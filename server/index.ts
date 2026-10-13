import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type Request, type Response, type NextFunction } from 'express';
import { createVoiceClientSecret, hasApiKey, inspectUnknown, synthesizeSpeech, tutorReply } from './ai.js';
import { getStory, listStories, wordCount } from './content.js';
import { addCard, listCards, listProgress, updateCard, updateProgress } from './storage.js';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
if (existsSync('.env')) process.loadEnvFile('.env');

const app = express();
app.use(express.json({ limit: '64kb' }));

const badRequest = (message: string) => Object.assign(new Error(message), { status: 400 });
const missing = (message: string) => Object.assign(new Error(message), { status: 404 });

function requireString(value: unknown, name: string, max = 500): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw badRequest(`Invalid ${name}`);
  return value.trim();
}

async function storyById(value: unknown) {
  const id = requireString(value, 'storyId', 100);
  const story = await getStory(id);
  if (!story) throw missing('Story not found');
  return story;
}

app.get('/api/health', (_req, res) => res.json({ ok: true, aiConfigured: hasApiKey() }));

app.get('/api/stories', async (_req, res) => {
  const stories = await listStories();
  res.json(stories.map(({ id, title, topic, level, estimatedMinutes, sentences }) => ({
    id, title, topic, level, estimatedMinutes,
    wordCount: sentences.reduce((count, sentence) => count + sentence.sk.trim().split(/\s+/u).length, 0),
  })));
});

app.get('/api/stories/:id', async (req, res) => {
  const story = await getStory(req.params.id);
  if (!story) throw missing('Story not found');
  res.json({ ...story, wordCount: wordCount(story) });
});

app.post('/api/inspect', async (req, res) => {
  const story = await storyById(req.body?.storyId);
  const sentenceId = requireString(req.body?.sentenceId, 'sentenceId', 30);
  const text = requireString(req.body?.text, 'text', 250);
  const sentence = story.sentences.find(item => item.id === sentenceId);
  if (!sentence) throw badRequest('Sentence not found in story');
  if (!sentence.sk.toLocaleLowerCase().includes(text.toLocaleLowerCase())) throw badRequest('Selection does not belong to sentence');
  const normalized = text.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '').toLocaleLowerCase();
  const entry = story.glossary.find(item => item.surface.toLocaleLowerCase() === normalized);
  if (entry) {
    res.json({
      translation: entry.meaning,
      lemma: entry.lemma,
      partOfSpeech: entry.partOfSpeech,
      forms: entry.forms?.map(form => `${form.label}: ${form.value}`) ?? [],
      note: entry.note,
      source: 'reviewed',
    });
    return;
  }
  if (text.trim() === sentence.sk.trim()) {
    res.json({ translation: sentence.en, forms: [], note: 'Prepared sentence translation', source: 'reviewed' });
    return;
  }
  res.json(await inspectUnknown(story, sentence, text));
});

app.post('/api/tutor', async (req, res) => {
  const story = await storyById(req.body?.storyId);
  const message = requireString(req.body?.message, 'message', 1000);
  const historyInput = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];
  const history = historyInput.map((turn: unknown) => {
    const value = turn as { role?: unknown; content?: unknown };
    if (value?.role !== 'user' && value?.role !== 'assistant') throw badRequest('Invalid history role');
    return { role: value.role, content: requireString(value.content, 'history content', 1000) };
  });
  const selectedText = typeof req.body?.selectedText === 'string' ? req.body.selectedText.slice(0, 250) : undefined;
  res.json({ reply: await tutorReply(story, message, history, selectedText) });
});

app.post('/api/speech', async (req, res) => {
  const text = requireString(req.body?.text, 'text', 250);
  const audio = await synthesizeSpeech(text);
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.send(audio);
});

app.post('/api/voice/session', async (req, res) => {
  const story = await storyById(req.body?.storyId);
  res.json(await createVoiceClientSecret(story));
});

app.get('/api/cards', async (_req, res) => res.json(await listCards()));
app.post('/api/cards', async (req, res) => {
  const story = await storyById(req.body?.storyId);
  const sentenceId = requireString(req.body?.sentenceId, 'sentenceId', 30);
  if (!story.sentences.some(sentence => sentence.id === sentenceId)) throw badRequest('Sentence not found');
  const front = requireString(req.body?.front, 'front', 250);
  const back = requireString(req.body?.back, 'back', 500);
  const lemma = typeof req.body?.lemma === 'string' ? req.body.lemma.slice(0, 100) : undefined;
  const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 300) : undefined;
  res.status(201).json(await addCard({ storyId: story.id, sentenceId, front, back, lemma, note }));
});
app.patch('/api/cards/:id', async (req, res) => {
  const front = requireString(req.body?.front, 'front', 250);
  const back = requireString(req.body?.back, 'back', 500);
  const rawTags = req.body?.tags;
  if (!Array.isArray(rawTags) || rawTags.length > 12) throw badRequest('Invalid tags');
  const tags: string[] = [];
  for (const rawTag of rawTags) {
    if (typeof rawTag !== 'string' || !rawTag.trim() || rawTag.trim().length > 32 || /[\r\n\t]/u.test(rawTag)) throw badRequest('Invalid tag');
    const tag = rawTag.trim();
    if (!tags.some(existing => existing.toLocaleLowerCase() === tag.toLocaleLowerCase())) tags.push(tag);
  }
  const card = await updateCard(req.params.id, { front, back, tags });
  if (!card) throw missing('Card not found');
  res.json(card);
});

app.get('/api/progress', async (_req, res) => res.json(await listProgress()));
app.post('/api/progress', async (req, res) => {
  const story = await storyById(req.body?.storyId);
  const status = req.body?.status;
  if (status !== undefined && status !== 'in_progress' && status !== 'completed') throw badRequest('Invalid status');
  const score = req.body?.quizScore;
  if (score !== undefined && (!Number.isInteger(score) || score < 0 || score > story.questions.length)) throw badRequest('Invalid quizScore');
  res.json(await updateProgress({ storyId: story.id, status, quizScore: score }));
});

const distDir = path.resolve('dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const detail = error as { status?: number; message?: string };
  const status = typeof detail.status === 'number' && detail.status >= 400 && detail.status < 600 ? detail.status : 500;
  if (status === 500) console.error(error);
  res.status(status).json({ error: status === 500 ? 'Something went wrong. Check the local server terminal.' : detail.message });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, '127.0.0.1', (error?: Error) => {
  if (error) {
    console.error('Could not start Slovak Teacher API:', error.message);
    process.exitCode = 1;
    return;
  }
  console.log(`Slovak Teacher API listening on http://127.0.0.1:${port}`);
  if (!hasApiKey()) console.log('AI features need OPENAI_API_KEY in .env.local');
});
