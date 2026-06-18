// App.tsx
import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform, StatusBar, View } from 'react-native';
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
import { NativeAlarmManager } from 'rn-native-alarmkit';

function navigateWhenReady(screen: string, params?: object) {
  const tryNav = () => {
    if (navigationRef.isReady()) {
      navigationRef.navigate(screen as never, params as never);
    } else {
      setTimeout(tryNav, 100);
    }
  };
  setTimeout(tryNav, 300);
}

async function checkAlarmKitAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const cap = await NativeAlarmManager.checkCapability();
    return cap?.capability === 'native_alarms';
  } catch {
    return false;
  }
}

function AppContent() {
  const { isDark, colors } = useTheme();
  const appStateRef = useRef(AppState.currentState);
  const [configReady, setConfigReady] = useState(false);
  const alarmKitUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    initRemoteConfig().then(() => setConfigReady(true));
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
      if (alarmId) navigateWhenReady('AlarmRinging', { alarmId });
    });

    const setupAlarmKitListener = async () => {
      const available = await checkAlarmKitAvailable();
      if (!available) {
        console.log('AlarmKit not available (iOS < 26), using notifee only');
        return;
      }

      try {
        const granted = await NativeAlarmManager.requestAuthorization();
        if (!granted) {
          console.warn('AlarmKit permission denied');
          return;
        }
        const unsub = NativeAlarmManager.onAlarmFired((event) => {
          console.log('🔔 AlarmKit fired:', event.alarm.id, 'action:', event.action?.actionId);

          const alarmId = event.alarm.id;
          const actionId = event.action?.actionId;

          if (actionId === 'snooze') {
            console.log('Snoozed:', alarmId);
            return;
          }

          if (actionId === 'dismiss') {
            console.log('Dismissed from notification:', alarmId);
            return;
          }
          navigateWhenReady('AlarmRinging', { alarmId });
        });

        alarmKitUnsubRef.current = unsub;
        console.log('AlarmKit listener registered');

      } catch (e) {
        console.error('AlarmKit setup error:', e);
      }
    };

    setupAlarmKitListener();

    return () => {
      sub.remove();
      stopAlarmWatcher();
      alarmKitUnsubRef.current?.();
    };
  }, []);

  if (!configReady) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={async () => {
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