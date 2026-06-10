import TrackPlayer, { 
  RepeatMode, 
  Capability, 
  State 
} from 'react-native-track-player';

let bgInitialized = false;

export async function startSilentBackground() {
  try {
    if (!bgInitialized) {
      await TrackPlayer.setupPlayer({
        autoHandleInterruptions: false,
      });
      await TrackPlayer.updateOptions({
        capabilities: [Capability.Play, Capability.Stop],
      });
      bgInitialized = true;
    }

    const state = await TrackPlayer.getState();
    if (state === State.Playing) {
      console.log('BG audio already playing');
      return;
    }

    await TrackPlayer.reset();
    await TrackPlayer.add({
      id: 'bg_audio',
      url: require('../../assets/sounds/fine_day.mp3'),
      title: 'AlarmApp',
      artist: 'Background',
    });
    await TrackPlayer.setRepeatMode(RepeatMode.Queue);
    
    await TrackPlayer.setVolume(0.01);
    await TrackPlayer.play();

    console.log('Background audio playing (vol 0.01)');
  } catch (e: any) {
    console.log('BG Audio error:', e?.message);
    bgInitialized = true;
  }
}

export async function stopSilentBackground() {
  try {
    await TrackPlayer.stop();
    await TrackPlayer.reset();
    bgInitialized = false;
  } catch {}
}