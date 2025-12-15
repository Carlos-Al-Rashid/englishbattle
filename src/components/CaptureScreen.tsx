import { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { db } from '../db';
import { Camera, Save, X, Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type CandidateWord = {
    id: string; // temp id
    word: string;
    meaning: string;
};

export default function CaptureScreen({ onBack }: { onBack: () => void }) {
    const [image, setImage] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [candidates, setCandidates] = useState<CandidateWord[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setImage(event.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const processImage = async () => {
        if (!image) return;
        setProcessing(true);
        setProgress(0);

        try {
            const result = await Tesseract.recognize(
                image,
                'eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            setProgress(Math.round(m.progress * 100));
                        }
                    }
                }
            );

            // Extract words: simple split by whitespace and filter alphabetic
            const text = result.data.text;
            const foundWords = text
                .split(/[\s\n]+/)
                .map(w => w.replace(/[^a-zA-Z]/g, ''))
                .filter(w => w.length > 2) // Filter very short noise
                .map(w => ({
                    id: crypto.randomUUID(),
                    word: w.toLowerCase(),
                    meaning: ''
                }));

            // Deduplicate
            const uniqueWords = Array.from(new Map(foundWords.map(item => [item.word, item])).values());

            setCandidates(uniqueWords);
        } catch (error) {
            console.error(error);
            alert('Failed to process image');
        } finally {
            setProcessing(false);
        }
    };

    const saveWords = async () => {
        const wordsToSave = candidates.filter(c => c.word && c.meaning);
        if (wordsToSave.length === 0) {
            alert('Please enter detecting words and meanings.');
            return;
        }

        try {
            await db.capturedWords.bulkAdd(
                wordsToSave.map(c => ({
                    word: c.word,
                    meaning: c.meaning,
                    createdAt: Date.now()
                }))
            );
            alert(`Saved ${wordsToSave.length} words to database!`);
            setCandidates([]);
            setImage(null);
        } catch (error) {
            console.error(error);
            alert('Failed to save words');
        }
    };

    const removeCandidate = (id: string) => {
        setCandidates(prev => prev.filter(c => c.id !== id));
    };

    const updateCandidate = (id: string, field: 'word' | 'meaning', value: string) => {
        setCandidates(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const addEmptyCandidate = () => {
        setCandidates(prev => [{ id: crypto.randomUUID(), word: '', meaning: '' }, ...prev]);
    };

    return (
        <div className="w-full max-w-4xl p-6 bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    Capture Words
                </h2>
                <div className="w-10" /> {/* Spacer */}
            </div>

            <div className="space-y-8">
                {/* Upload Section */}
                {!image ? (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-3 border-dashed border-gray-600 rounded-2xl p-12 text-center cursor-pointer hover:border-green-400 hover:bg-gray-700/30 transition-all group"
                    >
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                        />
                        <div className="flex flex-col items-center space-y-4 text-gray-400 group-hover:text-green-400">
                            <Camera className="w-16 h-16" />
                            <span className="text-xl font-medium">Click to upload or take photo</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="relative group rounded-2xl overflow-hidden border border-gray-600">
                            <img src={image} alt="Preview" className="w-full h-64 object-cover" />
                            <button
                                onClick={() => setImage(null)}
                                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-red-500/80 rounded-full text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {!candidates.length && !processing && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={processImage}
                                        className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold transition-transform transform hover:scale-105"
                                    >
                                        <span>Extract Text</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {processing && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm text-green-400 font-mono">
                                    <span className="flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        className="h-full bg-green-400"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Results Editor */}
                {candidates.length > 0 && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-500">
                        <div className="flex items-center justify-between sticky top-0 bg-gray-900/95 backdrop-blur py-4 z-10 border-b border-gray-700">
                            <div className="flex items-center space-x-4">
                                <h3 className="text-xl font-bold text-white">Detected Words ({candidates.length})</h3>
                                <button
                                    onClick={addEmptyCandidate}
                                    className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-green-400 transition-colors"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                            <button
                                onClick={saveWords}
                                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-blue-500/20"
                            >
                                <Save className="w-4 h-4" />
                                <span>Save Database</span>
                            </button>
                        </div>

                        <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
                            <AnimatePresence>
                                {candidates.map((candidate) => (
                                    <motion.div
                                        key={candidate.id}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex items-center space-x-3 bg-gray-800/50 p-3 rounded-xl border border-gray-700 group hover:border-gray-500 transition-colors"
                                    >
                                        <input
                                            type="text"
                                            value={candidate.word}
                                            onChange={(e) => updateCandidate(candidate.id, 'word', e.target.value)}
                                            placeholder="Word"
                                            className="flex-1 bg-transparent border-b border-gray-600 focus:border-green-400 px-2 py-1 outline-none text-white font-mono"
                                        />
                                        <div className="text-gray-500">→</div>
                                        <input
                                            type="text"
                                            value={candidate.meaning}
                                            onChange={(e) => updateCandidate(candidate.id, 'meaning', e.target.value)}
                                            placeholder="Meaning (Japanese)"
                                            className="flex-1 bg-transparent border-b border-gray-600 focus:border-green-400 px-2 py-1 outline-none text-white"
                                        />
                                        <button
                                            onClick={() => removeCandidate(candidate.id)}
                                            className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
