import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Word = {
    word: string;
    meaning: string;
    meaningList: string[]; // parsed meanings for validation
};

type QuestionType = 'en_to_jp' | 'jp_to_en';

export default function BattleScreen({ onEnd }: { onEnd: (score: number) => void }) {
    const [words, setWords] = useState<Word[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(60);
    const [score, setScore] = useState(0);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [input, setInput] = useState('');
    const [shake, setShake] = useState(false);

    // Determine question type for the current word. 
    // We can deterministically derive this from the index or just randomize it. 
    // To ensure consistency during a session for a specific word instance, let's use a stored state or derived value.
    // For simplicity and "battle" feel, we'll randomize it per word instance.
    const [questionType, setQuestionType] = useState<QuestionType>('jp_to_en');

    useEffect(() => {
        fetch('/word.json')
            .then(res => res.json())
            .then((data: any[]) => {
                // Limit to first 218 items
                const limitedData = data.slice(0, 218).map(item => ({
                    word: item.english,
                    meaning: item.japanese,
                    meaningList: item.japanese.split('、').map((m: string) => m.trim())
                }));
                // Shuffle words for randomness
                const shuffled = limitedData.sort(() => Math.random() - 0.5);
                setWords(shuffled);
                setLoading(false);
                // Set initial question type
                setQuestionType(Math.random() > 0.5 ? 'en_to_jp' : 'jp_to_en');
            })
            .catch(err => {
                console.error('Failed to load words:', err);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        if (loading || words.length === 0) return;

        if (timeLeft <= 0) {
            onEnd(score);
            return;
        }
        const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, onEnd, score, loading, words.length]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (words.length === 0) return;

        const currentWord = words[currentWordIndex % words.length];
        let isCorrect = false;

        if (questionType === 'jp_to_en') {
            // User sees Japanese, types English
            if (input.trim().toLowerCase() === currentWord.word.toLowerCase()) {
                isCorrect = true;
            }
        } else {
            // User sees English, types Japanese
            // Check if input matches ONE of the meanings exactly
            if (currentWord.meaningList.includes(input.trim())) {
                isCorrect = true;
            }
        }

        if (isCorrect) {
            setScore(s => s + 10 + Math.ceil(timeLeft / 10)); // Bonus for speed
            setCurrentWordIndex(i => i + 1);
            setInput('');
            // Randomize next question type
            setQuestionType(Math.random() > 0.5 ? 'en_to_jp' : 'jp_to_en');
        } else {
            setShake(true);
            setTimeout(() => setShake(false), 500);
        }
    };

    if (loading) {
        return <div className="text-white text-2xl text-center pt-20">Loading words...</div>;
    }

    if (words.length === 0) {
        return <div className="text-white text-2xl text-center pt-20">No words found or error loading words.</div>;
    }

    const currentWord = words[currentWordIndex % words.length];

    return (
        <div className="w-full max-w-2xl p-8">
            <div className="flex justify-between items-center mb-12">
                <div className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                    <Timer className="text-yellow-400" />
                    <span className="font-mono text-2xl font-bold text-yellow-50">{timeLeft}s</span>
                </div>
                <div className="text-3xl font-bold bg-gray-800 px-6 py-2 rounded-lg border border-gray-700 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                    {score}
                </div>
            </div>

            <div className="text-center space-y-12">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${currentWord.word}-${questionType}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                    >
                        <h2 className="text-6xl font-black tracking-tight text-white drop-shadow-lg">
                            {questionType === 'jp_to_en' ? currentWord.meaning : currentWord.word}
                        </h2>
                        <p className="text-xl text-gray-400 italic">
                            {questionType === 'jp_to_en' ? 'Type the English word' : '日本語で意味を入力'}
                        </p>
                    </motion.div>
                </AnimatePresence>

                <motion.form
                    onSubmit={handleSubmit}
                    animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                    className="relative max-w-lg mx-auto"
                >
                    <input
                        autoFocus
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="w-full bg-gray-800/50 border-2 border-gray-600 rounded-xl p-6 text-center text-3xl font-bold tracking-wider focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:outline-none transition-all placeholder-gray-600"
                        placeholder={questionType === 'jp_to_en' ? "Type in English..." : "日本語で入力..."}
                    />
                </motion.form>
            </div>
        </div>
    );
}
