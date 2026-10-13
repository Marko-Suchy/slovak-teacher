import { useEffect, useRef, useState } from "react";
import type { Selection, Story } from "./types";
import { Icon } from "./Icon";

function sentenceFromNode(node: Node | null): string | undefined {
  const element = node instanceof Element ? node : node?.parentElement;
  return element?.closest<HTMLElement>("[data-sentence-id]")?.dataset.sentenceId;
}

export function Reader({ story, selection, onSelect, onQuiz }: { story: Story; selection?: Selection; onSelect: (selection: Selection) => void; onQuiz: () => void }) {
  const [selectionHint, setSelectionHint] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; setSelectionHint(""); }, [story.id]);
  function captureSelection() {
    const selected = window.getSelection();
    const text = selected?.toString().trim();
    const sentenceId = sentenceFromNode(selected?.anchorNode || null);
    if (!text || !sentenceId) return;
    if (sentenceId !== sentenceFromNode(selected?.focusNode || null)) {
      setSelectionHint("Select text within one sentence for a precise explanation.");
      return;
    }
    setSelectionHint("");
    onSelect({ text, sentenceId });
  }

  return <main className="reader-panel" id="reader">
    <div className="reader-scroll" ref={scrollRef}>
      <header className="reader-heading"><h1>{story.title}</h1><p>{story.level} <span>·</span> {story.estimatedMinutes} min <span>·</span> {story.topic}</p></header>
      {selectionHint ? <p className="selection-hint" role="status">{selectionHint}</p> : null}
      <article className="story-body" lang="sk" aria-label={story.title} onMouseUp={captureSelection} onKeyUp={captureSelection}>
        {Array.from({ length: Math.ceil(story.sentences.length / 4) }, (_, index) => <p key={index}>
          {story.sentences.slice(index * 4, index * 4 + 4).map(sentence => <span className="sentence" data-sentence-id={sentence.id} key={sentence.id}>
            {sentence.sk.split(/(\s+)/).map((part, partIndex) => /^\s+$/.test(part) ? part : <span key={partIndex} className={`word ${selection?.sentenceId === sentence.id && selection.text === part.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "") ? "is-selected" : ""}`} role="button" tabIndex={0} aria-label={`Inspect ${part}`} onClick={() => { if (window.getSelection()?.toString().trim()) return; const text = part.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ""); if (text) onSelect({ text, sentenceId: sentence.id }); }} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); const text = part.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ""); if (text) onSelect({ text, sentenceId: sentence.id }); } }}>{part}</span>)}{" "}
          </span>)}
        </p>)}
      </article>
      <div className="reader-footer"><button className="primary-button" onClick={onQuiz}>Start comprehension questions <Icon name="arrow" size={19}/></button></div>
    </div>
  </main>;
}
