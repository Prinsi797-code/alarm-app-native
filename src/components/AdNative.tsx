// src/components/AdNative.tsx
import React, { useState, useEffect } from 'react';
import { View, AppState } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { getScreenAdConfig } from '../services/AdService';

interface Props {
    screen: string;
    colors: any;
}

export default function AdNative({ screen, colors }: Props) {
    const [config, setConfig] = useState(() => getScreenAdConfig(screen));

    useEffect(() => {
        setConfig(getScreenAdConfig(screen));

        const sub = AppState.addEventListener('change', async (state) => {
            if (state === 'active') {
                await new Promise(res => setTimeout(res, 1000));
                setConfig(getScreenAdConfig(screen));
            }
        });
        return () => sub.remove();
    }, [screen]);

    if (config.nativeFlag === 0) return null;

    return (
        <View style={{ alignItems: 'center', width: '100%', marginVertical: 10 }}>
            <BannerAd
                key={`${config.nativeId}-${config.nativeFlag}`}
                unitId={config.nativeId}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                onAdLoaded={() => console.log('[AdNative] loaded')}
                onAdFailedToLoad={(e) =>
                    console.log('[AdNative] failed:', e.message)
                }
                requestOptions={{ requestNonPersonalizedAdsOnly: true }}
            />
        </View>
    );
}