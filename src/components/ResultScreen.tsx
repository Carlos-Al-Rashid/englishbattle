import { RotateCcw, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResultScreen({ score, onRestart }: { score: number, onRestart: () => void }) {
    return (
        <div className="text-center space-y-8 max-w-lg w-full p-10 bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700">
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="mx-auto w-24 h-24 bg-yellow-400/10 rounded-full flex items-center justify-center mb-6"
            >
                <Trophy className="w-12 h-12 text-yellow-400" />
            </motion.div>

            <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">Battle Finished!</h2>
                <p className="text-gray-400">Great effort! Here is your final result.</p>
            </div>

            <div className="py-8 relative">
                <div className="text-7xl font-black bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                    {score}
                </div>
                <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-2">Total Score</div>
            </div>

            <button
                onClick={onRestart}
                className="w-full py-4 px-8 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center space-x-2 group"
            >
                <RotateCcw className="w-5 h-5 group-hover:-rotate-180 transition-transform duration-500" />
                <span>Play Again</span>
            </button>
        </div>
    );
}
