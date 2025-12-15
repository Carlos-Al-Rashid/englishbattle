import { useState, useEffect } from 'react';
import { Timer, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../db';
import { getOptionsForWord } from '../services/optionGenerator';

type Word = {
    word: string;
    meaning: string;
    meaningList: string[]; // parsed meanings for validation
};

type QuestionType = 'en_to_jp' | 'jp_to_en';
type Source = 'standard' | 'captured';

export default function BattleScreen({ onEnd, source }: { onEnd: (score: number) => void, source: Source }) {
    const [words, setWords] = useState<Word[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingOptions, setGeneratingOptions] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const [score, setScore] = useState(0);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [shake, setShake] = useState(false);

    // Mainly En -> Jp (See English, Choose Japanese) as requested
    const [questionType, setQuestionType] = useState<QuestionType>('en_to_jp');
    const [options, setOptions] = useState<string[]>([]);

    useEffect(() => {
        const loadWords = async () => {
            try {
                let loadedWords: Word[] = [];

                if (source === 'standard') {
                    const res = await fetch('/word.json');
                    const data = await res.json();
                    // Limit to first 218 items
                    loadedWords = data.slice(0, 218).map((item: any) => ({
                        word: item.english,
                        meaning: item.japanese,
                        meaningList: item.japanese.split('、').map((m: string) => m.trim())
                    }));
                } else {
                    const data = await db.capturedWords.toArray();
                    loadedWords = data.map(item => ({
                        word: item.word,
                        meaning: item.meaning,
                        meaningList: item.meaning.split('、').map((m: string) => m.trim())
                    }));
                }

                if (loadedWords.length === 0) {
                    console.warn("No words found for source:", source);
                }

                // Shuffle words for randomness
                const shuffled = loadedWords.sort(() => Math.random() - 0.5);
                setWords(shuffled);
                setLoading(false);
            } catch (err) {
                console.error('Failed to load words:', err);
                setLoading(false);
            }
        };

        loadWords();
    }, [source]);



    useEffect(() => {
        if (loading || words.length === 0) return;

        if (timeLeft <= 0) {
            onEnd(score);
            return;
        }
        const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, onEnd, score, loading, words.length]);

    // State for the current round's valid answer to avoid race conditions/re-derivation issues
    const [currentCorrectAnswer, setCurrentCorrectAnswer] = useState<string>('');

    // ...

    // Prepare options when word changes
    useEffect(() => {
        if (words.length === 0) return;

        const prepareOptions = async () => {
            setGeneratingOptions(true);
            const currentWord = words[currentWordIndex % words.length];

            const nextQuestionType = Math.random() > 0.2 ? 'en_to_jp' : 'jp_to_en';
            setQuestionType(nextQuestionType);

            try {
                // Determine correct answer string immediately
                const correctStr = nextQuestionType === 'en_to_jp' ? currentWord.meaning : currentWord.word;
                setCurrentCorrectAnswer(correctStr);

                // Try to get GPT generated options
                let distractors = await getOptionsForWord(currentWord.word, currentWord.meaning, nextQuestionType);

                // Fallback if no API key or error
                if (distractors.length === 0) {
                    const otherWords = words.filter(w => w.word !== currentWord.word);
                    const randomOthers = otherWords.sort(() => Math.random() - 0.5).slice(0, 3);
                    distractors = randomOthers.map(w => nextQuestionType === 'en_to_jp' ? w.meaning : w.word);
                }

                const allOptions = [...distractors, correctStr].sort(() => Math.random() - 0.5);

                setOptions(allOptions);
            } catch (e) {
                console.error(e);
            } finally {
                setGeneratingOptions(false);
            }
        };

        prepareOptions();
    }, [currentWordIndex, words]); // Removed questionType dependency

    // ...

    const handleOptionClick = (selectedOption: string) => {
        if (generatingOptions) return;

        if (selectedOption === currentCorrectAnswer) {
            setScore(s => s + 10 + Math.ceil(timeLeft / 10)); // Bonus for speed
            setCurrentWordIndex(i => i + 1);
        } else {
            setShake(true);
            setTimeout(() => setShake(false), 500);
            // Optionally penalize time
            setTimeLeft(prev => Math.max(0, prev - 5));
        }
    };

    if (loading) {
        return <div className="text-white text-2xl text-center pt-20">Loading words...</div>;
    }

    if (words.length === 0) {
        return <div className="text-white text-2xl text-center pt-20">No words found. Add some words first!</div>;
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
                        key={`${currentWord.word}-${currentWordIndex}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                    >
                        <h2 className="text-6xl font-black tracking-tight text-white drop-shadow-lg">
                            {questionType === 'en_to_jp' ? currentWord.word : currentWord.meaning}
                        </h2>
                        <p className="text-xl text-gray-400 italic">
                            {questionType === 'en_to_jp' ? 'Choose the correct meaning' : 'Choose the correct word'}
                        </p>
                    </motion.div>
                </AnimatePresence>

                {generatingOptions ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : (
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                    >
                        {options.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleOptionClick(option)}
                                className="p-6 bg-gray-800/80 hover:bg-blue-600/80 border-2 border-gray-600 hover:border-blue-400 rounded-xl text-xl font-bold transition-all transform hover:-translate-y-1 active:scale-95 text-white shadow-lg"
                            >
                                {option}
                            </button>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
