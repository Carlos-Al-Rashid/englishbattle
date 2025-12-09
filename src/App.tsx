import { useState } from 'react';
import SetupScreen from './components/SetupScreen';
import BattleScreen from './components/BattleScreen';
import ResultScreen from './components/ResultScreen';

export type GameState = 'setup' | 'battle' | 'result';

export default function App() {
    const [gameState, setGameState] = useState<GameState>('setup');
    const [score, setScore] = useState(0);

    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            {gameState === 'setup' && <SetupScreen onStart={() => setGameState('battle')} />}
            {gameState === 'battle' && <BattleScreen onEnd={(finalScore) => { setScore(finalScore); setGameState('result'); }} />}
            {gameState === 'result' && <ResultScreen score={score} onRestart={() => setGameState('setup')} />}
        </div>
    );
}
