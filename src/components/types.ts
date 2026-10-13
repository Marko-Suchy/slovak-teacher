export type StorySummary = {
  id: string;
  title: string;
  topic: string;
  level: string;
  estimatedMinutes: number;
  wordCount: number;
};

export type Sentence = { id: string; sk: string; en: string };
export type Story = Omit<StorySummary, "wordCount"> & {
  wordCount?: number;
  sentences: Sentence[];
  glossary: {
    surface: string;
    lemma: string;
    partOfSpeech: string;
    meaning: string;
    note: string;
  }[];
  questions: {
    id: string;
    promptSk: string;
    options: { id: string; text: string }[];
    answerId: string;
    sourceSentenceIds: string[];
    explanationEn: string;
  }[];
};

export type Inspection = {
  translation: string;
  lemma?: string;
  partOfSpeech?: string;
  forms?: string[];
  note?: string;
  source: "reviewed" | "generated";
};

export type Selection = { text: string; sentenceId: string };
export type TutorMessage = { role: "user" | "assistant"; content: string };
export type Card = {
  id: string;
  storyId: string;
  sentenceId: string;
  front: string;
  back: string;
  lemma?: string;
  note?: string;
  createdAt: string;
  dueAt: string;
  intervalDays: number;
  repetitions: number;
};
export type Progress = {
  storyId: string;
  status: "in_progress" | "completed";
  lastOpenedAt: string;
  completedAt?: string;
  quizScore?: number;
};
