import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import {TileModel} from "../types";

// Возвращает цвет для плитки по ее значению
const getTileColor = (v: number) => {
    if (v <= 4) return '#eee4da';
    if (v <= 8) return '#ede0c8';
    if (v <= 16) return '#f2b179';
    if (v <= 32) return '#f59563';
    if (v <= 64) return '#f67c5f';
    if (v <= 128) return '#f65e3b';
    if (v <= 256) return '#edcf72';
    if (v <= 512) return '#edcc61';
    if (v <= 1024) return '#edc850';
    return '#edc53f';
}

export default function Tile({tile, x, y, size}: {
    tile: TileModel;
    x: number;
    y: number;
    size: number;
}) {
    const translateX = useRef(new Animated.Value(x)).current;
    const translateY = useRef(new Animated.Value(y)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.7)).current;
    const prevValue = useRef(tile.value);

    // Появление новой плитки
    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        ]).start();
    }, []);

    // Перемещение
    useEffect(() => {
        Animated.parallel([
            Animated.timing(translateX, { toValue: x, duration: 110, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: y, duration: 110, useNativeDriver: true }),
        ]).start();
    }, [x, y, translateX, translateY]);

    // Пульс при merge (value вырос у той же плитки)
    useEffect(() => {
        if (tile.value > prevValue.current) {
            Animated.sequence([
                Animated.spring(scale, { toValue: 1.12, friction: 7, useNativeDriver: true }),
                Animated.spring(scale, { toValue: 1, friction: 8, useNativeDriver: true }),
            ]).start();
        }
        prevValue.current = tile.value;
    }, [tile.value, scale]);

    return (
        <Animated.View
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: size,
                height: size,
                borderRadius: 8,
                backgroundColor: getTileColor(tile.value),
                alignItems: 'center',
                justifyContent: 'center',
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
            }}
        >
            <Text
                style={{
                    fontWeight: '800',
                    fontSize: tile.value >= 1024 ? 20 : 24,
                    color: tile.value <= 4 ? '#776e65' : '#f9f6f2',
                }}
            >
                {tile.value}
            </Text>
        </Animated.View>
    );
}
