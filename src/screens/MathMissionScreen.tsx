// src/screens/MathMissionScreen.tsx
import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

const { width: SW } = Dimensions.get('window');

type Difficulty = 'Easy' | 'Medium' | 'Hard';

const DIFFICULTY_LIST: Difficulty[] = ['Easy', 'Medium', 'Hard'];

const DIFFICULTY_META: Record<Difficulty, { flames: number; descKey: string; example: string }> = {
    Easy: { flames: 2, descKey: 'difficulty_desc.Easy', example: '8 + 6 - 1 = ?' },
    Medium: { flames: 3, descKey: 'difficulty_desc.Medium', example: '7 × 8 + 3 = ?' },
    Hard: { flames: 5, descKey: 'difficulty_desc.Hard', example: '24 × 7 - 56 = ?' },
};

interface Props {
    count: number;
    difficulty: Difficulty;
    onSave: (count: number, difficulty: Difficulty) => void;
    onBack: () => void;
    // colors: any;
}

export default function MathMissionScreen({ count, difficulty, onSave, onBack }: Props) {
    const ins = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();
    const [localCount, setLocalCount] = useState(count);
    const [localDiff, setLocalDiff] = useState<Difficulty>(difficulty);
    // const { colors } = useTheme();
    const meta = DIFFICULTY_META[localDiff];
    const diffIdx = DIFFICULTY_LIST.indexOf(localDiff);

    const prevDiff = () => {
        if (diffIdx > 0) setLocalDiff(DIFFICULTY_LIST[diffIdx - 1]);
    };
    const nextDiff = () => {
        if (diffIdx < DIFFICULTY_LIST.length - 1) setLocalDiff(DIFFICULTY_LIST[diffIdx + 1]);
    };

    const decCount = () => setLocalCount(c => Math.max(1, c - 1));
    const incCount = () => setLocalCount(c => Math.min(10, c + 1));

    return (
        <View style={[S.root, { backgroundColor: colors.background, paddingTop: ins.top }]}>
            <View style={S.header}>
                <TouchableOpacity onPress={onBack} style={S.backBtn}>
                    <View style={[S.backCircle, { backgroundColor: colors.surface }]}>
                        <Ionicons name="chevron-back" size={26} color={colors.textSecondary} />
                    </View>
                </TouchableOpacity>
                <Text style={[S.title, { color: colors.text }]}>{t('Mathmission')}</Text>
                <TouchableOpacity
                    style={[S.previewBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]}
                    activeOpacity={0.7}
                    onPress={() => onSave(localCount, localDiff)}
                >
                    <Text style={[S.previewTxt, { fontSize: 15, fontWeight: '700', color: colors.primary }]}>{t('save')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: ins.bottom + 100, paddingHorizontal: 20 }}
            >
                <View style={[S.exampleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={S.flameRow}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <Text key={i} style={[S.flame, { opacity: i <= meta.flames ? 1 : 0.25 }]}>
                                🔥
                            </Text>
                        ))}
                    </View>

                    <Text style={[S.exampleLabel, { color: colors.textSecondary }]}>{t('Example')}</Text>
                    <Text style={[S.exampleText, { color: colors.text }]}>{meta.example}</Text>

                    <View style={[S.dotRow, { marginBottom: 40 }]}>
                        {DIFFICULTY_LIST.map((d, i) => (
                            <View
                                key={d}
                                style={[
                                    S.dot,
                                    {
                                        backgroundColor: d === localDiff
                                            ? colors.primary
                                            : colors.border,
                                        width: d === localDiff ? 18 : 7,
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    <View style={[{ marginTop: 20 }]}>
                        <Text style={[S.sectionLabel, { color: colors.textSecondary }]}>{t('NumberofProblems')}</Text>
                        <View style={[S.controlRow]}>
                            <TouchableOpacity
                                onPress={decCount}
                                activeOpacity={0.7}
                                style={[S.circleBtn, {
                                    backgroundColor: colors.surface,
                                    borderColor: colors.border,
                                    opacity: localCount <= 1 ? 0.35 : 1,
                                }]}
                            >
                                <Text style={[S.circleBtnTxt, { color: colors.text }]}>−</Text>
                            </TouchableOpacity>

                            <Text style={[S.countText, { color: colors.text }]}>{localCount}</Text>

                            <TouchableOpacity
                                onPress={incCount}
                                activeOpacity={0.7}
                                style={[S.circleBtn, {
                                    backgroundColor: colors.surface,
                                    borderColor: colors.border,
                                    opacity: localCount >= 10 ? 0.35 : 1,
                                }]}
                            >
                                <Text style={[S.circleBtnTxt, { color: colors.text }]}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* <View style={[S.exampleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> */}
                    <View style={[{ marginTop: 30 }]}>
                        <Text style={[S.sectionLabel, { color: colors.textSecondary, marginTop: 10 }]}>{t('Difficulty')}</Text>
                        <View style={S.controlRow}>
                            <TouchableOpacity
                                onPress={prevDiff}
                                activeOpacity={0.7}
                                style={{ opacity: diffIdx === 0 ? 0.25 : 1 }}
                            >
                                <Ionicons name="chevron-back" size={34} color={colors.text} />
                            </TouchableOpacity>

                            {/* <Text style={[S.diffText, { color: colors.text }]}>{localDiff}</Text> */}
                            <Text style={[S.diffText, { color: colors.text }]}>{t(`difficulty.${localDiff}`)}</Text>

                            <TouchableOpacity
                                onPress={nextDiff}
                                activeOpacity={0.7}
                                style={{ opacity: diffIdx === DIFFICULTY_LIST.length - 1 ? 0.25 : 1 }}
                            >
                                <Ionicons name="chevron-forward" size={34} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[S.diffDesc, { color: colors.textTertiary }]}>{t(meta.descKey)}</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const S = StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        justifyContent: 'space-between',
    },
    backBtn: { width: 44 },
    backCircle: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
    },
    title: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center', marginHorizontal: 8 },
    previewBtn: {
        paddingHorizontal: 16, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1,
    },

    exampleCard: {
        borderRadius: 20, borderWidth: 0.5,
        paddingVertical: 24, paddingHorizontal: 20,
        alignItems: 'center', marginTop: 16, marginBottom: 32,
    },
    flameRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
    flame: { fontSize: 26 },
    exampleLabel: { fontSize: 13, marginBottom: 8, fontWeight: '500' },
    exampleText: { fontSize: 36, fontWeight: '700', letterSpacing: 1, marginBottom: 16 },
    dotRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    dot: { height: 7, borderRadius: 4 },

    sectionLabel: {
        fontSize: 12, fontWeight: '500',
        textAlign: 'center', marginBottom: 16,
    },
    controlRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 32, marginBottom: 32,
    },
    circleBtn: {
        width: 48, height: 48, borderRadius: 24,
        borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    },
    circleBtnTxt: { fontSize: 26, fontWeight: '300', lineHeight: 30 },
    countText: { fontSize: 36, fontWeight: '700', minWidth: 48, textAlign: 'center' },
    diffText: { fontSize: 28, fontWeight: '700', minWidth: 100, textAlign: 'center' },
    diffDesc: { fontSize: 13, textAlign: 'center', marginTop: -20, marginBottom: 16 },

    saveWrap: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20, paddingTop: 12,
    },
    saveBtn: {
        borderRadius: 16, paddingVertical: 18,
        alignItems: 'center', justifyContent: 'center',
    },
    saveTxt: { fontSize: 17, fontWeight: '700', color: '#000' },
});