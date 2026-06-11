import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
const KEYS = {
  coins: '@coins_v1',
  lastEarnDate: '@coins_last_earn_date',
  earnedToday: '@coins_earned_today',
  unlocked: '@coins_unlocked_v1',
};

export type UnlockedItem = {
  bgIndex: number;
  unlockedAt: string;
  customUri?: string;
};

const todayStr = () => new Date().toISOString().split('T')[0];

export const CoinStore = {

  getCoins: async (): Promise<number> => {
    const v = await AsyncStorage.getItem(KEYS.coins);
    return v ? parseInt(v) : 0;
  },

  setCoins: async (n: number) => {
    await AsyncStorage.setItem(KEYS.coins, String(Math.max(0, n)));
  },

  getEarnedToday: async (): Promise<string[]> => {
    const today = todayStr();
    const lastDate = await AsyncStorage.getItem(KEYS.lastEarnDate);
    if (lastDate !== today) return [];
    const earned = await AsyncStorage.getItem(KEYS.earnedToday);
    return earned ? JSON.parse(earned) : [];
  },

  tryEarnCoins: async (type: 'alarm' | 'mission'): Promise<number> => {
    const today = todayStr();
    const lastDate = await AsyncStorage.getItem(KEYS.lastEarnDate);

    if (lastDate !== today) {
      await AsyncStorage.setItem(KEYS.lastEarnDate, today);
      await AsyncStorage.setItem(KEYS.earnedToday, JSON.stringify([]));
    }

    const earnedRaw = await AsyncStorage.getItem(KEYS.earnedToday);
    const earned: string[] = earnedRaw ? JSON.parse(earnedRaw) : [];

    if (earned.includes(type)) return 0;

    const amount = type === 'alarm' ? 2 : 5;
    const current = await CoinStore.getCoins();
    await CoinStore.setCoins(current + amount);
    earned.push(type);
    await AsyncStorage.setItem(KEYS.earnedToday, JSON.stringify(earned));

    return amount;
  },

  getUnlocked: async (): Promise<UnlockedItem[]> => {
    const raw = await AsyncStorage.getItem(KEYS.unlocked);
    const list: UnlockedItem[] = raw ? JSON.parse(raw) : [];

    const now = new Date();
    const valid = list.filter(item => {
      const unlockDate = new Date(item.unlockedAt);
      const diffDays = (now.getTime() - unlockDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays < 15;
    });

    if (valid.length !== list.length) {
      await AsyncStorage.setItem(KEYS.unlocked, JSON.stringify(valid));
    }
    return valid;
  },

  isUnlocked: async (bgIndex: number): Promise<boolean> => {
    const list = await CoinStore.getUnlocked();
    return list.some(i => i.bgIndex === bgIndex);
  },

  unlock: async (bgIndex: number, customUri?: string): Promise<{ success: boolean; message: string }> => {
    const coins = await CoinStore.getCoins();

    if (coins < 50) return {
      success: false,
      message: `Not enough coins. You need ${50 - coins} more.`
    };

    const alreadyUnlocked = await CoinStore.isUnlocked(bgIndex);
    if (alreadyUnlocked) return {
      success: false,
      message: 'Already unlocked!'
    };

    await CoinStore.setCoins(coins - 50);

    const list = await CoinStore.getUnlocked();
    list.push({ bgIndex, unlockedAt: new Date().toISOString(), customUri });
    await AsyncStorage.setItem(KEYS.unlocked, JSON.stringify(list));

    return { success: true, message: 'Unlocked for 15 days.' };
  },

  getDaysLeft: async (bgIndex: number): Promise<number> => {
    const list = await CoinStore.getUnlocked();
    const item = list.find(i => i.bgIndex === bgIndex);
    if (!item) return 0;
    const unlockDate = new Date(item.unlockedAt);
    const now = new Date();
    const diffDays = (now.getTime() - unlockDate.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(15 - diffDays));
  },
};