import Dexie, { type EntityTable } from 'dexie';

interface CapturedWord {
    id: number;
    word: string;
    meaning: string;
    createdAt: number;
}

interface CachedOption {
    word: string; // The English word acts as the key
    optionsEnToJp?: string[]; // Distractors for En -> Jp (Japanese meanings)
    optionsJpToEn?: string[]; // Distractors for Jp -> En (English words)
    updatedAt: number;
}

const db = new Dexie('EnglishBattleDB') as Dexie & {
    capturedWords: EntityTable<CapturedWord, 'id'>;
    cachedOptions: EntityTable<CachedOption, 'word'>;
};

db.version(1).stores({
    capturedWords: '++id, word, meaning, createdAt',
});

// Version 2 adds cachedOptions
db.version(2).stores({
    capturedWords: '++id, word, meaning, createdAt',
    cachedOptions: 'word, updatedAt'
});

export type { CapturedWord, CachedOption };
export { db };
