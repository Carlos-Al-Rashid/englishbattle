import { Play, BookOpen, Brain } from 'lucide-react';

export default function SetupScreen({ onStart }: { onStart: () => void }) {
    return (
        <div className="text-center space-y-8 max-w-lg w-full p-10 bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-gray-700">
            <div className="space-y-4">
                <div className="flex justify-center space-x-2">
                    <BookOpen className="w-8 h-8 text-blue-400" />
                    <Brain className="w-8 h-8 text-purple-400" />
                </div>
                <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
                    English Battle
                </h1>
                <p className="text-lg text-gray-300">Master vocabulary through rapid-fire challenges.</p>
            </div>

            <div className="flex flex-col space-y-4">
                <button
                    onClick={onStart}
                    className="group relative w-full py-4 px-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold text-lg shadow-lg hover:shadow-blue-500/25 transition-all transform hover:-translate-y-1 active:translate-y-0 overflow-hidden"
                >
                    <span className="relative z-10 flex items-center justify-center space-x-2">
                        <span>Start Battle</span>
                        <Play className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
            </div>

            <div className="text-sm text-gray-500">
                Press <span className="font-mono bg-gray-700 px-1.5 py-0.5 rounded">Enter</span> to begin
            </div>
        </div>
    );
}
