import React, { useCallback, useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Image, Alert, ImageBackground
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { CoinStore, UnlockedItem } from '../utils/CoinStore';
import { showInterstitialAd } from '../services/AdService';
import AdBanner from '../components/AdBanner';


const LOCKED_BG_IMAGES = [
    { index: 0, label: 'Aurora', src: require('../../assets/background/bg1.jpeg') },
    { index: 1, label: 'Ocean', src: require('../../assets/background/bg2.jpeg') },
    { index: 4, label: 'Forest', src: require('../../assets/background/bg5.jpeg') },
    { index: 5, label: 'Galaxy', src: require('../../assets/background/bg6.jpeg') },
];
export default function CoinScreen() {
    const ins = useSafeAreaInsets();
    const navigation = useNavigation();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const S = styles(colors);

    const [coins, setCoins] = useState(0);
    const [unlocked, setUnlocked] = useState<UnlockedItem[]>([]);
    const [earnedToday, setEarnedToday] = useState<string[]>([]);

    const load = async () => {
        const [c, u, e] = await Promise.all([
            CoinStore.getCoins(),
            CoinStore.getUnlocked(),
            CoinStore.getEarnedToday(),
        ]);
        setCoins(c);
        setUnlocked(u);
        setEarnedToday(e);
    };

    useFocusEffect(useCallback(() => { load(); }, []));

    const handleUnlock = async (bgIndex: number) => {
        if (coins < 50) {
            Alert.alert(t('NotEnoughCoins'), `${t('need50coins')} ${coins}.\n\n${t('earnmore')}`);
            return;
        }

        const label = bgIndex === 100
            ? 'Custom Background'
            : bgIndex === 200
                ? 'Custom Sounds'
                : 'this background';

        Alert.alert(
            t('Unlock'),
            `${t('cost50coins')}\n${t('Unlockeddays')}\n${t('Balance')} ${coins} → ${coins - 50}`,
            [
                { text: t('Cancel'), style: 'cancel' },
                {
                    text: 'Unlock',
                    onPress: async () => {
                        const res = await CoinStore.unlock(bgIndex);
                        if (res.success) {
                            Alert.alert(t('Unlocked'), t('Activefor'));
                            load();
                        } else {
                            Alert.alert('Error', res.message);
                        }
                    },
                },
            ]
        );
    };

    const handleBack = () => {
        showInterstitialAd('coin_screen', () => {
            navigation.goBack();
        });
    };

    const getItemState = (bgIndex: number): { unlocked: boolean; daysLeft: number } => {
        const item = unlocked.find(u => u.bgIndex === bgIndex);
        if (!item) return { unlocked: false, daysLeft: 0 };
        const diffDays = (Date.now() - new Date(item.unlockedAt).getTime()) / (1000 * 60 * 60 * 24);
        return { unlocked: true, daysLeft: Math.max(0, Math.ceil(15 - diffDays)) };
    };

    return (
        <View style={[S.root, { paddingTop: ins.top }]}>
            {/* Header */}
            <View style={S.header}>
                <TouchableOpacity onPress={handleBack} style={S.closeBtn} activeOpacity={0.7}>
                    <View style={[S.closeBtnCircle, { backgroundColor: colors.surface }]}>
                        <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
                    </View>
                </TouchableOpacity>
                <Text style={S.headerTitle}>{t('Coins')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: ins.bottom + 32 }}>
                <ImageBackground
                    source={require('../../assets/img/bg.png')}
                    style={S.balanceCard}
                    imageStyle={{ borderRadius: 20 }}
                    resizeMode="cover"
                >
                    <Image
                        source={require('../../assets/img/coin.png')}
                        style={{ width: 68, height: 68 }}
                        resizeMode="contain"
                    />
                    <View style={{ marginLeft: 16 }}>
                        <Text style={[S.balanceNum, { color: '#ffffff' }]}>{coins}</Text>
                        <Text style={S.balanceLabel}>{t('TotalCoins')}</Text>
                    </View>
                </ImageBackground>

                {/* How to earn */}
                <Text style={S.sectionTitle}>{t('HowtoEarnCoins')}</Text>
                <View style={S.infoCard}>
                    <View style={S.earnRow}>
                        <View style={[S.earnIcon, { backgroundColor: colors.primary + '18' }]}>
                            <Image
                                source={require('../../assets/icons/alarm.png')}
                                style={{ width: 20, height: 20, tintColor: colors.textSecondary }}
                                resizeMode="contain"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={S.earnTitle}>{t('SetEdit')}</Text>
                            <Text style={S.earnSub}>{t('Onceperday')}</Text>
                        </View>
                        <Image
                            source={require('../../assets/img/coin.png')}
                            style={{ width: 20, height: 20 }}
                            resizeMode="contain"
                        />
                        {/* <Text style={S.earnAmt}>+2 🪙</Text> */}
                    </View>
                    <View style={[S.divider]} />
                    <View style={S.earnRow}>
                        <View style={[S.earnIcon, { backgroundColor: colors.primary + '18' }]}>
                            {/* <Text style={{ fontSize: 18 }}>🧮</Text> */}
                            <Image
                                source={require('../../assets/icons/math.png')}
                                style={{ width: 20, height: 20, tintColor: colors.textSecondary }}
                                resizeMode="contain"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={S.earnTitle}>{t('EnableMath')}</Text>
                            <Text style={S.earnSub}>{t('day5coins')}</Text>
                        </View>
                        <Image
                            source={require('../../assets/img/coin.png')}
                            style={{ width: 20, height: 20 }}
                            resizeMode="contain"
                        />
                        {/* <Text style={S.earnAmt}>+5 🪙</Text> */}
                    </View>
                </View>

                {/* Locked Backgrounds */}
                <Text style={S.sectionTitle}>{t('LockedBackgrounds')}</Text>
                <Text style={S.sectionSub}>{t('Activefor15days')}</Text>

                <View style={S.bgGrid}>
                    {LOCKED_BG_IMAGES.map(bg => {
                        const state = getItemState(bg.index);
                        return (
                            <View key={bg.index} style={S.bgCard}>
                                <Image source={bg.src} style={S.bgThumb} resizeMode="cover" />

                                {/* Overlay */}
                                {!state.unlocked && (
                                    <View style={S.lockOverlay}>
                                        <Text style={{ fontSize: 22 }}>🔒</Text>
                                    </View>
                                )}
                                {state.unlocked && (
                                    <View style={[S.lockOverlay, { backgroundColor: 'rgba(0,0,0,0.25)' }]}>
                                        <Text style={{ fontSize: 22 }}>✅</Text>
                                        <Text style={S.daysLeftTxt}>{state.daysLeft}{t('dleft')}</Text>
                                    </View>
                                )}

                                <View style={S.bgCardFooter}>
                                    <Text style={S.bgLabel}>{bg.label}</Text>
                                    {state.unlocked ? (
                                        <View style={S.unlockedBadge}>
                                            <Text style={S.unlockedBadgeTxt}>{t('Active')}</Text>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            style={[S.unlockBtn, coins < 50 && S.unlockBtnDisabled]}
                                            onPress={() => handleUnlock(bg.index)}
                                        >
                                            <Text style={S.unlockBtnTxt}>{t('Unlock')}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Custom background unlock */}
                <Text style={S.sectionTitle}>{t('CustomBackground')}</Text>
                <Text style={S.sectionSub}>{t('Useyourownphoto')}</Text>
                <View style={S.customCard}>
                    {(() => {
                        const state = getItemState(100);
                        return (
                            <>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <View style={[S.earnIcon, {
                                        backgroundColor: colors.primary + '18',
                                        width: 54, height: 54, borderRadius: 14,
                                    }]}>
                                        <Image
                                            source={require('../../assets/icons/Icon.png')}
                                            style={{ width: 20, height: 20, tintColor: colors.textSecondary }}
                                            resizeMode="contain"
                                        />
                                        {/* <Text style={{ fontSize: 24 }}>🖼️</Text> */}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={S.earnTitle}>{t('ChoosefromGallery')}</Text>
                                        <Text style={S.earnSub}>
                                            {state.unlocked
                                                ? `${t('Unlocked')} · ${state.daysLeft} ${t('daysleft')}`
                                                : `${t('coins50')} · ${t('Activefor')}`}
                                        </Text>
                                    </View>
                                </View>
                                {!state.unlocked && (
                                    <TouchableOpacity
                                        style={[S.unlockBtn, { marginTop: 12, alignSelf: 'flex-end' }, coins < 50 && S.unlockBtnDisabled]}
                                        onPress={() => handleUnlock(100)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Image
                                                source={require('../../assets/img/coin.png')}
                                                style={{ width: 50, height: 40, }}
                                                resizeMode="contain"
                                            />
                                            <Text style={S.unlockBtnTxt}>{t('Unlock50')}</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                {state.unlocked && (
                                    <View style={[S.unlockedBadge, { marginTop: 10, alignSelf: 'flex-end' }]}>
                                        <Text style={S.unlockedBadgeTxt}>✓ {t('Unlocked')} — {state.daysLeft}{t('dleft')}</Text>
                                    </View>
                                )}
                            </>
                        );
                    })()}
                </View>

                {/* Custom Sounds unlock */}
                <Text style={S.sectionTitle}>{t('CustomSounds')}</Text>
                <View style={S.customCard}>
                    {(() => {
                        const state = getItemState(200);
                        return (
                            <>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <View style={[S.earnIcon, {
                                        backgroundColor: colors.primary + '18',
                                        width: 54, height: 54, borderRadius: 14,
                                    }]}>
                                        <Ionicons name="musical-note-outline" size={22} color={colors.textSecondary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={S.earnTitle}>{t('ChoosefromFiles')}</Text>
                                        <Text style={S.earnSub}>
                                            {state.unlocked
                                                ? `Unlocked · ${state.daysLeft} days left`
                                                : `${t('Activefor15days')}`}
                                        </Text>
                                    </View>
                                </View>
                                {!state.unlocked && (
                                    <TouchableOpacity
                                        style={[S.unlockBtn, { marginTop: 12, alignSelf: 'flex-end' }, coins < 50 && S.unlockBtnDisabled]}
                                        onPress={() => handleUnlock(200)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Image
                                                source={require('../../assets/img/coin.png')}
                                                style={{ width: 50, height: 40 }}
                                                resizeMode="contain"
                                            />
                                            <Text style={S.unlockBtnTxt}>{t('Unlock50')}</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                {state.unlocked && (
                                    <View style={[S.unlockedBadge, { marginTop: 10, alignSelf: 'flex-end' }]}>
                                        <Text style={S.unlockedBadgeTxt}>✓ {t('Unlocked')} — {state.daysLeft}{t('dleft')}</Text>
                                    </View>
                                )}
                            </>
                        );
                    })()}
                </View>
            </ScrollView>
            <View style={S.stickyAdContainer}>
                <AdBanner screen="coin_screen" />
            </View>
        </View>
    );
}

const styles = (colors: any) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    stickyAdContainer: {
        position: 'absolute',
        bottom: 12,
        width: '100%',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    closeBtn: { minWidth: 50, alignItems: 'flex-start', justifyContent: 'center' },
    closeBtnCircle: {
        width: 40,
        height: 40,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    balanceCard: {
        margin: 16,
        padding: 24,
        borderRadius: 20,
        borderWidth: 0.5,
        borderColor: colors.primary + '44',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    coinIcon: { fontSize: 44, marginBottom: 4 },
    balanceNum: { fontSize: 52, fontWeight: '500', letterSpacing: -2 },
    balanceLabel: { fontSize: 15, fontWeight: '500', color: colors.textSecondary, marginTop: 2, marginBottom: 14 },
    todayRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
    todayChip: {
        paddingHorizontal: 12, paddingVertical: 6,
        backgroundColor: colors.primary + '18',
        borderRadius: 20, borderWidth: 1, borderColor: colors.primary + '40',
    },
    chipDone: { backgroundColor: '#1D9E7522', borderColor: '#1D9E75' },
    chipTxt: { fontSize: 12, color: colors.primary, fontWeight: '600' },
    chipTxtDone: { color: '#1D9E75' },

    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginLeft: 16, marginTop: 20, marginBottom: 4 },
    sectionSub: { fontSize: 12, color: colors.textTertiary, marginLeft: 16, marginBottom: 10 },

    infoCard: {
        marginHorizontal: 16,
        backgroundColor: colors.surface,
        borderRadius: 16, padding: 14,
        borderWidth: 0.5, borderColor: colors.border,
    },
    earnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
    earnIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    earnTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
    earnSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    earnAmt: { fontSize: 15, fontWeight: '700', color: '#FAC775' },
    divider: { height: 0.5, backgroundColor: colors.border, marginVertical: 6 },

    bgGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        paddingHorizontal: 12, gap: 10,
    },
    bgCard: {
        width: '47%', borderRadius: 14,
        overflow: 'hidden', backgroundColor: colors.surface,
        borderWidth: 0.5, borderColor: colors.border,
    },
    bgThumb: { width: '100%', height: 120 },
    lockOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, height: 120,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center', justifyContent: 'center', gap: 4,
    },
    lockCoinTxt: { fontSize: 12, color: '#FAC775', fontWeight: '700' },
    daysLeftTxt: { fontSize: 12, color: '#5DCAA5', fontWeight: '700' },
    bgCardFooter: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
    },
    bgLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
    unlockBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 12, paddingVertical: 5,
        borderRadius: 10,
    },
    unlockBtnDisabled: { backgroundColor: colors.border, opacity: 0.6 },
    unlockBtnTxt: { fontSize: 12, color: '#fff', fontWeight: '700' },
    unlockedBadge: {
        backgroundColor: '#1D9E7522', borderWidth: 1, borderColor: '#1D9E75',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    },
    unlockedBadgeTxt: { fontSize: 11, color: '#1D9E75', fontWeight: '700' },
    customCard: {
        marginHorizontal: 16, padding: 14,
        backgroundColor: colors.surface,
        borderRadius: 16, borderWidth: 0.5, borderColor: colors.border,
        marginBottom: 8,
    },
});