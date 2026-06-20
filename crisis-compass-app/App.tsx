import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './src/screens/HomeScreen';
import ResourcesScreen from './src/screens/ResourcesScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { COLORS } from './src/services/config';

const Tab = createBottomTabNavigator();

const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.primary,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.text,
    border: COLORS.border,
    notification: COLORS.accent,
  },
};

const tabScreens = [
  { name: 'HOME', component: HomeScreen, icon: 'compass' as const },
  { name: 'RESOURCES', component: ResourcesScreen, icon: 'medkit' as const },
  { name: 'ALERTS', component: AlertsScreen, icon: 'notifications' as const },
  { name: 'PROFILE', component: ProfileScreen, icon: 'person' as const },
];

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer theme={DarkTheme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ focused, color, size }) => {
              const screen = tabScreens.find((s) => s.name === route.name);
              const iconName = screen?.icon ?? 'compass';
              return <Ionicons name={focused ? iconName : (`${iconName}-outline` as any)} size={size} color={color} />;
            },
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.textMuted,
            tabBarStyle: {
              backgroundColor: COLORS.surface,
              borderTopColor: COLORS.border,
              borderTopWidth: 1,
              paddingBottom: 6,
              paddingTop: 6,
              height: 60,
            },
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 0.5,
            },
          })}
        >
          {tabScreens.map((screen) => (
            <Tab.Screen
              key={screen.name}
              name={screen.name}
              component={screen.component}
            />
          ))}
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}
