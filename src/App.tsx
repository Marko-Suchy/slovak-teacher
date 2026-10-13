import { useEffect, useRef, useState } from "react";
import { api } from "./components/api";
import { Icon } from "./components/Icon";
import { Inspector } from "./components/Inspector";
import { Library } from "./components/Library";
import { Quiz } from "./components/Quiz";
import { Reader } from "./components/Reader";
import { Review } from "./components/Review";
import { StoryRail } from "./components/StoryRail";
import { Tutor } from "./components/Tutor";
import type { Card, Inspection, Progress, Selection, Story, StorySummary } from "./components/types";

type View = "library" | "read" | "review" | "quiz";

export default function App() {
  const [view, setView] = useState<View>("read");
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [story, setStory] = useState<Story>();
  const [cards, setCards] = useState<Card[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [selection, setSelection] = useState<Selection>();
  const [inspection, setInspection] = useState<Inspection>();
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [inspectionError, setInspectionError] = useState("");
  const [pageError, setPageError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mobilePane, setMobilePane] = useState<"story" | "inspector" | "tutor">("story");
  const inspectionRequest = useRef(0);
  const storyRequest = useRef(0);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([api.stories(), api.cards(), api.progress()]).then(async ([storyResult, cardResult, progressResult]) => {
      if (!mounted) return;
      if (cardResult.status === "fulfilled") setCards(cardResult.value);
      if (progressResult.status === "fulfilled") setProgress(progressResult.value);
      if (storyResult.status === "fulfilled") {
        setStories(storyResult.value);
        const first = storyResult.value[0];
        if (first) {
          try {
            const loaded = await api.story(first.id);
            if (mounted) setStory(loaded);
            const alreadyCompleted = progressResult.status === "fulfilled" && progressResult.value.some(item => item.storyId === first.id && item.status === "completed");
            if (!alreadyCompleted) {
              const item = await api.saveProgress({ storyId: first.id, status: "in_progress" });
              if (mounted) setProgress(current => [...current.filter(p => p.storyId !== first.id), item]);
            }
          }
          catch (cause) { if (mounted) setPageError(cause instanceof Error ? cause.message : "Could not open the story."); }
        }
      } else setPageError(storyResult.reason instanceof Error ? storyResult.reason.message : "Could not load stories.");
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  async function openStory(id: string) {
    const request = ++storyRequest.current;
    setPageError(""); setSelection(undefined); setInspection(undefined); setInspectionError(""); setMobilePane("story"); setView("read");
    try {
      const loaded = await api.story(id);
      if (request !== storyRequest.current) return;
      setStory(loaded);
      if (!progress.some(item => item.storyId === id && item.status === "completed")) {
        const item = await api.saveProgress({ storyId: id, status: "in_progress" });
        setProgress(current => [...current.filter(p => p.storyId !== id), item]);
      }
    } catch (cause) { if (request === storyRequest.current) setPageError(cause instanceof Error ? cause.message : "Could not open this story."); }
  }

  async function inspect(next: Selection) {
    if (!story) return;
    const request = ++inspectionRequest.current;
    setSelection(next); setInspection(undefined); setInspectionError(""); setInspectionLoading(true); setMobilePane("inspector");
    try {
      const result = await api.inspect(story.id, next.sentenceId, next.text);
      if (request === inspectionRequest.current) setInspection(result);
    } catch (cause) { if (request === inspectionRequest.current) setInspectionError(cause instanceof Error ? cause.message : "Could not inspect this text."); }
    finally { if (request === inspectionRequest.current) setInspectionLoading(false); }
  }

  async function refreshCards() {
    try { setCards(await api.cards()); }
    catch (cause) { setPageError(cause instanceof Error ? cause.message : "Could not refresh words."); }
  }

  async function finishQuiz(score?: number) {
    if (!story) return;
    try {
      const item = await api.saveProgress({ storyId: story.id, status: "completed", quizScore: score });
      setProgress(current => [...current.filter(p => p.storyId !== story.id), item]);
    } catch (cause) { setPageError(cause instanceof Error ? cause.message : "Could not save quiz progress."); }
  }

  const completed = progress.filter(item => item.status === "completed").length;

  return <div className="app-shell">
    <header className="app-header"><button className="brand" onClick={() => setView("library")}>Slovak Teacher</button><nav className="main-nav" aria-label="Main navigation"><button className={view === "library" ? "is-active" : ""} onClick={() => setView("library")}>Library</button><button className={view === "read" || view === "quiz" ? "is-active" : ""} onClick={() => setView("read")}>Read</button><button className={view === "review" ? "is-active" : ""} onClick={() => setView("review")}>Review</button></nav><div className="header-progress"><span>{completed} / {stories.length} stories</span><span className="progress-track"><span style={{ width: `${stories.length ? (completed / stories.length) * 100 : 0}%` }}/></span></div></header>
    {pageError ? <div className="global-error" role="alert">{pageError}<button onClick={() => setPageError("")} aria-label="Dismiss"><Icon name="close" size={16}/></button></div> : null}
    {loading ? <div className="loading-screen">Opening your reading desk…</div> : view === "library" ? <div className="solo-layout"><Library stories={stories} progress={progress} onOpen={openStory}/></div> : view === "review" ? <div className="solo-layout"><Review cards={cards} onCardsChanged={refreshCards}/></div> : story ? view === "quiz" ? <div className="solo-layout"><Quiz key={story.id} story={story} onDone={finishQuiz} onBack={() => setView("read")}/></div> : <div className="workspace"><StoryRail stories={stories} progress={progress} activeId={story.id} onOpen={openStory}/><div className="mobile-pane-nav" role="tablist" aria-label="Reader panels"><button role="tab" aria-selected={mobilePane === "story"} className={mobilePane === "story" ? "is-active" : ""} onClick={() => setMobilePane("story")}>Story</button><button role="tab" aria-selected={mobilePane === "inspector"} className={mobilePane === "inspector" ? "is-active" : ""} onClick={() => setMobilePane("inspector")}>Inspector</button><button role="tab" aria-selected={mobilePane === "tutor"} className={mobilePane === "tutor" ? "is-active" : ""} onClick={() => setMobilePane("tutor")}>Tutor</button></div><div className={`reader-slot ${mobilePane === "story" ? "is-mobile-active" : ""}`}><Reader story={story} selection={selection} onSelect={inspect} onQuiz={() => setView("quiz")}/></div><div className="right-column"><div className={`inspector-slot ${mobilePane === "inspector" ? "is-mobile-active" : ""}`}><Inspector story={story} selection={selection} inspection={inspection} loading={inspectionLoading} error={inspectionError} onCardSaved={refreshCards}/></div><div className={`tutor-slot ${mobilePane === "tutor" ? "is-mobile-active" : ""}`}><Tutor story={story} selection={selection}/></div></div></div> : <div className="loading-screen">No stories yet.</div>}
  </div>;
}
