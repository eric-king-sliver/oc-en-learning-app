import axios, { AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'http://localhost:3000/api/v1';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('user_data');
    }
    return Promise.reject(error);
  }
);

export const api = {
  getHomeFeed: () => client.get('/home/feed').then((res) => res.data),
  getDailyContent: () => client.get('/home/daily').then((res) => res.data),
  getRecommendations: (params?: { category?: string; difficulty?: string; limit?: number }) =>
    client.get('/home/recommendations', { params }).then((res) => res.data),
  getCategories: () => client.get('/home/categories').then((res) => res.data),

  getScenarios: (params?: {
    category?: string;
    difficulty?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => client.get('/scenarios', { params }).then((res) => res.data),

  getScenario: (id: string) => client.get(`/scenarios/${id}`).then((res) => res.data),

  getScenarioDialogues: (id: string) =>
    client.get(`/scenarios/${id}/dialogues`).then((res) => res.data),

  getScenarioVocabulary: (id: string) =>
    client.get(`/scenarios/${id}/vocabulary`).then((res) => res.data),

  startSession: (scenarioId: string) =>
    client.post('/sessions', { scenarioId }).then((res) => res.data),

  completeTurn: (sessionId: string, dialogueTurnId: string, timeSpentMs: number) =>
    client
      .post(`/sessions/${sessionId}/turns`, {
        dialogueTurnId,
        timeSpentMs,
      })
      .then((res) => res.data),

  completeSession: (sessionId: string) =>
    client.post(`/sessions/${sessionId}/complete`).then((res) => res.data),

  getProgress: (params?: { category?: string; difficulty?: string }) =>
    client.get('/progress', { params }).then((res) => res.data),

  getProgressStats: () => client.get('/progress/stats').then((res) => res.data),

  getStreak: () => client.get('/progress/streak').then((res) => res.data),

  getUserProfile: () => client.get('/users/me').then((res) => res.data),

  updateUserProfile: (data: {
    displayName?: string;
    avatarUrl?: string;
    nativeLanguage?: string;
  }) => client.put('/users/me', data).then((res) => res.data),

  getUserStats: () => client.get('/users/stats').then((res) => res.data),

  uploadRecording: (formData: FormData) =>
    client.post('/recordings', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res) => res.data),

  getRecordings: (params?: { page?: number; limit?: number; scenarioId?: string }) =>
    client.get('/recordings', { params }).then((res) => res.data),

  analyzeSpeech: (expectedText: string, transcript: string) =>
    client.post('/recordings/analyze', { expectedText, transcript }).then((res) => res.data),
};

export default api;
