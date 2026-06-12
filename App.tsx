// App.tsx
import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, StatusBar, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { initRemoteConfig } from './src/services/AdService';
import './src/i18n';
import notifee from '@notifee/react-native';
import analytics from '@react-native-firebase/analytics';
import { startAlarmWatcher, stopAlarmWatcher } from './src/services/AlarmWatcherService';
import { logScreen } from './src/services/AnalyticsService';

function AppContent() {
  // const { isDark } = useTheme();
  const { isDark, colors } = useTheme();

  const appStateRef = useRef(AppState.currentState);
  const [configReady, setConfigReady] = useState(false);

  useEffect(() => {
    initRemoteConfig().then(() => {
      setConfigReady(true);
    });

    startAlarmWatcher();

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (next === 'active') {
        startAlarmWatcher();
        initRemoteConfig();
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

  if (!configReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }} />
    );
  }

  return (
    <NavigationContainer ref={navigationRef} onStateChange={async () => {
      const current = navigationRef.getCurrentRoute();
      if (current?.name) {
        await analytics().logScreenView({
          screen_name: current.name,
          screen_class: current.name,
        });
      }
    }}
    >
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