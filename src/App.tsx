import { useState } from 'react';
import SetupScreen from './components/SetupScreen';
import BattleScreen from './components/BattleScreen';
import ResultScreen from './components/ResultScreen';
import CaptureScreen from './components/CaptureScreen';

export type GameState = 'setup' | 'battle' | 'result' | 'capture';
type Source = 'standard' | 'captured';

export default function App() {
    const [gameState, setGameState] = useState<GameState>('setup');
    const [score, setScore] = useState(0);
    const [source, setSource] = useState<Source>('standard');

    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            {gameState === 'setup' && (
                <SetupScreen
                    onStart={(selectedSource) => {
                        setSource(selectedSource);
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
                    onEnd={(finalScore) => { setScore(finalScore); setGameState('result'); }}
                />
            )}

            {gameState === 'result' && (
                <ResultScreen score={score} onRestart={() => setGameState('setup')} />
            )}
        </div>
    );
}
