"use client";

import { useEffect, useState } from "react";

const frames = [
  { title: "working", body: "claude-auto · session abc123", tone: "ok" as const },
  {
    title: "limit",
    body: "You've hit your session limit · resets 4:40pm",
    tone: "warn" as const,
  },
  { title: "waiting", body: "Remaining  12m 04s   ·   resumes 1 / 20", tone: "wait" as const },
  {
    title: "resumed",
    body: "Same session · continuation sent",
    tone: "ok" as const,
  },
];

export function LiveDemo() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setI((v) => (v + 1) % frames.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, []);

  const frame = frames[i]!;

  return (
    <div className="overflow-hidden rounded-[2px] border border-[var(--ink)] bg-[#0e1524] text-[#e8e4da] shadow-[0_24px_60px_rgba(11,18,32,0.22)]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="mono ml-3 text-[0.7rem] text-white/45">claude-auto</span>
      </div>
      <div className="relative min-h-[9.5rem] px-5 py-5">
        <p
          key={frame.title}
          className="mono text-[0.72rem] uppercase tracking-[0.14em] text-[var(--teal)] animate-[fadeUp_500ms_var(--ease)_both]"
        >
          {frame.title}
        </p>
        <p
          key={frame.body}
          className={`mono mt-3 text-[0.92rem] leading-relaxed animate-[fadeUp_550ms_var(--ease)_both] ${
            frame.tone === "warn"
              ? "text-[#fb923c]"
              : frame.tone === "wait"
                ? "text-[#7dd3fc]"
                : "text-[#e8e4da]"
          }`}
        >
          {frame.body}
        </p>
        <div className="absolute bottom-4 right-5 flex gap-1.5">
          {frames.map((_, idx) => (
            <span
              key={idx}
              className={`h-1 w-4 rounded-full transition ${
                idx === i ? "bg-[var(--teal)]" : "bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
