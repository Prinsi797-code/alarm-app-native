import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import notifee, { EventType } from '@notifee/react-native';
import TrackPlayer from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from './src/navigation/navigationRef';

const STORAGE_KEY = '@alarms_v3';

function navigateWhenReady(screenName, params) {
  const tryNavigate = () => {
    if (navigationRef.isReady()) {
      navigationRef.navigate(screenName, params);
    } else {
      setTimeout(tryNavigate, 100);
    }
  };
  setTimeout(tryNavigate, 300);
}

const TONE_MAP = {
  'Fine Day': require('./assets/sounds/fine_day.mp3'),
  'Classic':  require('./assets/sounds/classic.mp3'),
  'Radar':    require('./assets/sounds/radar.mp3'),
  'Beacon':   require('./assets/sounds/beacon.mp3'),
  'Einnt':    require('./assets/sounds/einnt.mp3'),
  'Funny':    require('./assets/sounds/funny.mp3'),
  'Gunfire':  require('./assets/sounds/gunfire.mp3'),
  'Love':     require('./assets/sounds/love.mp3'),
};

async function playAlarmSound(alarmId) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const alarms = raw ? JSON.parse(raw) : [];
    const alarm = alarms.find(a => a.id === alarmId);
    const ringtoneName = alarm?.ringtone ?? 'Fine Day';
    const trackUrl = TONE_MAP[ringtoneName] ?? TONE_MAP['Fine Day'];

    await TrackPlayer.setupPlayer();
    await TrackPlayer.reset();
    await TrackPlayer.add({
      id: alarmId,
      url: trackUrl,
      title: alarm?.label ?? 'Alarm',
      artist: 'Alarm',
    });
    await TrackPlayer.setRepeatMode(2);
    await TrackPlayer.play();
  } catch (e) {
    console.log('playAlarmSound error:', e);
  }
}

notifee.onForegroundEvent(({ type, detail }) => {
  if (type === EventType.DELIVERED || type === EventType.PRESS) {
    const alarmId =
      detail.notification?.data?.alarmId ?? detail.notification?.id;
    if (alarmId) {
      playAlarmSound(alarmId);
      navigateWhenReady('AlarmRinging', { alarmId });
    }
  }
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
    const alarmId =
        detail.notification?.data?.alarmId ?? detail.notification?.id;
    if (!alarmId) return;

    if (type === EventType.PRESS) {
        navigateWhenReady('AlarmRinging', { alarmId });
    }
});

AppRegistry.registerComponent(appName, () => App);

TrackPlayer.registerPlaybackService(
  () => require('./src/services/TrackPlayerService'),
);