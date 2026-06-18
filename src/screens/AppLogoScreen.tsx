import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Image, Alert, Platform, NativeModules,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

const ICON_KEY = '@selected_app_icon';
const { RNAppIcon } = NativeModules;

export default function AppLogoScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const ins = useSafeAreaInsets();
  const { t } = useTranslation();

  const [selected, setSelected] = useState<string>('Default');
  const [loading, setLoading] = useState(false);

  const ICONS = [
    { key: 'Default', label: t('Classic'), desc: t('Defaultapp'), image: require('../../assets/img/logo.png') },
    { key: 'logo1', label: t('Dark'), desc: t('Darktheme'), image: require('../../assets/img/logo1.png') },
    { key: 'logo3', label: t('Forest'), desc: t('Naturegreen'), image: require('../../assets/img/logo3.png') },
    { key: 'logo2', label: t('Sunset'), desc: t('Warmsunset'), image: require('../../assets/img/logo2.png') },
  ];

  useEffect(() => {
    // Pehle AsyncStorage se lo (reliable)
    AsyncStorage.getItem(ICON_KEY).then(v => {
      const saved = v ?? 'Default';
      setSelected(saved);

      // Native se verify karo (optional, sirf log ke liye)
      if (RNAppIcon) {
        RNAppIcon.getIcon()
          .then((iosIcon: string) => {
            // Agar iOS aur AsyncStorage match nahi karte to AsyncStorage hi sach hai
            // (iOS cancel karta hai silently, AsyncStorage humari source of truth hai)
            console.log('iOS icon:', iosIcon, '| Saved:', saved);
          })
          .catch(() => { });
      }
    });
  }, []);

  const handleChangeIcon = async (iconKey: string) => {
    if (loading || iconKey === selected) return;
    if (!RNAppIcon) {
      Alert.alert('Error', 'Native module load nahi hua');
      return;
    }

    setLoading(true);

    // UI immediately update karo — optimistic update
    setSelected(iconKey);
    await AsyncStorage.setItem(ICON_KEY, iconKey);

    try {
      await RNAppIcon.changeIcon(iconKey);
      // Success — UI already updated hai, kuch nahi karna
    } catch (e: any) {
      const msg = e?.message?.toLowerCase() ?? '';
      // Cancel/unavailable = iOS ne change kiya ya silently fail — UI rehne do
      if (
        msg.includes('cancel') ||
        msg.includes('temporarily unavailable') ||
        msg.includes('eagain')
      ) {
        // Theek hai — iOS ne handle kar liya
      } else {
        // Real error — rollback karo
        const prev = await AsyncStorage.getItem(ICON_KEY);
        setSelected(prev ?? 'Default');
        Alert.alert('Error', e?.message ?? 'Icon change nahi hua');
      }
    } finally {
      setLoading(false);
    }
  };

  const S = makeStyles(colors);

  return (
    <View style={[S.root, { paddingTop: ins.top }]}>

      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn} activeOpacity={0.7}>
          <View style={[S.backCircle, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
        <Text style={S.headerTitle}>{t('AppIcon')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: ins.bottom + 32, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={S.sectionLabel}>{t('CHOOSEAPPICON')}</Text>

        <View style={S.section}>
          {ICONS.map((item, idx) => {
            const isSelected = selected === item.key;
            const isLast = idx === ICONS.length - 1;

            return (
              <TouchableOpacity
                key={item.key}
                style={[S.row, !isLast && S.rowDivider]}
                onPress={() => handleChangeIcon(item.key)}
                activeOpacity={0.6}
                disabled={loading}
              >
                <Image source={item.image} style={S.iconPreview} />

                <View style={S.rowText}>
                  <Text style={S.rowLabel}>{item.label}</Text>
                  <Text style={S.rowSub}>{item.desc}</Text>
                </View>

                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                ) : loading ? (
                  <Ionicons name="ellipsis-horizontal" size={20} color={colors.textTertiary} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={S.footer}>
          {t('Iconselect')}
        </Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  backBtn: { minWidth: 50, alignItems: 'flex-start', justifyContent: 'center' },
  backCircle: { width: 40, height: 40, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  sectionLabel: { fontSize: 12, color: colors.textTertiary, marginLeft: 28, marginBottom: 6, letterSpacing: 0.5 },
  section: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 0.5, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  rowDivider: { borderBottomWidth: 0.5, borderBottomColor: colors.border + '66' },
  iconPreview: { width: 56, height: 56, borderRadius: 13 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: colors.text },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  footer: { textAlign: 'center', fontSize: 12, color: colors.textTertiary, marginTop: 12, paddingHorizontal: 24, lineHeight: 18 },
});