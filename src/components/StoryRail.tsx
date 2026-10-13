import { useEffect, useMemo, useRef, useState } from "react";
import type { Progress, StorySummary } from "./types";
import { Icon } from "./Icon";

export function StoryRail({ stories, progress, activeId, onOpen }: { stories: StorySummary[]; progress: Progress[]; activeId?: string; onOpen: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLElement>(null);
  const filtered = useMemo(() => stories.filter(story => `${story.title} ${story.topic}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [stories, search]);
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>(".story-list-item.is-active");
    if (list && active) active.scrollIntoView({ block: "start", behavior: "auto" });
  }, [activeId]);
  return <aside className="story-rail" aria-label="Stories">
    <div className="rail-heading"><h2>Stories</h2><label className="rail-search"><Icon name="search" size={20}/><span className="sr-only">Search stories</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search stories" /></label></div>
    <nav className="story-list" aria-label="Story library" ref={listRef}>
      {filtered.map(story => {
        const done = progress.find(item => item.storyId === story.id)?.status === "completed";
        return <button key={story.id} className={`story-list-item ${activeId === story.id ? "is-active" : ""}`} onClick={() => onOpen(story.id)} aria-current={activeId === story.id ? "page" : undefined}>
          <span className="story-list-title">{story.title}</span>
          <span className="story-list-meta">{story.level} · {story.estimatedMinutes} min {done ? <span className="done-dot" aria-label="Completed"><Icon name="check" size={12}/></span> : null}</span>
        </button>;
      })}
      {filtered.length === 0 ? <p className="rail-empty">No matching stories.</p> : null}
    </nav>
  </aside>;
}
