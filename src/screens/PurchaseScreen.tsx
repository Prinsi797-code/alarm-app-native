import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { PremiumStore } from '../utils/PremiumStore';
import StoreKitService, {
  DEFAULT_PRODUCTS,
  PRODUCT_IDS,
  StoreProduct,
} from '../services/StoreKitService';

const { width: SW, height: SH } = Dimensions.get('window');

const FEATURES = [
  { icon: '🔕', text: 'Ad-free experience' },
  { icon: '🎨', text: 'Unlock all backgrounds' },
  { icon: '🎵', text: 'All alarm tones' },
  { icon: '🧮', text: 'Math mission unlimited' },
  { icon: '⏰', text: 'Unlimited alarms' },
];
interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}


export default function PurchaseScreen({ visible, onClose, onSuccess }: Props) {
  const ins = useSafeAreaInsets();
  const [products, setProducts] = useState<StoreProduct[]>(DEFAULT_PRODUCTS);
  const [selectedId, setSelectedId] = useState<string>(PRODUCT_IDS.WEEKLY);
  const [loading, setLoading] = useState(false);
  const [fetchingProducts, setFetchingProducts] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const { t } = useTranslation();
  const [isPremium, setIsPremium] = useState(false);
  const [planInfo, setPlanInfo] = useState<{ productId: string | null; expiryDate: string | null }>({ productId: null, expiryDate: null });

  useEffect(() => {
    if (visible) {
      PremiumStore.getStatus().then(s => {
        setIsPremium(s.isActive);
        setPlanInfo({ productId: s.productId, expiryDate: s.expiryDate });
      });
    }
  }, [visible]);

  const PLAN_CONFIG: Record<
    string,
    {
      label: string;
      badge?: string;
      badgeColor?: string;
      tag?: string;
      tagColor?: string;
      perWeek?: string;
    }
  > = {
    [PRODUCT_IDS.WEEKLY]: {
      label: t('Weekly'),
      badge: '80% OFF',
      badgeColor: '#E91E8C',
      perWeek: t('Perweek'),
    },
    [PRODUCT_IDS.MONTHLY]: {
      label: t('Monthly'),
      tag: '76% OFF',
      tagColor: '#E91E8C',
      perWeek: t('Permonth'),
      badge: 'Most Popular',
      badgeColor: '#E91E8C',
    },
    [PRODUCT_IDS.YEARLY]: {
      label: t('Yearly'),
      tag: '39% OFF',
      tagColor: '#E91E8C',
      perWeek: t('Bestannual'),
      badge: 'Recommend',
      badgeColor: '#E91E8C',
    },
  };
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const swingAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 6 }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 4 }),
      ]).start();

      swingAnim.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(swingAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(swingAnim, { toValue: -1, duration: 2400, useNativeDriver: true }),
          Animated.timing(swingAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ])
      ).start();

      loadProducts();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(60);
      scaleAnim.setValue(0.95);
    }
  }, [visible]);

  const loadProducts = async () => {
    setFetchingProducts(true);
    try {
      const fetched = await StoreKitService.getProducts();
      if (fetched && fetched.length > 0) {
        setProducts(fetched);
        const weekly = fetched.find(p => p.productId === PRODUCT_IDS.WEEKLY);
        if (weekly) setSelectedId(weekly.productId);
        else setSelectedId(fetched[0].productId);
      }
    } catch {
      setProducts(DEFAULT_PRODUCTS);
    } finally {
      setFetchingProducts(false);
    }
  };

  const handlePurchase = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await StoreKitService.purchaseProduct(selectedId);
      if (result.success) {
        let expiryDate: string | null = null;
        if (selectedId) {
          const statuses = await StoreKitService.checkSubscriptionStatus([selectedId]);
          expiryDate = statuses.find(s => s.productId === selectedId)?.expiryDate ?? null;
        }
        await PremiumStore.activatePremium(selectedId, expiryDate);

        Alert.alert(
          t('WelcometoPremium'),
          t('Yoursubscriptionisnowactive'),
          [{ text: t('LetsGo'), onPress: () => { onSuccess?.(); onClose(); } }]
        );
      } else if (result.pending) {
        Alert.alert(t('PurchasePending'), t('Yourpurchaseis'), [{ text: 'OK', onPress: onClose }]);
      }
    } catch (error: any) {
      if (error?.code !== 'USER_CANCELLED') {
        Alert.alert(t('PurchaseFailed'), error?.message ?? t('Somethingwentwrong'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await StoreKitService.restorePurchases();
      if (restored && restored.length > 0) {
        const best = restored.sort((a, b) =>
          new Date(b.expiryDate ?? 0).getTime() - new Date(a.expiryDate ?? 0).getTime()
        )[0];

        await PremiumStore.activatePremium(
          best.productId,
          best.expiryDate ?? null
        );

        Alert.alert(t('Restored'), t('Yourpurchases'), [
          { text: 'OK', onPress: () => { onSuccess?.(); onClose(); } },
        ]);
      } else {
        Alert.alert(t('NoPurchases'), t('Noprevious'));
      }
    } catch {
      Alert.alert(t('RestoreFailed'), t('Couldnotrestore'));
    } finally {
      setRestoring(false);
    }
  };

  const selectedProduct = products.find(p => p.productId === selectedId);
  const lifetimeProduct = products.find(p => p.productId === PRODUCT_IDS.LIFETIME);

  // const planProducts = products.filter(p => p.productId !== PRODUCT_IDS.LIFETIME);
  const PLAN_ORDER = [PRODUCT_IDS.WEEKLY, PRODUCT_IDS.MONTHLY, PRODUCT_IDS.YEARLY];

  const planProducts = [...products].sort(
    (a, b) => PLAN_ORDER.indexOf(a.productId) - PLAN_ORDER.indexOf(b.productId)
  );
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.root}>
        <Image
          source={require('../../assets/img/premiumbg.png')}
          style={styles.bgImage}
          resizeMode="cover"
        />
        <View style={styles.overlay} />

        <TouchableOpacity
          onPress={onClose}
          style={[styles.closeBtn, { top: ins.top + 12 }]}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.offerTag,
            {
              top: ins.top + -57,
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                {
                  rotate: swingAnim.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: ['4deg', '8deg', '14deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <Image
            source={require('../../assets/img/offer.png')}
            style={styles.offerImage}
            resizeMode="contain"
          />
        </Animated.View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: SH * 0.38, paddingBottom: ins.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <Text style={styles.title}>{t('RemoveAd')}</Text>

            <View style={styles.planHeadingRow}>
              <View style={styles.planHeadingLine} />
              <Text style={styles.planHeadingText}>{t('ChoosePlan')}</Text>
              <View style={styles.planHeadingLine} />
            </View>

            {fetchingProducts ? (
              <ActivityIndicator color="#FFFFFF" size="large" style={{ marginVertical: 32 }} />
            ) : (
              <View style={styles.plansRow}>
                {planProducts.map(product => {
                  const config = PLAN_CONFIG[product.productId] ?? { label: product.title };
                  const isSelected = selectedId === product.productId;
                  const isActivePlan = isPremium && planInfo.productId === product.productId;

                  return (
                    <TouchableOpacity
                      key={product.productId}
                      onPress={() => {
                        if (isActivePlan) return;
                        setSelectedId(product.productId);
                      }}
                      activeOpacity={isActivePlan ? 1 : 0.85}
                      disabled={isActivePlan}
                      style={[
                        styles.planBox,
                        isSelected && !isActivePlan && styles.planBoxSelected,
                        isActivePlan && styles.planBoxActive,
                      ]}
                    >
                      {isSelected && !isActivePlan && (
                        <View style={styles.planCheckCircle}>
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        </View>
                      )}

                      {config.perWeek && (
                        <Text style={[styles.planPeriodText, isActivePlan && { color: 'rgba(255,255,255,0.6)' }]}>
                          {config.perWeek}
                        </Text>
                      )}

                      <Text style={[
                        styles.planBoxLabel,
                        (isSelected || isActivePlan) && styles.planBoxLabelSelected,
                      ]}>
                        {config.label}
                      </Text>

                      <View style={[
                        styles.pricePill,
                        isSelected && !isActivePlan && styles.pricePillSelected,
                        isActivePlan && styles.pricePillActive,
                      ]}>
                        <Text style={styles.pricePillText}>
                          {/* {isActivePlan ? t('Active') : product.localizedPrice} */}
                          <Text style={styles.pricePillText}>{product.localizedPrice}</Text>
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              onPress={handlePurchase}
              activeOpacity={0.88}
              disabled={loading || fetchingProducts}
              style={[styles.subscribeBtn, (loading || fetchingProducts) && { opacity: 0.7 }]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.subscribeBtnText}>{t('subscribe')}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Ionicons name="checkmark-circle" size={16} color="#E91E8C" />
              <Text style={styles.footerText}>{t('cancelanytime')}</Text>
            </View>

            <View style={styles.linksRow}>
              <TouchableOpacity onPress={handleRestore} disabled={restoring}>
                {restoring ? (
                  <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
                ) : (
                  <Text style={styles.linkText}>{t('Restorepurchase')}</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.linkSep}>|</Text>
              {/* <TouchableOpacity
                onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}
              >
                <Text style={styles.linkText}>{t('termsofservice')}</Text>
              </TouchableOpacity> */}
              <Text style={styles.linkSep}>|</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://alarm-app.blogspot.com/')}
              >
                <Text style={styles.linkText}>{t('privacypolicy')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  bgImage: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    width: SW,
    height: SH * 0.50,
  },
  offerImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(8,6,20,0.72)',
  },
  closeBtn: {
    position: 'absolute',
    left: 18,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  planHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 10,
  },
  planHeadingLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(233,30,140,0.5)',
  },
  planHeadingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  plansRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  planBoxActive: {
    borderColor: '#2ECC71',
    backgroundColor: 'rgba(46,204,113,0.15)',
  },
  pricePillActive: {
    backgroundColor: '#2ECC71',
  },
  planBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    position: 'relative',
    minHeight: 150,
    justifyContent: 'space-between',
  },
  planBoxSelected: {
    borderColor: '#E91E8C',
    backgroundColor: 'rgba(100,98,251,0.08)',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -22,
    left: -12,
    width: 44,
    height: 40,
    zIndex: 5,
  },
  planCheckCircle: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E91E8C',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    borderWidth: 2,
    borderColor: '#0A0A1A',
  },

  pricePillSelected: {
    backgroundColor: '#E91E8C',
  },

  planPeriodText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
  planBoxLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    marginVertical: 8,
  },
  planBoxLabelSelected: {
    color: '#FFFFFF',
  },
  pricePill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '100%',
    alignItems: 'center',
  },
  pricePillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  offerTag: {
    position: 'absolute',
    right: -40,
    top: 0,
    width: 160,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    paddingVertical: 6,
    gap: 1,
  },
  offerTagSmall: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    lineHeight: 15,
  },
  offerSave: {
    fontSize: 15,
    fontWeight: '800',
    color: '#E91E8C',
    letterSpacing: 1,
    marginTop: 2,
  },
  offerPercent: {
    fontSize: 26,
    fontWeight: '900',
    color: '#C084FC',
    letterSpacing: -1,
    lineHeight: 30,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 20,
  },
  featuresRow: {
    marginBottom: 20,
    gap: 8,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  featureIcon: { fontSize: 18 },
  featureText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  plansContainer: {
    gap: 10,
    marginBottom: 16,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  planCardSelected: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  planCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E91E8C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planLeft: {
    flex: 1,
  },
  planLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 3,
  },
  planLabelSelected: {
    color: '#FFFFFF',
  },
  planSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '400',
  },
  planRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  planTag: {
    fontSize: 13,
    fontWeight: '700',
  },
  lifetimeText: {
    textAlign: 'center',
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginBottom: 20,
  },
  subscribeBtn: {
    backgroundColor: '#E91E8C',
    borderRadius: 30,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#E91E8C',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  subscribeBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 8,
  },
  linkText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    textDecorationLine: 'underline',
  },
  linkSep: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
  },
});