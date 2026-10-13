import { useEffect, useState } from "react";
import { api } from "./api";
import { Icon } from "./Icon";
import type { Inspection, Selection, Story } from "./types";

export function Inspector({ story, selection, inspection, loading, error, onCardSaved }: { story: Story; selection?: Selection; inspection?: Inspection; loading: boolean; error?: string; onCardSaved: () => void }) {
  const [isSaving, setSaving] = useState(false);
  const [isPlaying, setPlaying] = useState(false);
  const [draftBack, setDraftBack] = useState("");
  const [cardError, setCardError] = useState("");
  const [saved, setSaved] = useState(false);
  const [audioError, setAudioError] = useState("");

  useEffect(() => { setDraftBack(inspection?.translation || ""); setSaved(false); setSaving(false); setCardError(""); setAudioError(""); }, [inspection, selection]);

  async function play() {
    if (!selection || isPlaying) return;
    setPlaying(true); setAudioError("");
    let url: string | undefined;
    try {
      const blob = await api.speech(selection.text);
      url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = 0.9;
      const finished = new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error("Playback failed"));
      });
      await audio.play();
      await finished;
    } catch (cause) { setAudioError(cause instanceof Error ? cause.message : "Could not play audio."); }
    finally { if (url) URL.revokeObjectURL(url); setPlaying(false); }
  }

  async function saveCard() {
    if (!selection || !draftBack.trim()) return;
    setCardError("");
    try {
      await api.addCard({ storyId: story.id, sentenceId: selection.sentenceId, front: selection.text, back: draftBack.trim(), lemma: inspection?.lemma, note: inspection?.note });
      setSaved(true); setSaving(false); onCardSaved();
    } catch (cause) { setCardError(cause instanceof Error ? cause.message : "Could not save the card."); }
  }

  return <section className="inspector panel" aria-labelledby="inspector-title">
    <div className="panel-title-row"><h2 id="inspector-title">Inspector</h2>{inspection?.source === "generated" ? <span className="source-label">AI explanation</span> : null}</div>
    {!selection ? <div className="inspector-empty"><div className="empty-symbol"><Icon name="search" size={26}/></div><h3>Look closer at a word</h3><p>Click a word or highlight a phrase in the story to see its meaning here.</p></div> : <>
      <div className="inspector-top"><div><h3 lang="sk">{selection.text}</h3>{loading ? <p className="muted">Looking it up…</p> : inspection ? <p className="translation">{inspection.translation}</p> : null}</div><button className="icon-button speaker-button" type="button" onClick={play} disabled={isPlaying} aria-label={`Play AI pronunciation of ${selection.text}`} title="Play AI pronunciation"><Icon name="speaker" size={22}/></button></div>
      {error ? <p className="inline-error" role="alert">{error}</p> : null}
      {audioError ? <p className="inline-error" role="alert">{audioError}</p> : null}
      {inspection ? <>
        <dl className="inspector-details">
          {inspection.lemma ? <><dt>Base form</dt><dd lang="sk">{inspection.lemma}</dd></> : null}
          {inspection.partOfSpeech ? <><dt>Type</dt><dd>{inspection.partOfSpeech}</dd></> : null}
          {inspection.forms?.length ? <><dt>Forms</dt><dd lang="sk">{inspection.forms.join(" · ")}</dd></> : null}
          {inspection.note ? <><dt>Note</dt><dd>{inspection.note}</dd></> : null}
        </dl>
        <div className="inspector-action">
          {isSaving ? <div className="save-form"><label htmlFor="card-meaning">Card meaning</label><input id="card-meaning" value={draftBack} onChange={event => setDraftBack(event.target.value)}/><div className="save-actions"><button className="text-button" onClick={() => setSaving(false)}>Cancel</button><button className="small-primary" onClick={saveCard} disabled={!draftBack.trim()}>Save card</button></div>{cardError ? <p className="inline-error" role="alert">{cardError}</p> : null}</div> : <button className={`save-card-button ${saved ? "is-saved" : ""}`} disabled={saved} onClick={() => setSaving(true)}><Icon name={saved ? "check" : "bookmark"} size={20}/>{saved ? "Saved to words" : "Save to my words"}</button>}
        </div>
      </> : null}
    </>}
  </section>;
}
