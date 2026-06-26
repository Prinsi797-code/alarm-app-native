import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, Platform, Share, Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

const { width: SW } = Dimensions.get('window');
const RING_SIZE = SW * 0.50;
const STROKE = 6;
const R = (RING_SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

type Lap = { index: number; lapMs: number; totalMs: number };

const fmt = (ms: number, showMs = true) => {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const cs = Math.floor((ms % 1000) / 10);
  if (showMs) return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function StopwatchScreen() {
  const { colors } = useTheme();
  const ins = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<Lap[]>([]);
  const startRef = useRef<number>(0);
  const baseRef = useRef<number>(0);
  const rafRef = useRef<any>(null);
  const { t } = useTranslation();

  const tick = useCallback(() => {
    setElapsed(baseRef.current + (Date.now() - startRef.current));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now();
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [running, tick]);

  const handleStartStop = () => {
    if (running) {
      baseRef.current = elapsed;
      setRunning(false);
    } else {
      setRunning(true);
    }
  };

  const handleReset = () => {
    setRunning(false);
    baseRef.current = 0;
    setElapsed(0);
    setLaps([]);
  };

  const handleLap = () => {
    if (!running && elapsed === 0) return;
    const prevTotal = laps.length > 0 ? laps[0].totalMs : 0;
    const lapMs = elapsed - prevTotal;
    setLaps(prev => [{ index: prev.length + 1, lapMs, totalMs: elapsed }, ...prev]);
  };

  const handleShare = async () => {
    if (laps.length === 0) return;

    const header = `🏁 Stopwatch Results\n${'─'.repeat(10)}\n`;
    const colHeader = `Lap    Lap Time     Overall Time\n`;

    const rows = [...laps].reverse().map(lap => {
      const lapColor = lap.lapMs === minLap && laps.length > 1 ? '🟢' :
        lap.lapMs === maxLap && laps.length > 1 ? '🔴' : '⚪';
      return `${lapColor} #${String(lap.index).padStart(2, '0')}   ${fmt(lap.lapMs)}   ${fmt(lap.totalMs)}`;
    }).join('\n');

    const totalLine = `${'─'.repeat(35)}\n⏱ Total: ${fmt(elapsed)}`;

    const message = header + colHeader + rows + '\n' + totalLine;

    try {
      await Share.share({ message });
    } catch (e) {
      console.log('Share error:', e);
    }
  };
  const secInMinute = (elapsed / 1000) % 60;
  const progress = (elapsed % 1000) / 1000;
  const strokeDashoffset = CIRC * (1 - progress);

  const lapTimes = laps.map(l => l.lapMs);
  const minLap = laps.length > 1 ? Math.min(...lapTimes) : -1;
  const maxLap = laps.length > 1 ? Math.max(...lapTimes) : -1;

  const getLapColor = (ms: number) => {
    if (laps.length < 2) return colors.text;
    if (ms === minLap) return '#4CAF50';
    if (ms === maxLap) return '#F44336';
    return colors.text;
  };
  const S = styles(colors);
  return (
    <View style={[S.root, { paddingTop: ins.top }]}>

      <View style={S.header}>
        <Text style={S.title}>{t('stopWatch')}</Text>

        <TouchableOpacity style={S.gearBtn} onPress={() => navigation.navigate('Settings')}>
          <Image source={require('../../assets/icons/settings.png')} style={{ width: 30, height: 30, tintColor: colors.textSecondary }} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      <View style={S.ringWrap}>
        <View style={[S.glow, { width: RING_SIZE * 1.1, height: RING_SIZE * 1.1, borderRadius: RING_SIZE }]} />
        <Svg width={RING_SIZE} height={RING_SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={R}
            stroke={colors.surface}
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={R}
            stroke={colors.primary}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={`${CIRC}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
          <G transform={`rotate(${progress * 360}, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}>
          </G>
        </Svg>

        <View style={S.ringCenter} pointerEvents="none">
          <Text style={S.timeText}>{fmt(elapsed)}</Text>
        </View>
      </View>
      
      <ScrollView
        style={S.lapScroll}
        contentContainerStyle={S.lapContent}
        showsVerticalScrollIndicator={false}
      >
        {laps.length > 0 && (
          <View style={[S.lapTable, { borderColor: colors.border }]}>
            <View style={[S.lapRow, S.lapHeader]}>
              <Text style={[S.lapCell, S.lapHdrTxt, { flex: 0.6 }]}>{t('Lap')}</Text>
              <Text style={[S.lapCell, S.lapHdrTxt]}>{t('LapTimes')}</Text>
              <Text style={[S.lapCell, S.lapHdrTxt]}>{t('OverallTime')}</Text>
            </View>
            {laps.map((lap) => {
              const c = getLapColor(lap.lapMs);
              return (
                <View key={lap.index} style={[S.lapRow, { borderTopWidth: 0.5, borderTopColor: colors.border + '44' }]}>
                  <Text style={[S.lapCell, { flex: 0.6, color: c, fontWeight: '700' }]}>
                    #{String(lap.index).padStart(2, '0')}
                  </Text>
                  <Text style={[S.lapCell, { color: c }]}>{fmt(lap.lapMs)}</Text>
                  <Text style={[S.lapCell, { color: c }]}>{fmt(lap.totalMs)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[S.btnRow, { paddingBottom: ins.bottom + 150 }]}>
        <TouchableOpacity onPress={handleReset} style={S.iconBtn} activeOpacity={0.75}>
          <View style={[S.iconBtnInner, { borderColor: colors.primary + '66' }]}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleStartStop}
          activeOpacity={0.85}
          style={[
            S.mainBtn,
            { borderColor: running ? '#F44336' : colors.primary },
          ]}
        >
          <Text style={[S.mainBtnTxt, { color: running ? '#F44336' : colors.primary }]}>
            {/* {running ? 'Stop' : elapsed > 0 ? 'Resume' : 'Start'} */}
            {running ? t('Stop') : elapsed > 0 ? t('Resume') : t('Start')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={running ? handleLap : handleShare}
          style={S.iconBtn}
          activeOpacity={0.75}
        >
          <View style={[S.iconBtnInner, { borderColor: colors.primary + '66' }]}>
            <Ionicons
              name={running ? 'flag-outline' : 'share-social-outline'}
              size={20}
              color={colors.primary}
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  gearBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  ringWrap: {
    alignItems: 'center', justifyContent: 'center',
    marginTop: 16, marginBottom: 8,
    height: RING_SIZE + 40,
  },
  glow: {
    position: 'absolute',
    backgroundColor: colors.background,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.30,
    shadowRadius: 10,
    elevation: 0,
    width: '100%', height: '100%',
    borderRadius: RING_SIZE / 2,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyImage: {
    width: SW * 0.40,
    height: SW * 0.40,
    opacity: 0.50,
  },
  timeText: {
    fontSize: 38,
    fontWeight: '300',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  lapScroll: { flex: 1, marginHorizontal: 16 },
  lapContent: { paddingBottom: 8 },
  lapTable: {
    borderRadius: 16, borderWidth: 0.5,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  lapHeader: { paddingVertical: 10, backgroundColor: colors.surface },
  lapRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  lapCell: {
    flex: 1, fontSize: 14,
    color: colors.text,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  lapHdrTxt: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  btnRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32, gap: 20,
    paddingTop: 12,
  },
  iconBtn: { alignItems: 'center', justifyContent: 'center' },
  iconBtnInner: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  mainBtn: {
    flex: 1, paddingVertical: 16,
    borderRadius: 40, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  mainBtnTxt: { fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },
});