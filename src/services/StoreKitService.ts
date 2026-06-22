import { NativeModules, Platform } from 'react-native';
console.log('RNStoreKit:', NativeModules.RNStoreKit);
const { RNStoreKit } = NativeModules;

export const PRODUCT_IDS = {
  WEEKLY:   'com.hevin.alarm.weekly', 
  MONTHLY:  'com.hevin.alarm.monthly',
  YEARLY:   'com.hevin.alarm.yearly', 
};

export const ALL_PRODUCT_IDS = Object.values(PRODUCT_IDS);

export interface StoreProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  localizedPrice: string;
  currency: string;
  subscriptionPeriod?: string;
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  productId?: string;
  purchaseDate?: string;
  pending?: boolean;
  message?: string;
}

export interface SubscriptionStatus {
  productId: string;
  transactionId: string;
  purchaseDate: string;
  expiryDate?: string;
  isActive: boolean;
  isExpired?: boolean;
}

// ─── Default fallback products (agar App Store se fetch na ho) ────────────────
export const DEFAULT_PRODUCTS: StoreProduct[] = [
  {
    productId: PRODUCT_IDS.WEEKLY,
    title: 'Weekly',
    description: 'Weekly subscription',
    price: '9400',
    localizedPrice: '₹9,400',
    currency: 'INR',
    subscriptionPeriod: '1 week',
  },
  {
    productId: PRODUCT_IDS.MONTHLY,
    title: 'Monthly',
    description: 'Monthly subscription',
    price: '9400',
    localizedPrice: '₹9,400',
    currency: 'INR',
    subscriptionPeriod: '1 month',
  },
  {
    productId: PRODUCT_IDS.YEARLY,
    title: 'Yearly',
    description: 'Yearly subscription',
    price: '490',
    localizedPrice: '₹490',
    currency: 'INR',
    subscriptionPeriod: '1 year',
  },
];

// ─── API ──────────────────────────────────────────────────────────────────────
const StoreKitService = {
  getProducts: async (ids: string[] = ALL_PRODUCT_IDS): Promise<StoreProduct[]> => {
    if (Platform.OS !== 'ios') return DEFAULT_PRODUCTS;
    if (!RNStoreKit) {
      console.warn('RNStoreKit native module not found, using defaults');
      return DEFAULT_PRODUCTS;
    }
    try {
      const products = await RNStoreKit.getProducts(ids);
      if (!products || products.length === 0) return DEFAULT_PRODUCTS;
      return products as StoreProduct[];
    } catch (error) {
      console.warn('getProducts failed, using defaults:', error);
      return DEFAULT_PRODUCTS;
    }
  },

  /**
   * Product purchase karo
   */
  purchaseProduct: async (productId: string): Promise<PurchaseResult> => {
    if (Platform.OS !== 'ios') {
      throw new Error('iOS only');
    }
    if (!RNStoreKit) throw new Error('RNStoreKit module not available');
    return await RNStoreKit.purchaseProduct(productId) as PurchaseResult;
  },

  /**
   * Purchases restore karo
   */
  restorePurchases: async (): Promise<SubscriptionStatus[]> => {
    if (Platform.OS !== 'ios') return [];
    if (!RNStoreKit) return [];
    try {
      return await RNStoreKit.restorePurchases() as SubscriptionStatus[];
    } catch (error) {
      console.warn('restorePurchases failed:', error);
      return [];
    }
  },

  checkSubscriptionStatus: async (ids: string[] = ALL_PRODUCT_IDS): Promise<SubscriptionStatus[]> => {
    if (Platform.OS !== 'ios') return [];
    if (!RNStoreKit) return [];
    try {
      return await RNStoreKit.checkSubscriptionStatus(ids) as SubscriptionStatus[];
    } catch (error) {
      console.warn('checkSubscriptionStatus failed:', error);
      return [];
    }
  },

  /**
   * Simple check — koi bhi active subscription hai?
   */
  isSubscribed: async (): Promise<boolean> => {
    try {
      const statuses = await StoreKitService.checkSubscriptionStatus();
      return statuses.some(s => s.isActive && !s.isExpired);
    } catch {
      return false;
    }
  },
};

export default StoreKitService;