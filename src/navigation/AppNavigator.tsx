// src/navigation/AppNavigator.tsx

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

import AlarmScreen from '../screens/AlarmScreen';
import ClockScreen from '../screens/ClockScreen';
import TimerScreen from '../screens/TimerScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AlarmRingingScreen from '../screens/AlarmRingingScreen';
import RingtonePickerScreen from '../screens/RingtonePickerScreen';
import ThemeModeScreen from '../screens/ThemeModeScreen';
import LanguageScreen from '../screens/LanguageScreen';
import SnoozePickerScreen from '../screens/SnoozePickerScreen';
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

  return (
    <View style={[bar.wrap, { paddingBottom: Platform.OS === 'ios' ? 24 : 10, backgroundColor: colors.background }]}>
      <View style={[bar.row, { borderColor: colors.border, marginRight: 70 }]}>
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
        style={bar.addBtnWrap}
        onPress={handleAddPress}
        activeOpacity={isTimerTab ? 1 : 0.8}
        disabled={isTimerTab}
      >
        <View style={[bar.addBtn, { borderColor: colors.border }, isTimerTab && { opacity: 0.3 }]}>
          <Text style={[bar.addIcon, { color: isTimerTab ? colors.textTertiary : colors.primary }]}>＋</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const bar = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10, borderRadius: 30, borderWidth: 1, marginLeft: 20, marginRight: 20, gap: 4 },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  label: { fontSize: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24 },
  pillLabel: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  addBtnWrap: { position: 'absolute', right: 15, bottom: Platform.OS === 'ios' ? 32 : 32 },
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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={BottomTabs} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="ThemeMode" component={ThemeModeScreen} options={{ presentation: 'card', animation: 'slide_from_right' }} />
      <Stack.Screen name="Language" component={LanguageScreen} options={{ presentation: 'card', animation: 'slide_from_right' }} />
      <Stack.Screen name="SnoozePicker" component={SnoozePickerScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="RingtonePicker" component={RingtonePickerScreen} options={{ presentation: 'modal', animation: 'fade' }} />
      <Stack.Screen name="AlarmRinging" component={AlarmRingingScreen} options={{ presentation: 'modal', animation: 'fade' }} />
    </Stack.Navigator>
  );
}