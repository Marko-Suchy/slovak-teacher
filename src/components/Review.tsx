import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { Icon } from "./Icon";
import type { Card } from "./types";

type ReviewTab = "directory" | "practice";
const exportField = (value: string) => value.replace(/[\t\r\n]+/gu, " ").trim();

export function Review({ cards, onCardsChanged }: { cards: Card[]; onCardsChanged: () => void | Promise<void> }) {
  const [tab, setTab] = useState<ReviewTab>("directory");
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string>();
  const [draftFront, setDraftFront] = useState("");
  const [draftBack, setDraftBack] = useState("");
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [practiceOrder, setPracticeOrder] = useState<string[]>();
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const orderedCards = useMemo(() => [...cards].sort((a, b) => a.front.localeCompare(b.front, "sk")), [cards]);
  const tags = useMemo(() => [...new Set(cards.flatMap(card => card.tags))].sort((a, b) => a.localeCompare(b)), [cards]);
  useEffect(() => { setSelectedTags(current => current.filter(tag => tags.includes(tag))); }, [tags]);
  const visibleCards = orderedCards.filter(card => `${card.front} ${card.back} ${card.tags.join(" ")}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const stagedCards = selectedTags.length ? orderedCards.filter(card => card.tags.some(tag => selectedTags.includes(tag))) : orderedCards;
  const practiceCards = practiceOrder ? practiceOrder.flatMap(id => stagedCards.find(card => card.id === id) ?? []) : stagedCards;
  const currentCard = practiceCards[practiceIndex];
  const exportText = stagedCards.map(card => `${exportField(card.front)}\t${exportField(card.back)}`).join("\n");

  function chooseTag(tag: string) {
    setSelectedTags(current => current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag]);
    setPracticeOrder(undefined);
    setPracticeIndex(0);
    setFlipped(false);
    setExportMessage("");
  }

  function beginEdit(card: Card) {
    setEditingId(card.id);
    setDraftFront(card.front);
    setDraftBack(card.back);
    setDraftTags([...card.tags]);
    setTagInput("");
    setError("");
  }

  function addTag() {
    const tag = tagInput.trim();
    if (!tag) return;
    if (tag.length > 32 || /[\r\n\t]/u.test(tag)) { setError("Tags must be 32 characters or fewer."); return; }
    if (draftTags.length >= 12) { setError("A word can have up to 12 tags."); return; }
    if (!draftTags.some(item => item.toLocaleLowerCase() === tag.toLocaleLowerCase())) setDraftTags(current => [...current, tag]);
    setTagInput("");
    setError("");
  }

  async function saveEdit() {
    if (!editingId || !draftFront.trim() || !draftBack.trim()) return;
    const pendingTag = tagInput.trim();
    if (pendingTag && (pendingTag.length > 32 || /[\r\n\t]/u.test(pendingTag))) { setError("Tags must be 32 characters or fewer."); return; }
    const nextTags = pendingTag && !draftTags.some(tag => tag.toLocaleLowerCase() === pendingTag.toLocaleLowerCase()) ? [...draftTags, pendingTag] : draftTags;
    if (nextTags.length > 12) { setError("A word can have up to 12 tags."); return; }
    setBusy(true);
    setError("");
    try {
      await api.updateCard(editingId, { front: draftFront.trim(), back: draftBack.trim(), tags: nextTags });
      await onCardsChanged();
      setEditingId(undefined);
      setPracticeOrder(undefined);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this word."); }
    finally { setBusy(false); }
  }

  function startPractice() {
    setTab("practice");
    setPracticeOrder(undefined);
    setPracticeIndex(0);
    setFlipped(false);
  }

  function moveCard(direction: number) {
    if (!practiceCards.length) return;
    setPracticeIndex(index => (index + direction + practiceCards.length) % practiceCards.length);
    setFlipped(false);
  }

  function shuffleCards() {
    const ids = stagedCards.map(card => card.id);
    for (let index = ids.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [ids[index], ids[other]] = [ids[other], ids[index]];
    }
    setPracticeOrder(ids);
    setPracticeIndex(0);
    setFlipped(false);
  }

  useEffect(() => {
    if (tab !== "practice" || !practiceCards.length) return;
    const cardCount = practiceCards.length;
    function handleKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(event.target.tagName)) return;
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      setPracticeIndex(index => (index + direction + cardCount) % cardCount);
      setFlipped(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [tab, practiceCards.length]);

  async function copyExport() {
    try { await navigator.clipboard.writeText(exportText); setExportMessage("Copied. Paste this into Quizlet’s Import box."); }
    catch { setExportMessage("Copy was unavailable. Select and copy the text below."); }
  }

  function downloadExport() {
    const url = URL.createObjectURL(new Blob([exportText], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "slovak-teacher-quizlet.txt";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <main className="review-page">
    <nav className="review-tabs" aria-label="Review sections">
      <button type="button" className={tab === "directory" ? "is-active" : ""} aria-current={tab === "directory" ? "page" : undefined} onClick={() => setTab("directory")}>Word directory</button>
      <button type="button" className={tab === "practice" ? "is-active" : ""} aria-current={tab === "practice" ? "page" : undefined} onClick={startPractice}>Practice</button>
    </nav>

    {tab === "directory" ? <div className="review-directory">
      <section className="review-directory-pane" aria-labelledby="all-words-title">
        <div className="review-pane-heading"><div><h1 id="all-words-title">All saved words</h1><p>Edit terms, definitions, and tags from your reading.</p></div><span>{cards.length} {cards.length === 1 ? "word" : "words"}</span></div>
        <label className="review-search"><Icon name="search" size={18}/><span className="sr-only">Search saved words</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search words or definitions"/></label>
        <div className="directory-columns" aria-hidden="true"><span>Slovak term</span><span>English definition</span><span>Tags</span><span></span></div>
        <div className="directory-list">
          {visibleCards.map(card => <div className="directory-entry" key={card.id}>
            <div className="directory-row"><strong lang="sk">{card.front}</strong><span>{card.back}</span><span className="directory-tags">{card.tags.length ? card.tags.map(tag => <span className="review-tag" key={tag}>{tag}</span>) : <span className="untagged">No tags</span>}</span><button type="button" className="directory-edit" onClick={() => beginEdit(card)} aria-label={`Edit ${card.front}`}>Edit</button></div>
            {editingId === card.id ? <form className="directory-editor" onSubmit={event => { event.preventDefault(); void saveEdit(); }}>
              <div className="directory-edit-fields"><label>Slovak term<input lang="sk" value={draftFront} maxLength={250} onChange={event => setDraftFront(event.target.value)}/></label><label>English definition<input value={draftBack} maxLength={500} onChange={event => setDraftBack(event.target.value)}/></label></div>
              <div className="directory-tag-editor"><span>Tags</span><div className="directory-tag-list">{draftTags.map(tag => <button className="review-tag is-removable" type="button" key={tag} onClick={() => setDraftTags(current => current.filter(item => item !== tag))} aria-label={`Remove ${tag} tag`}>{tag} ×</button>)}</div><div className="directory-add-tag"><input aria-label="New tag" value={tagInput} maxLength={32} placeholder="Add a tag" onChange={event => setTagInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addTag(); } }}/><button type="button" onClick={addTag}>Add tag</button></div></div>
              {error ? <p className="inline-error" role="alert">{error}</p> : null}
              <div className="directory-edit-actions"><button type="button" onClick={() => { setEditingId(undefined); setError(""); }}>Cancel</button><button type="submit" disabled={busy || !draftFront.trim() || !draftBack.trim()}>Save changes</button></div>
            </form> : null}
          </div>)}
          {!cards.length ? <div className="review-list-empty">No saved words yet. Save a word from a story to start your collection.</div> : !visibleCards.length ? <div className="review-list-empty">No words match your search.</div> : null}
        </div>
      </section>

      <section className="review-directory-pane review-staged" aria-labelledby="staged-title">
        <div className="review-pane-heading"><div><h2 id="staged-title">Staged for practice</h2><p>Choose tags to build the set you want to study.</p></div><span>{stagedCards.length} {stagedCards.length === 1 ? "word" : "words"}</span></div>
        <div className="review-filter" aria-label="Filter staged words by tag"><button type="button" className={!selectedTags.length ? "is-active" : ""} onClick={() => { setSelectedTags([]); setPracticeOrder(undefined); setPracticeIndex(0); }}>All words</button>{tags.map(tag => <button type="button" key={tag} className={selectedTags.includes(tag) ? "is-active" : ""} aria-pressed={selectedTags.includes(tag)} onClick={() => chooseTag(tag)}>{tag}</button>)}</div>
        <div className="staged-list">{stagedCards.map(card => <div className="staged-row" key={card.id}><strong lang="sk">{card.front}</strong><span>{card.back}</span></div>)}{!stagedCards.length ? <div className="review-list-empty">No words match these tags. Select another tag or choose All words.</div> : null}</div>
        <div className="staged-actions"><button type="button" className="staged-practice-button" disabled={!stagedCards.length} onClick={startPractice}>Practice these words <Icon name="arrow" size={17}/></button><button type="button" className="staged-export-button" disabled={!stagedCards.length} onClick={() => { setExportOpen(open => !open); setExportMessage(""); }}>Export to Quizlet</button></div>
        {exportOpen && stagedCards.length ? <div className="review-export" aria-label="Quizlet export"><button type="button" className="review-export-close" onClick={() => setExportOpen(false)} aria-label="Close Quizlet export"><Icon name="close" size={16}/></button><p>Copy these pairs, then paste them into <a href="https://help.quizlet.com/hc/en-us/articles/360029977151-Creating-sets-by-importing-content" target="_blank" rel="noreferrer">Quizlet’s Import box</a> on its website.</p><textarea readOnly aria-label="Quizlet import text" value={exportText}/><div><button type="button" onClick={copyExport}>Copy text</button><button type="button" onClick={downloadExport}>Download .txt</button></div>{exportMessage ? <p role="status">{exportMessage}</p> : null}</div> : null}
      </section>
    </div> : <section className="review-practice" aria-labelledby="practice-title">
      <div className="practice-heading"><div><h1 id="practice-title">Practice your words</h1><p>{selectedTags.length ? `Set: ${selectedTags.join(", ")}` : "All saved words"}</p></div><button type="button" onClick={shuffleCards} disabled={practiceCards.length < 2}>Shuffle cards</button></div>
      {currentCard ? <><div className="practice-count" aria-live="polite">{practiceIndex + 1} / {practiceCards.length}</div><button type="button" className={`practice-card ${flipped ? "is-flipped" : ""}`} onClick={() => setFlipped(value => !value)} aria-label={flipped ? "Show Slovak term" : "Show English definition"}><span className="practice-card-side">{flipped ? "English definition" : "Slovak term"}</span><strong lang={flipped ? undefined : "sk"}>{flipped ? currentCard.back : currentCard.front}</strong><span className="practice-card-hint">Click or tap to flip</span></button><div className="practice-controls"><button type="button" onClick={() => moveCard(-1)} aria-label="Previous card">← Previous</button><span>{practiceIndex + 1} of {practiceCards.length}</span><button type="button" onClick={() => moveCard(1)} aria-label="Next card">Next →</button></div><p className="practice-key-hint">Use the left and right arrow keys to move between cards.</p></> : <div className="review-practice-empty"><div className="empty-symbol"><Icon name="bookmark" size={27}/></div><h2>No words staged yet</h2><p>Save words while reading, or change your tag filter in Word directory.</p><button type="button" onClick={() => setTab("directory")}>Open word directory</button></div>}
    </section>}
  </main>;
}
