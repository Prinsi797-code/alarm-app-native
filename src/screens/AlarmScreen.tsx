// src/screens/AlarmScreen.tsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import SnoozePickerScreen from './SnoozePickerScreen';
import {
    Animated, Dimensions, FlatList, Image, Modal,
    Platform, ScrollView, StyleSheet, PanResponder,
    Text, TouchableOpacity, View, TextInput, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {
    AndroidImportance, AndroidVisibility, TriggerType, RepeatFrequency, AndroidLaunchActivityFlag,
} from '@notifee/react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { loadDefaultSnooze } from './SnoozePickerScreen';
import { loadDefaultVibrate } from './SettingsScreen';
import { useTranslation } from 'react-i18next';
import RingtonePickerScreen, { TONES, playPreview, stopPreview } from './RingtonePickerScreen';
import MathMissionScreen from '../screens/MathMissionScreen';
import { launchImageLibrary } from 'react-native-image-picker';
import { CoinStore } from '../utils/CoinStore';

const { width: SW, height: SH } = Dimensions.get('window');
const STORAGE_KEY = '@alarms_v3';
import TrackPlayer, {
    RepeatMode,
    Capability,
    State
} from 'react-native-track-player';
import Ionicons from 'react-native-vector-icons/Ionicons';

const BG_IMAGES = [
    require('../../assets/background/bg1.jpeg'),
    require('../../assets/background/bg2.jpeg'),
    require('../../assets/background/bg3.jpeg'),
    require('../../assets/background/bg4.jpeg'),
    require('../../assets/background/bg5.jpeg'),
    require('../../assets/background/bg6.jpeg'),
    require('../../assets/background/bg7.jpeg'),
    require('../../assets/background/bg8.jpeg'),
    require('../../assets/background/bg9.jpeg'),
];

const PREVIEW_IMAGES: Record<number, any> = {
    0: require('../../assets/preview/bg1.png'),
    1: require('../../assets/preview/bg2.png'),
    2: require('../../assets/preview/bg3.png'),
    3: require('../../assets/preview/bg4.png'),
    4: require('../../assets/preview/bg5.png'),
    5: require('../../assets/preview/bg6.png'),
    6: require('../../assets/preview/bg7.png'),
    7: require('../../assets/preview/bg8.png'),
    8: require('../../assets/preview/bg9.png'),
};

type Alarm = {
    id: string;
    hour: number;
    minute: number;
    label: string;
    days: number[];
    enabled: boolean;
    ringtone: string;
    snoozeMinutes: number;
    bgIndex: number;
    vibrate: boolean;
    specificDate?: string;
    mission?: {
        enabled: boolean;
        type: 'math';
        count: number;
        difficulty: 'Easy' | 'Medium' | 'Hard';
    };
    customBgUri?: string;
    customBgUris?: string[];
};

const DAY_S = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_F = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_F = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// const TONES = ['Fine Day', 'Classic', 'Radar', 'Beacon'];
// SNOOZE_OPTS update karo — Custom add karo
const SNOOZE_OPTS = [5, 10, 15, 30, 60];
const SNOOZE_LABELS: Record<number, string> = {
    5: '5 minutes',
    10: '10 minutes',
    15: '15 minutes',
    30: '30 minutes',
    60: '1 hour',
};
const CUSTOM_SNOOZE = -1;

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
    } catch (e) {
        playerReady = true;
    }
}

// async function playPreview(toneName: string) {
//     try {
//         await ensurePlayer();
//         await TrackPlayer.reset();
//         await TrackPlayer.add({
//             id: toneName,
//             url: TONE_MAP[toneName] ?? TONE_MAP['Fine Day'],
//             title: toneName,
//             artist: 'Alarm Preview',
//         });
//         await TrackPlayer.setRepeatMode(RepeatMode.Off);
//         await TrackPlayer.play();
//     } catch (e) {
//         console.log('Preview error:', e);
//     }
// }

// async function stopPreview() {
//     try {
//         await TrackPlayer.stop();
//         await TrackPlayer.reset();
//     } catch { }
// }

const p2 = (n: number) => String(n).padStart(2, '0');
const fmtT = (h: number, m: number) => ({
    disp: `${p2(h % 12 || 12)}:${p2(m)}`,
    per: h >= 12 ? 'PM' : 'AM',
});

async function askPermission() {
    await notifee.requestPermission();
    if (Platform.OS === 'android') {
        await notifee.createChannel({
            id: 'alarms', name: 'Alarms',
            importance: AndroidImportance.HIGH,
            visibility: AndroidVisibility.PUBLIC,
            sound: 'default', vibration: true,
        });
    }
}
function AlarmPreviewModal({ bgIndex, onClose }: { bgIndex: number; onClose: () => void }) {
    const ins = useSafeAreaInsets();
    return (
        <Modal visible animationType="fade" presentationStyle="fullScreen">
            <TouchableOpacity
                activeOpacity={1}
                onPress={onClose}
                style={{ flex: 1 }}
            >
                <Image
                    source={PREVIEW_IMAGES[bgIndex] ?? PREVIEW_IMAGES[0]}
                    style={{ flex: 1, width: '100%', height: '100%' }}
                    resizeMode="cover"
                />
            </TouchableOpacity>
        </Modal>
    );
}

async function scheduleAlarm(alarm: Alarm) {
    try { await notifee.cancelNotification(alarm.id); } catch { }
    if (!alarm.enabled) return;
    let fire: Date;
    if (alarm.specificDate) {
        fire = new Date(`${alarm.specificDate}T${p2(alarm.hour)}:${p2(alarm.minute)}:00`);
        if (fire <= new Date()) return;
    } else {
        fire = new Date();
        fire.setHours(alarm.hour, alarm.minute, 0, 0);
        if (fire <= new Date()) fire.setDate(fire.getDate() + 1);
    }
    const { disp, per } = fmtT(alarm.hour, alarm.minute);
    const TONE_IOS: Record<string, string> = {
        'Fine Day': 'fine_day.caf',
        'Classic': 'classic.caf',
        'Radar': 'radar.caf',
        'Beacon': 'beacon.caf',
        'Einnt': 'einnt.caf',
        'Funny': 'funny.caf',
        'Gunfire': 'gunfire.caf',
        'Love': 'love.caf'
    };
    const TONE_ANDROID: Record<string, string> = {
        'Fine Day': 'fine_day',
        'Classic': 'classic',
        'Radar': 'radar',
        'Beacon': 'beacon',
        'Einnt': 'einnt',
        'Funny': 'funny',
        'Gunfire': 'gunfire',
        'Love': 'love'
    };
    const iosSoundFile = TONE_IOS[alarm.ringtone] ?? 'fine_day.caf';
    const androidSoundFile = TONE_ANDROID[alarm.ringtone] ?? 'fine_day';

    await notifee.createTriggerNotification({
        id: alarm.id,
        title: `⏰ ${alarm.label}`,
        body: `${disp} ${per}`,
        data: { alarmId: alarm.id },
        ios: {
            sound: TONE_IOS[alarm.ringtone] ?? 'fine_day.caf',
            critical: false,
            interruptionLevel: 'timeSensitive',
            foregroundPresentationOptions: {
                alert: true,
                sound: true,
                banner: true,
            },
        },
    }, {
        type: TriggerType.TIMESTAMP,
        timestamp: fire.getTime(),
    });
}

const loadAlarms = async (): Promise<Alarm[]> => {
    try { const r = await AsyncStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : []; }
    catch { return []; }
};
const saveAlarms = (a: Alarm[]) => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(a));

function Toggle({ value, onChange, primary }: { value: boolean; onChange: (v: boolean) => void; primary: string }) {
    const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
    useEffect(() => {
        Animated.spring(anim, { toValue: value ? 1 : 0, useNativeDriver: false, bounciness: 6 }).start();
    }, [value]);
    return (
        <TouchableOpacity onPress={() => onChange(!value)} activeOpacity={0.85}>
            <Animated.View style={[tog.track, {
                backgroundColor: anim.interpolate({ inputRange: [0, 1], outputRange: ['#3A3A4A', primary] })
            }]}>
                <Animated.View style={[tog.thumb, {
                    transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] }) }]
                }]} />
            </Animated.View>
        </TouchableOpacity>
    );
}
const tog = StyleSheet.create({
    track: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center' },
    thumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF', position: 'absolute', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
});

const IH = 50;
function Drum({ vals, sel, onChange, w = 90, colors, fontSize = 30 }: {
    vals: string[]; sel: number; onChange: (i: number) => void; w?: number; colors: any; fontSize?: number;
}) {
    const ref = useRef<ScrollView>(null);
    useEffect(() => { ref.current?.scrollTo({ y: sel * IH, animated: false }); }, []);
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
    sel: {
        position: 'absolute', left: 4, right: 4, height: IH,
        borderTopWidth: 1, borderBottomWidth: 1, borderRadius: 8,
    },
    item: { height: IH, alignItems: 'center', justifyContent: 'center' },
    text: { fontWeight: '300', fontVariant: ['tabular-nums'] },
    textSel: { fontWeight: '600' },
    fade: { position: 'absolute', left: 0, right: 0, height: 44, zIndex: 2 },
});

function CalendarPicker({
    selectedDays,
    specificDate,
    onSelectDate,
    onClose,
    colors,
}: {
    selectedDays: number[];
    specificDate?: string;
    onSelectDate: (date: string | undefined) => void;
    onClose: () => void;
    colors: any;
}) {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const todayStr = `${today.getFullYear()}-${p2(today.getMonth() + 1)}-${p2(today.getDate())}`;
    const cellDate = (day: number) => `${viewYear}-${p2(viewMonth + 1)}-${p2(day)}`;
    const isSelectedDate = (day: number) => cellDate(day) === specificDate;
    const isWeekdayActive = (day: number) => {
        const dow = new Date(viewYear, viewMonth, day).getDay();
        return selectedDays.includes(dow);
    };
    const isToday = (day: number) => cellDate(day) === todayStr;
    const { t } = useTranslation();
    const isPast = (day: number) => {
        const d = new Date(viewYear, viewMonth, day);
        d.setHours(23, 59, 59);
        return d < today;
    };
    const handleDayPress = (day: number) => {
        if (isPast(day)) return;
        const ds = cellDate(day);
        onSelectDate(specificDate === ds ? undefined : ds);
    };

    return (
        <View style={{
            marginHorizontal: 16, marginTop: 10,
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderWidth: 0.5,
            borderColor: colors.border,
            overflow: 'hidden',
        }}>
            {/* Header */}
            <View style={{
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 14, paddingVertical: 10,
                borderBottomWidth: 0.5, borderBottomColor: colors.border,
            }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                    {t('selectDate')}
                </Text>
                <TouchableOpacity
                    onPress={onClose}
                    style={{
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: colors.border + '55',
                        alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <Ionicons name="close" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={{
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'center', gap: 16,
                paddingHorizontal: 14, paddingVertical: 10,
            }}>
                <TouchableOpacity
                    onPress={prevMonth}
                    style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: colors.border + '44',
                        alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <Ionicons name="chevron-back" size={16} color={colors.text} />
                </TouchableOpacity>

                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                    {t(`months_full_${viewMonth}`)} {viewYear}
                </Text>

                <TouchableOpacity
                    onPress={nextMonth}
                    style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: colors.border + '44',
                        alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <Ionicons name="chevron-forward" size={16} color={colors.text} />
                </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', paddingHorizontal: 10, marginBottom: 4 }}>
                {DAY_S.map((d, i) => (
                    <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 2 }}>
                        <Text style={{
                            fontSize: 11, fontWeight: '700', letterSpacing: 0.5,
                            color: selectedDays.includes(i) ? colors.primary : colors.textTertiary,
                        }}>{t(`days_short_${i}`)}</Text>
                    </View>
                ))}
            </View>

            <View style={{ paddingHorizontal: 10, paddingBottom: 12 }}>
                {Array.from({ length: cells.length / 7 }, (_, rowIdx) => (
                    <View key={rowIdx} style={{ flexDirection: 'row', marginBottom: 2 }}>
                        {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
                            if (!day) return <View key={colIdx} style={{ flex: 1, height: 38 }} />;
                            const selected = isSelectedDate(day);
                            const weekdayActive = isWeekdayActive(day);
                            const todayCell = isToday(day);
                            const past = isPast(day);
                            return (
                                <TouchableOpacity
                                    key={colIdx}
                                    onPress={() => handleDayPress(day)}
                                    activeOpacity={past ? 1 : 0.7}
                                    style={{ flex: 1, height: 38, alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <View style={{
                                        width: 34, height: 34, borderRadius: 17,
                                        alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: selected
                                            ? colors.primary
                                            : weekdayActive && !past
                                                ? colors.primary + '20'
                                                : 'transparent',
                                        borderWidth: todayCell && !selected ? 1.5 : 0,
                                        borderColor: colors.primary,
                                    }}>
                                        <Text style={{
                                            fontSize: 13,
                                            fontWeight: selected || todayCell ? '700' : weekdayActive ? '600' : '400',
                                            color: selected
                                                ? '#FFFFFF'
                                                : past
                                                    ? colors.textTertiary + '60'
                                                    : weekdayActive
                                                        ? colors.primary
                                                        : colors.text,
                                        }}>{day}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
            </View>
        </View>
    );
}

function AnalogClock({ size = 200, colors }: { size?: number; colors: any }) {
    const secondAnim = useRef(new Animated.Value(0)).current;
    const minuteAnim = useRef(new Animated.Value(0)).current;
    const hourAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const tick = () => {
            const now = new Date();
            const s = now.getSeconds();
            const m = now.getMinutes() + s / 60;
            const h = (now.getHours() % 12) + m / 60;
            secondAnim.setValue(s / 60);
            minuteAnim.setValue(m / 60);
            hourAnim.setValue(h / 12);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    const rot = (a: Animated.Value) =>
        a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const cx = size / 2;

    const isDark = colors.isDark;
    const clockBg = isDark ? '#0A0A16' : '#FFFFFF';
    const handColor = isDark ? '#FFFFFF' : '#1A1A2E';
    const tickMajor = isDark ? 'rgba(255,255,255,0.50)' : 'rgba(26,26,46,0.35)';
    const tickMinor = isDark ? 'rgba(255,255,255,0.20)' : 'rgba(26,26,46,0.15)';
    const ringBorder = isDark ? 'rgba(101,99,255,0.25)' : 'rgba(101,99,255,0.12)';

    const glow = [
        { extra: 80, color: isDark ? '#161638' : '#efefff' },
        { extra: 54, color: isDark ? '#100E24' : '#EAE8FE' },
    ];
    return (
        <View style={{ width: size + 80, height: size + 80, alignItems: 'center', justifyContent: 'center' }}>
            {glow.map(({ extra, color }, idx) => (
                <View key={idx} style={{
                    position: 'absolute',
                    width: size + extra, height: size + extra,
                    backgroundColor: color,
                    borderRadius: (size + extra) / 2,
                }} />
            ))}
            <View style={{
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: clockBg,
                alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                shadowColor: isDark ? '#6563FF' : '#000',
                shadowOpacity: isDark ? 0.3 : 0.08,
                shadowRadius: isDark ? 20 : 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 8,
            }}>
                <View style={{
                    position: 'absolute',
                    width: size - 8, height: size - 8,
                    borderRadius: (size - 8) / 2,
                    borderWidth: 1, borderColor: ringBorder,
                }} />
                {[...Array(12)].map((_, i) => {
                    const angle = (i * 30 * Math.PI) / 180;
                    const r = cx - 16;
                    const x = cx + r * Math.sin(angle) - 2;
                    const y = cx - r * Math.cos(angle) - (i % 3 === 0 ? 5 : 3);
                    return (
                        <View key={i} style={{
                            position: 'absolute', left: x, top: y,
                            width: 4, height: i % 3 === 0 ? 10 : 5,
                            borderRadius: 2,
                            backgroundColor: i % 3 === 0 ? tickMajor : tickMinor,
                            transform: [{ rotate: `${i * 30}deg` }],
                        }} />
                    );
                })}
                <Animated.View style={{
                    position: 'absolute', bottom: cx, left: cx - 3,
                    width: 6, height: cx * 0.5, borderRadius: 3,
                    backgroundColor: handColor, transformOrigin: 'bottom',
                    transform: [{ rotate: rot(hourAnim) }],
                }} />
                <Animated.View style={{
                    position: 'absolute', bottom: cx, left: cx - 2,
                    width: 4, height: cx * 0.72, borderRadius: 2,
                    backgroundColor: handColor, transformOrigin: 'bottom',
                    transform: [{ rotate: rot(minuteAnim) }],
                }} />
                <Animated.View style={{
                    position: 'absolute', bottom: cx, left: cx - 1,
                    width: 2, height: cx * 0.78, borderRadius: 1,
                    backgroundColor: colors.primary, transformOrigin: 'bottom',
                    transform: [{ rotate: rot(secondAnim) }],
                }} />
                <View style={{
                    width: 12, height: 12, borderRadius: 6,
                    backgroundColor: colors.primary, position: 'absolute',
                    shadowColor: colors.primary, shadowOpacity: 0.8,
                    shadowRadius: 6, elevation: 4,
                }} />
            </View>
        </View>
    );
}

function DigitalClock({ colors }: { colors: any }) {
    const [now, setNow] = useState(new Date());
    const { t } = useTranslation();

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const h = now.getHours(), m = now.getMinutes();
    const { disp, per } = fmtT(h, m);

    return (
        <View style={{ alignItems: 'center', marginTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={{ fontSize: 44, fontWeight: '200', color: colors.text, letterSpacing: -1, fontVariant: ['tabular-nums'] }}>
                    {disp}
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '500', color: colors.textSecondary }}>
                    {t(per)}
                </Text>
            </View>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}>
                {now.getDate()} {t(`months_abbr_${now.getMonth()}`)}, {t(`days_full_${now.getDay()}`)}
            </Text>
        </View>
    );
}
const openCardRef = { current: null as ((() => void) | null) };
const REVEAL_WIDTH = 80;
const DELETE_WIDTH = 65;
const GAP = 8;

function AlarmCard({ item, onToggle, onPress, onDelete, colors }: {
    item: Alarm;
    onToggle: () => void;
    onPress: () => void;
    onDelete: () => void;
    colors: any;
}) {
    const translateX = useRef(new Animated.Value(0)).current;
    const deleteScale = useRef(new Animated.Value(0)).current;
    const isOpen = useRef(false);
    const { t } = useTranslation();
    const sc = useRef(new Animated.Value(1)).current;

    const { disp, per } = fmtT(item.hour, item.minute);
    const on = item.enabled;

    const daysStr = (days: number[], specificDate?: string): string => {
        if (specificDate) {
            const d = new Date(specificDate + 'T12:00:00');
            return `${t(`days_abbr_${d.getDay()}`)}, ${d.getDate()} ${t(`months_abbr_${d.getMonth()}`)}`;
        }
        if (!days.length) return t('once');
        if (days.length === 7) return t('everyDay');
        if (days.length === 5 && !days.includes(0) && !days.includes(6)) return t('weekdays');
        if (days.length === 2 && days.includes(0) && days.includes(6)) return t('weekend');
        return t('every') + ' ' + days.map(d => t(`days_abbr_${d}`)).join(', ');
    };

    const closeSwipe = useCallback(() => {
        isOpen.current = false;
        Animated.parallel([
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 6, speed: 14 }),
            Animated.timing(deleteScale, { toValue: 0, duration: 160, useNativeDriver: true }),
        ]).start();
    }, []);

    const getDaysLabel = (days: number[], specificDate?: string) => {
        const raw = daysStr(days, specificDate);
        const keyMap: Record<string, string> = {
            'once_key': t('once'),
            'everyDay_key': t('everyDay'),
            'weekdays_key': t('weekdays'),
            'weekend_key': t('weekend'),
        };
        return keyMap[raw] ?? raw;
    };

    const openSwipe = useCallback(() => {
        if (openCardRef.current && openCardRef.current !== closeSwipe) openCardRef.current();
        isOpen.current = true;
        openCardRef.current = closeSwipe;
        Animated.parallel([
            Animated.spring(translateX, { toValue: -REVEAL_WIDTH, useNativeDriver: true, bounciness: 4, speed: 14 }),
            Animated.spring(deleteScale, { toValue: 1, useNativeDriver: true, bounciness: 8 }),
        ]).start();
    }, [closeSwipe]);

    const startX = useRef(0);
    const lastDx = useRef(0);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2 && Math.abs(g.dy) < 10,
            onPanResponderGrant: () => {
                startX.current = (translateX as any)._value;
                lastDx.current = 0;
            },
            onPanResponderMove: (_, g) => {
                lastDx.current = g.dx;
                const next = Math.max(-REVEAL_WIDTH, Math.min(0, startX.current + g.dx));
                translateX.setValue(next);
                deleteScale.setValue(Math.abs(next) / REVEAL_WIDTH);
            },
            onPanResponderRelease: (_, g) => {
                if (g.vx < -0.1 || g.dx < 0 || lastDx.current < 0) {
                    if (openCardRef.current && openCardRef.current !== closeSwipe) openCardRef.current();
                    openSwipe();
                } else { closeSwipe(); }
            },
            onPanResponderTerminate: (_, g) => {
                if (lastDx.current < 0 || g?.vx < -0.1) openSwipe();
                else closeSwipe();
            },
        })
    ).current;

    const handleDelete = () => {
        Animated.timing(translateX, { toValue: -SW, duration: 220, useNativeDriver: true }).start(() => onDelete());
    };

    return (
        <View style={{ marginBottom: 12, borderRadius: 16, overflow: 'hidden' }}>
            <Animated.View style={{
                position: 'absolute', right: GAP, top: 4, bottom: 4,
                width: DELETE_WIDTH, marginLeft: 5,
                alignItems: 'center', justifyContent: 'center',
                borderRadius: 16, borderWidth: 1.5, borderColor: '#FF3B30',
                backgroundColor: 'transparent',
                opacity: deleteScale,
            }}>
                <TouchableOpacity
                    onPress={handleDelete} activeOpacity={0.75}
                    style={{ alignItems: 'center', justifyContent: 'center', flex: 1, width: '100%' }}
                >
                    <Animated.View style={{ transform: [{ scale: deleteScale }], alignItems: 'center' }}>
                        <Image
                            source={require('../../assets/icons/trash.png')}
                            style={{ width: 24, height: 24, tintColor: '#FF3B30' }}
                            resizeMode="contain"
                        />
                        <Text style={{ color: '#FF3B30', fontSize: 11, fontWeight: '700', marginTop: 4, letterSpacing: 0.2 }}>
                            {t('delete')}
                        </Text>
                    </Animated.View>
                </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
                <Animated.View style={{ transform: [{ scale: sc }] }}>
                    <TouchableOpacity
                        activeOpacity={1}
                        onPressIn={() => {
                            if (isOpen.current) return;
                            Animated.spring(sc, { toValue: 0.97, useNativeDriver: true, bounciness: 2 }).start();
                        }}
                        onPressOut={() =>
                            Animated.spring(sc, { toValue: 1, useNativeDriver: true, bounciness: 2 }).start()
                        }
                        onPress={() => {
                            if (isOpen.current) { closeSwipe(); return; }
                            onPress();
                        }}
                        style={[card.wrap, {
                            backgroundColor: colors.surface,
                            borderColor: colors.cardBorder,
                            opacity: on ? 1 : 0.55,
                            marginBottom: 0,
                        }]}
                    >
                        <Image style={card.bgStrip} resizeMode="cover" />
                        <View style={card.body}>
                            <View style={card.top}>
                                <View>
                                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                                        <Text style={[card.time, { color: on ? colors.text : colors.textTertiary }]}>
                                            {disp}
                                        </Text>
                                        <Text style={[card.per, { color: on ? colors.textSecondary : colors.textTertiary }]}>
                                            {per} · {item.label}
                                        </Text>
                                    </View>
                                    <Text style={[card.sub, { color: on ? colors.primary : colors.textTertiary }]}>
                                        <Text>{t(daysStr(item.days, item.specificDate))}</Text>
                                    </Text>
                                </View>
                                <Toggle value={on} onChange={onToggle} primary={colors.primary} />
                            </View>
                            {!item.specificDate && (
                                <View style={card.dots}>
                                    {DAY_S.map((l, i) => {
                                        const active = item.days.includes(i) && on;
                                        return (
                                            <View key={i} style={[card.dot, {
                                                backgroundColor: active ? colors.primary + '22' : colors.border + '44',
                                            }]}>
                                                <Text style={[card.dotTxt, {
                                                    color: active ? colors.primary : colors.textTertiary,
                                                    fontWeight: active ? '700' : '400',
                                                }]}>{l}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                            {item.specificDate && (
                                <View style={[card.dots, { justifyContent: 'flex-start' }]}>
                                    <View style={{
                                        paddingHorizontal: 10, paddingVertical: 4,
                                        backgroundColor: colors.primary + '18',
                                        borderRadius: 8, borderWidth: 1, borderColor: colors.primary + '44',
                                    }}>
                                        <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>
                                            📅 {t('oneTime')} · {daysStr([], item.specificDate)}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        </View>
    );
}

const card = StyleSheet.create({
    wrap: { borderRadius: 16, borderWidth: 0.5, overflow: 'hidden', marginBottom: 12 },
    bgStrip: { width: '100%', height: 6 },
    body: { padding: 14 },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    time: { fontSize: 42, fontWeight: '200', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
    per: { fontSize: 15, fontWeight: '500', marginBottom: 4 },
    sub: { fontSize: 13, fontWeight: '600', marginTop: 2 },
    dots: { flexDirection: 'row', gap: 5, marginTop: 12 },
    dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    dotTxt: { fontSize: 10 },
});

function EditScreen({ alarm, onSave, onDelete, onBack, onGoToCoins, colors }: {
    alarm: Alarm | null;
    onSave: (a: Alarm) => void;
    onDelete: (id: string) => void;
    onBack: () => void;
    onGoToCoins: () => void;
    colors: any;
}) {
    const ins = useSafeAreaInsets();
    const [showSnoozePicker, setShowSnoozePicker] = useState(false);
    const isNew = alarm === null;
    const [d, setD] = useState<Alarm>(alarm ?? {
        id: Date.now().toString(), hour: 7, minute: 0, label: 'New Alarm',
        days: [1, 2, 3, 4, 5], enabled: true, ringtone: 'Fine Day',
        snoozeMinutes: 5, bgIndex: 0,
        customBgUris: [],
        mission: { enabled: false, type: 'math', count: 1, difficulty: 'Easy' },
    });

    const CUSTOM_INDEX_START = 100;
    const isCustomIndex = (idx: number) => idx >= CUSTOM_INDEX_START;
    const getCustomSlot = (idx: number) => idx - CUSTOM_INDEX_START;
    const [unlockedItems, setUnlockedItems] = useState<number[]>([]);

    useEffect(() => {
        CoinStore.getUnlocked().then(list => {
            setUnlockedItems(list.map(u => u.bgIndex));
        });
    }, []);

    const pickCustomImage = () => {
        const uris = d.customBgUris ?? [];
        if (uris.length >= 3) return;

        launchImageLibrary(
            { mediaType: 'photo', quality: 0.8 },
            (response) => {
                if (response.didCancel || response.errorCode) return;
                const uri = response.assets?.[0]?.uri;
                if (!uri) return;
                const newUris = [...uris, uri];
                const newIndex = CUSTOM_INDEX_START + (newUris.length - 1);
                setD(x => ({ ...x, customBgUris: newUris, bgIndex: newIndex }));
            }
        );
    };

    const removeCustomImage = (slot: number) => {
        const uris = [...(d.customBgUris ?? [])];
        uris.splice(slot, 1);
        let newBgIndex = d.bgIndex;
        if (d.bgIndex === CUSTOM_INDEX_START + slot) {
            newBgIndex = 0;
        } else if (isCustomIndex(d.bgIndex) && getCustomSlot(d.bgIndex) > slot) {
            newBgIndex = d.bgIndex - 1;
        }
        setD(x => ({ ...x, customBgUris: uris, bgIndex: newBgIndex }));
    };


    const [showMission, setShowMission] = useState(false);
    const daysStr = (days: number[], specificDate?: string): string => {
        if (specificDate) {
            const d = new Date(specificDate + 'T12:00:00');
            return `${t(`days_abbr_${d.getDay()}`)}, ${d.getDate()} ${t(`months_abbr_${d.getMonth()}`)}`;
        }
        if (!days.length) return t('once');
        if (days.length === 7) return t('everyDay');
        if (days.length === 5 && !days.includes(0) && !days.includes(6)) return t('weekdays');
        if (days.length === 2 && days.includes(0) && days.includes(6)) return t('weekend');
        return t('every') + ' ' + days.map(d => t(`days_abbr_${d}`)).join(', ');
    };

    const [showRingtonePicker, setShowRingtonePicker] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const { t } = useTranslation();

    useEffect(() => { return () => { stopPreview(); }; }, []);

    const HOURS = Array.from({ length: 12 }, (_, i) => p2(i + 1));
    const MINS = Array.from({ length: 60 }, (_, i) => p2(i));
    // const AMPM = ['AM', 'PM'];
    const AMPM = [t('AM'), t('PM')];

    const h12 = d.hour % 12 || 12;
    const per = d.hour >= 12 ? 1 : 0;

    const setH = (idx: number) => {
        const h = idx + 1, isPM = d.hour >= 12;
        setD(x => ({ ...x, hour: isPM ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h) }));
    };
    const setP = (p: number) => setD(x => {
        const h = x.hour % 12 || 12;
        return { ...x, hour: p === 1 ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h) };
    });
    const togDay = (day: number) => setD(x => {
        if (x.specificDate) {
            return { ...x, days: [day], specificDate: undefined };
        }
        return {
            ...x,
            days: x.days.includes(day)
                ? x.days.filter(v => v !== day)
                : [...x.days, day].sort(),
        };
    });
    useEffect(() => {
        if (isNew) {
            loadDefaultSnooze().then(saved => {
                setD(x => ({ ...x, snoozeMinutes: saved }));
            });
            loadDefaultVibrate().then(saved => setD(x => ({ ...x, vibrate: saved })));
        }
    }, []);
    const now = new Date();
    let diffStr = '';
    if (d.specificDate) {
        const fire = new Date(`${d.specificDate}T${p2(d.hour)}:${p2(d.minute)}:00`);
        const mDiff = Math.round((fire.getTime() - now.getTime()) / 60000);
        if (mDiff <= 0) {
            diffStr = t('timePassed');
        } else {
            const hLeft = Math.floor(mDiff / 60), mnLeft = mDiff % 60;
            diffStr = hLeft === 0
                ? t('alarmInMin', { min: mnLeft })
                : mnLeft === 0
                    ? t('alarmInHr', { hr: hLeft })
                    : t('alarmInHrMin', { hr: hLeft, min: mnLeft });
        }
    } else {
        const mDiff = (d.hour * 60 + d.minute) - (now.getHours() * 60 + now.getMinutes());
        const mLeft = mDiff <= 0 ? mDiff + 1440 : mDiff;
        const hLeft = Math.floor(mLeft / 60), mnLeft = mLeft % 60;
        diffStr = hLeft === 0
            ? t('alarmInMin', { min: mnLeft })
            : mnLeft === 0
                ? t('alarmInHr', { hr: hLeft })
                : t('alarmInHrMin', { hr: hLeft, min: mnLeft });
    }

    const S = edit_styles(colors);

    const LOCKED_BG_INDICES = [0, 1, 4, 5];
    // const LOCKED_BG_INDICES = [0, 1, 2, 3];
    const isLocked = (idx: number) => {
        if (idx >= 100) return !unlockedItems.includes(100); // custom
        if (LOCKED_BG_INDICES.includes(idx)) return !unlockedItems.includes(idx);
        return false;
    };

    return (
        <View style={[S.root, { paddingTop: ins.top }]}>
            <View style={S.hdr}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity onPress={onBack} style={S.closeBtn} activeOpacity={0.7}>
                        <View style={S.closeBtnCircle}>
                            <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
                        </View>
                    </TouchableOpacity>
                    <Text style={S.hdrTitle}>{isNew ? t('createAlarm') : t('editAlarm')}</Text>
                </View>
                <TouchableOpacity onPress={() => onSave(d)} style={S.saveBtn}>
                    <Text style={S.saveTxt}>{t('save')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: ins.bottom + 48 }}>
                <View style={S.card}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <Image
                            source={require('../../assets/icons/alarm.png')}
                            style={{ width: 16, height: 16, tintColor: colors.textSecondary }}
                            resizeMode="contain"
                        />
                        <Text style={S.cardHdrTxt}>{t('alarmLabel')}</Text>
                    </View>

                    <TextInput
                        value={d.label}
                        onChangeText={text => setD(x => ({ ...x, label: text }))}
                        placeholder={t('newAlarm')}
                        placeholderTextColor={colors.textTertiary}
                        style={{
                            fontSize: 18,
                            fontWeight: '600',
                            color: colors.text,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                            paddingVertical: 8,
                            paddingHorizontal: 4,
                        }}
                        maxLength={30}
                        returnKeyType="done"
                    />
                </View>

                <View style={S.card}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <Image
                            source={require('../../assets/icons/calendar.png')}
                            style={{ width: 16, height: 16, tintColor: colors.textSecondary }}
                            resizeMode="contain"
                        />
                        <Text style={S.cardHdrTxt}>{t('selectTime')}</Text>
                    </View>

                    <View style={S.drumRow}>
                        <Drum vals={HOURS} sel={h12 - 1} onChange={setH} w={80} colors={colors} />

                        <View style={{ justifyContent: 'center', paddingBottom: 6, paddingHorizontal: 2 }}>
                            <Text style={S.colon}>:</Text>
                        </View>

                        <Drum vals={MINS} sel={d.minute} onChange={i => setD(x => ({ ...x, minute: i }))} w={80} colors={colors} />

                        <View style={{
                            width: 1, height: IH * 2, backgroundColor: colors.border + '60',
                            alignSelf: 'center', marginHorizontal: 6,
                        }} />

                        <Drum vals={AMPM} sel={per} onChange={setP} w={64} colors={colors} fontSize={18} />
                    </View>

                    <Text style={S.diffTxt}>{diffStr}</Text>
                </View>

                <View style={S.card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={S.cardLbl}>
                            {daysStr(d.days, d.specificDate)}
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowCalendar(true)}
                            style={{
                                width: 34, height: 34, borderRadius: 10,
                                backgroundColor: d.specificDate ? colors.primary + '20' : colors.surface,
                                borderWidth: 0.5,
                                borderColor: d.specificDate ? colors.primary + '60' : colors.border,
                                alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <Image
                                source={require('../../assets/icons/calendar.png')}
                                style={{ width: 18, height: 18, tintColor: d.specificDate ? colors.primary : colors.textSecondary }}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>
                    <View style={S.daysRow}>
                        {DAY_S.map((l, i) => {
                            const on = d.days.includes(i) && !d.specificDate;
                            return (
                                <TouchableOpacity
                                    key={i}
                                    onPress={() => togDay(i)}
                                    style={[
                                        S.dayBtn,
                                        on && { backgroundColor: colors.primary + '22', borderColor: colors.primary },
                                        d.specificDate && !on && { opacity: 0.45 },
                                    ]}
                                >
                                    <Text style={[S.dayTxt, on && { color: colors.primary, fontWeight: '700' }]}>
                                        {l}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {!d.specificDate && d.days.length === 0 && (
                        <Text style={{ textAlign: 'center', fontSize: 12, color: colors.textTertiary, marginTop: 10 }}>
                            {t('alarmOnce')}
                        </Text>
                    )}
                </View>

                {/* Mission Card */}
                <TouchableOpacity
                    style={S.card}
                    onPress={() => d.mission?.enabled ? setShowMission(true) : null}
                    activeOpacity={0.85}
                >
                    <View style={S.row}>
                        <Image
                            source={require('../../assets/icons/math.png')}
                            style={{ width: 20, height: 20, tintColor: colors.textSecondary }}
                            resizeMode="contain"
                        />
                        {/* <Text style={{ fontSize: 20 }}>🧮</Text> */}
                        <Text style={S.rowLbl}>{t('Mission')}</Text>

                        {d.mission?.enabled && (
                            <Text style={[S.rowVal, { color: colors.primary }]}>
                                {t('Math')} · {d.mission.count}x · {d.mission.difficulty}
                            </Text>
                        )}

                        <Toggle
                            value={d.mission?.enabled ?? false}
                            onChange={(v) => {
                                setD(x => ({ ...x, mission: { ...x.mission!, enabled: v } }));
                                if (v) setTimeout(() => setShowMission(true), 300);
                            }}
                            primary={colors.primary}
                        />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={S.card} onPress={() => setShowRingtonePicker(true)} activeOpacity={0.75}>
                    <View style={S.row}>
                        <Image
                            source={require('../../assets/icons/sound.png')}
                            style={{ width: 20, height: 20, tintColor: colors.textSecondary }}
                            resizeMode="contain"
                        />
                        <Text style={S.rowLbl}>{t('alarmSound')}</Text>
                        <Text style={[S.rowVal, { color: colors.primary }]}>{d.ringtone}</Text>
                        <View style={{
                            width: 28, height: 28, borderRadius: 14,
                            backgroundColor: colors.primary + '22',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                        </View>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={S.card} onPress={() => setShowSnoozePicker(true)} activeOpacity={0.75}>
                    <View style={S.row}>
                        <Image
                            source={require('../../assets/icons/snooze.png')}
                            style={{ width: 20, height: 20, tintColor: colors.textSecondary }}
                            resizeMode="contain"
                        />
                        <Text style={S.rowLbl}>{t('snooze')}</Text>

                        <Text style={[S.rowVal, { color: colors.primary }]}>
                            {SNOOZE_OPTS.includes(d.snoozeMinutes)
                                ? (d.snoozeMinutes === 60 ? t('snooze_1hr') : t('snooze_mins', { min: d.snoozeMinutes }))
                                : t('snooze_mins', { min: d.snoozeMinutes })}
                        </Text>
                        <View style={{
                            width: 28, height: 28, borderRadius: 14,
                            backgroundColor: colors.primary + '22',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Background */}
                <View style={S.card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Image
                                source={require('../../assets/icons/Icon.png')}
                                style={{ width: 18, height: 18, tintColor: colors.textSecondary }}
                                resizeMode="contain"
                            />
                            <Text style={S.rowLbl}>{t('alarmBackground')}</Text>
                            <TouchableOpacity
                                onPress={() => setShowPreview(true)}
                                activeOpacity={0.7}
                                style={{
                                    width: 32, height: 32, borderRadius: 8,
                                    backgroundColor: colors.primary + '18',
                                    borderWidth: 0.5, borderColor: colors.primary + '44',
                                    alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <Image
                                    source={require('../../assets/icons/easy.png')}
                                    style={{ width: 20, height: 20, tintColor: colors.primary }}
                                    resizeMode="contain"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>


                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -2 }}>
                        {BG_IMAGES.map((src, i) => (
                            <TouchableOpacity
                                key={i}
                                onPress={() => {
                                    if (isLocked(i)) {
                                        onGoToCoins();
                                        // Alert.alert('Locked 🔒', '50 coins mein unlock karo.\nCoin screen pe jao!');
                                        return;
                                    }
                                    setD(x => ({ ...x, bgIndex: i }));
                                }}
                                style={{ marginHorizontal: 4 }}
                            >
                                <Image source={src} style={{
                                    width: 100, height: 150, borderRadius: 10,
                                    borderWidth: d.bgIndex === i ? 2.5 : 0,
                                    borderColor: colors.primary,
                                    opacity: isLocked(i) ? 0.5 : 1,
                                }} resizeMode="cover" />
                                {isLocked(i) && (
                                    <View style={{
                                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                        backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10,
                                        alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Text style={{ fontSize: 22 }}>🔒</Text>
                                        {/* <Text style={{ fontSize: 11, color: '#FAC775', fontWeight: '700', marginTop: 4 }}>50 🪙</Text> */}
                                    </View>
                                )}
                                {d.bgIndex === i && !isLocked(i) && (
                                    <View style={{
                                        position: 'absolute', top: 6, right: 6,
                                        width: 20, height: 20, borderRadius: 10,
                                        backgroundColor: colors.primary,
                                        alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>✓</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}

                        {(d.customBgUris ?? []).map((uri, slot) => {
                            const idx = CUSTOM_INDEX_START + slot;
                            const isSelected = d.bgIndex === idx;
                            return (
                                <TouchableOpacity
                                    key={`custom_${slot}`}
                                    onPress={() => setD(x => ({ ...x, bgIndex: idx }))}
                                    style={{ marginHorizontal: 4 }}
                                >
                                    <Image
                                        source={{ uri }}
                                        style={{
                                            width: 100, height: 150, borderRadius: 10,
                                            borderWidth: isSelected ? 2.5 : 0,
                                            borderColor: colors.primary,
                                        }}
                                        resizeMode="cover"
                                    />
                                    {/* Remove (×) button — top-left */}
                                    <TouchableOpacity
                                        onPress={() => removeCustomImage(slot)}
                                        style={{
                                            position: 'absolute', top: 6, left: 6,
                                            width: 22, height: 22, borderRadius: 11,
                                            backgroundColor: 'rgba(0,0,0,0.6)',
                                            borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
                                            alignItems: 'center', justifyContent: 'center',
                                        }}
                                    >
                                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700', lineHeight: 15 }}>×</Text>
                                    </TouchableOpacity>
                                    {/* Selected checkmark — top-right */}
                                    {isSelected && (
                                        <View style={{
                                            position: 'absolute', top: 6, right: 6,
                                            width: 20, height: 20, borderRadius: 10,
                                            backgroundColor: colors.primary,
                                            alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>✓</Text>
                                        </View>
                                    )}
                                    {/* "Custom" label — bottom */}
                                    <View style={{
                                        position: 'absolute', bottom: 0, left: 0, right: 0,
                                        backgroundColor: 'rgba(0,0,0,0.45)',
                                        borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
                                        paddingVertical: 4, alignItems: 'center',
                                    }}>
                                        <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '600' }}>
                                            {t('Custom')} {slot + 1}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}

                        {(d.customBgUris ?? []).length < 3 && (
                            <TouchableOpacity
                                onPress={() => {
                                    if (isLocked(100)) {
                                        onGoToCoins();
                                        // Alert.alert('Locked 🔒', '50 coins mein unlock karo.\nCoin screen pe jao!');
                                        return;
                                    }
                                    pickCustomImage();
                                }}
                                style={{ marginHorizontal: 4 }}
                            >
                                <View style={{
                                    width: 100, height: 150, borderRadius: 10,
                                    borderWidth: 1.5,
                                    borderColor: isLocked(100) ? colors.border + '60' : colors.border,
                                    borderStyle: 'dashed',
                                    backgroundColor: colors.surfaceAlt,
                                    alignItems: 'center', justifyContent: 'center',
                                    gap: 8,
                                    opacity: isLocked(100) ? 0.6 : 1,
                                }}>
                                    {isLocked(100) ? (
                                        <>
                                            <Text style={{ fontSize: 22 }}>🔒</Text>
                                            {/* <Text style={{ fontSize: 10, color: '#FAC775', fontWeight: '700', textAlign: 'center', paddingHorizontal: 8 }}>
                                                50 🪙{'\n'}Unlock karo
                                            </Text> */}
                                        </>
                                    ) : (
                                        <>
                                            <View style={{
                                                width: 40, height: 40, borderRadius: 20,
                                                backgroundColor: colors.primary + '18',
                                                borderWidth: 1, borderColor: colors.primary + '44',
                                                alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <Ionicons name="add" size={24} color={colors.primary} />
                                            </View>
                                            <Text style={{
                                                fontSize: 11, color: colors.textTertiary,
                                                fontWeight: '600', textAlign: 'center',
                                                paddingHorizontal: 8,
                                            }}>
                                                {(d.customBgUris ?? []).length > 0
                                                    ? `${t('AddMore')}\n(${(d.customBgUris ?? []).length}/3)`
                                                    : t('Custom')}
                                            </Text>
                                        </>
                                    )}
                                </View>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                    {showPreview && (
                        <AlarmPreviewModal
                            bgIndex={d.bgIndex}
                            onClose={() => setShowPreview(false)}
                        />
                    )}
                </View>
            </ScrollView>

            <Modal visible={showRingtonePicker} animationType="slide" presentationStyle="fullScreen">
                <RingtonePickerScreen
                    selected={d.ringtone}
                    onSelect={(tone) => setD(x => ({ ...x, ringtone: tone }))}
                    onBack={() => setShowRingtonePicker(false)}
                    onSave={() => setShowRingtonePicker(false)}
                    colors={colors}
                />
            </Modal>

            <Modal visible={showMission} animationType="slide" presentationStyle="fullScreen">
                <MathMissionScreen
                    count={d.mission?.count ?? 1}
                    difficulty={d.mission?.difficulty ?? 'Easy'}
                    onSave={(count, difficulty) => {
                        setD(x => ({ ...x, mission: { enabled: true, type: 'math', count, difficulty } }));
                        setShowMission(false);
                    }}
                    onBack={() => setShowMission(false)}
                />
            </Modal>

            <Modal visible={showSnoozePicker} animationType="slide" presentationStyle="fullScreen">
                <SnoozePickerScreen
                    selected={d.snoozeMinutes}
                    onSelect={(mins) => setD(x => ({ ...x, snoozeMinutes: mins }))}
                    onBack={() => setShowSnoozePicker(false)}
                    onSave={() => setShowSnoozePicker(false)}
                    colors={colors}
                />
            </Modal>

            {showCalendar && (
                <CalendarPicker
                    selectedDays={d.days}
                    specificDate={d.specificDate}
                    onSelectDate={(date) => setD(x => ({ ...x, specificDate: date }))}
                    onClose={() => setShowCalendar(false)}
                    colors={colors}
                />
            )}
        </View>
    );
}

const edit_styles = (colors: any) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    closeBtn: { minWidth: 50, alignItems: 'flex-start', justifyContent: 'center' },
    closeBtnCircle: {
        width: 40, height: 40, borderRadius: 50,
        alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
    },
    hdr: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 18, paddingVertical: 14, borderBottomColor: colors.border,
    },
    hdrTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    saveBtn: {
        paddingHorizontal: 16, paddingVertical: 7,
        backgroundColor: colors.primary + '18',
        borderRadius: 20, borderWidth: 1, borderColor: colors.primary + '44',
    },
    saveTxt: { fontSize: 15, fontWeight: '700', color: colors.primary },
    card: {
        marginHorizontal: 16, marginTop: 14,
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 14,
    },
    cardHdrTxt: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    cardLbl: { fontSize: 16, fontWeight: '500', color: colors.text },
    drumRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
    },
    colon: { fontSize: 34, fontWeight: '200', color: colors.textSecondary },
    diffTxt: { textAlign: 'center', fontSize: 12, color: colors.textTertiary, marginTop: 4 },
    daysRow: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
    dayBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: colors.border + '44', borderWidth: 1, borderColor: colors.border,
        alignItems: 'center', justifyContent: 'center',
    },
    dayTxt: { fontSize: 13, fontWeight: '600', color: colors.textTertiary },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowLbl: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.text },
    rowVal: { fontSize: 14, color: colors.textSecondary },
    delBtn: {
        margin: 16, marginTop: 8, padding: 16, borderRadius: 14,
        backgroundColor: colors.surfaceAlt, alignItems: 'center',
        borderWidth: 0.5, borderColor: colors.border,
    },
    delTxt: { fontSize: 15, fontWeight: '600' },
});

export default function AlarmScreen() {
    const ins = useSafeAreaInsets();
    const { colors } = useTheme();
    const route = useRoute<any>();
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const [alarms, setAlarms] = useState<Alarm[]>([]);
    const [editing, setEditing] = useState<Alarm | null | undefined>(undefined);
    const showEdit = editing !== undefined;

    useFocusEffect(useCallback(() => {
        if (route.params?.openNew) setEditing(null);
    }, [route.params?.openNew]));

    useEffect(() => {
        askPermission();
        loadAlarms().then(setAlarms);
    }, []);

    const persist = async (list: Alarm[]) => {
        setAlarms(list);
        await saveAlarms(list);
        for (const a of list) await scheduleAlarm(a);
    };
    const handleToggle = async (id: string) => {
        await persist(alarms.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
    };
    const [headerCoins, setHeaderCoins] = useState(0);
    useFocusEffect(useCallback(() => {
        CoinStore.getCoins().then(setHeaderCoins);
    }, []));


    // const handleSave = async (alarm: Alarm) => {
    //     const exists = alarms.some(a => a.id === alarm.id);
    //     await persist(exists ? alarms.map(a => a.id === alarm.id ? alarm : a) : [...alarms, alarm]);
    //     setEditing(undefined);
    // };
    const handleSave = async (alarm: Alarm) => {
        const exists = alarms.some(a => a.id === alarm.id);
        await persist(exists
            ? alarms.map(a => a.id === alarm.id ? alarm : a)
            : [...alarms, alarm]
        );

        // +2 coins for alarm (daily 1 baar)
        const alarmCoins = await CoinStore.tryEarnCoins('alarm');

        // +5 coins agar mission ON hai (daily 1 baar)
        let missionCoins = 0;
        if (alarm.mission?.enabled) {
            missionCoins = await CoinStore.tryEarnCoins('mission');
        }

        const total = alarmCoins + missionCoins;
        if (total > 0) {
            // Toast ya Alert dikhao
            Alert.alert(t('CoinsEarned'), `+${total} ${t('CoinsCollected')}\n\n ${t('KeepWatching')}`);
        }

        setHeaderCoins(await CoinStore.getCoins());
        setEditing(undefined);
    };

    const handleDelete = async (id: string) => {
        try { await notifee.cancelNotification(id); } catch { }
        const updated = alarms.filter(a => a.id !== id);
        await saveAlarms(updated);
        setAlarms(updated);
        setEditing(undefined);
    };

    const scrollY = useRef(new Animated.Value(0)).current;

    const CLOCK_LARGE = SW * 0.42;
    const CLOCK_SMALL = SW * 0.24;
    const LARGE_CLOCK_SECTION_H = CLOCK_LARGE + 80 + 80 + 20;
    const THRESHOLD = LARGE_CLOCK_SECTION_H * 0.7;

    const miniClockOpacity = scrollY.interpolate({ inputRange: [THRESHOLD * 0.5, THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
    const miniClockScale = scrollY.interpolate({ inputRange: [THRESHOLD * 0.5, THRESHOLD], outputRange: [0.6, 1], extrapolate: 'clamp' });
    const digitalOpacity = scrollY.interpolate({ inputRange: [THRESHOLD * 0.5, THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
    const digitalTranslateX = scrollY.interpolate({ inputRange: [THRESHOLD * 0.5, THRESHOLD], outputRange: [16, 0], extrapolate: 'clamp' });
    const largeclockOpacity = scrollY.interpolate({ inputRange: [0, THRESHOLD * 0.6], outputRange: [1, 0], extrapolate: 'clamp' });

    const ORB_SIZE = SW * 1.9;
    const ORB_VISIBLE = SH * 0.40;
    const MINI_HEADER_H = CLOCK_SMALL + 150;

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View pointerEvents="none" style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                height: ORB_VISIBLE, overflow: 'hidden',
            }}>
                <Image
                    source={colors.isDark
                        ? require('../../assets/background/night.png')
                        : require('../../assets/background/day.png')}
                    style={{
                        position: 'absolute',
                        width: ORB_SIZE, height: ORB_SIZE,
                        borderRadius: ORB_SIZE / 2,
                        top: -(ORB_SIZE - ORB_VISIBLE),
                        alignSelf: 'center',
                    }}
                    resizeMode="cover"
                />
            </View>

            <View style={[hdr.wrap, { paddingTop: ins.top + 12 }]}>
                <Text style={[hdr.title, { color: colors.text }]}>{t('Alarm')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* Coin Button */}
                    <TouchableOpacity
                        style={[hdr.gear, {
                            flexDirection: 'row', alignItems: 'center', gap: 4,
                            paddingHorizontal: 10,
                        }]}
                        onPress={() => navigation.navigate('CoinScreen')}
                    >
                        <Image
                            source={require('../../assets/img/coin.png')}
                            style={{ width: 30, height: 30 }}
                            resizeMode="contain"
                        />
                        {/* <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{headerCoins}</Text> */}
                    </TouchableOpacity>

                    {/* Settings */}
                    <TouchableOpacity style={hdr.gear} onPress={() => navigation.navigate('Settings')}>
                        <Image source={require('../../assets/icons/settings.png')}
                            style={{ width: 30, height: 30, tintColor: colors.textSecondary }} resizeMode="contain" />
                    </TouchableOpacity>
                </View>
            </View>

            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: ins.bottom + 110 }}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
            >
                <Animated.View style={{
                    height: LARGE_CLOCK_SECTION_H,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: largeclockOpacity,
                }}>
                    <AnalogClock size={CLOCK_LARGE} colors={colors} />
                    <DigitalClock colors={colors} />
                </Animated.View>

                <View style={{ paddingHorizontal: 16 }}>
                    {alarms.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingTop: 30, justifyContent: 'center', flex: 1, minHeight: 300 }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textSecondary }}>{t('setAlarm')}</Text>
                            <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 6 }}>
                                {t('tapBar')}
                            </Text>
                        </View>
                    ) : (
                        alarms.map(item => (
                            <AlarmCard
                                key={item.id}
                                item={item}
                                colors={colors}
                                onToggle={() => handleToggle(item.id)}
                                onPress={() => setEditing(item)}
                                onDelete={() => handleDelete(item.id)}
                            />
                        ))
                    )}
                </View>
            </Animated.ScrollView>

            <View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    top: ins.top + 52,
                    left: 0, right: 0,
                    height: MINI_HEADER_H,
                    overflow: 'hidden',
                }}
            >
                <Animated.View
                    style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: colors.background,
                        opacity: scrollY.interpolate({
                            inputRange: [THRESHOLD * 0.5, THRESHOLD],
                            outputRange: [0, 1],
                            extrapolate: 'clamp',
                        }),
                    }}
                >
                    <Image
                        source={colors.isDark
                            ? require('../../assets/background/night.png')
                            : require('../../assets/background/day.png')}
                        style={{
                            position: 'absolute',
                            width: ORB_SIZE,
                            height: ORB_SIZE,
                            borderRadius: ORB_SIZE / 2,
                            top: -(ORB_SIZE - ORB_VISIBLE) - (ins.top + 52),
                            alignSelf: 'center',
                        }}
                        resizeMode="cover"
                    />
                </Animated.View>

                <Animated.View style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                }}>
                    <Animated.View style={{
                        opacity: miniClockOpacity,
                        transform: [{ scale: miniClockScale }],
                    }}>
                        <AnalogClock size={CLOCK_SMALL} colors={colors} />
                    </Animated.View>
                    <Animated.View style={{
                        opacity: digitalOpacity,
                        transform: [{ translateX: digitalTranslateX }],
                        flex: 1,
                        paddingLeft: 4,
                    }}>
                        <DigitalClock colors={colors} />
                    </Animated.View>
                </Animated.View>
            </View>

            <Modal visible={showEdit} animationType="slide" presentationStyle="fullScreen">
                {showEdit && (
                    <EditScreen
                        alarm={editing ?? null}
                        colors={colors}
                        onSave={handleSave}
                        onDelete={handleDelete}
                        onBack={() => setEditing(undefined)}
                        onGoToCoins={() => {
                            setEditing(undefined);
                            navigation.navigate('CoinScreen');
                        }}

                    />
                )}
            </Modal>
        </View>
    );
}

const hdr = StyleSheet.create({
    wrap: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20, paddingBottom: 8,
    },
    emptyImage: { width: SW * 0.40, height: SW * 0.40, opacity: 0.50 },
    title: { fontSize: 22, fontWeight: '700' },
    gear: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});