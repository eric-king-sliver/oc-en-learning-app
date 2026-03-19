import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../services/api';

export function PlayerScreen({ route, navigation }: any) {
  const { sessionId, scenarioId } = route.params;
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [score, setScore] = useState<number | null>(null);

  const { data: dialoguesData } = useQuery({
    queryKey: ['dialogues', scenarioId],
    queryFn: () => api.getScenarioDialogues(scenarioId),
  });

  const completeTurnMutation = useMutation({
    mutationFn: (turnId: string) =>
      api.completeTurn(sessionId, turnId, 5000),
    onSuccess: (data) => {
      if (data.data.data.isLastTurn) {
        handleCompleteSession();
      } else {
        moveToNextTurn(data.data.data);
      }
    },
  });

  const dialogues = dialoguesData?.data?.data || [];
  const currentDialogue = dialogues[currentDialogueIndex];
  const turns = currentDialogue?.turns || [];
  const currentTurn = turns[currentTurnIndex];

  function moveToNextTurn(response: any) {
    if (response.nextTurn) {
      const nextTurnInDialogue = turns.find((t: any) => t.id === response.nextTurn.id);
      if (nextTurnInDialogue) {
        setCurrentTurnIndex(turns.indexOf(nextTurnInDialogue));
      }
    } else if (response.nextDialogue) {
      setCurrentDialogueIndex((prev) => prev + 1);
      setCurrentTurnIndex(0);
    }
  }

  async function handleStartRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please grant microphone access');
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
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  }

  async function handleStopRecording() {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (currentTurn && currentTurn.idealResponse) {
        const mockTranscript = currentTurn.content;
        const result = await api.analyzeSpeech(currentTurn.idealResponse, mockTranscript);
        setScore(result.data.data.score);
      }

      completeTurnMutation.mutate(currentTurn.id);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  }

  function handleShowHint() {
    if (currentTurn?.hints?.length > 0) {
      Alert.alert('Hint', currentTurn.hints.join('\n'));
    }
  }

  async function handleCompleteSession() {
    try {
      await api.completeSession(sessionId);
      Alert.alert('Great job! 🎉', 'You completed the scenario!', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      navigation.goBack();
    }
  }

  function handleSkip() {
    const nextIndex = currentTurnIndex + 1;
    if (nextIndex < turns.length) {
      setCurrentTurnIndex(nextIndex);
    } else {
      const nextDialogueIndex = currentDialogueIndex + 1;
      if (nextDialogueIndex < dialogues.length) {
        setCurrentDialogueIndex(nextDialogueIndex);
        setCurrentTurnIndex(0);
      } else {
        handleCompleteSession();
      }
    }
  }

  if (!currentDialogue) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.progress}>
        <Text style={styles.progressText}>
          Dialogue {currentDialogueIndex + 1}/{dialogues.length} • Turn{' '}
          {currentTurnIndex + 1}/{turns.length}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${
                  ((currentDialogueIndex * turns.length + currentTurnIndex) /
                    (dialogues.length * turns.length)) *
                  100
                }%`,
              },
            ]}
          />
        </View>
      </View>

      <ScrollView style={styles.content}>
        {turns.slice(0, currentTurnIndex + 1).map((turn: any, index: number) => (
          <View
            key={turn.id}
            style={[
              styles.turnBubble,
              turn.speakerType === 'ai' ? styles.aiBubble : styles.userBubble,
            ]}
          >
            <Text
              style={[
                styles.turnText,
                turn.speakerType === 'user' && styles.userTurnText,
              ]}
            >
              {turn.content}
            </Text>
            {index === currentTurnIndex && score !== null && (
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>Score: {score}</Text>
              </View>
            )}
          </View>
        ))}

        {currentTurn?.speakerType === 'ai' && (
          <View style={styles.turnBubble styles.aiBubble}>
            <Text style={styles.turnText}>{currentTurn.content}</Text>
          </View>
        )}
      </ScrollView>

      {currentTurn?.speakerType === 'user' && (
        <View style={styles.controls}>
          {currentTurn.hints?.length > 0 && (
            <TouchableOpacity style={styles.hintButton} onPress={handleShowHint}>
              <Text style={styles.hintButtonText}>💡 Show Hint</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.recordButton, isRecording && styles.recordButtonActive]}
            onPress={isRecording ? handleStopRecording : handleStartRecording}
          >
            <Text style={styles.recordButtonText}>
              {isRecording ? '⏹️ Stop' : '🎤 Record'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  progress: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 48,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90D9',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  turnBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  aiBubble: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#4A90D9',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  turnText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  userTurnText: {
    color: '#fff',
  },
  scoreBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  scoreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  controls: {
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  hintButton: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  hintButtonText: {
    fontSize: 16,
    color: '#856404',
  },
  recordButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 50,
    width: 80,
    height: 80,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonActive: {
    backgroundColor: '#F44336',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    alignSelf: 'center',
    padding: 8,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#666',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 100,
  },
});
