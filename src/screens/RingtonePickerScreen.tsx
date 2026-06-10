// src/screens/RingtonePickerScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import TrackPlayer, { RepeatMode, Capability } from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';

export const TONES = ['Fine Day', 'Classic', 'Radar', 'Beacon'];
export const DEFAULT_RINGTONE_KEY = '@default_ringtone';
export const DEFAULT_RINGTONE = 'Fine Day';

const TONE_MAP: Record<string, any> = {
    'Fine Day': require('../../assets/sounds/fine_day.mp3'),
    'Classic':  require('../../assets/sounds/classic.mp3'),
    'Radar':    require('../../assets/sounds/radar.mp3'),
    'Beacon':   require('../../assets/sounds/beacon.mp3'),
};

export async function loadDefaultRingtone(): Promise<string> {
    try {
        const saved = await AsyncStorage.getItem(DEFAULT_RINGTONE_KEY);
        return saved ?? DEFAULT_RINGTONE;
    } catch {
        return DEFAULT_RINGTONE;
    }
}

export async function saveDefaultRingtone(tone: string): Promise<void> {
    try {
        await AsyncStorage.setItem(DEFAULT_RINGTONE_KEY, tone);
    } catch {}
}

let playerReady = false;

async function ensurePlayer() {
    if (playerReady) return;
    try {
        await TrackPlayer.setupPlayer();
        await TrackPlayer.updateOptions({
            capabilities: [Capability.Play, Capability.Stop],
            compactCapabilities: [Capability.Play, Capability.Stop],
        });
        playerReady = true;
    } catch {
        playerReady = true;
    }
}

export async function playPreview(toneName: string) {
    try {
        await ensurePlayer();
        await TrackPlayer.reset();
        await TrackPlayer.add({
            id: toneName,
            url: TONE_MAP[toneName] ?? TONE_MAP[DEFAULT_RINGTONE],
            title: toneName,
            artist: 'Alarm Preview',
        });
        await TrackPlayer.setRepeatMode(RepeatMode.Off);
        await TrackPlayer.play();
    } catch (e) {
        console.log('Preview error:', e);
    }
}

export async function stopPreview() {
    try {
        await TrackPlayer.stop();
        await TrackPlayer.reset();
    } catch {}
}

function Toggle({
    value,
    onChange,
    primary,
}: {
    value: boolean;
    onChange: (v: boolean) => void;
    primary: string;
}) {
    const anim = React.useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
        Animated.spring(anim, {
            toValue: value ? 1 : 0,
            useNativeDriver: false,
            bounciness: 6,
        }).start();
    }, [value]);

    return (
        <TouchableOpacity onPress={() => onChange(!value)} activeOpacity={0.85}>
            <Animated.View
                style={[
                    tog.track,
                    {
                        backgroundColor: anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['#3A3A4A', primary],
                        }),
                    },
                ]}
            >
                <Animated.View
                    style={[
                        tog.thumb,
                        {
                            transform: [
                                {
                                    translateX: anim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [2, 22],
                                    }),
                                },
                            ],
                        },
                    ]}
                />
            </Animated.View>
        </TouchableOpacity>
    );
}

const tog = StyleSheet.create({
    track: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center' },
    thumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFF',
        position: 'absolute',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
});

interface RingtonePickerScreenProps {
    selected?: string;
    onSelect?: (tone: string) => void;
    onBack?: () => void;
    onSave?: () => void;
    colors?: any;
    navigation?: any;
}

export default function RingtonePickerScreen({
    selected,
    onSelect,
    onBack,
    onSave,
    colors: colorsProp,
    navigation,
}: RingtonePickerScreenProps) {
    const ins = useSafeAreaInsets();
    const { t } = useTranslation();
    const { colors: themeColors } = useTheme();

    const colors = colorsProp ?? themeColors;
    const [localSelected, setLocalSelected] = useState<string>(selected ?? DEFAULT_RINGTONE);
    const [playingTone, setPlayingTone] = useState<string | null>(null);
    const isNavigatorMode = !onBack;

    useEffect(() => {
        if (isNavigatorMode) {
            loadDefaultRingtone().then(tone => setLocalSelected(tone));
        }
        return () => { stopPreview(); };
    }, []);

    const handleTonePress = async (tone: string) => {
        setLocalSelected(tone);
        onSelect?.(tone);

        if (playingTone === tone) {
            await stopPreview();
            setPlayingTone(null);
        } else {
            await stopPreview();
            await playPreview(tone);
            setPlayingTone(tone);
        }
    };

    const handleSave = async () => {
        await stopPreview();
        if (isNavigatorMode) {
            await saveDefaultRingtone(localSelected);
            navigation?.goBack();
        } else {
            onSave?.();
        }
    };

    const handleBack = () => {
        stopPreview();
        if (isNavigatorMode) {
            navigation?.goBack();
        } else {
            onBack?.();
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: ins.top }}>
            {/* Header */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 18,
                paddingVertical: 14,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity onPress={handleBack} style={Sn.closeBtn} activeOpacity={0.7}>
                        <View style={[Sn.closeBtnCircle, { backgroundColor: colors.surface }]}>
                            <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
                        </View>
                    </TouchableOpacity>
                    <Text style={[Sn.hdrTitle, { color: colors.text }]}>{t('alarmSound')}</Text>
                </View>

                <TouchableOpacity
                    onPress={handleSave}
                    style={[Sn.saveBtn, {
                        backgroundColor: colors.primary + '18',
                        paddingHorizontal: 20,
                        paddingVertical: 8,
                        borderColor: colors.primary + '44',
                    }]}
                >
                    <Text style={[Sn.saveTxt, { fontSize: 15, fontWeight: '700', color: colors.primary }]}>
                        {t('save')}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={{
                marginHorizontal: 16,
                marginBottom: 16,
                backgroundColor: colors.surface,
                borderRadius: 16,
                borderWidth: 0.5,
                borderColor: colors.border,
                paddingHorizontal: 18,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
            }}>
                <Text style={{ fontSize: 20, marginRight: 12 }}>🎵</Text>
                <Text style={{ flex: 1, fontSize: 16, fontWeight: '500', color: colors.text }}>
                    {t('alarmSound')}
                </Text>
                <Toggle value={true} onChange={() => {}} primary={colors.primary} />
            </View>

            <View style={{
                marginHorizontal: 16,
                backgroundColor: colors.surface,
                borderRadius: 16,
                borderWidth: 0.5,
                borderColor: colors.border,
                overflow: 'hidden',
            }}>
                <FlatList
                    data={TONES}
                    keyExtractor={(item) => item}
                    scrollEnabled={true}
                    renderItem={({ item: tone, index }) => {
                        const isSelected = localSelected === tone;
                        const isPlaying = playingTone === tone;
                        const isLast = index === TONES.length - 1;

                        return (
                            <TouchableOpacity
                                onPress={() => handleTonePress(tone)}
                                activeOpacity={0.6}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingHorizontal: 20,
                                    paddingVertical: 18,
                                    borderBottomWidth: isLast ? 0 : 0.5,
                                    borderBottomColor: colors.border + '55',
                                }}
                            >
                                <Text style={{
                                    flex: 1,
                                    fontSize: 16,
                                    fontWeight: isSelected ? '600' : '400',
                                    color: colors.text,
                                }}>
                                    {tone}
                                    {isPlaying && (
                                        <Text style={{ fontSize: 13, color: colors.primary }}>
                                            {'  ♪'}
                                        </Text>
                                    )}
                                </Text>

                                <View style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 13,
                                    borderWidth: isSelected ? 0 : 2,
                                    borderColor: colors.border,
                                    backgroundColor: isSelected ? colors.primary : 'transparent',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    {isSelected && (
                                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>✓</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>
        </View>
    );
}

const Sn = StyleSheet.create({
    closeBtn: { minWidth: 50, alignItems: 'flex-start', justifyContent: 'center' },
    closeBtnCircle: {
        width: 40,
        height: 40,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hdrTitle: { fontSize: 18, fontWeight: '700' },
    saveBtn: {
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
    },
    saveTxt: { fontSize: 15, fontWeight: '700' },
});