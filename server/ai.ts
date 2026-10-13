import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';
import type { Sentence, Story } from './content.js';

let client: OpenAI | undefined;

export function hasApiKey(): boolean { return Boolean(process.env.OPENAI_API_KEY?.trim()); }

function getClient(): OpenAI {
  if (!hasApiKey()) throw Object.assign(new Error('Add OPENAI_API_KEY to .env.local, then restart the app to use AI features.'), { status: 503 });
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const textModel = () => process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini';

function storyContext(story: Story): string {
  return `Story: ${story.title} (${story.level})\n${story.sentences.map(sentence => `${sentence.id}: ${sentence.sk}`).join('\n')}`;
}

function parseExplanation(raw: string): Record<string, unknown> {
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(clean) as Record<string, unknown>; }
  catch { return { translation: raw.trim() }; }
}

export async function inspectUnknown(story: Story, sentence: Sentence, selectedText: string) {
  const cacheDir = path.resolve('.data/explanations');
  const cacheKey = createHash('sha256').update(JSON.stringify({ version: 1, model: textModel(), storyId: story.id, sentence: sentence.sk, selectedText })).digest('hex');
  const cacheFile = path.join(cacheDir, `${cacheKey}.json`);
  try {
    const cached = JSON.parse(await readFile(cacheFile, 'utf8')) as { translation?: unknown; source?: unknown };
    if (typeof cached.translation === 'string' && cached.source === 'generated') return cached;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.error('Could not read cached explanation:', error);
  }
  const response = await getClient().responses.create({
    model: textModel(),
    store: false,
    max_output_tokens: 300,
    instructions: 'You explain Slovak to an English-speaking A1 learner. Return only a JSON object with keys translation, lemma, partOfSpeech, forms (array of short strings), note. Use the selected text in its sentence context. For a verb give its infinitive and only 2-3 useful accurate forms; for a noun give its dictionary form and gender if known. For a phrase, omit lemma/forms. Keep note to one plain English sentence. Be honest if uncertain.',
    input: `${storyContext(story)}\n\nSentence: ${sentence.sk}\nSelected text: ${selectedText}`,
  });
  const parsed = parseExplanation(response.output_text);
  const explanation = {
    translation: typeof parsed.translation === 'string' ? parsed.translation : response.output_text,
    lemma: typeof parsed.lemma === 'string' ? parsed.lemma : undefined,
    partOfSpeech: typeof parsed.partOfSpeech === 'string' ? parsed.partOfSpeech : undefined,
    forms: Array.isArray(parsed.forms) ? parsed.forms.filter((item): item is string => typeof item === 'string').slice(0, 5) : [],
    note: typeof parsed.note === 'string' ? parsed.note : undefined,
    source: 'generated' as const,
  };
  try {
    await mkdir(cacheDir, { recursive: true });
    await writeFile(cacheFile, JSON.stringify(explanation));
  } catch (error) {
    console.error('Could not cache explanation:', error);
  }
  return explanation;
}

export async function tutorReply(story: Story, message: string, history: Array<{ role: 'user' | 'assistant'; content: string }>, selectedText?: string): Promise<string> {
  const conversation = [...history, { role: 'user' as const, content: message }]
    .map(turn => `${turn.role === 'user' ? 'Learner' : 'Tutor'}: ${turn.content}`)
    .join('\n');
  const response = await getClient().responses.create({
    model: textModel(),
    store: false,
    max_output_tokens: 350,
    instructions: `You are a patient Slovak teacher for one A1 learner. Discuss the supplied story accurately. Reply mainly in clear, short Slovak sentences. If the learner asks for English, give a short English explanation too. Do not invent plot details. Ask at most one simple follow-up question. Avoid excessive praise.\n\n${storyContext(story)}`,
    input: `${selectedText ? `Currently selected: ${selectedText}\n` : ''}${conversation}`,
  });
  return response.output_text.trim();
}

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const dir = path.resolve('.data/speech');
  const hash = createHash('sha256').update(text).digest('hex');
  const file = path.join(dir, `${hash}.mp3`);
  try { return await readFile(file); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const audio = await getClient().audio.speech.create({
    model: 'gpt-4o-mini-tts',
    voice: 'marin',
    input: text,
    instructions: 'Speak natural standard Slovak clearly at a comfortable pace for a language learner.',
    response_format: 'mp3',
  });
  const buffer = Buffer.from(await audio.arrayBuffer());
  await mkdir(dir, { recursive: true });
  await writeFile(file, buffer);
  return buffer;
}

export async function createVoiceClientSecret(story: Story): Promise<{ clientSecret: string; model: string }> {
  const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1';
  const response = await getClient().realtime.clientSecrets.create({
    expires_after: { anchor: 'created_at', seconds: 60 },
    session: {
      type: 'realtime',
      model,
      instructions: `You are a friendly Slovak conversation teacher for one A1 learner. Discuss only this story and closely related everyday topics. Speak primarily in short, clear Slovak sentences, at a learner-friendly pace. If the learner is confused or asks for English, briefly explain in English, then return to Slovak. Ask one simple question at a time. Avoid inventing story details.\n\n${storyContext(story)}`,
      max_output_tokens: 300,
    },
  });
  return { clientSecret: response.value, model };
}
