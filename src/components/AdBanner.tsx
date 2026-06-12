// src/components/AdBanner.tsx
import React, { useState, useEffect } from 'react';
import { View, AppState } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { getScreenAdConfig } from '../services/AdService';

interface Props {
    screen: string;
}

export default function AdBanner({ screen }: Props) {
    const [config, setConfig] = useState(() => getScreenAdConfig(screen));

    useEffect(() => {
        setConfig(getScreenAdConfig(screen));

        const sub = AppState.addEventListener('change', async (state) => {
            if (state === 'active') {
                // Wait for initRemoteConfig() in App.tsx to finish first
                await new Promise(res => setTimeout(res, 1000));
                setConfig(getScreenAdConfig(screen));
            }
        });
        return () => sub.remove();
    }, [screen]);

    // Strict check — both falsy AND explicit 0
    if (!config.bannerFlag || config.bannerFlag === 0) return null;

    return (
        <View style={{ alignItems: 'center', width: '100%' }}>
            {/* key forces full remount when bannerId or flag changes */}
            <BannerAd
                key={`${config.bannerId}-${config.bannerFlag}`}
                unitId={config.bannerId}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                onAdLoaded={() => console.log('[AdBanner] loaded:', screen)}
                onAdFailedToLoad={(e) =>
                    console.log('[AdBanner] failed:', screen, e.message)
                }
                requestOptions={{ requestNonPersonalizedAdsOnly: true }}
            />
        </View>
    );
}