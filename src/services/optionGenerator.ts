import axios from 'axios';
import { db } from '../db';

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export async function getOptionsForWord(
    word: string,
    correctMeaning: string,
    direction: 'en_to_jp' | 'jp_to_en'
): Promise<string[]> {
    // 1. Check Cache
    const cached = await db.cachedOptions.get(word);

    if (direction === 'en_to_jp') {
        if (cached?.optionsEnToJp && cached.optionsEnToJp.length > 0) {
            return cached.optionsEnToJp;
        }
    } else {
        if (cached?.optionsJpToEn && cached.optionsJpToEn.length > 0) {
            return cached.optionsJpToEn;
        }
    }

    // 2. If not cached, generate using GPT (if key exists) or fallback
    // Note: In a real app, we should user user input key if env is missing. 
    // For now assuming env or we can't usage GPT.
    // However, to satisfy the user request strictly, we need GPT.
    // If no key is found, we might need to rely on random words from the dictionary as a fallback 
    // to strictly prevent the app from breaking, but the prompt asked for GPT.

    if (!API_KEY) {
        console.warn("OpenAI API Key not found. Please set VITE_OPENAI_API_KEY in .env");
        // Fallback: This will return empty, handling logic should pick random from other words
        return [];
    }

    try {
        const prompt = direction === 'en_to_jp'
            ? `Generate 3 incorrect but plausible short Japanese meanings for the English word "${word}" (which actually means "${correctMeaning}"). Output ONLY the 3 meanings separated by a pipe character (|). Example format: 意味1|意味2|意味3`
            : `Generate 3 incorrect but plausible English words that could be mistaken for the Japanese meaning "${correctMeaning}" (which actually corresponds to "${word}"). Output ONLY the 3 words separated by a pipe character (|). Example format: word1|word2|word3`;

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                }
            }
        );

        const content = response.data.choices[0].message.content;
        const options = content.split('|').map((s: string) => s.trim());

        // 3. Save to Cache
        if (options.length === 3) {
            await db.cachedOptions.put({
                // Merge with existing if any
                ...((cached) || { word: word }),
                [direction === 'en_to_jp' ? 'optionsEnToJp' : 'optionsJpToEn']: options,
                updatedAt: Date.now()
            });
            return options;
        }

        return [];
    } catch (error) {
        console.error("GPT Generation validation failed", error);
        return [];
    }
}
