# Slovak Teacher — implementation plan

## Goal and first-release boundary

Build a personal, ten-minute Slovak reading practice app for an A1 learner. A session should let the learner read one short story, inspect unfamiliar text, save useful words, and answer a few comprehension questions. The content is stored and reviewed ahead of time; AI helps explain and discuss it at runtime.

**Confirmed direction:** the first version runs locally for one person, starts from the terminal, and includes live voice conversation. The first content set uses original A1 stories; older public-domain tales can inform later retellings, but their original language is generally too difficult for this learning level.

### First usable release

- 5–10 original A1 stories, initially about 120–200 Slovak words each, with English translations, key vocabulary, and 3–5 comprehension questions.
- Story library with title, topic, estimated time, and completion state.
- Reader with Slovak text on the left, an inspector above the tutor on the right. On narrow screens, the inspector and tutor become tabs or a bottom sheet.
- Select a word, phrase, or sentence to see an English explanation. A known story word shows its reviewed dictionary form and selected inflections.
- Play Slovak pronunciation for selected text.
- Save a selected word or phrase as a flashcard and practice any staged set.
- Ask text questions about the story; the tutor replies mostly in simple Slovak and can clarify in English.
- Start and stop a live, story-aware Slovak voice conversation, with a transcript and microphone controls.
- Finish the story with multiple-choice questions and a short result/review screen.
- Discuss each comprehension question aloud as an unscored practice option.

### Later release

- Larger story library, more A2 material, richer progress views, and content editing tools if maintaining the library becomes cumbersome.

## User flow

1. Open the library and choose a story marked as new or ready to revisit.
2. Read the Slovak text. Tap or drag to select text; the inspector shows its translation, base form if applicable, short usage note, and pronunciation control.
3. Save important selections as cards. Ask the tutor a question without leaving the story.
4. Answer 3–5 questions. See the relevant passage and explanation after each answer.
5. Practice a tagged set of saved cards. The app records story completion and quiz results.

The main flow should be usable with only one AI request at a time and should degrade gracefully if the AI service is unavailable: stories, prepared translations, questions, and saved cards still work.

## Suggested technical shape

- **Application:** TypeScript web app using React and Vite for the browser UI, with an Express API process started by the same terminal command.
- **Content:** Version-controlled story files (JSON or Markdown plus structured metadata). Story content is shipped with the app, so opening and reading a story does not require generation or an API call.
- **Persistence:** A local JSON state file for flashcards and progress. The app is single-user and runs on one computer; a database becomes useful only if syncing or multi-user access is added.
- **AI boundary:** Server endpoints call OpenAI for tutor replies, selection explanations when prepared data is insufficient, and text-to-speech. Keep the API key on the server. The browser never receives the long-lived key.
- **Voice:** The server issues a short-lived Realtime credential, and the browser connects for microphone/audio turns. The story and learner-level instructions are attached to the session.
- **Run mode:** A terminal command starts the local API and browser UI on `127.0.0.1`. No accounts or hosting are needed for this version.

This does not require a generic content management system or a vector database. A selected story is small enough to pass directly as context to the tutor.

## Story format and content workflow

Each story should have a stable ID, title, topic, level, estimated duration, Slovak paragraphs, aligned English sentence translations, a reviewed glossary, and quiz items. Paragraphs and sentences need stable IDs so selections, explanations, and quiz references can point to the right passage even after layout changes.

Example shape (illustrative, not the final schema):

```json
{
  "id": "ranajky-v-kaviarni",
  "level": "A1",
  "title": "Raňajky v kaviarni",
  "sentences": [
    { "id": "s1", "sk": "Ráno idem do kaviarne.", "en": "In the morning I go to a café." }
  ],
  "glossary": [
    { "surface": "idem", "lemma": "ísť", "partOfSpeech": "verb", "meaning": "I go", "note": "first person singular, present tense" }
  ],
  "questions": [
    { "id": "q1", "promptSk": "Kam ide rozprávač ráno?", "options": [], "answerId": "a", "sourceSentenceIds": ["s1"] }
  ]
}
```

Content production should be a separate pipeline: draft an original story against a controlled A1 vocabulary list; draft its translation, glossary, and questions; validate the schema automatically; then review Slovak correctness, reading level, and question answers with a competent speaker. AI-generated material is a draft, not the source of truth. Do not copy stories from the referenced book without rights to use them.

Start with varied everyday topics (home, food, shopping, transport, family) and deliberately reuse target words across stories. Measure length by the full ten-minute activity, not reading time alone.

## Selection and inspector behavior

- A single tap on a word may select its token; drag selection supports a phrase or sentence. Keyboard selection must also work.
- Normalize punctuation and whitespace, but retain the original story sentence ID and selected text. Avoid saving a position based solely on visual coordinates.
- For a reviewed glossary match, return the stored meaning, lemma, part of speech, and only relevant forms. For verbs, show infinitive and useful conjugations; for nouns, dictionary form, gender, and useful cases; for adjectives, base form and common agreement forms.
- For a whole sentence, show its prepared English translation. For arbitrary multiword selections or unknown words, request a contextual explanation from the AI endpoint and mark it as generated.
- Cache generated explanations by story ID plus normalized selection and sentence context, so repeated lookups do not repeatedly cost money.
- Keep the inspector concise: translation first, then one usage note and expandable forms. Allow copying and card creation.

This reviewed-first lookup design is important because Slovak inflection and context can make a bare dictionary lookup misleading.

## Tutor and audio behavior

The text tutor receives the story, the current selected passage, recent conversation, and a short teaching policy: use A1 Slovak first, define unfamiliar words simply, switch to English for a brief clarification when requested, and avoid inventing facts outside the story. Limit response length so the panel remains useful during reading. Store each conversation against its story, or make it ephemeral if the product is intentionally private and minimal.

For pronunciation, synthesize the selected Slovak text and cache repeat requests. Provide playback speed controls for the learner. Test Slovak pronunciation with real example words and sentences before settling on a voice; supported-language status alone does not guarantee teaching-quality pronunciation. Label generated speech as AI audio.

For live voice, start a session only after the learner presses **Talk**. Handle microphone permission, interruptions, mute/stop, transcript visibility, connection loss, and a clear return to text chat. Avoid keeping a paid audio session open while the learner is silently reading.

## Flashcards and progress

A card stores the selected surface form, dictionary form where relevant, English meaning, source story/sentence, a short example, created date, and tags. The learner can edit the meaning because a selected word may have more than one translation.

The Review tab now has a word directory and a practice deck. Saved cards can be edited and tagged; the active tag filter determines which cards are staged. Practice cycles through every staged card without due dates or spaced scheduling. The staged set can be copied or downloaded as tab-separated term/definition pairs for Quizlet import. Record per-story status, last opened date, quiz score, and completed date separately from word practice.

## API and data contracts

Likely server routes:

| Route | Purpose |
| --- | --- |
| `GET /api/stories`, `GET /api/stories/:id` | Read validated, published story data. |
| `POST /api/inspect` | Explain an unknown selection with story context. |
| `POST /api/tutor` | Generate a text tutor response. |
| `POST /api/speech` | Generate and cache pronunciation audio. |
| `GET/POST /api/cards`, `PATCH /api/cards/:id` | Save, edit, and tag flashcards. |
| `GET/POST /api/progress` | Persist reading and quiz progress. |
| `POST /api/voice/session` | Mint a short-lived voice credential. |

Validate all request bodies and story IDs on the server. Rate-limit AI endpoints if the app is publicly reachable. Store secrets in environment variables, set a spending cap, and record request failures without logging private conversation content unnecessarily.

## Build sequence and exit criteria

### Phase 0 — Product and content foundation

Confirm audience, story rights/source, and voice priority. Define the story schema and create 2 fully reviewed sample stories. Sketch desktop and mobile reader states. **Done when:** sample files pass validation and one story demonstrates all required content fields.

### Phase 1 — Reader and prepared learning content

Build the library, responsive reader, selection logic, prepared translations/glossary, and multiple-choice quiz. **Done when:** a learner can complete a story and inspect prepared content without an API key.

### Phase 2 — Saved practice and AI text help

Add persistence, cards, practice, text tutor, generated fallback explanations, and error/cost controls. **Done when:** a learner can resume progress, save/practice a card, and ask a story-specific question; failures leave the reading flow usable.

### Phase 3 — Pronunciation, live voice, and content expansion

Add text-to-speech, caching, playback controls, live voice conversation, transcripts, and expand to 5–10 reviewed stories. **Done when:** selected Slovak speech plays reliably and a learner can start and stop a story-grounded voice exchange. The complete ten-minute loop works with several topics.

### Phase 4 — Voice refinement

Refine timing, Slovak accuracy, interruptions, and cost per session. Add spoken quiz mode if it improves the routine. **Done when:** voice reliably recovers from microphone or connection failure and remains useful at A1 level.

### Phase 5 — Scale the library

Build the remaining stories in batches, review them, track vocabulary coverage and repetition, and refine content based on actual usage. **Done when:** each published story meets the same language and quiz quality checks as the pilot set.

## Main risks and decisions

1. **Language accuracy:** generated morphology, translations, and voice may be imperfect. Mitigation: reviewed glossary and translations for core content; generated fallback labeled and tested.
2. **Content volume:** 100 stories is a substantial editorial project. Mitigation: validate the ten-minute loop with 5–10 stories before producing the rest.
3. **Session length:** a 500-word A1 story plus lookups and questions may exceed ten minutes. Mitigation: begin shorter and measure actual completion time.
4. **Usage cost:** live voice and uncached explanations incur ongoing API cost. Mitigation: on-demand sessions, caching, response limits, and a budget cap.
5. **Device layout:** three simultaneous panes are cramped on phones. Mitigation: keep the story primary and move the other panes into tabs or a sheet.

## Current implementation choices

- Local, single-user app with terminal startup.
- Ten original stories in the current content set: nine A1 and one longer A1+ story. Public-domain folklore may be adapted into new A1 retellings later, with source and rights checked per text.
- Live Realtime voice conversation in the first usable version.
