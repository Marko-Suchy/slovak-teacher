import { listStories, wordCount } from './content.js';

try {
  const stories = await listStories();
  if (stories.length === 0) throw new Error('No story files found');
  for (const story of stories) {
    const words = wordCount(story);
    const maxWords = story.level === 'A1+' ? 300 : 250;
    if (words < 100 || words > maxWords) throw new Error(`${story.id}: ${words} Slovak words; expected 100–${maxWords}`);
    console.log(`${story.id}: ${words} words, ${story.sentences.length} sentences, ${story.questions.length} questions`);
  }
  console.log(`Validated ${stories.length} stories.`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
