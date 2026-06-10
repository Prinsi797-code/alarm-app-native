// src/components/AppHeader.tsx
import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  StyleSheet, Platform,Image
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

function MiniClock({ colors }: { colors: any }) {
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

  const rotate = (anim: Animated.Value) =>
    anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={[clock.face, {
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    }]}>
      <Animated.View style={[clock.hand, clock.hour, {
        backgroundColor: colors.text,
        transform: [{ rotate: rotate(hourAnim) }],
      }]} />
      <Animated.View style={[clock.hand, clock.minute, {
        backgroundColor: colors.text,
        transform: [{ rotate: rotate(minuteAnim) }],
      }]} />
      <Animated.View style={[clock.hand, clock.second, {
        backgroundColor: colors.primary,
        transform: [{ rotate: rotate(secondAnim) }],
      }]} />
      <View style={[clock.dot, { backgroundColor: colors.primary }]} />
    </View>
  );
}

const clock = StyleSheet.create({
  face: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  hand: {
    position: 'absolute', bottom: '50%', left: '50%',
    borderRadius: 2,
  },
  hour: { width: 2, height: 8, marginLeft: -1 },
  minute: { width: 1.5, height: 11, marginLeft: -0.75 },
  second: { width: 1, height: 12, marginLeft: -0.5 },
  dot: { width: 4, height: 4, borderRadius: 2, position: 'absolute' },
});

export default function AppHeader({ title }: { title: string }) {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();

  return (
    <View style={[styles.wrapper, { borderBottomColor: colors.border }]}>
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType={isDark ? 'dark' : 'light'}
        blurAmount={20}
        reducedTransparencyFallbackColor={colors.tabBar}
      />
      <View style={styles.inner}>

        <View style={styles.left}>
          <MiniClock colors={colors} />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>

        <TouchableOpacity
          style={[styles.settBtn, {
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border,
          }]}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}
        >
          <Image
            source={require('../../assets/icons/settings.png')}
            style={{ width: 20, height: 20, tintColor: colors.textSecondary }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: Platform.OS === 'ios' ? 54 : 28,
    borderBottomWidth: 0.5,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: 0.2 },
  settBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5,
  },
});