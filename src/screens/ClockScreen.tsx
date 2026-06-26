// src/screens/ClockScreen.tsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Image, Modal,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { Country } from '../data/countries';
import { WorldClockCard } from '../components/WorldClockCard';
import AddCountryScreen from './AddCountryScreen';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';
import PurchaseScreen from './PurchaseScreen';

const { width: SW, height: SH } = Dimensions.get('window');
const WORLD_CLOCKS_KEY = '@world_clocks_v1';

const p2 = (n: number) => String(n).padStart(2, '0');

function useFmtT(t: (k: string) => string) {
  return (h: number, m: number) => ({
    disp: `${p2(h % 12 || 12)}:${p2(m)}`,
    per: h >= 12 ? t('pm') : t('am'),
  });
}

function AnalogClock({ size = 200, colors }: { size?: number; colors: any }) {
  const secondAnim = useRef(new Animated.Value(0)).current;
  const minuteAnim = useRef(new Animated.Value(0)).current;
  const hourAnim = useRef(new Animated.Value(0)).current;
  const [isPremium, setIsPremium] = useState(false);

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
  // const glow = [
  //   { extra: 80, opacity: isDark ? 0.13 : 0.09 },
  //   { extra: 54, opacity: isDark ? 0.09 : 0.06 },
  // ];

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
          borderRadius: (size + extra) / 2,
          backgroundColor: color,
        }} />
      ))}
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: clockBg, alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: isDark ? '#6563FF' : '#000',
        shadowOpacity: isDark ? 0.3 : 0.08,
        shadowRadius: isDark ? 20 : 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      }}>
        <View style={{
          position: 'absolute', width: size - 8, height: size - 8,
          borderRadius: (size - 8) / 2, borderWidth: 1, borderColor: ringBorder,
        }} />
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const r = cx - 16;
          const x = cx + r * Math.sin(angle) - 2;
          const y = cx - r * Math.cos(angle) - (i % 3 === 0 ? 5 : 3);
          return (
            <View key={i} style={{
              position: 'absolute', left: x, top: y,
              width: 4, height: i % 3 === 0 ? 10 : 5, borderRadius: 2,
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
          shadowColor: colors.primary, shadowOpacity: 0.8, shadowRadius: 6, elevation: 4,
        }} />
      </View>
    </View>
  );
}

function DigitalClock({ colors }: { colors: any }) {
  const { t } = useTranslation();
  const fmtT = useFmtT(t);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = now.getHours();
  const m = now.getMinutes();
  const { disp, per } = fmtT(h, m);

  const months = [
    t('jan'), t('feb'), t('mar'), t('apr'),
    t('may'), t('jun'), t('jul'), t('aug'),
    t('sep'), t('oct'), t('nov'), t('dec'),
  ];
  const days = [
    t('sunday'), t('monday'), t('tuesday'), t('wednesday'),
    t('thursday'), t('friday'), t('saturday'),
  ];

  return (
    <View style={{ alignItems: 'center', marginTop: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text style={{
          fontSize: 44, fontWeight: '200', color: colors.text,
          letterSpacing: -1, fontVariant: ['tabular-nums'],
        }}>
          {disp}
        </Text>
        <Text style={{ fontSize: 18, fontWeight: '500', color: colors.textSecondary }}>
          {per}
        </Text>
      </View>
      <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}>
        {now.getDate()} {months[now.getMonth()]}, {days[now.getDay()]}
      </Text>
    </View>
  );
}

export default function ClockScreen() {
  const ins = useSafeAreaInsets();
  const { colors } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const [worldClocks, setWorldClocks] = useState<Country[]>([]);
  const [showAddCountry, setShowAddCountry] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(WORLD_CLOCKS_KEY).then(raw => {
      if (raw) setWorldClocks(JSON.parse(raw));
    });
  }, []);

  const lastOpenParam = useRef<number | null>(null);
  useEffect(() => {
    const param = route.params?.openAddCountry;
    if (param && param !== lastOpenParam.current) {
      lastOpenParam.current = param;
      setShowAddCountry(true);
    }
  }, [route.params?.openAddCountry]);

  const handleAddCountries = async (newOnes: Country[]) => {
    const merged = [
      ...worldClocks,
      ...newOnes.filter(n => !worldClocks.some(w => w.name === n.name)),
    ];
    setWorldClocks(merged);
    setShowAddCountry(false);
    await AsyncStorage.setItem(WORLD_CLOCKS_KEY, JSON.stringify(merged));
  };

  const handleDeleteClock = async (name: string) => {
    const updated = worldClocks.filter(c => c.name !== name);
    setWorldClocks(updated);
    await AsyncStorage.setItem(WORLD_CLOCKS_KEY, JSON.stringify(updated));
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
  const [showPremium, setShowPremium] = useState(false);
  const ORB_SIZE = SW * 1.9;
  const ORB_VISIBLE = SH * 0.40;
  const MINI_HEADER_H = CLOCK_SMALL + 150;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* Background orb */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: ORB_VISIBLE, overflow: 'hidden',
      }}>
        <Image
          source={colors.isDark
            ? require('../../assets/background/night.png')
            : require('../../assets/background/day.png')}
          style={{
            position: 'absolute', width: ORB_SIZE, height: ORB_SIZE,
            borderRadius: ORB_SIZE / 2, top: -(ORB_SIZE - ORB_VISIBLE), alignSelf: 'center',
          }}
          resizeMode="cover"
        />
      </View>

      {/* Header */}
      <View style={[hdr.wrap, { paddingTop: ins.top + 12 }]}>
        <Text style={[hdr.title, { color: colors.text }]}>{t('worldClock')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setShowPremium(true)}
            style={[hdr.gear, { marginTop: -15 }]}
            activeOpacity={0.8}
          >
            <LottieView
              source={require('../../assets/animations/premium_star.json')}
              autoPlay
              loop
              style={{ width: 43, height: 43 }}
            />
          </TouchableOpacity>
          <TouchableOpacity style={hdr.gear} onPress={() => navigation.getParent()?.navigate('Settings')}>
            <Image
              source={require('../../assets/icons/settings.png')}
              style={{ width: 30, height: 30, tintColor: colors.textSecondary }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scroll content */}
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
          height: LARGE_CLOCK_SECTION_H, alignItems: 'center',
          justifyContent: 'center', opacity: largeclockOpacity,
        }}>
          <AnalogClock size={CLOCK_LARGE} colors={colors} />
          <DigitalClock colors={colors} />
        </Animated.View>

        <View style={[card.wrap, { marginBottom: 0 }]}>
          {worldClocks.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 30, justifyContent: 'center', flex: 1, minHeight: 200 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textSecondary }}>
                {/* {t('noWorld')} */}
              </Text>
            </View>
          ) : (
            worldClocks.map(item => (
              <WorldClockCard
                key={item.name}
                country={item}
                colors={colors}
                onDelete={() => handleDeleteClock(item.name)}
              />
            ))
          )}
        </View>
      </Animated.ScrollView>

      {/* Mini sticky header */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: ins.top + 52,
        left: 0, right: 0, height: MINI_HEADER_H, overflow: 'hidden',
      }}>
        <Animated.View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: colors.background,
          opacity: scrollY.interpolate({
            inputRange: [THRESHOLD * 0.5, THRESHOLD],
            outputRange: [0, 1], extrapolate: 'clamp',
          }),
        }}>
          <Image
            source={colors.isDark
              ? require('../../assets/background/night.png')
              : require('../../assets/background/day.png')}
            style={{
              position: 'absolute', width: ORB_SIZE, height: ORB_SIZE,
              borderRadius: ORB_SIZE / 2,
              top: -(ORB_SIZE - ORB_VISIBLE) - (ins.top + 52),
              alignSelf: 'center',
            }}
            resizeMode="cover"
          />
        </Animated.View>

        <Animated.View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
          <Animated.View style={{ opacity: miniClockOpacity, transform: [{ scale: miniClockScale }] }}>
            <AnalogClock size={CLOCK_SMALL} colors={colors} />
          </Animated.View>
          <Animated.View style={{ opacity: digitalOpacity, transform: [{ translateX: digitalTranslateX }], flex: 1, paddingLeft: 4 }}>
            <DigitalClock colors={colors} />
          </Animated.View>
        </Animated.View>
      </View>

      {/* Add Country Modal */}
      <Modal visible={showAddCountry} animationType="slide" presentationStyle="fullScreen">
        <AddCountryScreen
          alreadyAdded={worldClocks.map(c => c.name)}
          onAdd={handleAddCountries}
          onBack={() => setShowAddCountry(false)}
        />
      </Modal>
      <PurchaseScreen
        visible={showPremium}
        onClose={() => setShowPremium(false)}
        onSuccess={() => {
          setShowPremium(false);
          setIsPremium(true);
        }}
      />
    </View>
  );
}

const card = StyleSheet.create({
  wrap: { paddingVertical: 14, marginBottom: 10 },
  bgStrip: { width: '100%', height: 6 },
  body: { padding: 14 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  time: { fontSize: 42, fontWeight: '200', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  per: { fontSize: 15, fontWeight: '500', marginBottom: 4 },
  sub: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  dots: { flexDirection: 'row', gap: 5, marginTop: 12 },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dotTxt: { fontSize: 10 },
  emptyImage: { width: SW * 0.40, height: SW * 0.40, opacity: 0.50 },
});

const hdr = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700' },
  gear: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});