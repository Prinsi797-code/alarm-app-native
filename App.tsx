// App.tsx
import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import './src/i18n';
import notifee from '@notifee/react-native';
import { startAlarmWatcher, stopAlarmWatcher } from './src/services/AlarmWatcherService';
function AppContent() {
  const { isDark } = useTheme();
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    startAlarmWatcher();

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (next === 'active') {
        startAlarmWatcher();
      }
      console.log(`AppState: ${prev} → ${next}`);
    });

    notifee.getInitialNotification().then(n => {
      if (!n) return;
      const alarmId = n.notification?.data?.alarmId ?? n.notification?.id;
      if (!alarmId) return;
      const tryNav = () => {
        if (navigationRef.isReady()) {
          navigationRef.navigate('AlarmRinging' as never, { alarmId } as never);
        } else {
          setTimeout(tryNav, 100);
        }
      };
      setTimeout(tryNav, 500);
    });

    return () => {
      sub.remove();
      stopAlarmWatcher();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}