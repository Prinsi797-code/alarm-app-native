import analytics from '@react-native-firebase/analytics';

export async function logScreen(screenName: string): Promise<void> {
    try {
        await analytics().logScreenView({
            screen_name: screenName,
            screen_class: screenName,
        });
        await analytics().logEvent('page_view', {
            page_title: screenName,
            page_location: screenName,
        });
    } catch (e) {
        console.log('[Analytics] logScreen error:', e);
    }
}

export async function logEvent(event: string, params?: Record<string, any>): Promise<void> {
    try {
        await analytics().logEvent(event, params);
    } catch (e) {
        console.log('[Analytics] logEvent error:', e);
    }
}


export const AlarmEvents = {
    alarmCreated: (ringtone: string) => logEvent('alarm_created', { ringtone }),
    alarmEdited: () => logEvent('alarm_edited'),
    alarmDeleted: () => logEvent('alarm_deleted'),
    alarmToggled: (enabled: boolean) => logEvent('alarm_toggled', { enabled }),
    missionEnabled: (difficulty: string, count: number) => logEvent('mission_enabled', { difficulty, count }),
};

export const AdEvents = {
    interShown: (screen: string) => logEvent('ad_inter_shown', { screen }),
    interClosed: (screen: string) => logEvent('ad_inter_closed', { screen }),
    interFailed: (screen: string) => logEvent('ad_inter_failed', { screen }),
    bannerShown: (screen: string) => logEvent('ad_banner_shown', { screen }),
};

export const CoinEvents = {
    earned: (source: string, amount: number) => logEvent('coin_earned', { source, amount }),
    spent: (item: string, amount: number) => logEvent('coin_spent', { item, amount }),
    unlocked: (item: string) => logEvent('coin_unlocked', { item }),
};

export async function setUserProperty(key: string, value: string): Promise<void> {
    try {
        await analytics().setUserProperty(key, value);
    } catch (e) {
        console.log('[Analytics] setUserProperty error:', e);
    }
}