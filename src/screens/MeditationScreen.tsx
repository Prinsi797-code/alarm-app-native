import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import AppHeader from '../contexts/AppHeader';

const SESSIONS = [
  { label: '5 min',  seconds: 300,  emoji: '🌱' },
  { label: '10 min', seconds: 600,  emoji: '🌿' },
  { label: '15 min', seconds: 900,  emoji: '🌳' },
  { label: '20 min', seconds: 1200, emoji: '🏔️' },
];

export default function MeditationScreen() {
  const { colors } = useTheme();
  const [selected, setSelected] = useState(0);
  const [remaining, setRemaining] = useState(SESSIONS[0].seconds);
  const [running, setRunning] = useState(false);
  const breathAnim = useRef(new Animated.Value(1)).current;
  const ref = useRef<any>(null);

  useEffect(() => {
    if (running) {
      // Breath animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathAnim, { toValue: 1.3, duration: 4000, useNativeDriver: true }),
          Animated.timing(breathAnim, { toValue: 1,   duration: 4000, useNativeDriver: true }),
        ])
      ).start();
      ref.current = setInterval(() => setRemaining(p => {
        if (p <= 1) { setRunning(false); clearInterval(ref.current); return 0; }
        return p - 1;
      }), 1000);
    } else {
      breathAnim.stopAnimation();
      breathAnim.setValue(1);
      clearInterval(ref.current);
    }
    return () => clearInterval(ref.current);
  }, [running]);

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Meditation" />
      <View style={styles.center}>
        <Animated.View style={[styles.circle, {
          borderColor: colors.primary,
          backgroundColor: `${colors.primary}20`,
          transform: [{ scale: breathAnim }],
        }]}>
          <Text style={{ fontSize: 48 }}>🧘</Text>
          <Text style={[styles.time, { color: colors.text }]}>{fmt(remaining)}</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {running ? 'Breathe...' : 'Ready'}
          </Text>
        </Animated.View>

        <View style={styles.presets}>
          {SESSIONS.map((s, i) => (
            <TouchableOpacity key={i}
              style={[styles.preset, {
                backgroundColor: selected === i ? colors.primary : colors.inputBg,
                borderColor: selected === i ? colors.primary : 'transparent',
              }]}
              onPress={() => { setSelected(i); setRemaining(s.seconds); setRunning(false); }}>
              <Text style={{ fontSize: 16 }}>{s.emoji}</Text>
              <Text style={{ color: selected === i ? '#fff' : colors.text, fontSize: 13 }}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.startBtn, { backgroundColor: running ? colors.danger : colors.primary }]}
          onPress={() => setRunning(p => !p)}>
          <Text style={styles.startText}>{running ? 'Pause' : 'Begin'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32 },
  circle: { width: 200, height: 200, borderRadius: 100, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 6 },
  time: { fontSize: 28, fontWeight: '200', fontVariant: ['tabular-nums'] },
  hint: { fontSize: 13 },
  presets: { flexDirection: 'row', gap: 10 },
  preset: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, gap: 4, borderWidth: 1 },
  startBtn: { paddingHorizontal: 60, paddingVertical: 16, borderRadius: 30 },
  startText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});