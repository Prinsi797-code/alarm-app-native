// src/navigation/AppNavigator.tsx

// import React from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

import AlarmScreen from '../screens/AlarmScreen';
import ClockScreen from '../screens/ClockScreen';
import TimerScreen from '../screens/TimerScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AlarmRingingScreen from '../screens/AlarmRingingScreen';
import CoinScreen from '../screens/CoinScreen';
import RingtonePickerScreen from '../screens/RingtonePickerScreen';
import ThemeModeScreen from '../screens/ThemeModeScreen';
import LanguageScreen from '../screens/LanguageScreen';
import SnoozePickerScreen from '../screens/SnoozePickerScreen';
import SplashScreen from '../screens/SplashScreen';
import AppLogoScreen from '../screens/AppLogoScreen';
import AdBanner from '../components/AdBanner';

import { useTranslation } from 'react-i18next';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TABS = [
  { name: 'Clock', icon: require('../../assets/icons/clock.png') },
  { name: 'Alarm', icon: require('../../assets/icons/alarm.png') },
  { name: 'Timer', icon: require('../../assets/icons/timer.png') },
];

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { colors } = useTheme();
  const activeRouteName: string = state.routes[state.index]?.name ?? '';
  const isTimerTab = activeRouteName === 'Timer';
  const { t } = useTranslation();
  const [adHeight, setAdHeight] = useState(0); 

  const handleAddPress = () => {
    if (activeRouteName === 'Clock') {
      navigation.navigate('Clock', { openAddCountry: Date.now() });
    } else if (activeRouteName === 'Alarm') {
      navigation.navigate('Alarm');
      setTimeout(() => {
        navigation.navigate('Alarm', { openNew: Date.now() });
      }, 50);
    }
  };

  // tab row ki approximate height (paddingTop+Bottom=20, pill~36) + ios safe area
  const tabRowH = 66 + (Platform.OS === 'ios' ? 24 : 10);

return (
    <View style={[bar.wrap, { backgroundColor: colors.background }]}>

      {/* Tab row + button inline */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 10, marginBottom: 4 }}>
        <View style={[bar.row, { borderColor: colors.border, flex: 1 }]}>
          {state.routes.map((route: any, index: number) => {
            const focused = state.index === index;
            const tabDef = TABS.find(t => t.name === route.name);
            if (!tabDef) return null;

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            };

            if (focused) {
              return (
                <TouchableOpacity key={route.key} style={bar.tab} onPress={onPress} activeOpacity={0.8}>
                  <View style={[bar.pill, { backgroundColor: colors.primary, borderColor: colors.background, borderWidth: 1 }]}>
                    <Image source={tabDef.icon} style={{ width: 20, height: 20, tintColor: '#FFFFFF' }} resizeMode="contain" />
                    <Text style={bar.pillLabel}>{t(`tabs.${route.name.toLowerCase()}`)}</Text>
                  </View>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity key={route.key} style={bar.tab} onPress={onPress} activeOpacity={0.8}>
                <Image source={tabDef.icon} style={{ width: 24, height: 24, tintColor: colors.icon, opacity: 0.45 }} resizeMode="contain" />
                <Text style={[bar.label, { color: colors.icon }]}>{t(`tabs.${route.name.toLowerCase()}`)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={handleAddPress}
          activeOpacity={isTimerTab ? 1 : 0.8}
          disabled={isTimerTab}
          style={{ marginLeft: 8 }}
        >
          <View style={[bar.addBtn, { borderColor: colors.border }, isTimerTab && { opacity: 0.3 }]}>
            <Text style={[bar.addIcon, { color: isTimerTab ? colors.textTertiary : colors.primary }]}>＋</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={{ paddingBottom: Platform.OS === 'ios' ? 24 : 10 }}>
        <AdBanner screen="main_screen" />
      </View>

    </View>
  );
}

const bar = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 10,
    borderRadius: 30, borderWidth: 1, gap: 4,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  label: { fontSize: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24 },
  pillLabel: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  addBtn: { width: 50, height: 50, borderRadius: 30, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  addIcon: { fontSize: 28, fontWeight: '400' },
});

function BottomTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Alarm"
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Clock" component={ClockScreen} />
      <Tab.Screen name="Alarm" component={AlarmScreen} />
      <Tab.Screen name="Timer" component={TimerScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    // <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
    <Stack.Navigator initialRouteName="Main" screenOptions={{ headerShown: false }}>
      {/* <Stack.Screen name="Splash" component={SplashScreen} /> */}
      <Stack.Screen name="Home" component={AlarmScreen} />
      <Stack.Screen name="Main" component={BottomTabs} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="ThemeMode" component={ThemeModeScreen} options={{ presentation: 'card', animation: 'slide_from_right' }} />
      <Stack.Screen name="Language" component={LanguageScreen} options={{ presentation: 'card', animation: 'slide_from_right' }} />
      <Stack.Screen name="SnoozePicker" component={SnoozePickerScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="RingtonePicker" component={RingtonePickerScreen} options={{ presentation: 'modal', animation: 'fade' }} />
      <Stack.Screen name="AlarmRinging" component={AlarmRingingScreen} options={{ presentation: 'modal', animation: 'fade' }} />
      <Stack.Screen name="AppLogo" component={AppLogoScreen} options={{ presentation: 'modal', animation: 'fade' }} />
      <Stack.Screen name="CoinScreen" component={CoinScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}