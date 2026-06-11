// src/screens/SplashScreen.tsx
import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

export default function SplashScreen() {
    const navigation = useNavigation();
    const { isDark, colors } = useTheme();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigation.reset({
                index: 0,
                routes: [{ name: 'Main' as never }],
            });
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Image
                source={
                    isDark
                        ? require('../../assets/img/darklogo.png')
                        : require('../../assets/img/lightlogo.png')
                }
                style={styles.logo}
                resizeMode="contain"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 200,
        height: 200,
    },
});