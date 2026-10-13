import { useMemo, useState } from "react";
import { api } from "./api";
import { Icon } from "./Icon";
import type { Card } from "./types";

export function Review({ cards, onCardsChanged }: { cards: Card[]; onCardsChanged: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const due = useMemo(() => cards.filter(card => new Date(card.dueAt).getTime() <= Date.now()).sort((a, b) => a.dueAt.localeCompare(b.dueAt)), [cards]);
  const card = due[0];

  async function review(rating: "again" | "know") {
    if (!card) return;
    setBusy(true); setError("");
    try { await api.reviewCard(card.id, rating); onCardsChanged(); setRevealed(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update this card."); }
    finally { setBusy(false); }
  }

  return <main className="study-panel review-panel"><div className="study-top"><span>My words</span><span>{due.length} due today</span></div><div className="review-content"><h1>Word review</h1><p className="study-intro">A few familiar words, just when you need them.</p>
    {!card ? <div className="review-empty"><div className="empty-symbol"><Icon name="bookmark" size={28}/></div><h2>All caught up</h2><p>Save words as you read. They will appear here when it is time to practice.</p></div> : <div className="review-card"><p className="review-label">Slovak</p><h2 lang="sk">{card.front}</h2>{revealed ? <div className="review-answer"><p className="review-label">Meaning</p><p>{card.back}</p>{card.lemma ? <small>Base form: <span lang="sk">{card.lemma}</span></small> : null}</div> : <button className="reveal-button" onClick={() => setRevealed(true)}>Show meaning <Icon name="arrow"/></button>}{revealed ? <div className="review-buttons"><button disabled={busy} onClick={() => review("again")}>Again</button><button disabled={busy} className="small-primary" onClick={() => review("know")}>Know it <Icon name="check" size={17}/></button></div> : null}</div>}
    {error ? <p className="inline-error" role="alert">{error}</p> : null}
  </div></main>;
}
