// src/components/WorldClockCard.tsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Country } from '../data/countries';
import { getTimeDifference, getTimeForTimezone } from '../utils/timezoneUtils';

const { width: SW } = Dimensions.get('window');
const REVEAL_WIDTH = 80;
const DELETE_WIDTH = 65;
const GAP = 8;

const openCardRef = { current: null as (() => void) | null };

interface Props {
  country: Country;
  colors: any;
  onDelete?: () => void;
}

export function WorldClockCard({ country, colors, onDelete }: Props) {
  const tz = country.tz ?? '';

  const [time, setTime] = useState(() => getTimeForTimezone(tz));
  const [diff, setDiff] = useState(() => getTimeDifference(tz));

  useEffect(() => {
    setTime(getTimeForTimezone(tz));
    setDiff(getTimeDifference(tz));
    const id = setInterval(() => {
      setTime(getTimeForTimezone(tz));
      setDiff(getTimeDifference(tz));
    }, 1000);
    return () => clearInterval(id);
  }, [tz]);

  // Swipe animation
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteScale = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const closeSwipe = useCallback(() => {
    isOpen.current = false;
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
        speed: 14,
      }),
      Animated.timing(deleteScale, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const openSwipe = useCallback(() => {

    if (openCardRef.current && openCardRef.current !== closeSwipe) {
      openCardRef.current();
    }
    isOpen.current = true;
    openCardRef.current = closeSwipe;
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: -REVEAL_WIDTH,
        useNativeDriver: true,
        bounciness: 4,
        speed: 14,
      }),
      Animated.spring(deleteScale, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 8,
      }),
    ]).start();
  }, [closeSwipe]);

  const startX = useRef(0);
  const lastDx = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 2 && Math.abs(g.dy) < 10,
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
        if (g.vx < -0.1 || lastDx.current < 0) {
          if (openCardRef.current && openCardRef.current !== closeSwipe) {
            openCardRef.current();
          }
          openSwipe();
        } else {
          closeSwipe();
        }
      },
      onPanResponderTerminate: (_, g) => {
        if (lastDx.current < 0 || g?.vx < -0.1) openSwipe();
        else closeSwipe();
      },
    })
  ).current;

  const handleDelete = () => {
    Animated.timing(translateX, {
      toValue: -SW,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onDelete?.());
  };

  return (
    <View style={styles.container}>
      {/* Delete button — peeche */}
      <Animated.View
        style={[
          styles.deleteWrapper,
          {
            right: GAP,
            opacity: deleteScale,
            borderColor: '#FF3B30',
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleDelete}
          activeOpacity={0.75}
          style={styles.deleteBtn}
        >
          <Animated.View
            style={{
              transform: [{ scale: deleteScale }],
              alignItems: 'center',
            }}
          >
            <Image
              source={require('../../assets/icons/trash.png')}
              style={{ width: 24, height: 24, tintColor: '#FF3B30' }}
              resizeMode="contain"
            />
            {/* <Text style={{ fontSize: 20 }}>🗑️</Text> */}
            <Text style={styles.deleteTxt}>Delete</Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      {/* Card — upar swipe hota hai */}
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            if (isOpen.current) {
              closeSwipe();
            }
          }}
          style={[
            styles.card,
            {
              backgroundColor: colors.surface ?? '#1C1C2E',
              borderColor: colors.cardBorder ?? 'rgba(255,255,255,0.08)',
            },
          ]}
        >
          <View style={styles.left}>
            <Text style={[styles.city, { color: colors.text }]}>
              {country.city ?? country.name}
            </Text>
            <Text style={[styles.diffTxt, { color: colors.textSecondary }]}>
              {diff}
            </Text>
          </View>
          <View style={styles.right}>
            <Text style={[styles.time, { color: colors.text }]}>
              {time.display}
              <Text style={[styles.ampm, { color: colors.textSecondary }]}>
                {' '}{time.ampm}
              </Text>
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
    borderRadius: 14,
    overflow: 'hidden',
  },
  deleteWrapper: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: DELETE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  deleteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
  },
  deleteTxt: {
    color: '#FF3B30',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 5,
    borderRadius: 14,
    borderWidth: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  left: { flex: 1 },
  city: { fontSize: 15, fontWeight: '500' },
  diffTxt: { fontSize: 12, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  time: {
    fontSize: 20,
    fontWeight: '300',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  ampm: { fontSize: 12 },
});