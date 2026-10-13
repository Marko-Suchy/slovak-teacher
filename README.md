# Slovak Teacher

A local reading and speaking practice app for beginner Slovak. It includes ten original short stories (nine A1 and one A1+) with English sentence translations, vocabulary notes, multiple-choice or spoken comprehension practice, flashcards, text tutoring, pronunciation, and live voice conversation.

## Start locally

Requires Node.js 20.19+ or 22.12+. Dependencies are already installed in this workspace, so you can start the app without installing pnpm:

```bash
npm run dev
```

For a fresh checkout, install the dependencies with `pnpm install` first. The project uses a pnpm lockfile.

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The command starts Vite and the local API server together. Stop both with Ctrl+C.

Reading, prepared translations, quizzes, and flashcards work without an API key. To enable AI explanations, tutor replies, speech playback, and voice conversation, create a local configuration file:

```bash
cp .env.example .env.local
```

Put your own OpenAI API key in `.env.local` as `OPENAI_API_KEY=...`, then restart the app. The key stays in the local server process; the browser receives only a short-lived credential for voice sessions.

To run a built version:

```bash
npm run build
npm start
```

Then open [http://127.0.0.1:3001](http://127.0.0.1:3001).

## Content and saved data

Stories live in `content/stories/*.json` and are validated with:

```bash
npm run check:content
```

To add a story, copy an existing JSON file in `content/stories/`, give it a unique filename and `id`, then write the Slovak sentences with matching English translations, glossary entries for useful words, and three to five source-linked questions. Run `npm run check:content` and refresh the browser; no application code change is needed. For an example, see `content/stories/balik-na-poste.json`. The longer citizenship-office story has [source and terminology notes](docs/citizenship-story-notes.md).

Flashcards and reading progress are saved in `.data/state.json` on this computer. In **Review**, edit or tag saved words in **Word directory**, filter the set staged for **Practice**, and flip through every staged card whenever you like. **Export to Quizlet** prepares tab-separated terms and definitions to copy or download; import them on the Quizlet website. Generated speech and AI explanations are cached in `.data/speech/` and `.data/explanations/`. Both `.data` and `.env.local` are ignored by Git.

The ten included stories are original drafts. Their Slovak, English translations, and teaching notes should receive an independent native-speaker review before being treated as authoritative learning material.

## AI setup

The default text model is `gpt-4.1-mini`, the speech model is `gpt-4o-mini-tts`, and the voice model is `gpt-realtime-2.1`. `OPENAI_TEXT_MODEL` and `OPENAI_REALTIME_MODEL` can override the defaults in `.env.local`. API usage incurs charges on your OpenAI account. Voice connects only after you press **Start talking** and disconnects when you end the conversation or leave the story.
