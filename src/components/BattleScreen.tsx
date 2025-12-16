import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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
type GameMode = 'solo' | 'battle';

export default function BattleScreen({ onEnd, source, wordCount, mode }: {
    onEnd: (score: number) => void,
    source: Source,
    wordCount: number,
    mode: GameMode
}) {
    const [words, setWords] = useState<Word[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingOptions, setGeneratingOptions] = useState(false);
    const [score, setScore] = useState(0);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [shake, setShake] = useState(false);

    // Detect iPad more accurately
    const isIPad = (() => {
        const ua = navigator.userAgent;
        // Check for iPad in user agent
        if (/iPad/.test(ua)) return true;

        // Modern iPads may report as Macintosh, so check for touch support and screen size
        if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) {
            // Exclude large desktop screens (iPad max is around 1366px)
            return window.screen.width <= 1366 && window.screen.height <= 1366;
        }

        return false;
    })();
    const isBattleMode = mode === 'battle' && isIPad;

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


    // State for the current round's valid answer to avoid race conditions/re-derivation issues
    const [currentCorrectAnswer, setCurrentCorrectAnswer] = useState<string>('');

    // Prepare options when word changes
    useEffect(() => {
        if (words.length === 0) return;
        if (currentWordIndex >= wordCount) {
            onEnd(score);
            return;
        }

        let ignore = false;

        const prepareOptions = async () => {
            // Ensure loading state is set (redundant if set in handler, but good for initial load)
            if (!ignore) setGeneratingOptions(true);
            const currentWord = words[currentWordIndex % words.length];

            // Bias towards 'en_to_jp' (80% chance) or purely as requested "basically En->Jp"
            // "基本的には英日の問題を出すようにして下さい" -> Mostly En->Jp.
            const nextQuestionType = Math.random() > 0.2 ? 'en_to_jp' : 'jp_to_en';
            if (!ignore) {
                setQuestionType(nextQuestionType);
            }

            try {
                // Determine correct answer string immediately
                const correctStr = nextQuestionType === 'en_to_jp' ? currentWord.meaning : currentWord.word;

                // Try to get GPT generated options
                let distractors = await getOptionsForWord(currentWord.word, currentWord.meaning, nextQuestionType);

                // Fallback if no API key or error: Pick random from other words in the list
                if (distractors.length === 0) {
                    const otherWords = words.filter(w => w.word !== currentWord.word);
                    const randomOthers = otherWords.sort(() => Math.random() - 0.5).slice(0, 3);
                    distractors = randomOthers.map(w => nextQuestionType === 'en_to_jp' ? w.meaning : w.word);
                }

                const allOptions = [...distractors, correctStr].sort(() => Math.random() - 0.5);

                if (!ignore) {
                    setCurrentCorrectAnswer(correctStr);
                    setOptions(allOptions);
                    setGeneratingOptions(false);
                }
            } catch (e) {
                console.error(e);
                if (!ignore) {
                    setGeneratingOptions(false);
                }
            }
        };

        prepareOptions();

        return () => { ignore = true; };
    }, [currentWordIndex, words, wordCount, onEnd, score]);

    const handleOptionClick = (selectedOption: string) => {
        if (generatingOptions) return;

        if (selectedOption === currentCorrectAnswer) {
            setScore(s => s + 10);

            // Clear state immediately to prevent "flash of old content" mismatch
            setOptions([]);
            setCurrentCorrectAnswer('');
            setGeneratingOptions(true);

            setCurrentWordIndex(i => i + 1);
        } else {
            setShake(true);
            setTimeout(() => setShake(false), 500);
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
                    <span className="font-mono text-xl font-bold text-gray-400">{currentWordIndex + 1} / {wordCount}</span>
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
                ) : isBattleMode ? (
                    // Battle Mode: Options on top (upside down) and bottom (normal)
                    <div className="flex flex-col justify-between min-h-[70vh]">
                        {/* Player 2 (Top - Upside Down) */}
                        <motion.div
                            className="grid grid-cols-2 gap-4 rotate-180"
                            animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                        >
                            {options.map((option, idx) => (
                                <button
                                    key={`p2-${idx}`}
                                    onClick={() => handleOptionClick(option)}
                                    className="p-6 bg-gray-800/80 hover:bg-red-600/80 border-2 border-gray-600 hover:border-red-400 rounded-xl text-xl font-bold transition-all transform hover:-translate-y-1 active:scale-95 text-white shadow-lg"
                                >
                                    {option}
                                </button>
                            ))}
                        </motion.div>

                        {/* Player 1 (Bottom - Normal) */}
                        <motion.div
                            className="grid grid-cols-2 gap-4"
                            animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                        >
                            {options.map((option, idx) => (
                                <button
                                    key={`p1-${idx}`}
                                    onClick={() => handleOptionClick(option)}
                                    className="p-6 bg-gray-800/80 hover:bg-blue-600/80 border-2 border-gray-600 hover:border-blue-400 rounded-xl text-xl font-bold transition-all transform hover:-translate-y-1 active:scale-95 text-white shadow-lg"
                                >
                                    {option}
                                </button>
                            ))}
                        </motion.div>
                    </div>
                ) : (
                    // Solo Mode: Normal layout
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
