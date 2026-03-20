import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { useAuth } from '../stores/AuthContext';

import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ScenarioListScreen } from '../screens/ScenarioListScreen';
import { ScenarioDetailScreen } from '../screens/ScenarioDetailScreen';
import { PlayerScreen } from '../screens/PlayerScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { VideoScreen } from '../screens/VideoScreen';
import { ChatbotScreen } from '../screens/ChatbotScreen';
import { SocialScreen } from '../screens/SocialScreen';
import { OfflineContentScreen } from '../screens/OfflineContentScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Learn: '📚',
    Profile: '👤',
    Videos: '🎬',
    Chatbot: '🤖',
    Social: '👥',
    Offline: '📥',
    Analytics: '📊',
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 24 }}>{icons[name] || '•'}</Text>
      <Text style={{ fontSize: 10, color: focused ? '#4A90D9' : '#999' }}>{name}</Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: { height: 60, paddingBottom: 8 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} /> }}
      />
      <Tab.Screen
        name="Learn"
        component={ScenarioListScreen}
        options={{ title: 'Learn', tabBarIcon: ({ focused }) => <TabIcon name="Learn" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} /> }}
      />
      <Tab.Screen
        name="Videos"
        component={VideoScreen}
        options={{ title: 'Videos', tabBarIcon: ({ focused }) => <TabIcon name="Videos" focused={focused} /> }}
      />
      <Tab.Screen
        name="Chatbot"
        component={ChatbotScreen}
        options={{ title: 'Chatbot', tabBarIcon: ({ focused }) => <TabIcon name="Chatbot" focused={focused} /> }}
      />
      <Tab.Screen
        name="Social"
        component={SocialScreen}
        options={{ title: 'Social', tabBarIcon: ({ focused }) => <TabIcon name="Social" focused={focused} /> }}
      />
      <Tab.Screen
        name="Offline"
        component={OfflineContentScreen}
        options={{ title: 'Offline', tabBarIcon: ({ focused }) => <TabIcon name="Offline" focused={focused} /> }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: 'Analytics', tabBarIcon: ({ focused }) => <TabIcon name="Analytics" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="ScenarioDetail"
            component={ScenarioDetailScreen}
            options={{ headerShown: true, title: 'Scenario' }}
          />
          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            options={{ headerShown: true, title: 'Practice' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
