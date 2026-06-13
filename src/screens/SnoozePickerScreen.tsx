// src/screens/SnoozePickerScreen.tsx

import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, TouchableOpacity,
    View, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { showInterstitialAd } from '../services/AdService';
import AdNative from '../components/AdNative';

export const SNOOZE_OPTS = [5, 10, 15, 30, 60];
export const CUSTOM_SNOOZE = -1;
export const DEFAULT_SNOOZE = 10;
export const SNOOZE_STORAGE_KEY = '@default_snooze_minutes';

const IH = 50;
const p2 = (n: number) => String(n).padStart(2, '0');

export async function loadDefaultSnooze(): Promise<number> {
    try {
        const val = await AsyncStorage.getItem(SNOOZE_STORAGE_KEY);
        return val ? parseInt(val, 10) : DEFAULT_SNOOZE;
    } catch {
        return DEFAULT_SNOOZE;
    }
}

export async function saveDefaultSnooze(mins: number): Promise<void> {
    try {
        await AsyncStorage.setItem(SNOOZE_STORAGE_KEY, String(mins));
    } catch { }
}

function Drum({ vals, sel, onChange, w = 90, colors, fontSize = 30 }: {
    vals: string[]; sel: number; onChange: (i: number) => void;
    w?: number; colors: any; fontSize?: number;
}) {
    const ref = React.useRef<ScrollView>(null);
    React.useEffect(() => {
        ref.current?.scrollTo({ y: sel * IH, animated: false });
    }, []);
    return (
        <View style={{ width: w, height: IH * 3, overflow: 'hidden' }}>
            <View style={[drum.sel, { top: IH, borderColor: colors.primary + '60' }]} pointerEvents="none" />
            <ScrollView
                ref={ref}
                showsVerticalScrollIndicator={false}
                snapToInterval={IH}
                decelerationRate="fast"
                contentContainerStyle={{ paddingVertical: IH }}
                onMomentumScrollEnd={e => {
                    const i = Math.round(e.nativeEvent.contentOffset.y / IH);
                    onChange(Math.max(0, Math.min(vals.length - 1, i)));
                }}
            >
                {vals.map((v, i) => (
                    <View key={i} style={[drum.item, { width: w }]}>
                        <Text style={[
                            drum.text,
                            { fontSize, color: i === sel ? colors.text : colors.textTertiary },
                            i === sel && drum.textSel,
                        ]}>{v}</Text>
                    </View>
                ))}
            </ScrollView>
            <View style={[drum.fade, { top: 0, backgroundColor: colors.surface + 'EE' }]} pointerEvents="none" />
            <View style={[drum.fade, { bottom: 0, backgroundColor: colors.surface + 'EE' }]} pointerEvents="none" />
        </View>
    );
}

const drum = StyleSheet.create({
    sel: { position: 'absolute', left: 4, right: 4, height: IH, borderTopWidth: 1, borderBottomWidth: 1, borderRadius: 8 },
    item: { height: IH, alignItems: 'center', justifyContent: 'center' },
    text: { fontWeight: '300', fontVariant: ['tabular-nums'] },
    textSel: { fontWeight: '600' },
    fade: { position: 'absolute', left: 0, right: 0, height: 44, zIndex: 2 },
});

type Props = {
    selected?: number;
    onSelect?: (mins: number) => void;
    onBack?: () => void;
    onSave?: () => void;
    colors?: any;
};

export default function SnoozePickerScreen(props: Props) {
    const ins = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { colors: themeColors } = useTheme();
    const colors = props.colors ?? themeColors;
    const { t } = useTranslation();
    const isNavMode = !props.onSelect;
    const [isLoading, setIsLoading] = useState(false);
    const [initDone, setInitDone] = useState(!isNavMode);
    const [initSelected, setInitSelected] = useState(props.selected ?? DEFAULT_SNOOZE);

    const snoozeLabel = (mins: number): string => {
        if (mins === 60) return t('snooze_1hr');
        return t('snooze_mins', { min: mins });
    };

    useEffect(() => {
        if (isNavMode) {
            loadDefaultSnooze().then(saved => {
                setInitSelected(saved);
                setInitDone(true);
            });
        }
    }, []);

    const isCustomInit = !SNOOZE_OPTS.includes(initSelected);
    const [localSelected, setLocalSelected] = useState<number>(
        isCustomInit ? CUSTOM_SNOOZE : initSelected
    );
    const [customMins, setCustomMins] = useState<number>(
        isCustomInit ? initSelected : 11
    );

    useEffect(() => {
        if (isNavMode && initDone) {
            const isC = !SNOOZE_OPTS.includes(initSelected);
            setLocalSelected(isC ? CUSTOM_SNOOZE : initSelected);
            if (isC) setCustomMins(initSelected);
        }
    }, [initDone, initSelected]);

    const MINS_VALS = Array.from({ length: 59 }, (_, i) => p2(i + 1));

    const handleSelect = (val: number) => {
        setLocalSelected(val);
        if (val !== CUSTOM_SNOOZE) props.onSelect?.(val);
    };

    // ── Back: show interstitial, then go back ──────────────────────────────
    const handleBack = () => {
        if (isLoading) return;
        setIsLoading(true);
        showInterstitialAd('snooze_screen', () => {
            setIsLoading(false);
            if (props.onBack) props.onBack();
            else navigation.goBack();
        });
    };

    const handleSave = async () => {
        if (isLoading) return;
        setIsLoading(true);
        const finalMins = localSelected === CUSTOM_SNOOZE ? customMins : localSelected;

        if (isNavMode) {
            await saveDefaultSnooze(finalMins);
            showInterstitialAd('snooze_screen', () => {
                setIsLoading(false);
                navigation.goBack();
            });
        } else {
            props.onSelect?.(finalMins);
            showInterstitialAd('snooze_screen', () => {
                setIsLoading(false);
                props.onSave?.();
            });
        }
    };


    if (!initDone) return (
        <View style={{ flex: 1, backgroundColor: colors.background }} />
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: ins.top }}>
            {/* Header */}
            <View style={S.hdr}>
                {/* <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}> */}
                    <TouchableOpacity onPress={handleBack} style={S.closeBtn} activeOpacity={isLoading ? 1 : 0.7} disabled={isLoading}>
                        <View style={[S.closeBtnCircle, { backgroundColor: colors.surface }]}>
                            <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
                        </View>
                    </TouchableOpacity>
                    <Text style={[S.hdrTitle, { color: colors.text }]}>{t('snooze')}</Text>
                {/* </View> */}
                <TouchableOpacity
                    onPress={handleSave}
                    style={[S.saveBtn, {
                        backgroundColor: colors.primary + '18',
                        borderColor: colors.primary + '44',
                        opacity: isLoading ? 0.5 : 1,
                    }]}
                >
                    <Text style={[S.saveTxt, { color: colors.primary }]}>{t('save')}</Text>
                </TouchableOpacity>
            </View>

            {/* Options list */}
            <View style={[S.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {SNOOZE_OPTS.map((mins, index) => {
                    const isSelected = localSelected === mins;
                    const isLast = index === SNOOZE_OPTS.length - 1;
                    return (
                        <TouchableOpacity
                            key={mins}
                            onPress={() => handleSelect(mins)}
                            activeOpacity={0.6}
                            style={[
                                S.optionRow,
                                !isLast && { borderBottomWidth: 0.5, borderBottomColor: colors.border + '55' },
                            ]}
                        >
                            <Text style={[S.optionTxt, { color: colors.text, fontWeight: isSelected ? '600' : '400' }]}>
                                {snoozeLabel(mins)}
                            </Text>
                            <View style={[S.radio, {
                                borderWidth: isSelected ? 0 : 2,
                                borderColor: colors.border,
                                backgroundColor: isSelected ? colors.primary : 'transparent',
                            }]}>
                                {isSelected && <Text style={S.checkmark}>✓</Text>}
                            </View>
                        </TouchableOpacity>
                    );
                })}

                {/* Custom option */}
                <TouchableOpacity
                    onPress={() => handleSelect(CUSTOM_SNOOZE)}
                    activeOpacity={0.6}
                    style={S.optionRow}
                >
                    <Text style={[S.optionTxt, {
                        color: colors.text,
                        fontWeight: localSelected === CUSTOM_SNOOZE ? '600' : '400',
                    }]}>
                        {t('custom')}
                    </Text>
                    <View style={[S.radio, {
                        borderWidth: localSelected === CUSTOM_SNOOZE ? 0 : 2,
                        borderColor: colors.border,
                        backgroundColor: localSelected === CUSTOM_SNOOZE ? colors.primary : 'transparent',
                    }]}>
                        {localSelected === CUSTOM_SNOOZE && <Text style={S.checkmark}>✓</Text>}
                    </View>
                </TouchableOpacity>
            </View>

            {/* Custom drum picker */}
            {localSelected === CUSTOM_SNOOZE && (
                <View style={[S.drumCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Drum
                        vals={MINS_VALS}
                        sel={customMins - 1}
                        onChange={i => {
                            const val = i + 1;
                            setCustomMins(val);
                            props.onSelect?.(val);
                        }}
                        w={80}
                        colors={colors}
                        fontSize={30}
                    />
                    <Text style={[S.drumLabel, { color: colors.textSecondary }]}>{t('minutes')}</Text>
                </View>
            )}

            {/* Native ad — bottom */}

            <View style={S.stickyAdContainer}>
                <AdNative screen="snooze_screen" colors={colors} />
            </View>
        </View>

    );
}

const S = StyleSheet.create({
    hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, position: 'relative' },
    closeBtn: { minWidth: 50, alignItems: 'flex-start', justifyContent: 'center' },
    closeBtnCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    hdrTitle: { fontSize: 18, fontWeight: '700' },
    saveBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    saveTxt: { fontSize: 15, fontWeight: '700' },
    listCard: { marginHorizontal: 16, borderRadius: 16, borderWidth: 0.5, overflow: 'hidden' },
    optionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18 },
    optionTxt: { flex: 1, fontSize: 16 },
    radio: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    checkmark: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    drumCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, borderWidth: 0.5, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
    drumLabel: { fontSize: 18, fontWeight: '500' },
    stickyAdContainer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        alignItems: 'center',
    },
});