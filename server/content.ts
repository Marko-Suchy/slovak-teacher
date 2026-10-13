import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export interface Sentence {
  id: string;
  sk: string;
  en: string;
}

export interface GlossaryEntry {
  surface: string;
  lemma: string;
  partOfSpeech: string;
  meaning: string;
  note?: string;
  forms?: Array<{ label: string; value: string }>;
}

export interface StoryQuestion {
  id: string;
  promptSk: string;
  options: Array<{ id: string; text: string }>;
  answerId: string;
  sourceSentenceIds: string[];
  explanationEn: string;
}

export interface Story {
  id: string;
  title: string;
  topic: string;
  level: string;
  estimatedMinutes: number;
  sentences: Sentence[];
  glossary: GlossaryEntry[];
  questions: StoryQuestion[];
}

const contentDir = path.resolve('content/stories');

export function wordCount(story: Story): number {
  return story.sentences.reduce((count, sentence) => count + sentence.sk.trim().split(/\s+/u).length, 0);
}

export function validateStory(input: unknown, filename = 'story'): Story {
  if (!input || typeof input !== 'object') throw new Error(`${filename}: expected object`);
  const story = input as Story;
  const requiredStrings: Array<keyof Story> = ['id', 'title', 'topic', 'level'];
  for (const key of requiredStrings) {
    if (typeof story[key] !== 'string' || !(story[key] as string).trim()) {
      throw new Error(`${filename}: missing ${key}`);
    }
  }
  if (!/^[a-z0-9-]+$/.test(story.id)) throw new Error(`${filename}: invalid id`);
  if (story.level !== 'A1' && story.level !== 'A1+') throw new Error(`${filename}: level must be A1 or A1+`);
  if (!Number.isFinite(story.estimatedMinutes) || story.estimatedMinutes < 1) throw new Error(`${filename}: invalid estimatedMinutes`);
  if (!Array.isArray(story.sentences) || story.sentences.length === 0) throw new Error(`${filename}: sentences required`);
  const sentenceIds = new Set<string>();
  for (const sentence of story.sentences) {
    if (!sentence.id || !sentence.sk?.trim() || !sentence.en?.trim()) throw new Error(`${filename}: invalid sentence`);
    if (sentenceIds.has(sentence.id)) throw new Error(`${filename}: duplicate sentence ${sentence.id}`);
    sentenceIds.add(sentence.id);
  }
  if (!Array.isArray(story.glossary)) throw new Error(`${filename}: glossary required`);
  for (const entry of story.glossary) {
    if (!entry.surface?.trim() || !entry.lemma?.trim() || !entry.meaning?.trim() || !entry.partOfSpeech?.trim()) {
      throw new Error(`${filename}: invalid glossary entry`);
    }
    if (entry.forms && (!Array.isArray(entry.forms) || entry.forms.some(form => !form.label?.trim() || !form.value?.trim()))) {
      throw new Error(`${filename}: invalid glossary forms`);
    }
  }
  if (!Array.isArray(story.questions) || story.questions.length === 0) throw new Error(`${filename}: questions required`);
  const questionIds = new Set<string>();
  for (const question of story.questions) {
    if (!question.id || !question.promptSk?.trim() || !question.explanationEn?.trim()) throw new Error(`${filename}: invalid question`);
    if (questionIds.has(question.id)) throw new Error(`${filename}: duplicate question ${question.id}`);
    questionIds.add(question.id);
    if (!Array.isArray(question.options) || question.options.length < 2) throw new Error(`${filename}: invalid options`);
    const optionIds = new Set(question.options.map(option => option.id));
    if (optionIds.size !== question.options.length || !question.options.every(option => option.id && option.text?.trim())) {
      throw new Error(`${filename}: invalid option`);
    }
    if (!optionIds.has(question.answerId)) throw new Error(`${filename}: missing answerId`);
    if (!Array.isArray(question.sourceSentenceIds) || !question.sourceSentenceIds.every(id => sentenceIds.has(id))) {
      throw new Error(`${filename}: invalid sourceSentenceIds`);
    }
  }
  return story;
}

export async function listStories(): Promise<Story[]> {
  let files: string[];
  try {
    files = (await readdir(contentDir)).filter(file => file.endsWith('.json')).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const stories = await Promise.all(files.map(async file => {
    const text = await readFile(path.join(contentDir, file), 'utf8');
    return validateStory(JSON.parse(text), file);
  }));
  const ids = new Set(stories.map(story => story.id));
  if (ids.size !== stories.length) throw new Error('Duplicate story IDs');
  return stories;
}

export async function getStory(id: string): Promise<Story | undefined> {
  return (await listStories()).find(story => story.id === id);
}
