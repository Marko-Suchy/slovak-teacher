type Name = "book" | "search" | "speaker" | "bookmark" | "send" | "arrow" | "close" | "check" | "headphones" | "chevron" | "spark";

export function Icon({ name, size = 18 }: { name: Name; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  const path = {
    book: <><path d="M12 6.5c-2.2-1.7-5-2-9-1v14c4-1 6.8-.7 9 1 2.2-1.7 5-2 9-1v-14c-4-1-6.8-.7-9 1Z"/><path d="M12 6.5v14"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></>,
    speaker: <><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6a8 8 0 0 1 0 12"/></>,
    bookmark: <path d="M6 3.5h12v17l-6-4-6 4v-17Z"/>,
    send: <><path d="m3 3 18 9-18 9 3-9-3-9Z"/><path d="M6 12h15"/></>,
    arrow: <><path d="M4 12h16M14 6l6 6-6 6"/></>,
    close: <path d="M5 5 19 19M19 5 5 19"/>,
    check: <path d="m4 12 5 5L20 6"/>,
    headphones: <><path d="M4 14v-3a8 8 0 0 1 16 0v3"/><path d="M4 14h3v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 1-2ZM20 14h-3v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-1-2Z"/></>,
    chevron: <path d="m9 5 7 7-7 7"/>,
    spark: <><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2ZM19 18l.5 1.5L21 20l-1.5.5L19 22l-.5-1.5L17 20l1.5-.5L19 18Z"/></>,
  }[name];
  return <svg {...common}>{path}</svg>;
}
