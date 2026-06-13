import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    FlatList,
    Image,
    SectionList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COUNTRIES, Country } from '../data/countries';
import { getTimeForTimezone } from '../utils/timezoneUtils';
import { useTheme } from '../contexts/ThemeContext';
import { showInterstitialAd } from '../services/AdService';
import { useTranslation } from 'react-i18next';
import AdBanner from '../components/AdBanner';

interface Props {
    alreadyAdded: string[];
    onAdd: (countries: Country[]) => void;
    onBack: () => void;
}

export default function AddCountryScreen({ alreadyAdded, onAdd, onBack }: Props) {
    const ins = useSafeAreaInsets();
    const { colors } = useTheme();
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [tick, setTick] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(id);
    }, []);

    const sections = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = q
            ? COUNTRIES.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.city.toLowerCase().includes(q) ||
                c.region.toLowerCase().includes(q)
            )
            : COUNTRIES;

        const grouped: Record<string, Country[]> = {};
        filtered.forEach(c => {
            const letter = c.name[0].toUpperCase();
            if (!grouped[letter]) grouped[letter] = [];
            grouped[letter].push(c);
        });

        return Object.keys(grouped)
            .sort()
            .map(letter => ({ title: letter, data: grouped[letter] }));
    }, [query]);

    const toggleSelect = useCallback((name: string) => {
        if (alreadyAdded.includes(name)) return;
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    }, [alreadyAdded]);

    const handleAdd = () => {
        if (isLoading) return;
        setIsLoading(true);
        const toAdd = COUNTRIES.filter(c => selected.has(c.name));
        showInterstitialAd('country_screen', () => {
            setIsLoading(false);
            onAdd(toAdd);
        });
    };


    const handleBack = () => {
        if (isLoading) return;
        setIsLoading(true);
        showInterstitialAd('country_screen', () => {
            setIsLoading(false);
            onBack();
        });
    };

  const { t } = useTranslation();

    const renderItem = ({ item }: { item: Country }) => {
        const isAdded = alreadyAdded.includes(item.name);
        const isSel = selected.has(item.name);
        const { display, ampm } = getTimeForTimezone(item.tz);
        
        return (
            <TouchableOpacity
                style={[styles.row, { borderBottomColor: colors.border }]}
                onPress={() => toggleSelect(item.name)}
                activeOpacity={0.7}
            >
                <Text style={[styles.countryName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                    {display} {ampm}
                </Text>
                <View style={[
                    styles.circle,
                    { borderColor: isSel || isAdded ? '#6563FF' : colors.border },
                    (isSel || isAdded) && styles.circleSelected,
                ]}>
                    {(isSel || isAdded) && (
                        <Ionicons name="checkmark" size={13} color="#fff" />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: ins.top }]}>
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 18,
                paddingVertical: 14,
                position: 'relative',
            }}>
                {/* <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}> */}
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={isLoading ? 1 : 0.7} disabled={isLoading}>
                        <View style={[styles.closeBtnCircle, { backgroundColor: colors.surface }]}>
                            <Ionicons name="chevron-back" size={28} color={colors.textSecondary} />
                        </View>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Addcountry')}</Text>
                {/* </View> */}

                <TouchableOpacity
                    onPress={handleAdd}
                    style={[styles.saveBtn, {
                        backgroundColor: colors.primary + '18',
                        paddingHorizontal: 20,
                        paddingVertical: 8,
                        borderColor: colors.primary + '44',
                        opacity: isLoading ? 0.5 : 1,
                    }]}
                >
                    <Text style={[styles.saveTxt, { fontSize: 15, fontWeight: '700', color: colors.primary }]}>
                        {t('save')}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={20} color={colors.textTertiary} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder={t('searchCountry')}
                    placeholderTextColor={colors.textTertiary}
                    value={query}
                    onChangeText={setQuery}
                    autoCorrect={false}
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={() => setQuery('')}>
                        <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
                    </TouchableOpacity>
                )}
            </View>

            <SectionList
                sections={sections}
                keyExtractor={item => item.name}
                renderItem={renderItem}
                renderSectionHeader={({ section }) => (
                    <Text style={[styles.sectionLabel, { color: '#6563FF', backgroundColor: colors.background }]}>
                        {section.title}
                    </Text>
                )}
                extraData={[selected, tick]}
                stickySectionHeadersEnabled
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: ins.bottom + 20 }}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={{ color: colors.textSecondary, fontSize: 15 }}>{t('Noresultsfound')}</Text>
                    </View>
                }
            />
            <View style={{ position: 'absolute', bottom: 12, width: '100%', alignItems: 'center' }}>
                <AdBanner screen="country_screen" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    saveTxt: { fontSize: 15, fontWeight: '700' },
    closeBtnCircle: {
        width: 40,
        height: 40,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtn: {
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
    },
    backBtn: { minWidth: 50, alignItems: 'flex-start', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    addBtn: {
        backgroundColor: '#EEEDFE',
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 8,
    },
    addBtnDisabled: { opacity: 0.5 },
    addBtnText: { color: '#6563FF', fontSize: 14, fontWeight: '600' },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 12,
        paddingHorizontal: 12,
        paddingVertical: 15,
        borderRadius: 10,
        borderWidth: 0.5,
        gap: 8,
    },
    searchInput: { flex: 1, fontSize: 16 },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    countryName: { flex: 1, fontSize: 15 },
    timeText: { fontSize: 14, marginRight: 12 },
    circle: {
        width: 22, height: 22, borderRadius: 11,
        borderWidth: 1.5,
        alignItems: 'center', justifyContent: 'center',
    },
    circleSelected: { backgroundColor: '#6563FF', borderColor: '#6563FF' },
    emptyState: { paddingTop: 60, alignItems: 'center' },
});