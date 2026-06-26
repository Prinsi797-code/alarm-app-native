// src/screens/SettingsScreen.tsx

import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Linking, Share, Animated,Image
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadDefaultSnooze, SNOOZE_LABELS, SNOOZE_OPTS } from './SnoozePickerScreen';
import { loadDefaultRingtone } from './RingtonePickerScreen';
import LottieView from 'lottie-react-native';

const DEFAULT_VIBRATE_KEY = '@default_vibrate';
const ICON_KEY = '@selected_app_icon';

export async function loadDefaultVibrate(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(DEFAULT_VIBRATE_KEY);
    return v === null ? true : v === 'true';
  } catch { return true; }
}

async function saveDefaultVibrate(v: boolean) {
  try { await AsyncStorage.setItem(DEFAULT_VIBRATE_KEY, String(v)); } catch { }
}

function Toggle({ value, onChange, primary }: { value: boolean; onChange: (v: boolean) => void; primary: string }) {
  const anim = React.useRef(new Animated.Value(value ? 1 : 0)).current;
  React.useEffect(() => {
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
  thumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF', position: 'absolute', elevation: 3 },
});

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const ins = useSafeAreaInsets();
  const { t } = useTranslation();

  const [snoozeSub, setSnoozeSub] = useState('');
  const [ringtoneSub, setRingtoneSub] = useState('');
  const [defaultVibrate, setDefaultVibrate] = useState(true);
  const [iconSub, setIconSub] = useState('Classic');

  const ICON_LABELS: Record<string, string> = {
    Default: t('Classic'),
    logo1: t('Dark'),
    logo2: t('Sunset'),
    logo3: t('Forest'),
  };

  useFocusEffect(
    useCallback(() => {
      loadDefaultSnooze().then(mins => {
        setSnoozeSub(SNOOZE_OPTS.includes(mins) ? SNOOZE_LABELS[mins] : `${mins} minutes`);
      });
      loadDefaultRingtone().then(tone => setRingtoneSub(tone));
      loadDefaultVibrate().then(v => setDefaultVibrate(v));

      AsyncStorage.getItem(ICON_KEY).then(v => {
        const key = v ?? 'Default';
        setIconSub(ICON_LABELS[key] ?? 'Classic');
      });
    }, [])
  );

  const handleVibrateToggle = async (v: boolean) => {
    setDefaultVibrate(v);
    await saveDefaultVibrate(v);
  };

  const MAIN_ROWS = [
    { icon: 'alarm-outline', label: t('snooze'), sub: snoozeSub, screen: 'SnoozePicker', accent: '#6563FF' },
    { icon: 'musical-notes-outline', label: t('alarmSound'), sub: ringtoneSub, screen: 'RingtonePicker', accent: '#6563FF' },
    { icon: 'language-outline', label: t('switchLanguage'), sub: t('english'), screen: 'Language', accent: '#6563FF' },
    { icon: 'moon-outline', label: t('themeMode'), sub: t('followSystem'), screen: 'ThemeMode', accent: '#6563FF' },
    { icon: 'color-palette-outline', label: t('appIcon') ?? 'App Icon', sub: iconSub, screen: 'AppLogo', accent: '#6563FF' },
  ];

  const MORE_ROWS = [
    { icon: 'share-social-outline', label: t('share'), key: 'Share' },
    { icon: 'star-outline', label: t('rateUs'), key: 'Rate' },
    { icon: 'shield-outline', label: t('privacyPolicy'), key: 'Privacy' },
  ];

  const handleMore = async (key: string) => {
    if (key === 'Privacy') Linking.openURL('https://alarm-app.blogspot.com/');
    else if (key === 'Share') Share.share({
      message: 'Check out this amazing Alarm app! https://apps.apple.com/in/app/alarm2026-smart-alarm-clock/id6779944599',
      url: 'https://apps.apple.com/in/app/alarm2026-smart-alarm-clock/id6779944599',
    });
    else if (key === 'Rate') Linking.openURL('https://apps.apple.com/in/app/alarm2026-smart-alarm-clock/id6779944599');
  };

  const S = makeStyles(colors, isDark);

  return (
    <View style={[S.root, { paddingTop: ins.top }]}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn} activeOpacity={0.7}>
          <View style={[S.backCircle, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
        <Text style={S.headerTitle}>{t('settings')}</Text>
        <View style={{ width: 40 }} />
      </View>
      <TouchableOpacity
        onPress={() => navigation.navigate('CoinScreen')}
        activeOpacity={0.9}
        style={{
          marginHorizontal: 16,
          marginBottom: 12,
          borderRadius: 20,
          overflow: 'hidden',
        }}
      >
        <Image
          source={require('../../assets/animations/bgcoin.png')}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            width: '100%',
            height: '100%',
          }}
          resizeMode="cover"
        />
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 16,
          paddingHorizontal: 16,
        }}>
          <LottieView
            source={require('../../assets/animations/gift.json')}
            autoPlay
            loop
            style={{ width: 80, height: 70 }}
          />

          <View style={{ flex: 1, marginLeft: 2 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>
              {t('CoinBalance')}
            </Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              {t('HowToUnlocked')}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('CoinScreen')}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              paddingVertical: 10,
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1565C0' }}>
              {t('CoinsButton')}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: ins.bottom + 32, paddingTop: 8 }}
      >
        <View style={S.section}>
          {MAIN_ROWS.map((item, idx) => {
            const isLast = idx === MAIN_ROWS.length - 1;
            return (
              <TouchableOpacity
                key={item.screen}
                style={[S.row, !isLast && S.rowDivider]}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.6}
              >
                <View style={[S.iconBox, { backgroundColor: item.accent + '18' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.accent} />
                </View>
                <View style={S.rowText}>
                  <Text style={S.rowLabel}>{item.label}</Text>
                  {!!item.sub && <Text style={S.rowSub}>{item.sub}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={S.section}>
          <View style={S.row}>
            <View style={[S.iconBox, { backgroundColor: '#6563FF18' }]}>
              <Ionicons name="phone-portrait-outline" size={20} color="#6563FF" />
            </View>
            <View style={S.rowText}>
              <Text style={S.rowLabel}>{t('vibrate')}</Text>
              <Text style={S.rowSub}>
                {defaultVibrate ? t('vibrateOn') : t('vibrateOff')}
              </Text>
            </View>
            <Toggle value={defaultVibrate} onChange={handleVibrateToggle} primary={colors.primary} />
          </View>
        </View>

        <View style={S.section}>
          {MORE_ROWS.map((item, idx) => {
            const isLast = idx === MORE_ROWS.length - 1;
            return (
              <TouchableOpacity
                key={item.key}
                style={[S.row, !isLast && S.rowDivider]}
                onPress={() => handleMore(item.key)}
                activeOpacity={0.6}
              >
                <View style={[S.iconBox, { backgroundColor: colors.border + '55' }]}>
                  <Ionicons name={item.icon as any} size={20} color={colors.textSecondary} />
                </View>
                <View style={S.rowText}>
                  <Text style={S.rowLabel}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={S.version}>{t('version')} 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
  },
  backBtn: { minWidth: 50, alignItems: 'flex-start', justifyContent: 'center' },
  backCircle: { width: 40, height: 40, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  section: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 16, borderWidth: 0.5, borderColor: colors.border, overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowDivider: { borderBottomWidth: 0.5, borderBottomColor: colors.border + '66' },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: colors.text },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  version: { textAlign: 'center', fontSize: 12, color: colors.textTertiary, marginTop: 8 },
});