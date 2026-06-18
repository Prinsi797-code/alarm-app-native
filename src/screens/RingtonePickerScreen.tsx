// src/screens/RingtonePickerScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Animated,
    Alert,
    ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import TrackPlayer, { RepeatMode, Capability } from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { showInterstitialAd } from '../services/AdService';
export const TONES = ['Fine Day', 'Classic', 'Radar', 'Beacon', 'Einnt', 'Funny', 'Gunfire', 'Love'];
export const DEFAULT_RINGTONE_KEY = '@default_ringtone';
export const DEFAULT_RINGTONE = 'Fine Day';
import { launchImageLibrary } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import { CoinStore } from '../utils/CoinStore';
import AdBanner from '../components/AdBanner';
import RNFS from 'react-native-fs';


const TONE_MAP: Record<string, any> = {
    'Fine Day': require('../../assets/sounds/fine_day.mp3'),
    'Classic': require('../../assets/sounds/classic.mp3'),
    'Radar': require('../../assets/sounds/radar.mp3'),
    'Beacon': require('../../assets/sounds/beacon.mp3'),
    'Einnt': require('../../assets/sounds/einnt.mp3'),
    'Funny': require('../../assets/sounds/funny.mp3'),
    'Gunfire': require('../../assets/sounds/gunfire.mp3'),
    'Love': require('../../assets/sounds/love.mp3')
};

export const CUSTOM_TONES_KEY = '@custom_ringtones';

export async function loadDefaultRingtone(): Promise<string> {
    try {
        const saved = await AsyncStorage.getItem(DEFAULT_RINGTONE_KEY);
        return saved ?? DEFAULT_RINGTONE;
    } catch {
        return DEFAULT_RINGTONE;
    }
}

export async function loadCustomTones(): Promise<{ name: string; uri: string; bundleFileName?: string }[]> {
    try {
        const raw = await AsyncStorage.getItem(CUSTOM_TONES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

export async function saveCustomTones(tones: { name: string; uri: string; bundleFileName?: string }[]): Promise<void> {
    try { await AsyncStorage.setItem(CUSTOM_TONES_KEY, JSON.stringify(tones)); } catch { }
}

export async function saveDefaultRingtone(tone: string): Promise<void> {
    try {
        await AsyncStorage.setItem(DEFAULT_RINGTONE_KEY, tone);
    } catch { }
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
    } catch { }
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

    const [customTones, setCustomTones] = useState<{ name: string; uri: string; bundleFileName?: string }[]>([]);
    const [pickingAudio, setPickingAudio] = useState(false);

    const [customSoundsUnlocked, setCustomSoundsUnlocked] = useState(false);
    const [customSoundsDaysLeft, setCustomSoundsDaysLeft] = useState(0);
    const [unlockingSound, setUnlockingSound] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleTonePress = async (tone: string, customUri?: string) => {
        setLocalSelected(tone);
        onSelect?.(tone);
        if (playingTone === tone) {
            await stopPreview();
            setPlayingTone(null);
        } else {
            await stopPreview();
            if (customUri) {
                try {
                    await ensurePlayer();
                    await TrackPlayer.reset();
                    await TrackPlayer.add({
                        id: tone,
                        url: customUri,
                        title: tone,
                        artist: 'Custom Ringtone',
                    });
                    await TrackPlayer.setRepeatMode(RepeatMode.Off);
                    await TrackPlayer.play();
                } catch (e) { console.log('Custom preview error:', e); }
            } else {
                await playPreview(tone);
            }
            setPlayingTone(tone);
        }
    };

    const handleUnlockCustomSounds = async () => {
        const coins = await CoinStore.getCoins();
        if (coins < 50) {
            Alert.alert(
                t('NotEnoughCoins'),
                `${t('need50coins')}${coins}.\n\n ${t('earnmore')}`
            );
            return;
        }
        Alert.alert(
            t('UnlockCustomSounds'),
            `${t('cost50coins')}\n${t('Unlockeddays')}\n${t('Balance')} ${coins} → ${coins - 50}`,
            [
                { text: t('Cancel'), style: ('cancel') },
                {
                    text: t('Unlock'),
                    onPress: async () => {
                        setUnlockingSound(true);
                        const res = await CoinStore.unlock(200);
                        if (res.success) {
                            Alert.alert(t('Unlocked'), t('soundsunlocked'));
                            setCustomSoundsUnlocked(true);
                            CoinStore.getDaysLeft(200).then(setCustomSoundsDaysLeft);
                        } else {
                            Alert.alert('Error', t('Pleasetryagain'));
                        }
                        setUnlockingSound(false);
                    },
                },
            ]
        );
    };

    useEffect(() => {
        loadCustomTones().then(setCustomTones);
        if (isNavigatorMode) {
            loadDefaultRingtone().then(tone => setLocalSelected(tone));
        }
        CoinStore.isUnlocked(200).then(setCustomSoundsUnlocked);
        CoinStore.getDaysLeft(200).then(setCustomSoundsDaysLeft);
        return () => { stopPreview(); };
    }, []);

    const handleSave = async () => {
        if (isLoading) return;
        setIsLoading(true);
        await stopPreview();
        showInterstitialAd('sound_screen', async () => {
            setIsLoading(false);
            if (isNavigatorMode) {
                await saveDefaultRingtone(localSelected);
                navigation?.goBack();
            } else {
                onSave?.();
            }
        });
    };


    const pickCustomAudio = async () => {
        if (customTones.length >= 5) return;
        try {
            setPickingAudio(true);
            const result = await DocumentPicker.pickSingle({
                type: [DocumentPicker.types.audio],
                copyTo: 'documentDirectory',
            });

            const sourceUri = result.fileCopyUri ?? result.uri;
            const rawName = result.name ?? `Custom ${customTones.length + 1}`;
            const name = rawName.replace(/\.[^/.]+$/, '');
            const destFileName = `alarm_custom_${Date.now()}.wav`;
            const destPath = `${RNFS.LibraryDirectoryPath}/${destFileName}`;

            await RNFS.copyFile(sourceUri, destPath);

            const newTones = [...customTones, {
                name,
                uri: sourceUri,
                bundleFileName: destFileName
            }];
            setCustomTones(newTones);
            await saveCustomTones(newTones);
            setLocalSelected(`custom_${customTones.length}`);
            onSelect?.(`custom_${customTones.length}`);
        } catch (e) {
            if (!DocumentPicker.isCancel(e)) console.log('Pick error:', e);
        } finally {
            setPickingAudio(false);
        }
    };

    const removeCustomTone = async (index: number) => {
        if (localSelected === `custom_${index}`) {
            setLocalSelected(DEFAULT_RINGTONE);
            onSelect?.(DEFAULT_RINGTONE);
        }
        await stopPreview();
        setPlayingTone(null);
        const updated = [...customTones];
        updated.splice(index, 1);
        setCustomTones(updated);
        await saveCustomTones(updated);
    };


    const handleBack = () => {
        if (isLoading) return;
        setIsLoading(true);
        stopPreview();
        showInterstitialAd('sound_screen', () => {
            setIsLoading(false);
            if (isNavigatorMode) navigation?.goBack();
            else onBack?.();
        });
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
                position: 'relative',
            }}>
                {/* <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}> */}
                <TouchableOpacity onPress={handleBack} style={Sn.closeBtn} activeOpacity={isLoading ? 1 : 0.7} disabled={isLoading}>
                    <View style={[Sn.closeBtnCircle, { backgroundColor: colors.surface }]}>
                        <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
                    </View>
                </TouchableOpacity>
                <Text style={[Sn.hdrTitle, { color: colors.text }]}>{t('alarmSound')}</Text>
                {/* </View> */}
                <TouchableOpacity
                    onPress={handleSave}
                    style={[Sn.saveBtn, {
                        backgroundColor: colors.primary + '18',
                        paddingHorizontal: 20,
                        paddingVertical: 8,
                        borderColor: colors.primary + '44',
                        opacity: isLoading ? 0.5 : 1
                    }]}
                >
                    <Text style={[Sn.saveTxt, { fontSize: 15, fontWeight: '700', color: colors.primary }]}>
                        {t('save')}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: ins.bottom + 40 }}
            >
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
                    <Toggle value={true} onChange={() => { }} primary={colors.primary} />
                </View>

                <View style={{
                    marginHorizontal: 16,
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    borderWidth: 0.5,
                    borderColor: colors.border,
                    overflow: 'hidden',
                }}>
                    {TONES.map((tone, index) => {
                        const isSelected = localSelected === tone;
                        const isPlaying = playingTone === tone;
                        const isLast = index === TONES.length - 1;
                        return (
                            <TouchableOpacity
                                key={tone}
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
                                    width: 26, height: 26, borderRadius: 13,
                                    borderWidth: isSelected ? 0 : 2,
                                    borderColor: colors.border,
                                    backgroundColor: isSelected ? colors.primary : 'transparent',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {isSelected && (
                                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>✓</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={{
                    marginHorizontal: 16,
                    marginTop: 12,
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    borderWidth: 0.5,
                    borderColor: colors.border,
                    overflow: 'hidden',
                }}>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 20, paddingVertical: 14,
                        borderBottomWidth: customSoundsUnlocked && customTones.length > 0 ? 0.5 : 0,
                        borderBottomColor: colors.border + '55',
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Text style={{ fontSize: 18 }}>🎵</Text>
                            <View>
                                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
                                    {t('CustomSounds')}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 1 }}>
                                    {customSoundsUnlocked
                                        ? `${customTones.length}/5 ${t('added')} · ${customSoundsDaysLeft}d left`
                                        : t('coinsFor15days')}
                                </Text>
                            </View>
                        </View>

                        {!customSoundsUnlocked ? (
                            <TouchableOpacity
                                onPress={handleUnlockCustomSounds}
                                disabled={unlockingSound}
                                activeOpacity={0.7}
                                style={{
                                    flexDirection: 'row', alignItems: 'center', gap: 6,
                                    paddingHorizontal: 14, paddingVertical: 8,
                                    backgroundColor: colors.primary + '18',
                                    borderRadius: 20, borderWidth: 1, borderColor: colors.primary + '44',
                                }}
                            >
                                <Text style={{ fontSize: 14 }}>🔒</Text>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                                    50 Unlock
                                </Text>
                            </TouchableOpacity>
                        ) : customTones.length < 5 ? (
                            <TouchableOpacity
                                onPress={pickCustomAudio}
                                disabled={pickingAudio}
                                activeOpacity={0.7}
                                style={{
                                    flexDirection: 'row', alignItems: 'center', gap: 6,
                                    paddingHorizontal: 14, paddingVertical: 8,
                                    backgroundColor: colors.primary + '18',
                                    borderRadius: 20, borderWidth: 1, borderColor: colors.primary + '44',
                                }}
                            >
                                <Ionicons name="add" size={16} color={colors.primary} />
                                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                                    {pickingAudio ? t('Picking') : t('Add')}
                                </Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    {!customSoundsUnlocked ? (
                        <View style={{ paddingVertical: 24, alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 28 }}>🔒</Text>
                            <Text style={{ fontSize: 13, color: colors.textTertiary }}>
                                {t('Unlocktoadd')}
                            </Text>
                        </View>
                    ) : customTones.length === 0 ? (
                        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, color: colors.textTertiary }}>
                                {t('audiofiles')}
                            </Text>
                        </View>
                    ) : (
                        customTones.map((ct, index) => {
                            const toneKey = `custom_${index}`;
                            const isSelected = localSelected === toneKey;
                            const isPlaying = playingTone === toneKey;
                            const isLast = index === customTones.length - 1;
                            return (
                                <View key={`custom_tone_${index}`} style={{
                                    flexDirection: 'row', alignItems: 'center',
                                    paddingHorizontal: 20, paddingVertical: 16,
                                    borderBottomWidth: isLast ? 0 : 0.5,
                                    borderBottomColor: colors.border + '55',
                                }}>
                                    <TouchableOpacity
                                        onPress={() => handleTonePress(toneKey, ct.uri)}
                                        activeOpacity={0.6}
                                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                                    >
                                        <View style={{
                                            width: 36, height: 36, borderRadius: 18,
                                            backgroundColor: isSelected ? colors.primary + '22' : colors.border + '44',
                                            alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Ionicons
                                                name={isPlaying ? 'pause' : 'play'}
                                                size={16}
                                                color={isSelected ? colors.primary : colors.textSecondary}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{
                                                fontSize: 15,
                                                fontWeight: isSelected ? '600' : '400',
                                                color: colors.text,
                                            }} numberOfLines={1}>
                                                {ct.name}
                                                {isPlaying && (
                                                    <Text style={{ fontSize: 13, color: colors.primary }}> ♪</Text>
                                                )}
                                            </Text>
                                            <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
                                                {t('custom')} {index + 1}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    <View style={{
                                        width: 26, height: 26, borderRadius: 13,
                                        borderWidth: isSelected ? 0 : 2,
                                        borderColor: colors.border,
                                        backgroundColor: isSelected ? colors.primary : 'transparent',
                                        alignItems: 'center', justifyContent: 'center',
                                        marginRight: 12,
                                    }}>
                                        {isSelected && (
                                            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>✓</Text>
                                        )}
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => removeCustomTone(index)}
                                        style={{
                                            width: 30, height: 30, borderRadius: 15,
                                            backgroundColor: 'rgba(255,59,48,0.12)',
                                            borderWidth: 1, borderColor: 'rgba(255,59,48,0.25)',
                                            alignItems: 'center', justifyContent: 'center',
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="trash-outline" size={14} color="#FF3B30" />
                                    </TouchableOpacity>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
            <View style={Sn.stickyAdContainer}>
                <AdBanner screen="sound_screen" />
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
    stickyAdContainer: {
        position: 'absolute',
        bottom: 12,
        width: '100%',
        alignItems: 'center',
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