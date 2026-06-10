// src/screens/AlarmRingingScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated, Dimensions, ImageBackground,
    Platform, StatusBar, StyleSheet, Vibration,
    Text, TouchableOpacity, View, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import notifee, {
    AndroidImportance, AndroidVisibility, TriggerType,
} from '@notifee/react-native';

const { width: SW, height: SH } = Dimensions.get('window');
const STORAGE_KEY = '@alarms_v3';
import TrackPlayer, {
    RepeatMode,
    Capability
} from 'react-native-track-player';

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

const p2 = (n: number) => String(n).padStart(2, '0');
const fmtT = (h: number, m: number) => ({
    disp: `${p2(h % 12 || 12)}:${p2(m)}`,
    per: h >= 12 ? 'PM' : 'AM',
});
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TONE_MAP: Record<string, any> = {
    'Fine Day': require('../../assets/sounds/fine_day.mp3'),
    'Classic': require('../../assets/sounds/classic.mp3'),
    'Radar': require('../../assets/sounds/radar.mp3'),
    'Beacon': require('../../assets/sounds/beacon.mp3'),
};
let playerReady = false;

const VIBRATE_PATTERN = [0, 600, 400];
function startVibrating() { Vibration.vibrate(VIBRATE_PATTERN, true); }
function stopVibrating() { Vibration.cancel(); }

function useClock() {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return now;
}

async function getAlarm(id: string) {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const list: any[] = JSON.parse(raw);
        return list.find(a => a.id === id) ?? null;
    } catch { return null; }
}

async function ensurePlayer() {
    if (playerReady) return;
    try {
        await TrackPlayer.setupPlayer({ autoHandleInterruptions: true });
        await TrackPlayer.updateOptions({ capabilities: [Capability.Play, Capability.Stop] });
        playerReady = true;
    } catch { playerReady = true; }
}

async function startRinging(alarm: any) {
    try {
        await ensurePlayer();
        await TrackPlayer.reset();
        await TrackPlayer.add({
            id: 'alarm_ring',
            url: TONE_MAP[alarm?.ringtone] ?? TONE_MAP['Fine Day'],
            title: alarm?.label ?? 'Alarm',
            artist: 'Alarm',
        });
        await TrackPlayer.setRepeatMode(RepeatMode.Queue);
        await TrackPlayer.play();
    } catch (e) { console.log('Ring error:', e); }
}

async function stopRinging() {
    try { await TrackPlayer.stop(); await TrackPlayer.reset(); } catch { }
}

async function scheduleSnooze(alarm: any) {
    const snoozeMin: number = alarm.snoozeMinutes ?? 5;
    const fire = new Date(Date.now() + snoozeMin * 60 * 1000);
    const { disp, per } = fmtT(alarm.hour, alarm.minute);
    try { await notifee.cancelNotification(`snooze_${alarm.id}`); } catch { }
    if (Platform.OS === 'android') {
        await notifee.createChannel({
            id: 'alarms', name: 'Alarms',
            importance: AndroidImportance.HIGH,
            visibility: AndroidVisibility.PUBLIC,
            sound: 'default', vibration: true,
        });
    }
    await notifee.createTriggerNotification(
        {
            id: `snooze_${alarm.id}`,
            title: `⏰ ${alarm.label} (Snoozed)`,
            body: `${disp} ${per} — ${snoozeMin} min snooze`,
            data: { alarmId: alarm.id, isSnooze: 'true' },
            android: {
                channelId: 'alarms',
                importance: AndroidImportance.HIGH,
                fullScreenAction: { id: 'default', launchActivity: 'default' },
                sound: 'default',
                vibrationPattern: alarm.vibrate ? [0, 400, 200, 400] : undefined,
                pressAction: { id: 'default' },
            },
            ios: { sound: 'default', critical: false },
        },
        { type: TriggerType.TIMESTAMP, timestamp: fire.getTime() }
    );
}

type MathProblem = { question: string; answer: number };

function generateMath(difficulty: 'Easy' | 'Medium' | 'Hard' = 'Easy'): MathProblem {
    let a: number, b: number, answer: number, question: string;

    if (difficulty === 'Easy') {
        const ops = ['+', '-'];
        const op = ops[Math.floor(Math.random() * ops.length)];
        if (op === '+') {
            a = Math.floor(Math.random() * 30) + 5;
            b = Math.floor(Math.random() * 30) + 5;
            answer = a + b;
        } else {
            a = Math.floor(Math.random() * 40) + 20;
            b = Math.floor(Math.random() * 20) + 1;
            answer = a - b;
        }
        question = `${a}  ${op}  ${b}`;
    } else if (difficulty === 'Medium') {
        const ops = ['+', '-', '×'];
        const op = ops[Math.floor(Math.random() * ops.length)];
        if (op === '×') {
            a = Math.floor(Math.random() * 9) + 2;
            b = Math.floor(Math.random() * 9) + 2;
            answer = a * b;
        } else if (op === '+') {
            a = Math.floor(Math.random() * 80) + 20;
            b = Math.floor(Math.random() * 80) + 20;
            answer = a + b;
        } else {
            a = Math.floor(Math.random() * 80) + 30;
            b = Math.floor(Math.random() * 30) + 5;
            answer = a - b;
        }
        question = `${a}  ${op}  ${b}`;
    } else {
        // Hard — multi step
        a = Math.floor(Math.random() * 20) + 5;
        b = Math.floor(Math.random() * 12) + 2;
        const c = Math.floor(Math.random() * 20) + 5;
        answer = a * b - c;
        question = `${a} × ${b} − ${c}`;
    }

    return { question, answer };
}

function MathDismissScreen({
    onSolved,
    onClose,
    totalCount = 1,    
    difficulty = 'Easy',
}: {
    onSolved: () => void;
    onClose: () => void;
    totalCount?: number;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
}) {
    const [problem, setProblem] = useState<MathProblem>(() => generateMath(difficulty));
    const [input, setInput] = useState('');
    const [wrong, setWrong] = useState(false);
    const [solved, setSolved] = useState(0); // ← kitni solve hui
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.85)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const inputRef = useRef<TextInput>(null);
    const { t } = useTranslation();


    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 10, speed: 8 }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start(() => inputRef.current?.focus());
    }, []);

    const doShake = () => {
        shakeAnim.setValue(0);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 12, duration: 55, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -12, duration: 55, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 55, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
        ]).start();
    };

    const handleSubmit = () => {
        if (!input.trim()) return;
        if (parseInt(input) === problem.answer) {
            const newSolved = solved + 1;
            setSolved(newSolved);
            setInput('');

            if (newSolved >= totalCount) {
                onSolved();
            } else {
                setProblem(generateMath(difficulty));
            }
        } else {
            setWrong(true);
            doShake();
            setInput('');
            setTimeout(() => {
                setWrong(false);
                inputRef.current?.focus();
            }, 600);
        }
    };

    const numKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];

    const handleKey = (key: string) => {
        if (key === '⌫') {
            setInput(v => v.slice(0, -1));
        } else if (key === '✓') {
            handleSubmit();
        } else {
            if (input.length >= 5) return;
            const next = input + key;
            setInput(next);
        }
    };

    return (
        <Animated.View style={[
            math.container,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
        ]}>
            {/* Header */}
            <View style={math.header}>
                <Text style={math.headerTitle}>{t('SolvetoDismiss')}</Text>
                <TouchableOpacity onPress={onClose} style={math.closeBtn}>
                    <Text style={math.closeTxt}>✕</Text>
                </TouchableOpacity>
            </View>

            <Text style={math.subtitle}>{t('Answercorrectly')}</Text>

            <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
                {Array.from({ length: totalCount }).map((_, i) => (
                    <View key={i} style={{
                        height: 5, flex: 1, borderRadius: 3,
                        backgroundColor: i < solved
                            ? '#FFFFFF'
                            : i === solved
                                ? 'rgba(255,255,255,0.5)'
                                : 'rgba(255,255,255,0.15)',
                    }} />
                ))}
            </View>

            <Text style={[math.subtitle, { marginBottom: 8 }]}>
                {t('Problem')} {solved + 1} {t('of')} {totalCount}
            </Text>

            <Animated.View style={[
                math.questionBox,
                wrong && { borderColor: 'rgba(255,80,80,0.8)' },
                { transform: [{ translateX: shakeAnim }] }
            ]}>
                <Text style={math.questionText}>{problem.question}</Text>
                <Text style={math.equalSign}>=</Text>
                <View style={[math.answerBox, wrong && { borderBottomColor: 'rgba(255,80,80,0.8)' }]}>
                    <Text style={[math.answerText, !input && math.answerPlaceholder]}>
                        {input || '?'}
                    </Text>
                </View>
            </Animated.View>

            {wrong && (
                <Text style={math.wrongText}>Wrong! Try again</Text>
            )}

            <View style={math.numpad}>
                {numKeys.map((key) => {
                    const isSubmit = key === '✓';
                    const isDelete = key === '⌫';
                    return (
                        <TouchableOpacity
                            key={key}
                            onPress={() => handleKey(key)}
                            activeOpacity={0.7}
                            style={[
                                math.numKey,
                                isSubmit && { backgroundColor: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.5)' },
                                isDelete && { backgroundColor: 'rgba(255,255,255,0.06)' },
                            ]}
                        >
                            <Text style={[
                                math.numKeyText,
                                isSubmit && { fontSize: 22 },
                                isDelete && { fontSize: 20 },
                            ]}>
                                {key}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </Animated.View>
    );
}

export default function AlarmRingingScreen() {
    const ins = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const now = useClock();
    const alarmId: string = route.params?.alarmId ?? '';
    const [alarm, setAlarm] = useState<any>(route.params?.alarm ?? null);
    const [showMath, setShowMath] = useState(false);

    const pulse = useRef(new Animated.Value(1)).current;
    const slideUp = useRef(new Animated.Value(80)).current;
    const fadeIn = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const initAlarm = async (a: any) => {
            await startRinging(a);
            if (a?.vibrate !== false) startVibrating();
        };

        if (!alarm && alarmId) {
            getAlarm(alarmId).then(a => {
                if (a) { setAlarm(a); initAlarm(a); }
            });
        } else if (alarm) {
            initAlarm(alarm);
        }

        Animated.parallel([
            Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(slideUp, { toValue: 0, useNativeDriver: true, bounciness: 8, speed: 6 }),
        ]).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1.04, duration: 900, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 1.00, duration: 900, useNativeDriver: true }),
            ])
        ).start();

        return () => { stopVibrating(); };
    }, []);

    const handleDismiss = async () => {
        stopVibrating();
        await stopRinging();
        try {
            await notifee.cancelNotification(alarmId);
            await notifee.cancelNotification(`snooze_${alarmId}`);
        } catch { }
        navigation.goBack();
    };

    const handleSnooze = async () => {
        stopVibrating();
        await stopRinging();
        if (alarm) await scheduleSnooze(alarm);
        try { await notifee.cancelNotification(alarmId); } catch { }
        navigation.goBack();
    };

    const { disp, per } = alarm
        ? fmtT(alarm.hour, alarm.minute)
        : fmtT(now.getHours(), now.getMinutes());

    const bgSource = alarm
        ? BG_IMAGES[alarm.bgIndex % BG_IMAGES.length]
        : BG_IMAGES[0];

    const dateStr = `${now.getDate()} ${MONTHS[now.getMonth()]}, ${DAYS[now.getDay()]}`;
    const snoozeMin = alarm?.snoozeMinutes ?? 5;

    return (
        <View style={styles.root}>
            <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />

            <ImageBackground source={bgSource} style={styles.bg} resizeMode="cover">
                <View style={styles.overlay} />

                <Animated.View style={[styles.content, { opacity: fadeIn }]}>
                    {/* Top — time & label */}
                    <View style={[styles.topSection, { paddingTop: ins.top + 40 }]}>
                        <Text style={styles.alarmName}>{alarm?.label ?? 'Alarm'}</Text>
                        <Text style={styles.dateText}>{dateStr}</Text>
                        <Animated.View style={[styles.timeSection, { transform: [{ scale: pulse }] }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                                <Text style={styles.timeText}>{disp}</Text>
                                <Text style={styles.ampmText}>{per}</Text>
                            </View>
                        </Animated.View>
                    </View>

                    <Animated.View style={[styles.bottomSection, {
                        paddingBottom: ins.bottom + 40,
                        transform: [{ translateY: slideUp }],
                    }]}>
                        <TouchableOpacity
                            onPress={() => {
                                if (alarm?.mission?.enabled) {
                                    setShowMath(true);
                                } else {
                                    handleDismiss();
                                }
                            }}
                            activeOpacity={0.85}
                            style={styles.dismissBtn}
                        >
                            <Text style={styles.dismissTxt}>
                                {alarm?.mission?.enabled ? '🧮  Dismiss' : 'Dismiss'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSnooze}
                            activeOpacity={0.7}
                            style={styles.snoozeBtn}
                        >
                            <Text style={styles.snoozeTxt}>Snooze {snoozeMin} mins</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>

                {/* Math overlay — fullscreen */}
                {showMath && (
                    <View style={StyleSheet.absoluteFill}>
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
                        <MathDismissScreen
                            onSolved={handleDismiss}
                            onClose={() => setShowMath(false)}
                            totalCount={alarm?.mission?.count ?? 1}
                            difficulty={alarm?.mission?.difficulty ?? 'Easy'}
                        />
                    </View>
                )}
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    bg: { flex: 1 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' },
    content: { flex: 1, justifyContent: 'space-between' },
    topSection: { alignItems: 'center', paddingHorizontal: 24 },
    alarmName: {
        fontSize: 28, fontWeight: '700', color: '#FFFFFF',
        textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6, textAlign: 'center',
    },
    dateText: {
        fontSize: 16, color: 'rgba(255,255,255,0.85)', marginTop: 6,
        fontWeight: '400', textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
    },
    timeSection: { alignItems: 'center', justifyContent: 'center' },
    timeText: {
        fontSize: 86, fontWeight: '700', color: '#FFFFFF',
        letterSpacing: -3, fontVariant: ['tabular-nums'],
        textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
    },
    ampmText: {
        fontSize: 28, fontWeight: '600', color: 'rgba(255,255,255,0.9)',
        marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
    },
    bottomSection: { alignItems: 'center', gap: 16, paddingHorizontal: 32 },
    dismissBtn: {
        width: '80%', paddingVertical: 18, borderRadius: 50,
        backgroundColor: 'rgba(20,20,30,0.72)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center',
    },
    dismissTxt: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
    snoozeBtn: { paddingVertical: 10, paddingHorizontal: 24 },
    snoozeTxt: {
        fontSize: 16, fontWeight: '700', color: '#FFFFFF',
        textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
});

const math = StyleSheet.create({
    container: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(15,15,25,0.97)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36,
        borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    },
    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 4,
    },
    headerTitle: {
        fontSize: 20, fontWeight: '700', color: '#FFFFFF',
    },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center', justifyContent: 'center',
    },
    closeTxt: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
    subtitle: {
        fontSize: 13, color: 'rgba(255,255,255,0.5)',
        marginBottom: 24,
    },
    questionBox: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 16,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 20, paddingVertical: 22, paddingHorizontal: 24,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
        marginBottom: 10,
    },
    questionText: {
        fontSize: 25, fontWeight: '300', color: '#FFFFFF',
        fontVariant: ['tabular-nums'], letterSpacing: 2,
    },
    equalSign: {
        fontSize: 38, fontWeight: '200', color: 'rgba(255,255,255,0.4)',
    },
    answerBox: {
        minWidth: 60, borderBottomWidth: 2,
        borderBottomColor: 'rgba(255,255,255,0.4)',
        alignItems: 'center', paddingBottom: 4,
    },
    answerText: {
        fontSize: 25, fontWeight: '600', color: '#FFFFFF',
        fontVariant: ['tabular-nums'], letterSpacing: 1,
    },
    answerPlaceholder: { color: 'rgba(255,255,255,0.25)' },
    wrongText: {
        textAlign: 'center', color: 'rgba(255,100,100,0.9)',
        fontSize: 13, fontWeight: '600', marginBottom: 6,
    },
    numpad: {
        flexDirection: 'row', flexWrap: 'wrap',
        gap: 10, marginTop: 16,
        justifyContent: 'center',
    },
    numKey: {
        width: (SW - 48 - 20) / 3,
        height: 58, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center', justifyContent: 'center',
    },
    numKeyText: {
        fontSize: 24, fontWeight: '500', color: '#FFFFFF',
        fontVariant: ['tabular-nums'],
    },
});