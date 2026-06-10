import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import notifee, { EventType } from '@notifee/react-native';
import TrackPlayer from 'react-native-track-player';
import { navigationRef } from './src/navigation/navigationRef';

function navigateWhenReady(screenName, params) {
  const tryNavigate = () => {
    if (navigationRef.isReady()) {
      navigationRef.navigate(screenName, params);
    } else {
      setTimeout(tryNavigate, 100);
    }
  };
  tryNavigate();
}
notifee.onForegroundEvent(({ type, detail }) => {
  if (
    type === EventType.DELIVERED || 
    type === EventType.PRESS
  ) {
    const alarmId =
      detail.notification?.data?.alarmId ?? detail.notification?.id;
    if (alarmId) {
      navigateWhenReady('AlarmRinging', { alarmId });
    }
  }
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
    const alarmId =
      detail.notification?.data?.alarmId ?? detail.notification?.id;
    if (alarmId) {
      navigateWhenReady('AlarmRinging', { alarmId });
    }
  }
});

AppRegistry.registerComponent(appName, () => App);

TrackPlayer.registerPlaybackService(
  () => require('./src/services/TrackPlayerService'),
);