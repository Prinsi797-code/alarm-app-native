import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRODUCT_IDS } from '../services/StoreKitService';

const KEYS = {
  isPremium: '@premium_active_v1',
  productId: '@premium_product_id_v1',
  purchaseDate: '@premium_purchase_date_v1',
  expiryDate: '@premium_expiry_v1',
};

export type PremiumStatus = {
  isActive: boolean;
  productId: string | null;
  purchaseDate: string | null;
  expiryDate: string | null;
  isLifetime: boolean;
};

export const PremiumStore = {
  /**
   * Call this right after a successful purchase or restore.
   * expiryDate = null for lifetime / one-time purchase.
   * expiryDate = ISO string for weekly/monthly/yearly subs (from StoreKit).
   */
  activatePremium: async (productId: string, expiryDate: string | null) => {
    await AsyncStorage.setItem(KEYS.isPremium, 'true');
    await AsyncStorage.setItem(KEYS.productId, productId);
    await AsyncStorage.setItem(KEYS.purchaseDate, new Date().toISOString());
    if (expiryDate) {
      await AsyncStorage.setItem(KEYS.expiryDate, expiryDate);
    } else {
      await AsyncStorage.removeItem(KEYS.expiryDate);
    }
  },

  deactivatePremium: async () => {
    await AsyncStorage.multiRemove([
      KEYS.isPremium, KEYS.productId, KEYS.purchaseDate, KEYS.expiryDate,
    ]);
  },

  getStatus: async (): Promise<PremiumStatus> => {
    const flag = await AsyncStorage.getItem(KEYS.isPremium);
    if (flag !== 'true') {
      return { isActive: false, productId: null, purchaseDate: null, expiryDate: null, isLifetime: false };
    }

    const productId = await AsyncStorage.getItem(KEYS.productId);
    const purchaseDate = await AsyncStorage.getItem(KEYS.purchaseDate);
    const expiryDate = await AsyncStorage.getItem(KEYS.expiryDate);
    // const isLifetime = productId === PRODUCT_IDS.LIFETIME || !expiryDate;

    // auto-expire subscriptions (lifetime is never checked here)
    // if (!isLifetime && expiryDate && new Date(expiryDate).getTime() < Date.now()) {
    //   await PremiumStore.deactivatePremium();
    //   return { isActive: false, productId: null, purchaseDate: null, expiryDate: null, isLifetime: false };
    // }

    return { isActive: true, productId, purchaseDate, expiryDate };
  },

  isPremiumActive: async (): Promise<boolean> => {
    const s = await PremiumStore.getStatus();
    return s.isActive;
  },
};