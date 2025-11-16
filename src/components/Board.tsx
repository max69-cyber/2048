import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    Dimensions,
    Text,
    View,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GameEngine from '../game-engine/GameEngine';
import Tile from './Tile';
import {Direction} from '../types';

const DEFAULT_PADDING = 8;
const DEFAULT_SPACING = 8;
const BEST_SCORE_KEY = 'BEST_SCORE_2048';

export default function Board() {
    const engineRef = useRef(new GameEngine());
    const [state, setState] = useState(engineRef.current.getGameState());
    const [bestScore, setBestScore] = useState(0);

    // Загружаем рекорд
    useEffect(() => {
        (async () => {
            try {
                const saved = await AsyncStorage.getItem(BEST_SCORE_KEY);
                if (saved != null) {
                    setBestScore(Number(saved) || 0);
                }
            } catch (e) {
                console.warn('Failed to load best score', e);
            }
        })();
    }, []);

    // Обновляем стейт из движка + пишем рекорд
    const syncStateWithEngine = useCallback(async () => {
        const newState = engineRef.current.getGameState();
        setState(newState);

        if (newState.score > bestScore) {
            setBestScore(newState.score);
            try {
                await AsyncStorage.setItem(BEST_SCORE_KEY, String(newState.score));
            } catch (e) {
                console.warn('Failed to save best score', e);
            }
        }
    }, [bestScore]);

    const size = useMemo(
        () => Math.min(Dimensions.get('window').width - 32, 420),
        []
    );
    const cell = (size - DEFAULT_PADDING * 2 - DEFAULT_SPACING * 3) / 4;

    const doMove = useCallback(
        (dir: Direction) => {
            const changed = engineRef.current.move(dir);
            if (changed) {
                syncStateWithEngine();
            }
        },
        [syncStateWithEngine]
    );

    const undo = useCallback(() => {
        if (engineRef.current.undo()) {
            setState(engineRef.current.getGameState());
        }
    }, []);

    const redo = useCallback(() => {
        if (engineRef.current.redo()) {
            setState(engineRef.current.getGameState());
        }
    }, []);

    const reset = useCallback(() => {
        engineRef.current.reset();
        setState(engineRef.current.getGameState());
    }, []);

    const pan = useMemo(
        () =>
            Gesture.Pan()
                .activeOffsetX([-20, 20])
                .activeOffsetY([-20, 20])
                .onEnd(e => {
                    const {translationX: x, translationY: y} = e;
                    const ax = Math.abs(x),
                        ay = Math.abs(y);
                    if (Math.max(ax, ay) < 30) return;
                    if (ax > ay) doMove(x > 0 ? Direction.RIGHT : Direction.LEFT);
                    else doMove(y > 0 ? Direction.DOWN : Direction.UP);
                }),
        [doMove]
    );

    return (
        <View style={styles.container}>
            {/* Верх: рекорд + текущий счёт */}
            <View style={styles.header}>
                <Text style={styles.bestText}>Best: {bestScore}</Text>
                <Text style={styles.scoreText}>Score: {state.score}</Text>
            </View>

            {/* Центр: доска */}
            <View style={styles.boardWrapper}>
                <GestureDetector gesture={pan}>
                    <View style={[styles.board, {width: size, height: size}]}>
                        {/* фоновые клетки */}
                        <View
                            style={{
                                position: 'absolute',
                                left: DEFAULT_PADDING,
                                top: DEFAULT_PADDING,
                                right: DEFAULT_PADDING,
                                bottom: DEFAULT_PADDING,
                            }}>
                            {Array.from({length: 16}).map((_, i) => {
                                const r = Math.floor(i / 4),
                                    c = i % 4;
                                return (
                                    <View
                                        key={`bg-${i}`}
                                        style={{
                                            position: 'absolute',
                                            left: c * (cell + DEFAULT_SPACING),
                                            top: r * (cell + DEFAULT_SPACING),
                                            width: cell,
                                            height: cell,
                                            backgroundColor: '#cdc1b4',
                                            borderRadius: 8,
                                        }}
                                    />
                                );
                            })}
                        </View>

                        {/* плитки */}
                        {state.board.map((t, i) => {
                            if (!t) return null;
                            const r = Math.floor(i / 4),
                                c = i % 4;
                            const x =
                                DEFAULT_PADDING + c * (cell + DEFAULT_SPACING);
                            const y =
                                DEFAULT_PADDING + r * (cell + DEFAULT_SPACING);
                            return (
                                <Tile
                                    key={t.id}
                                    tile={t}
                                    x={x}
                                    y={y}
                                    size={cell}
                                />
                            );
                        })}
                    </View>
                </GestureDetector>

                {/* Game Over оверлей поверх доски */}
                {!state.canMove && (
                    <View style={styles.overlay}>
                        <View style={styles.overlayCard}>
                            <Text style={styles.overlayText}>
                                No moves 😢
                            </Text>
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={reset}>
                                <Text style={styles.primaryButtonText}>
                                    Try again
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            {/* Низ: кнопки управления */}
            <View style={styles.controls}>
                <ControlButton title="RESET" onPress={reset} />
                <ControlButton
                    title="UNDO"
                    onPress={undo}
                    disabled={!state.canUndo}
                />
                <ControlButton
                    title="REDO"
                    onPress={redo}
                    disabled={!state.canRedo}
                />
            </View>
        </View>
    );
}

type ControlButtonProps = {
    title: string;
    onPress: () => void;
    disabled?: boolean;
};

function ControlButton({title, onPress, disabled}: ControlButtonProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            style={[
                styles.controlButton,
                disabled && styles.controlButtonDisabled,
            ]}>
            <Text style={styles.controlButtonText}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#faf8ef',
        paddingHorizontal: 16,
        paddingTop: 32,
        paddingBottom: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 16,
    },
    bestText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#776e65',
        marginBottom: 4,
    },
    scoreText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#776e65',
    },
    boardWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    board: {
        backgroundColor: '#bbada0',
        borderRadius: 12,
        padding: DEFAULT_PADDING,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
    },
    controlButton: {
        flex: 1,
        paddingVertical: 10,
        marginHorizontal: 4,
        borderRadius: 999,
        backgroundColor: '#8f7a66',
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlButtonDisabled: {
        backgroundColor: '#ccc0b3',
        opacity: 0.7,
    },
    controlButtonText: {
        color: '#f9f6f2',
        fontWeight: '700',
        fontSize: 14,
        letterSpacing: 1,
    },
    overlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    overlayCard: {
        paddingVertical: 20,
        paddingHorizontal: 28,
        backgroundColor: '#fff',
        borderRadius: 12,
        alignItems: 'center',
    },
    overlayText: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 12,
        color: '#776e65',
    },
    primaryButton: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 999,
        backgroundColor: '#8f7a66',
    },
    primaryButtonText: {
        color: '#f9f6f2',
        fontWeight: '700',
        fontSize: 14,
        letterSpacing: 1,
    },
});
