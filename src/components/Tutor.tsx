import { FormEvent, Suspense, lazy, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { Icon } from "./Icon";
import type { Selection, Story, TutorMessage } from "./types";

const VoiceTutor = lazy(() => import("./VoiceTutor"));

export function Tutor({ story, selection }: { story: Story; selection?: Selection }) {
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const conversationId = useRef(0);
  useEffect(() => { conversationId.current += 1; setMessages([]); setMode("text"); setDraft(""); setError(""); setPending(false); }, [story.id]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest" }); }, [messages, pending]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || pending) return;
    const requestedConversationId = conversationId.current;
    const history = messages;
    setMessages([...history, { role: "user", content: message }]);
    setDraft(""); setError(""); setPending(true);
    try {
      const result = await api.tutor(story.id, message, history, selection?.text);
      if (conversationId.current === requestedConversationId) setMessages(current => [...current, { role: "assistant", content: result.reply }]);
    } catch (cause) { if (conversationId.current === requestedConversationId) setError(cause instanceof Error ? cause.message : "The tutor is unavailable."); }
    finally { if (conversationId.current === requestedConversationId) setPending(false); }
  }

  return <section className="tutor panel" aria-labelledby="tutor-title"><div className="tutor-heading"><h2 id="tutor-title">Tutor</h2><div className="tutor-tabs" role="tablist" aria-label="Tutor mode"><button role="tab" aria-selected={mode === "text"} className={mode === "text" ? "is-active" : ""} onClick={() => setMode("text")}>Text</button><button role="tab" aria-selected={mode === "voice"} className={mode === "voice" ? "is-active" : ""} onClick={() => setMode("voice")}>Voice</button></div></div>
    {mode === "voice" ? <Suspense fallback={<div className="voice-loading">Opening voice…</div>}><VoiceTutor story={story} selectedText={selection?.text}/></Suspense> : <div className="tutor-text"><div className="chat-history" aria-live="polite">
      {messages.length === 0 ? <div className="tutor-welcome"><div className="empty-symbol"><Icon name="spark" size={23}/></div><p>Ask me about the story or a Slovak phrase. I’ll keep it simple.</p></div> : messages.map((item, index) => <div className={`chat-bubble ${item.role}`} key={index}>{item.content}</div>)}
      {pending ? <p className="thinking">Tutor is thinking…</p> : null}<div ref={bottom}/>
    </div><div className="chat-input-wrap">{error ? <p className="inline-error" role="alert">{error}</p> : null}<form className="chat-form" onSubmit={send}><label className="sr-only" htmlFor="tutor-message">Ask the tutor</label><input id="tutor-message" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Ask in Slovak or English…"/><button type="submit" aria-label="Send message" disabled={!draft.trim() || pending}><Icon name="send" size={19}/></button></form><button className="voice-entry" onClick={() => setMode("voice")}><Icon name="headphones" size={18}/> Start voice conversation</button></div></div>}
  </section>;
}
