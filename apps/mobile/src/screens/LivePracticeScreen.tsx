import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../stores/AuthContext';

type PracticeState = 'lobby' | 'matchmaking' | 'matched' | 'practicing' | 'results';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
}

interface PartnerUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
  proficiency: string;
}

interface SessionResult {
  sessionId: string;
  duration: number;
  messagesExchanged: number;
  vocabularyScore: number;
  pronunciationScore: number;
  fluencyScore: number;
  overallScore: number;
  feedback: string;
}

interface ScenarioPrompt {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
}

const SOCKET_URL = 'http://localhost:3000';

export function LivePracticeScreen({ navigation }: { navigation?: any }) {
  const { user } = useAuth();
  const [practiceState, setPracticeState] = useState<PracticeState>('lobby');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [partner, setPartner] = useState<PartnerUser | null>(null);
  const [scenarioPrompt, setScenarioPrompt] = useState<ScenarioPrompt | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [searchAnim] = useState(new Animated.Value(0));
  const flatListRef = useRef<FlatList>(null);

  const initializeSocket = useCallback(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      newSocket.emit('join_lobby', { userId: user?.id });
    });

    newSocket.on('match_found', (data: { partner: PartnerUser; scenario: ScenarioPrompt }) => {
      setPartner(data.partner);
      setScenarioPrompt(data.scenario);
      setPracticeState('matched');
      setTimeout(() => setPracticeState('practicing'), 2000);
    });

    newSocket.on('session_start', (data: { scenario: ScenarioPrompt; partner: PartnerUser }) => {
      setScenarioPrompt(data.scenario);
      setPartner(data.partner);
      setSessionStartTime(Date.now());
      setPracticeState('practicing');
    });

    newSocket.on('receive_message', (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    newSocket.on('user_typing', (data: { isTyping: boolean; userId: string }) => {
      if (data.userId !== user?.id) {
        setIsTyping(data.isTyping);
      }
    });

    newSocket.on('session_end', (result: SessionResult) => {
      setSessionResult(result);
      setPracticeState('results');
    });

    newSocket.on('match_cancelled', () => {
      setPracticeState('lobby');
      Alert.alert('Match Cancelled', 'The matchmaking was cancelled. You can try again.');
    });

    newSocket.on('partner_disconnected', () => {
      if (practiceState === 'practicing' || practiceState === 'matched') {
        Alert.alert('Partner Disconnected', 'Your practice partner has disconnected.');
        setPracticeState('results');
      }
    });

    setSocket(newSocket);
    return newSocket;
  }, [user?.id, practiceState]);

  useEffect(() => {
    const newSocket = initializeSocket();
    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (practiceState === 'matchmaking') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(searchAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(searchAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [practiceState, searchAnim]);

  const handleJoinMatchmaking = () => {
    if (!socket) {
      const newSocket = initializeSocket();
      setSocket(newSocket);
      setTimeout(() => {
        newSocket.emit('join_matchmaking', { userId: user?.id });
        setPracticeState('matchmaking');
      }, 500);
    } else {
      socket.emit('join_matchmaking', { userId: user?.id });
      setPracticeState('matchmaking');
    }
  };

  const handleCancelMatchmaking = () => {
    if (socket) {
      socket.emit('cancel_matchmaking', { userId: user?.id });
    }
    setPracticeState('lobby');
  };

  const handleAcceptMatch = () => {
    if (socket) {
      socket.emit('accept_match', { userId: user?.id });
      setPracticeState('practicing');
      setSessionStartTime(Date.now());
    }
  };

  const handleDeclineMatch = () => {
    if (socket) {
      socket.emit('decline_match', { userId: user?.id });
    }
    setPracticeState('lobby');
    setPartner(null);
    setScenarioPrompt(null);
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !socket || practiceState !== 'practicing') return;

    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: user?.id || 'unknown',
      senderName: user?.displayName || 'You',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    socket.emit('send_message', {
      conversationId: sessionResult?.sessionId || 'live',
      message,
    });

    setChatMessages((prev) => [...prev, message]);
    setInputText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    if (socket) {
      socket.emit('typing', { userId: user?.id, isTyping: text.length > 0 });
    }
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    Alert.alert('Recording', 'Voice recording would start here. (Demo mode)');
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    Alert.alert('Recording Stopped', 'Voice recording would be processed here. (Demo mode)');
  };

  const handleEndSession = () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to end this practice session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: () => {
            if (socket) {
              socket.emit('end_session', { userId: user?.id });
            }
            const demoResult: SessionResult = {
              sessionId: `session_${Date.now()}`,
              duration: sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 300,
              messagesExchanged: chatMessages.length,
              vocabularyScore: Math.floor(Math.random() * 20) + 75,
              pronunciationScore: Math.floor(Math.random() * 20) + 70,
              fluencyScore: Math.floor(Math.random() * 20) + 72,
              overallScore: Math.floor(Math.random() * 15) + 80,
              feedback: 'Great effort! Keep practicing to improve your fluency and vocabulary.',
            };
            setSessionResult(demoResult);
            setPracticeState('results');
          },
        },
      ]
    );
  };

  const handleShareResults = async () => {
    if (!sessionResult) return;

    try {
      await Share.share({
        message: `I just completed a live English practice session! 🎉\n\nScore: ${sessionResult.overallScore}/100\nVocabulary: ${sessionResult.vocabularyScore}/100\nPronunciation: ${sessionResult.pronunciationScore}/100\nFluency: ${sessionResult.fluencyScore}/100\n\nJoin me on English Learning App!`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share results.');
    }
  };

  const handleReturnToLobby = () => {
    setPracticeState('lobby');
    setPartner(null);
    setScenarioPrompt(null);
    setChatMessages([]);
    setSessionResult(null);
    setSessionStartTime(null);
    if (socket) {
      socket.emit('leave_session', { userId: user?.id });
    }
  };

  const renderLobbyView = () => (
    <View style={styles.lobbyContainer}>
      <View style={styles.lobbyHeader}>
        <Text style={styles.lobbyTitle}>Live Practice</Text>
        <Text style={styles.lobbySubtitle}>
          Practice English with real partners in real-time
        </Text>
      </View>

      <View style={styles.userStatusCard}>
        <View style={styles.statusRow}>
          <View style={styles.statusIndicator} />
          <Text style={styles.statusText}>Online</Text>
        </View>
        <Text style={styles.userName}>{user?.displayName || 'Learner'}</Text>
        <Text style={styles.userProficiency}>Level: {user?.currentProficiency || 'A1'}</Text>
      </View>

      <View style={styles.lobbyFeatures}>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🎯</Text>
          <Text style={styles.featureText}>Real-time conversation</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📊</Text>
          <Text style={styles.featureText}>Instant feedback</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🌍</Text>
          <Text style={styles.featureText}>Meet learners worldwide</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.joinButton} onPress={handleJoinMatchmaking}>
        <Text style={styles.joinButtonText}>Find a Practice Partner</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation?.goBack()}
      >
        <Text style={styles.backButtonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMatchmakingView = () => (
    <View style={styles.matchmakingContainer}>
      <Text style={styles.matchmakingTitle}>Finding a Partner...</Text>
      <Text style={styles.matchmakingSubtitle}>
        We'll match you with someone at your level
      </Text>

      <View style={styles.searchAnimationContainer}>
        <Animated.View
          style={[
            styles.searchCircle,
            {
              transform: [
                {
                  scale: searchAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2],
                  }),
                },
              ],
              opacity: searchAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.5],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.searchCircleInner,
            {
              transform: [
                {
                  scale: searchAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.8],
                  }),
                },
              ],
            },
          ]}
        />
        <Text style={styles.searchIcon}>🔍</Text>
      </View>

      <TouchableOpacity style={styles.cancelButton} onPress={handleCancelMatchmaking}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMatchedView = () => (
    <View style={styles.matchedContainer}>
      <Text style={styles.matchedTitle}>Match Found! 🎉</Text>
      <Text style={styles.matchedSubtitle}>
        You've been matched with a practice partner
      </Text>

      <View style={styles.partnerPreviewCard}>
        <View style={styles.partnerAvatar}>
          <Text style={styles.partnerAvatarText}>
            {partner?.displayName?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.partnerName}>{partner?.displayName || 'Partner'}</Text>
        <Text style={styles.partnerProficiency}>
          Level: {partner?.proficiency || 'A2'}
        </Text>
      </View>

      {scenarioPrompt && (
        <View style={styles.scenarioPreviewCard}>
          <Text style={styles.scenarioPreviewTitle}>Scenario</Text>
          <Text style={styles.scenarioPreviewName}>{scenarioPrompt.title}</Text>
          <Text style={styles.scenarioPreviewDesc}>{scenarioPrompt.description}</Text>
        </View>
      )}

      <View style={styles.matchedActions}>
        <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptMatch}>
          <Text style={styles.acceptButtonText}>Start Practice</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineButton} onPress={handleDeclineMatch}>
          <Text style={styles.declineButtonText}>Find Another</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPracticeView = () => (
    <KeyboardAvoidingView
      style={styles.practiceContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.practiceHeader}>
        <View style={styles.partnerInfo}>
          <View style={styles.miniAvatar}>
            <Text style={styles.miniAvatarText}>
              {partner?.displayName?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.partnerNameHeader}>{partner?.displayName || 'Partner'}</Text>
        </View>
        <TouchableOpacity style={styles.endSessionButton} onPress={handleEndSession}>
          <Text style={styles.endSessionButtonText}>End</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.videoContainer}>
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoPlaceholderText}>Your Video</Text>
          <View style={styles.videoPlaceholderIcon}>
            <Text style={{ fontSize: 40 }}>📹</Text>
          </View>
        </View>
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoPlaceholderText}>{partner?.displayName || 'Partner'}</Text>
          <View style={styles.videoPlaceholderIcon}>
            <Text style={{ fontSize: 40 }}>📹</Text>
          </View>
        </View>
      </View>

      {scenarioPrompt && (
        <View style={styles.scenarioPromptCard}>
          <Text style={styles.scenarioPromptLabel}>Scenario</Text>
          <Text style={styles.scenarioPromptTitle}>{scenarioPrompt.title}</Text>
          <Text style={styles.scenarioPromptDesc}>{scenarioPrompt.description}</Text>
          <View style={styles.scenarioTags}>
            <View style={styles.scenarioTag}>
              <Text style={styles.scenarioTagText}>{scenarioPrompt.difficulty}</Text>
            </View>
            <View style={styles.scenarioTag}>
              <Text style={styles.scenarioTagText}>{scenarioPrompt.category}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.chatContainer}>
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isOwnMessage = item.senderId === user?.id;
            return (
              <View
                style={[
                  styles.chatMessageBubble,
                  isOwnMessage ? styles.ownMessageBubble : styles.partnerMessageBubble,
                ]}
              >
                {!isOwnMessage && (
                  <Text style={styles.messageSenderName}>{item.senderName}</Text>
                )}
                <Text
                  style={[
                    styles.chatMessageText,
                    isOwnMessage ? styles.ownMessageText : styles.partnerMessageText,
                  ]}
                >
                  {item.content}
                </Text>
                <Text style={styles.messageTimestamp}>
                  {new Date(item.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            );
          }}
          contentContainerStyle={styles.chatMessagesList}
        />
        {isTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>{partner?.displayName || 'Partner'} is typing...</Text>
          </View>
        )}
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.chatInput}
            value={inputText}
            onChangeText={handleTyping}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.voiceButton, isRecording && styles.voiceButtonRecording]}
            onPress={isRecording ? handleStopRecording : handleStartRecording}
          >
            <Text style={styles.voiceButtonText}>{isRecording ? '⏹️' : '🎤'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendButtonText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderResultsView = () => (
    <View style={styles.resultsContainer}>
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>Session Complete! 🎉</Text>
        <Text style={styles.resultsSubtitle}>Great practice session</Text>
      </View>

      <View style={styles.scoreCard}>
        <View style={styles.mainScoreCircle}>
          <Text style={styles.mainScoreValue}>{sessionResult?.overallScore || 0}</Text>
          <Text style={styles.mainScoreLabel}>Overall</Text>
        </View>

        <View style={styles.scoreBreakdown}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Vocabulary</Text>
            <View style={styles.scoreBarContainer}>
              <View
                style={[
                  styles.scoreBar,
                  { width: `${sessionResult?.vocabularyScore || 0}%` },
                ]}
              />
            </View>
            <Text style={styles.scoreValue}>{sessionResult?.vocabularyScore || 0}</Text>
          </View>

          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Pronunciation</Text>
            <View style={styles.scoreBarContainer}>
              <View
                style={[
                  styles.scoreBar,
                  { width: `${sessionResult?.pronunciationScore || 0}%` },
                ]}
              />
            </View>
            <Text style={styles.scoreValue}>{sessionResult?.pronunciationScore || 0}</Text>
          </View>

          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Fluency</Text>
            <View style={styles.scoreBarContainer}>
              <View
                style={[
                  styles.scoreBar,
                  { width: `${sessionResult?.fluencyScore || 0}%` },
                ]}
              />
            </View>
            <Text style={styles.scoreValue}>{sessionResult?.fluencyScore || 0}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sessionStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{sessionResult?.duration || 0}s</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{sessionResult?.messagesExchanged || 0}</Text>
          <Text style={styles.statLabel}>Messages</Text>
        </View>
      </View>

      <View style={styles.feedbackCard}>
        <Text style={styles.feedbackTitle}>Feedback</Text>
        <Text style={styles.feedbackText}>
          {sessionResult?.feedback || 'Keep practicing to improve your English skills!'}
        </Text>
      </View>

      <View style={styles.resultsActions}>
        <TouchableOpacity style={styles.shareButton} onPress={handleShareResults}>
          <Text style={styles.shareButtonText}>Share Results</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.practiceAgainButton} onPress={handleReturnToLobby}>
          <Text style={styles.practiceAgainButtonText}>Practice Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {practiceState === 'lobby' && renderLobbyView()}
      {practiceState === 'matchmaking' && renderMatchmakingView()}
      {practiceState === 'matched' && renderMatchedView()}
      {practiceState === 'practicing' && renderPracticeView()}
      {practiceState === 'results' && renderResultsView()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  lobbyContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  lobbyHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  lobbyTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  lobbySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  userStatusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userProficiency: {
    fontSize: 14,
    color: '#666',
  },
  lobbyFeatures: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
  },
  joinButton: {
    backgroundColor: '#4A90D9',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
  },
  matchmakingContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 100,
    alignItems: 'center',
  },
  matchmakingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  matchmakingSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 48,
  },
  searchAnimationContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  searchCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4A90D9',
    opacity: 0.3,
  },
  searchCircleInner: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4A90D9',
    opacity: 0.5,
  },
  searchIcon: {
    fontSize: 40,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
  matchedContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 80,
    alignItems: 'center',
  },
  matchedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  matchedSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  partnerPreviewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  partnerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4A90D9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  partnerAvatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  partnerName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  partnerProficiency: {
    fontSize: 14,
    color: '#666',
  },
  scenarioPreviewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scenarioPreviewTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  scenarioPreviewName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  scenarioPreviewDesc: {
    fontSize: 14,
    color: '#666',
  },
  matchedActions: {
    width: '100%',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  practiceContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  practiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#4A90D9',
    padding: 12,
    paddingTop: 48,
  },
  partnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  miniAvatarText: {
    color: '#4A90D9',
    fontSize: 16,
    fontWeight: 'bold',
  },
  partnerNameHeader: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  endSessionButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  endSessionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  videoContainer: {
    flexDirection: 'row',
    height: 180,
    padding: 8,
    gap: 8,
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholderText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  videoPlaceholderIcon: {
    opacity: 0.5,
  },
  scenarioPromptCard: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scenarioPromptLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  scenarioPromptTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  scenarioPromptDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  scenarioTags: {
    flexDirection: 'row',
    gap: 8,
  },
  scenarioTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scenarioTagText: {
    color: '#4A90D9',
    fontSize: 12,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  chatMessagesList: {
    padding: 12,
  },
  chatMessageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  ownMessageBubble: {
    backgroundColor: '#4A90D9',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  partnerMessageBubble: {
    backgroundColor: '#f5f5f5',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageSenderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  chatMessageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#fff',
  },
  partnerMessageText: {
    color: '#333',
  },
  messageTimestamp: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.4)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  typingIndicator: {
    padding: 8,
    paddingHorizontal: 12,
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  chatInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    maxHeight: 100,
    paddingVertical: 4,
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  voiceButtonRecording: {
    backgroundColor: '#F44336',
  },
  voiceButtonText: {
    fontSize: 18,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A90D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    fontSize: 20,
    color: '#fff',
  },
  resultsContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  resultsHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  resultsSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mainScoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4A90D9',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  mainScoreValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  mainScoreLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  scoreBreakdown: {
    gap: 12,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreLabel: {
    width: 100,
    fontSize: 14,
    color: '#666',
  },
  scoreBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  scoreBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  scoreValue: {
    width: 30,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90D9',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  feedbackCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  resultsActions: {
    gap: 12,
  },
  shareButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4A90D9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#4A90D9',
    fontSize: 16,
    fontWeight: '600',
  },
  practiceAgainButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  practiceAgainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
