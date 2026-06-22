import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StoreReview from 'react-native-store-review';

const LAUNCH_COUNT_KEY = '@app_launch_count';
const RATING_SHOWN_KEY = '@rating_prompt_shown_v1';
const MIN_LAUNCHES_BEFORE_PROMPT = 4;

export async function incrementLaunchCount(): Promise<void> {
    try {
        const raw = await AsyncStorage.getItem(LAUNCH_COUNT_KEY);
        const count = raw ? parseInt(raw, 10) : 0;
        await AsyncStorage.setItem(LAUNCH_COUNT_KEY, String(count + 1));
    } catch { }
}

export async function maybeShowRatingPrompt(): Promise<void> {
    if (Platform.OS !== 'ios') return;

    try {
        const alreadyShown = await AsyncStorage.getItem(RATING_SHOWN_KEY);
        if (alreadyShown === 'true') return;

        const raw = await AsyncStorage.getItem(LAUNCH_COUNT_KEY);
        const count = raw ? parseInt(raw, 10) : 0;

        if (count >= MIN_LAUNCHES_BEFORE_PROMPT) {
            if (StoreReview.isAvailable) {
                StoreReview.requestReview();
                await AsyncStorage.setItem(RATING_SHOWN_KEY, 'true');
            }
        }
    } catch (e) {
        console.log('RatingPrompt error:', e);
    }
}