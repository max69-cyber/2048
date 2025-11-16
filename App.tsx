import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Board from './src/components/Board';

export default function App() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <SafeAreaView style={{ flex: 1, backgroundColor: '#faf8ef' }}>
                    <Board />
                </SafeAreaView>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
