import { Icon } from "./Icon";
import type { Progress, StorySummary } from "./types";

export function Library({ stories, progress, onOpen }: { stories: StorySummary[]; progress: Progress[]; onOpen: (id: string) => void }) {
  return <main className="study-panel library-panel"><div className="study-top"><span>Story library</span><span>{stories.length} stories</span></div><div className="library-content"><h1>A little Slovak every day.</h1><p className="study-intro">Choose a short story, read at your pace, and ask anything along the way.</p><div className="library-list">{stories.map((story, index) => {
    const status = progress.find(item => item.storyId === story.id)?.status;
    return <button key={story.id} className="library-row" onClick={() => onOpen(story.id)}><span className="library-index">{String(index + 1).padStart(2, "0")}</span><span className="library-row-main"><strong>{story.title}</strong><span>{story.topic}</span></span><span className="library-row-meta">{story.level} · {story.estimatedMinutes} min{status === "completed" ? " · Done" : ""}</span><Icon name="chevron" size={19}/></button>;
  })}</div></div></main>;
}
