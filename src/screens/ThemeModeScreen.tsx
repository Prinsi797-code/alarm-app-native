// src/screens/ThemeModeScreen.tsx

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { showInterstitialAd } from '../services/AdService';
import AdBanner from '../components/AdBanner';
import AdNative from '../components/AdNative';
import { useTranslation } from 'react-i18next';

type ThemeOption = 'system' | 'dark' | 'light';

export default function ThemeMode() {
  const { colors, isDark, setThemeMode } = useTheme();
  const navigation = useNavigation<any>();
  const ins = useSafeAreaInsets();
  const { themeMode } = useTheme() as any;
  const [selected, setSelected] = useState<ThemeOption>(themeMode ?? 'system');
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const THEME_OPTIONS: { key: ThemeOption; icon: string; label: string }[] = [
    { key: 'system', icon: 'contrast-outline', label: t('FollowSystem') },
    { key: 'dark', icon: 'moon-outline', label: t('DarkMode') },
    { key: 'light', icon: 'sunny-outline', label: t('LightMode') },
  ];
  const handleSelect = (key: ThemeOption) => {
    setSelected(key);
    setThemeMode?.(key);
  };

  const handleBack = () => {
    if (isLoading) return;
    setIsLoading(true);
    showInterstitialAd('theme_mode_screen', () => {
      setIsLoading(false);
      navigation.goBack();
    });
  };

  const handleSave = () => {
    if (isLoading) return;
    setIsLoading(true);
    showInterstitialAd('theme_mode_screen', () => {
      setIsLoading(false);
      navigation.goBack();
    });
  };

  const S = makeStyles(colors, isDark);
  return (
    <View style={[S.root, { paddingTop: ins.top }]}>

      <View style={S.header}>
        <TouchableOpacity onPress={handleBack} style={S.backBtn} activeOpacity={isLoading ? 1 : 0.7} disabled={isLoading}>
          <View style={[S.backCircle, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <Text style={S.headerTitle}>{t('ThemeMode')}</Text>

        <TouchableOpacity
          onPress={handleSave}
          style={[S.saveBtn, {
            backgroundColor: colors.primary + '18',
            paddingHorizontal: 20, paddingVertical: 8,
            borderColor: colors.primary + '44',
            opacity: isLoading ? 0.5 : 1,
          }]}
          activeOpacity={isLoading ? 1 : 0.75}
          disabled={isLoading}
        >
          <Text style={S.saveBtnText}>{t('save')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: ins.bottom + 32, paddingTop: 8 }}
      >
        <View style={S.section}>
          {THEME_OPTIONS.map((item, idx) => {
            const isActive = selected === item.key;
            const isLast = idx === THEME_OPTIONS.length - 1;
            return (
              <TouchableOpacity
                key={item.key}
                style={[S.row, !isLast && S.rowDivider, isActive && S.rowActive]}
                onPress={() => handleSelect(item.key)}
                activeOpacity={0.6}
              >
                <View style={[S.iconBox, isActive && S.iconBoxActive]}>
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color={isActive ? '#6563FF' : colors.textSecondary}
                  />
                </View>
                <Text style={[S.rowLabel, isActive && S.rowLabelActive]}>
                  {item.label}
                </Text>
                <Switch
                  value={isActive}
                  onValueChange={() => handleSelect(item.key)}
                  trackColor={{ false: colors.border, true: '#6563FF' }}
                  thumbColor="#ffffff"
                  ios_backgroundColor={colors.border}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Native ad — bottom */}
      <View style={S.stickyAdContainer}>
        <AdBanner screen="theme_mode_screen" />
      </View>
    </View>
  );
}

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
    backBtn: { minWidth: 50, alignItems: 'flex-start', justifyContent: 'center' },
    backCircle: { width: 40, height: 40, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    saveBtn: { paddingHorizontal: 16, paddingVertical: 7, backgroundColor: colors.primary + '18', borderRadius: 20, borderWidth: 1, borderColor: colors.primary + '44' },
    saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.primary },
    section: { marginHorizontal: 16, marginBottom: 12, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 0.5, borderColor: colors.border, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    rowDivider: { borderBottomWidth: 0.5, borderBottomColor: colors.border + '66' },
    rowActive: { backgroundColor: '#6563FF12' },
    iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.border + '55', alignItems: 'center', justifyContent: 'center' },
    iconBoxActive: { backgroundColor: '#6563FF18' },
    rowLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.text },
    rowLabelActive: { color: '#6563FF' },
    stickyAdContainer: {
      position: 'absolute',
      bottom: 12,
      width: '100%',
      alignItems: 'center',
    },
  });