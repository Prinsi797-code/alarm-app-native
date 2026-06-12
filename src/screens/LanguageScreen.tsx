// src/screens/LanguageScreen.tsx

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, I18nManager, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { showInterstitialAd } from '../services/AdService';
import AdNative from '../components/AdNative';


const LANGUAGES = [
  { code: 'en', label: 'English', subtitle: '(English)', flag: require("../../assets/flag/UnitedStates.png"), rtl: false },
  { code: 'es', label: 'Español', subtitle: '(Spanish)', flag: require("../../assets/flag/spanish.png"), rtl: false },
  { code: 'fr', label: 'Français', subtitle: '(French)', flag: require("../../assets/flag/france.png"), rtl: false },
  { code: 'pt', label: 'Português', subtitle: '(Portuguese)', flag: require("../../assets/flag/portugal.png"), rtl: false },
  { code: 'ar', label: 'العربية', subtitle: '(Arabic)', flag: require("../../assets/flag/arab.png"), rtl: true },
  { code: 'ru', label: 'Русский', subtitle: '(Russian)', flag: require("../../assets/flag/russia.png"), rtl: false },
  { code: 'ko', label: '한국인', subtitle: '(Korean)', flag: require("../../assets/flag/korean.png"), rtl: false },
  { code: 'de', label: 'Deutsch', subtitle: '(German)', flag: require("../../assets/flag/german.png"), rtl: false },
  { code: 'tr', label: 'Türkçe', subtitle: '(Turkish)', flag: require("../../assets/flag/turkey.png"), rtl: false },
  { code: 'it', label: 'Italiana', subtitle: '(Italian)', flag: require("../../assets/flag/italian.png"), rtl: false },

  { code: 'vi', label: 'Việt Nam', subtitle: '(Vietnamese)', flag: require("../../assets/flag/vi.png"), rtl: false },
  { code: 'ja', label: '日本語', subtitle: '(Japanese)', flag: require("../../assets/flag/ja.png"), rtl: false },
  { code: 'id', label: 'Indonesia', subtitle: '(Indonesian)', flag: require("../../assets/flag/id.png"), rtl: false },
  { code: 'th', label: 'ไทย', subtitle: '(Thai)', flag: require("../../assets/flag/th.png"), rtl: false },
  { code: 'pl', label: 'Polski', subtitle: '(Polski)', flag: require("../../assets/flag/pl.png"), rtl: false },
  { code: 'zh', label: 'Chinese', subtitle: '(Chinese)', flag: require("../../assets/flag/zh.png"), rtl: false },
  { code: 'ro', label: 'Română', subtitle: '(Romanian)', flag: require("../../assets/flag/ro.png"), rtl: false },
  { code: 'hi', label: 'हिंदी', subtitle: '(Hindi)', flag: require("../../assets/flag/hi.png"), rtl: false },

  { code: 'af', label: 'Afrikaans', subtitle: '(Afrikaans)', flag: require("../../assets/flag/af.png"), rtl: false },
  { code: 'hu', label: 'Hungarian', subtitle: '(Magyar)', flag: require("../../assets/flag/hu.png"), rtl: false },
  { code: 'ua', label: 'українська', subtitle: '(Ukrainian)', flag: require("../../assets/flag/ua.png"), rtl: false },
  { code: 'ph', label: 'Filipino', subtitle: '(Filipino)', flag: require("../../assets/flag/ph.png"), rtl: false },
];

export default function LanguageScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const ins = useSafeAreaInsets();
  const { i18n } = useTranslation();
  const { t } = useTranslation();
  const [selected, setSelected] = useState(i18n.language ?? 'en');

  const handleSave = async () => {
    try {
      const lang = LANGUAGES.find(l => l.code === selected);
      if (typeof i18n.changeLanguage === 'function') {
        await i18n.changeLanguage(selected);
      }
      if (lang && lang.rtl !== I18nManager.isRTL) {
        I18nManager.forceRTL(lang.rtl);
      }

      navigation.goBack();
    } catch (e) {
      console.error('Language save error:', e);
      showInterstitialAd('language_screen', () => {
        navigation.goBack();
      });

    }
  };

  const handleBack = () => {
    showInterstitialAd('language_screen', () => {
      navigation.goBack();
    });
  };

  const S = makeStyles(colors, isDark);

  return (
    <View style={[S.root, { paddingTop: ins.top }]}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 14,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={handleBack} style={S.closeBtn} activeOpacity={0.7}>
            <View style={[S.closeBtnCircle, { backgroundColor: colors.surface }]}>
              <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
          <Text style={[S.hdrTitle, { color: colors.text }]}>{t('switchLanguage')}</Text>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          style={[S.saveBtn, {
            backgroundColor: colors.primary + '18',
            paddingHorizontal: 20,
            paddingVertical: 8,
            borderColor: colors.primary + '44',
          }]}
        >
          <Text style={[S.saveTxt, { fontSize: 15, fontWeight: '700', color: colors.primary }]}>
            {t('save')}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: ins.bottom + 32, paddingTop: 8 }}
      >
        <View style={S.section}>
          {LANGUAGES.map((lang, idx) => {
            const isActive = selected === lang.code;
            const isLast = idx === LANGUAGES.length - 1;

            return (
              <TouchableOpacity
                key={lang.code}
                style={[S.row, !isLast && S.rowDivider, isActive && S.rowActive]}
                onPress={() => setSelected(lang.code)}
                activeOpacity={0.6}
              >
                <View style={[S.radio, isActive && S.radioActive]}>
                  {isActive && <View style={S.radioDot} />}
                </View>

                <Text style={[S.rowLabel, isActive && S.rowLabelActive]}>
                  {lang.label}  {lang.subtitle}
                </Text>

                <Image source={lang.flag} style={S.flag} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      <View style={S.stickyAdContainer}>
        <AdNative screen="language_screen" colors={colors} />
      </View>
    </View>
  );
}

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flag: {
      width: 30,
      height: 30,
      borderRadius: 15,
    },
    closeBtn: { minWidth: 50, alignItems: 'flex-start', justifyContent: 'center' },
    closeBtnCircle: {
      width: 40,
      height: 40,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hdrTitle: { fontSize: 18, fontWeight: '700' },
    saveBtn: {
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
    },
    saveTxt: { fontSize: 15, fontWeight: '700' },
    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 14,
    },
    backBtn: {
      width: 40,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    stickyAdContainer: {
      position: 'absolute',
      bottom: 12,
      width: '100%',
      alignItems: 'center',
    },
    backCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    saveBtnText: {
      fontSize: 15, fontWeight: '700'
    },
    section: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 0.5,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 15,
      gap: 14,
    },
    rowDivider: {
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border + '66',
    },
    rowActive: {
      backgroundColor: '#6563FF0D',
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioActive: {
      borderColor: '#6563FF',
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#6563FF',
    },
    rowLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    rowLabelActive: {
      color: '#6563FF',
      fontWeight: '600',
    },
  });