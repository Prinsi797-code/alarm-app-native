import TrackPlayer, { Event } from 'react-native-track-player';

module.exports = async function () {
  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    await TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
    try {
      await TrackPlayer.seekTo(0);
      await TrackPlayer.play();
    } catch {}
  });
};