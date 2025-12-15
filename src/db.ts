import Dexie, { type EntityTable } from 'dexie';

interface CapturedWord {
    id: number;
    word: string;
    meaning: string;
    createdAt: number;
}

const db = new Dexie('EnglishBattleDB') as Dexie & {
    capturedWords: EntityTable<CapturedWord, 'id'>;
};

db.version(1).stores({
    capturedWords: '++id, word, meaning, createdAt'
});

export type { CapturedWord };
export { db };
