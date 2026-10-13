import type { Card, Inspection, Progress, Story, StorySummary, TutorMessage } from "./types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json() as { error?: string; message?: string };
      message = body.error || body.message || message;
    } catch { /* Keep the HTTP error. */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  stories: () => request<StorySummary[]>("/api/stories"),
  story: (id: string) => request<Story>(`/api/stories/${encodeURIComponent(id)}`),
  inspect: (storyId: string, sentenceId: string, text: string) =>
    request<Inspection>("/api/inspect", json({ storyId, sentenceId, text })),
  tutor: (storyId: string, message: string, history: TutorMessage[], selectedText?: string) =>
    request<{ reply: string }>("/api/tutor", json({ storyId, message, history, selectedText })),
  cards: () => request<Card[]>("/api/cards"),
  addCard: (body: { storyId: string; sentenceId: string; front: string; back: string; lemma?: string; note?: string }) =>
    request<Card>("/api/cards", json(body)),
  reviewCard: (id: string, rating: "again" | "know") =>
    request<Card>(`/api/cards/${encodeURIComponent(id)}/review`, json({ rating })),
  progress: () => request<Progress[]>("/api/progress"),
  saveProgress: (body: { storyId: string; status?: Progress["status"]; quizScore?: number }) =>
    request<Progress>("/api/progress", json(body)),
  speech: async (text: string) => {
    const response = await fetch("/api/speech", json({ text }));
    if (!response.ok) {
      let message = `Audio is unavailable (${response.status})`;
      try {
        const body = await response.json() as { error?: string; message?: string };
        message = body.error || body.message || message;
      } catch { /* Keep the HTTP error. */ }
      throw new Error(message);
    }
    return response.blob();
  },
};
