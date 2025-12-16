import { useState } from 'react';
import SetupScreen from './components/SetupScreen';
import BattleScreen from './components/BattleScreen';
import ResultScreen from './components/ResultScreen';
import CaptureScreen from './components/CaptureScreen';

export type GameState = 'setup' | 'battle' | 'result' | 'capture';
type Source = 'standard' | 'captured';
type GameMode = 'solo' | 'battle';

export default function App() {
    const [gameState, setGameState] = useState<GameState>('setup');
    const [score, setScore] = useState(0);
    const [source, setSource] = useState<Source>('standard');
    const [wordCount, setWordCount] = useState<number>(10);
    const [mode, setMode] = useState<GameMode>('solo');

    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            {gameState === 'setup' && (
                <SetupScreen
                    onStart={(selectedSource, selectedWordCount, selectedMode) => {
                        setSource(selectedSource);
                        setWordCount(selectedWordCount);
                        setMode(selectedMode);
                        setGameState('battle');
                    }}
                    onCaptureMode={() => setGameState('capture')}
                />
            )}

            {gameState === 'capture' && (
                <CaptureScreen onBack={() => setGameState('setup')} />
            )}

            {gameState === 'battle' && (
                <BattleScreen
                    source={source}
                    wordCount={wordCount}
                    mode={mode}
                    onEnd={(finalScore) => { setScore(finalScore); setGameState('result'); }}
                />
            )}

            {gameState === 'result' && (
                <ResultScreen score={score} onRestart={() => setGameState('setup')} />
            )}
        </div>
    );
}
