import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export interface Card {
  id: string;
  storyId: string;
  sentenceId: string;
  front: string;
  back: string;
  lemma?: string;
  note?: string;
  createdAt: string;
  tags: string[];
}

export interface StoryProgress {
  storyId: string;
  status: 'in_progress' | 'completed';
  lastOpenedAt: string;
  completedAt?: string;
  quizScore?: number;
}

interface Store { cards: Card[]; progress: StoryProgress[] }
const dataDir = path.resolve('.data');
const dataPath = path.join(dataDir, 'state.json');
let mutationQueue: Promise<unknown> = Promise.resolve();

async function readStore(): Promise<Store> {
  try {
    const parsed = JSON.parse(await readFile(dataPath, 'utf8')) as Partial<Store>;
    const cards = Array.isArray(parsed.cards) ? parsed.cards.map(({ id, storyId, sentenceId, front, back, lemma, note, createdAt, tags }) => ({
      id, storyId, sentenceId, front, back, lemma, note, createdAt,
      tags: Array.isArray(tags) ? tags : [],
    })) : [];
    return { cards, progress: Array.isArray(parsed.progress) ? parsed.progress : [] };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { cards: [], progress: [] };
    throw error;
  }
}

async function mutate<T>(fn: (store: Store) => T): Promise<T> {
  const run = mutationQueue.then(async () => {
    const store = await readStore();
    const result = fn(store);
    await mkdir(dataDir, { recursive: true });
    const tempPath = path.join(dataDir, `state-${randomUUID()}.tmp`);
    await writeFile(tempPath, JSON.stringify(store, null, 2));
    await rename(tempPath, dataPath);
    return result;
  });
  mutationQueue = run.catch(() => undefined);
  return run;
}

export async function listCards(): Promise<Card[]> { return (await readStore()).cards; }
export async function listProgress(): Promise<StoryProgress[]> { return (await readStore()).progress; }

export async function addCard(input: Pick<Card, 'storyId' | 'sentenceId' | 'front' | 'back' | 'lemma' | 'note'>): Promise<Card> {
  return mutate(store => {
    const existing = store.cards.find(card => card.storyId === input.storyId && card.sentenceId === input.sentenceId && card.front.toLocaleLowerCase() === input.front.toLocaleLowerCase());
    if (existing) return existing;
    const now = new Date().toISOString();
    const card: Card = { id: randomUUID(), ...input, createdAt: now, tags: [] };
    store.cards.push(card);
    return card;
  });
}

export async function updateCard(id: string, changes: Pick<Card, 'front' | 'back' | 'tags'>): Promise<Card | undefined> {
  return mutate(store => {
    const card = store.cards.find(item => item.id === id);
    if (!card) return undefined;
    card.front = changes.front;
    card.back = changes.back;
    card.tags = changes.tags;
    return card;
  });
}

export async function updateProgress(input: { storyId: string; status?: StoryProgress['status']; quizScore?: number }): Promise<StoryProgress> {
  return mutate(store => {
    const now = new Date().toISOString();
    let progress = store.progress.find(item => item.storyId === input.storyId);
    if (!progress) {
      progress = { storyId: input.storyId, status: 'in_progress', lastOpenedAt: now };
      store.progress.push(progress);
    }
    progress.lastOpenedAt = now;
    if (input.status && !(progress.status === 'completed' && input.status === 'in_progress')) {
      progress.status = input.status;
    }
    if (input.status === 'completed') progress.completedAt = now;
    if (input.quizScore !== undefined) progress.quizScore = input.quizScore;
    return progress;
  });
}
