import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Button, Dimensions, Text, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import GameEngine from '../game-engine/GameEngine';
import Tile from './Tile';
import {Direction} from "../types";

const DEFAULT_PADDING = 8;
const DEFAULT_SPACING = 8;

export default function Board() {
    const engineRef = useRef(new GameEngine());
    const [state, setState] = useState(engineRef.current.getGameState());

    const size = useMemo(() => Math.min(Dimensions.get('window').width - 32, 420), []);
    const cell = (size - DEFAULT_PADDING * 2 - DEFAULT_SPACING * 3) / 4;

    const doMove = useCallback((dir: Direction) => {
        const changed = engineRef.current.move(dir);
        if (changed) setState(engineRef.current.getGameState());
    }, []);

    const undo = useCallback(() => {
        if (engineRef.current.undo()) setState(engineRef.current.getGameState());
    }, []);

    const redo = useCallback(() => {
        if (engineRef.current.redo()) setState(engineRef.current.getGameState());
    }, []);


    const pan = useMemo(
        () =>
            Gesture.Pan()
                .activeOffsetX([-20, 20])
                .activeOffsetY([-20, 20])
                .onEnd(e => {
                    const { translationX: x, translationY: y } = e;
                    const ax = Math.abs(x), ay = Math.abs(y);
                    if (Math.max(ax, ay) < 30) return;
                    if (ax > ay) doMove(x > 0 ? Direction.RIGHT : Direction.LEFT);
                    else doMove(y > 0 ? Direction.DOWN : Direction.UP);
                }),
        [doMove]
    );

    const reset = useCallback(() => {
        engineRef.current.reset();
        setState(engineRef.current.getGameState());
    }, []);

    return (
        <View style={{ flex: 1 }}>
            <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '700' }}>Score: {state.score}</Text>
                <View style={{ flexDirection: 'row' }}>
                    <View style={{ marginRight: 8 }}>
                        <Button title="UNDO" onPress={undo} disabled={!state.canUndo} />
                    </View>
                    <View style={{ marginRight: 8 }}>
                        <Button title="REDO" onPress={redo} disabled={!state.canRedo} />
                    </View>
                    <Button title="RESET" onPress={reset} />
                </View>
            </View>

            {/* Игровое поле */}
            <GestureDetector gesture={pan}>
                <View style={{ alignSelf: 'center', width: size, height: size, backgroundColor: '#bbada0', borderRadius: 12, padding: DEFAULT_PADDING }}>
                    {/* фоновые клетки */}
                    <View style={{ position: 'absolute', left: DEFAULT_PADDING, top: DEFAULT_PADDING, right: DEFAULT_PADDING, bottom: DEFAULT_PADDING }}>
                        {Array.from({ length: 16 }).map((_, i) => {
                            const r = Math.floor(i / 4), c = i % 4;
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
                        const r = Math.floor(i / 4), c = i % 4;
                        const x = DEFAULT_PADDING + c * (cell + DEFAULT_SPACING);
                        const y = DEFAULT_PADDING + r * (cell + DEFAULT_SPACING);
                        return <Tile key={t.id} tile={t} x={x} y={y} size={cell} />;
                    })}
                </View>
            </GestureDetector>

            {/* Game Over */}
            {!state.canMove && (
                <View style={{
                    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
                    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)'
                }}>
                    <View style={{ padding: 24, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center' }}>
                        <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 12 }}>No moves 😢</Text>
                        <Button title="Try again" onPress={reset} />
                    </View>
                </View>
            )}
        </View>
    );
}
