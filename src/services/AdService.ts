// src/services/AdService.ts
import remoteConfig from '@react-native-firebase/remote-config';
import {
    InterstitialAd,
    AdEventType,
    BannerAdSize,
    TestIds,
} from 'react-native-google-mobile-ads';
import { AdEvents } from './AnalyticsService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type InterFlag = 0 | 1 | 2 | 3;
export type VisibilityFlag = 0 | 1;

export interface ScreenAdConfig {
    interFlag: InterFlag;
    interId: string;
    nativeFlag: VisibilityFlag;
    nativeId: string;
    bannerFlag: VisibilityFlag;
    bannerId: string;
}

const SCREEN_KEYS: Record<string, {
    interFlag: string; interId: string;
    nativeFlag?: string; nativeId?: string;
    bannerFlag?: string; bannerId?: string;
}> = {
    alarm_screen: { interFlag: 'alarm_inter_flag', interId: 'alarm_inter_id', nativeFlag: 'alarm_native_flag', nativeId: 'alarm_native_id' },
    coin_screen: { interFlag: 'coin_inter_flag', interId: 'coin_inter_id', bannerFlag: 'coin_baner_flag', bannerId: 'coin_baner_id' },
    language_screen: { interFlag: 'language_inter_flag', interId: 'language_inter_id', nativeFlag: 'language_native_flag', nativeId: 'language_native_id' },
    country_screen: { interFlag: 'country_inter_flag', interId: 'country_inter_id', bannerFlag: 'country_baner_flag', bannerId: 'country_baner_id' },
    main_screen: { interFlag: 'main_inter_flag', interId: 'main_inter_id', bannerFlag: 'main_baner_flag', bannerId: 'main_baner_id' },
    math_mission_screen: { interFlag: 'math_inter_flag', interId: 'math_inter_id', bannerFlag: 'math_baner_flag', bannerId: 'math_baner_id' },
    snooze_screen: { interFlag: 'snooze_inter_flag', interId: 'snooze_inter_id', nativeFlag: 'snooze_native_flag', nativeId: 'snooze_native_id' },
    sound_screen: { interFlag: 'sound_inter_flag', interId: 'sound_inter_id', bannerFlag: 'sound_baner_flag', bannerId: 'sound_baner_id' },
    theme_mode_screen: { interFlag: 'theme_inter_flag', interId: 'theme_inter_id', bannerFlag: 'theme_baner_flag', bannerId: 'theme_baner_id' },
};

const SHOWN_LIFETIME_KEY = (s: string) => `@ad_shown_lifetime_${s}`;
const SHOWN_DATE_KEY = (s: string) => `@ad_shown_date_${s}`;

export async function initRemoteConfig(): Promise<void> {
    try {
        const rc = remoteConfig();
        await rc.setConfigSettings({
            minimumFetchIntervalMillis: 0,
        });
        await rc.setDefaults({
            alarm_inter_flag: 0, alarm_inter_id: '',
            alarm_native_flag: 0, alarm_native_id: '',
            coin_inter_flag: 0, coin_inter_id: '',
            coin_baner_flag: 0, coin_baner_id: '',
            language_inter_flag: 0, language_inter_id: '',
            language_native_flag: 0, language_native_id: '',
            main_inter_flag: 0, main_inter_id: '',
            main_baner_flag: 0, main_baner_id: '',
            math_inter_flag: 0, math_inter_id: '',
            math_baner_flag: 0, math_baner_id: '',
            snooze_inter_flag: 0, snooze_inter_id: '',
            snooze_native_flag: 0, snooze_native_id: '',
            sound_inter_flag: 0, sound_inter_id: '',
            sound_baner_flag: 0, sound_baner_id: '',
            theme_inter_flag: 0, theme_inter_id: '',
            theme_baner_flag: 0, theme_baner_id: '',
            country_inter_flag: 0, country_inter_id: '',
            country_baner_flag: 0, country_baner_id: '',

        });

        await rc.fetchAndActivate();

        console.log('[RC] main_baner_flag:', rc.getValue('main_baner_flag').asNumber());
        console.log('[RC] main_baner_flag source:', rc.getValue('main_baner_flag').getSource());

    } catch (e) {
        console.log('[RC] init error:', e);
    }
}

export function getScreenAdConfig(screen: string): ScreenAdConfig {
    const keys = SCREEN_KEYS[screen];
    if (!keys) return defaultConfig();

    const rc = remoteConfig();
    const config: ScreenAdConfig = {
        interFlag: (rc.getValue(keys.interFlag).asNumber() ?? 0) as InterFlag,
        interId: rc.getValue(keys.interId).asString() || TestIds.INTERSTITIAL,
        nativeFlag: (rc.getValue(keys.nativeFlag ?? '').asNumber() ?? 0) as VisibilityFlag,
        nativeId: rc.getValue(keys.nativeId ?? '').asString() || TestIds.BANNER,
        bannerFlag: (rc.getValue(keys.bannerFlag ?? '').asNumber() ?? 0) as VisibilityFlag,
        bannerId: rc.getValue(keys.bannerId ?? '').asString() || TestIds.BANNER,
    };
    console.log(`[AdService] ${screen}:`, config);
    return config;
}

function defaultConfig(): ScreenAdConfig {
    return {
        interFlag: 0, interId: TestIds.INTERSTITIAL,
        nativeFlag: 0, nativeId: TestIds.BANNER,
        bannerFlag: 0, bannerId: TestIds.BANNER,
    };
}

async function shouldShowInter(screen: string, flag: InterFlag): Promise<boolean> {
    if (flag === 0) return false;
    if (flag === 3) return true;
    if (flag === 1) {
        const shown = await AsyncStorage.getItem(SHOWN_LIFETIME_KEY(screen));
        return shown !== 'true';
    }
    if (flag === 2) {
        const lastDate = await AsyncStorage.getItem(SHOWN_DATE_KEY(screen));
        return lastDate !== new Date().toISOString().split('T')[0];
    }
    return false;
}

async function markInterShown(screen: string, flag: InterFlag): Promise<void> {
    if (flag === 1) await AsyncStorage.setItem(SHOWN_LIFETIME_KEY(screen), 'true');
    else if (flag === 2) await AsyncStorage.setItem(SHOWN_DATE_KEY(screen), new Date().toISOString().split('T')[0]);
}

export async function showInterstitialAd(screen: string, onClosed?: () => void): Promise<void> {
    const config = getScreenAdConfig(screen);
    const should = await shouldShowInter(screen, config.interFlag);
    if (!should) { onClosed?.(); return; }

    const ad = InterstitialAd.createForAdRequest(config.interId, {
        requestNonPersonalizedAdsOnly: true,
    });

    let done = false;
    const finish = () => {
        if (done) return;
        done = true;
        cleanup();
        onClosed?.();
    };

    const unsubLoad = ad.addAdEventListener(AdEventType.LOADED, () => {
        clearTimeout(loadTimeout);
        AdEvents.interShown(screen);
        try { ad.show(); } catch { finish(); }
    });

    const unsubClose = ad.addAdEventListener(AdEventType.CLOSED, () => {
        markInterShown(screen, config.interFlag);
        AdEvents.interClosed(screen);
        finish();
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, (e) => {
        console.log('[AdService] interstitial error:', e);
        AdEvents.interFailed(screen);
        clearTimeout(loadTimeout);
        finish();
    });

    const cleanup = () => { unsubLoad(); unsubClose(); unsubError(); };
    const loadTimeout = setTimeout(() => {
        console.log('[AdService] load timeout, skipping ad');
        finish();
    }, 5000);

    ad.load();
}