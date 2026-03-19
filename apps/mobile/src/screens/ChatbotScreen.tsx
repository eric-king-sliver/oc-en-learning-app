import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Audio } from 'expo-av';
import { api } from '../services/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  scenarioId?: string;
  scenarioTitle?: string;
  lastMessageAt: string;
  messageCount: number;
  messages?: ChatMessage[];
}

interface ChatbotScreenProps {
  route?: {
    params?: {
      conversationId?: string;
    };
  };
  navigation?: any;
}

export function ChatbotScreen({ route, navigation }: ChatbotScreenProps) {
  const conversationId = route?.params?.conversationId;
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);

  const {
    data: conversationsData,
    isLoading: isLoadingConversations,
    error: conversationsError,
  } = useQuery({
    queryKey: ['chatbotConversations'],
    queryFn: () => api.getChatbotConversations(),
    enabled: !conversationId,
  });

  const {
    data: conversationData,
    isLoading: isLoadingConversation,
    error: conversationError,
  } = useQuery({
    queryKey: ['chatbotConversation', conversationId],
    queryFn: () => api.getChatbotConversation(conversationId!),
    enabled: !!conversationId,
  });

  const createConversationMutation = useMutation({
    mutationFn: (data: { title?: string; scenarioId?: string }) =>
      api.createChatbotConversation(data.scenarioId, data.title),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chatbotConversations'] });
      const newConversationId = data.data?.data?.id;
      if (newConversationId) {
        navigation?.setParams({ conversationId: newConversationId });
      }
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: { conversationId: string; content: string; audioUrl?: string }) =>
      api.sendChatbotMessage(data.conversationId, data.content, data.audioUrl),
    onSuccess: (data) => {
      setOptimisticMessages((prev) =>
        prev.filter((m) => m.id !== 'pending')
      );
      queryClient.invalidateQueries({ queryKey: ['chatbotConversation', conversationId] });
    },
    onError: () => {
      setOptimisticMessages((prev) =>
        prev.filter((m) => m.id !== 'pending')
      );
      Alert.alert('Error', 'Failed to send message. Please try again.');
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (id: string) => api.deleteChatbotConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbotConversations'] });
    },
  });

  const conversations: Conversation[] = conversationsData?.data?.data || [];
  const conversation = conversationData?.data?.data;
  const messages: ChatMessage[] = conversation?.messages || [];
  const allMessages = [...messages, ...optimisticMessages];

  useEffect(() => {
    if (conversationId && navigation) {
      navigation.setOptions({
        title: conversation?.title || 'Chat',
        headerShown: true,
        headerBackTitle: 'Back',
      });
    }
  }, [conversationId, conversation?.title, navigation]);

  useEffect(() => {
    if (allMessages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [allMessages.length]);

  function handleSendMessage() {
    if (!inputText.trim() || !conversationId || isSending) return;

    const optimisticMessage: ChatMessage = {
      id: 'pending',
      role: 'user',
      content: inputText.trim(),
      createdAt: new Date().toISOString(),
    };

    setOptimisticMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');
    setIsSending(true);

    sendMessageMutation.mutate(
      { conversationId, content: inputText.trim() },
      {
        onSettled: () => setIsSending(false),
      }
    );
  }

  async function handleStartRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please grant microphone access to record voice messages.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  }

  async function handleStopRecording() {
    if (!recording || !conversationId) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        const optimisticMessage: ChatMessage = {
          id: 'pending',
          role: 'user',
          content: '🎤 Voice message',
          createdAt: new Date().toISOString(),
        };

        setOptimisticMessages((prev) => [...prev, optimisticMessage]);

        sendMessageMutation.mutate({
          conversationId,
          content: '🎤 Voice message',
          audioUrl: uri,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
    }
  }

  function handleNewConversation() {
    Alert.prompt(
      'New Conversation',
      'Enter a title for your conversation (optional)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: (title) => {
            createConversationMutation.mutate({ title: title || 'New Chat' });
          },
        },
      ],
      'plain-text'
    );
  }

  function handleDeleteConversation(id: string) {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteConversationMutation.mutate(id),
        },
      ]
    );
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  function renderConversationItem({ item }: { item: Conversation }) {
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => navigation?.navigate('Chatbot', { conversationId: item.id })}
        onLongPress={() => handleDeleteConversation(item.id)}
      >
        <View style={styles.conversationAvatar}>
          <Text style={styles.avatarText}>AI</Text>
        </View>
        <View style={styles.conversationInfo}>
          <Text style={styles.conversationTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.scenarioTitle && (
            <Text style={styles.conversationScenario} numberOfLines={1}>
              {item.scenarioTitle}
            </Text>
          )}
        </View>
        <View style={styles.conversationMeta}>
          <Text style={styles.conversationDate}>{formatDate(item.lastMessageAt)}</Text>
          {item.messageCount > 0 && (
            <View style={styles.messageCountBadge}>
              <Text style={styles.messageCountText}>{item.messageCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  function renderMessageItem({ item }: { item: ChatMessage }) {
    const isUser = item.role === 'user';
    const isPending = item.id === 'pending';

    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble,
        ]}
      >
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Text style={styles.aiAvatarText}>AI</Text>
          </View>
        )}
        <View
          style={[
            styles.messageContent,
            isUser ? styles.userMessageContent : styles.aiMessageContent,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.aiMessageText,
            ]}
          >
            {item.content}
          </Text>
          {isPending && (
            <ActivityIndicator
              size="small"
              color={isUser ? '#fff' : '#4A90D9'}
              style={styles.sendingIndicator}
            />
          )}
        </View>
      </View>
    );
  }

  if (!conversationId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI Chat</Text>
          <TouchableOpacity style={styles.newChatButton} onPress={handleNewConversation}>
            <Text style={styles.newChatButtonText}>+ New</Text>
          </TouchableOpacity>
        </View>

        {isLoadingConversations ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90D9" />
          </View>
        ) : conversationsError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load conversations</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => queryClient.invalidateQueries({ queryKey: ['chatbotConversations'] })}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              Start a new conversation to practice English with AI
            </Text>
            <TouchableOpacity style={styles.startButton} onPress={handleNewConversation}>
              <Text style={styles.startButtonText}>Start Chatting</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={renderConversationItem}
            contentContainerStyle={styles.conversationList}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {isLoadingConversation ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90D9" />
        </View>
      ) : conversationError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load conversation</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => queryClient.invalidateQueries({ queryKey: ['chatbotConversation', conversationId] })}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={allMessages}
            keyExtractor={(item, index) => item.id || `pending-${index}`}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type a message..."
                placeholderTextColor="#999"
                multiline
                maxLength={1000}
                onSubmitEditing={handleSendMessage}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[
                  styles.voiceButton,
                  isRecording && styles.voiceButtonRecording,
                ]}
                onPress={isRecording ? handleStopRecording : handleStartRecording}
                disabled={!conversationId}
              >
                <Text style={styles.voiceButtonText}>
                  {isRecording ? '⏹️' : '🎤'}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isSending}
            >
              <Text style={styles.sendButtonText}>➤</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4A90D9',
    padding: 16,
    paddingTop: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  newChatButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newChatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  conversationList: {
    padding: 16,
  },
  conversationItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  conversationAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4A90D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  conversationScenario: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  conversationMeta: {
    alignItems: 'flex-end',
  },
  conversationDate: {
    fontSize: 12,
    color: '#999',
  },
  messageCountBadge: {
    backgroundColor: '#4A90D9',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  messageCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 12,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: '85%',
  },
  aiBubble: {
    alignSelf: 'flex-start',
  },
  userBubble: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A90D9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  aiAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageContent: {
    borderRadius: 16,
    padding: 12,
    maxWidth: '100%',
  },
  aiMessageContent: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  userMessageContent: {
    backgroundColor: '#4A90D9',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  aiMessageText: {
    color: '#333',
  },
  userMessageText: {
    color: '#fff',
  },
  sendingIndicator: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
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
  textInput: {
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
});
