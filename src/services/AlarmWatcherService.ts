import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundTimer from 'react-native-background-timer';
import { navigationRef } from '../navigation/navigationRef';

const STORAGE_KEY = '@alarms_v3';
let watcherInterval: number | null = null;
let lastFiredKey = '';

type Alarm = {
  id: string;
  hour: number;
  minute: number;
  days: number[];
  enabled: boolean;
  ringtone: string;
  snoozeMinutes: number;
  bgIndex: number;
  label: string;
};

async function loadAlarms(): Promise<Alarm[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function shouldFireToday(alarm: Alarm): boolean {
  if (!alarm.enabled) return false;
  if (alarm.days.length === 0) return true;
  return alarm.days.includes(new Date().getDay());
}

function navigateToAlarm(alarm: Alarm) {
  const tryNav = (retries = 0) => {
    if (retries > 30) return;
    if (navigationRef.isReady()) {
      const current = navigationRef.getCurrentRoute();
      if (current?.name === 'AlarmRinging') return;
      navigationRef.navigate('AlarmRinging' as never, {
        alarmId: alarm.id,
        alarm: alarm,
      } as never);
    } else {
      setTimeout(() => tryNav(retries + 1), 100);
    }
  };
  tryNav();
}

export function startAlarmWatcher() {
  if (watcherInterval !== null) return;

  watcherInterval = BackgroundTimer.setInterval(async () => {
    const now = new Date();
    const s = now.getSeconds();
    if (s > 5) return;

    const h = now.getHours();
    const m = now.getMinutes();
    const alarms = await loadAlarms();

    for (const alarm of alarms) {
      const key = `${alarm.id}_${h}_${m}`;
      if (
        alarm.hour === h &&
        alarm.minute === m &&
        shouldFireToday(alarm) &&
        lastFiredKey !== key
      ) {
        lastFiredKey = key;
        navigateToAlarm(alarm);
        break;
      }
    }
  }, 1000);
}

export function stopAlarmWatcher() {
  if (watcherInterval !== null) {
    BackgroundTimer.clearInterval(watcherInterval);
    watcherInterval = null;
    console.log('Watcher stopped');
  }
}