import { useEffect, useMemo, useRef, useState } from "react";
import type { Progress, StorySummary } from "./types";
import { Icon } from "./Icon";

export function StoryRail({ stories, progress, activeId, collapsed, onToggle, onOpen }: { stories: StorySummary[]; progress: Progress[]; activeId?: string; collapsed: boolean; onToggle: () => void; onOpen: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLElement>(null);
  const filtered = useMemo(() => stories.filter(story => `${story.title} ${story.topic}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [stories, search]);
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>(".story-list-item.is-active");
    if (list && active) active.scrollIntoView({ block: "start", behavior: "auto" });
  }, [activeId]);
  return <aside className={`story-rail ${collapsed ? "is-collapsed" : ""}`} aria-label="Stories">
    <div className="rail-heading"><div className="rail-heading-main"><h2>Stories</h2><button className="rail-toggle" type="button" onClick={onToggle} aria-expanded={!collapsed} aria-controls="story-rail-list" aria-label={collapsed ? "Expand stories" : "Collapse stories"} title={collapsed ? "Expand stories" : "Collapse stories"}><Icon name="chevron" size={17}/></button></div>{!collapsed ? <label className="rail-search"><Icon name="search" size={20}/><span className="sr-only">Search stories</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search stories" /></label> : null}</div>
    <nav className="story-list" id="story-rail-list" aria-label="Story library" ref={listRef} hidden={collapsed}>
      {filtered.map(story => {
        const done = progress.find(item => item.storyId === story.id)?.status === "completed";
        return <button key={story.id} className={`story-list-item ${activeId === story.id ? "is-active" : ""}`} onClick={() => onOpen(story.id)} aria-current={activeId === story.id ? "page" : undefined}>
          <span className="story-list-main"><span className={`story-complete-box ${done ? "is-done" : ""}`} aria-hidden="true">{done ? <Icon name="check" size={14}/> : null}</span><span className="story-list-title">{story.title}</span></span>
          <span className="story-list-meta">{story.level} · {story.estimatedMinutes} min</span><span className="sr-only">{done ? "Completed" : "Not completed"}</span>
        </button>;
      })}
      {filtered.length === 0 ? <p className="rail-empty">No matching stories.</p> : null}
    </nav>
  </aside>;
}
