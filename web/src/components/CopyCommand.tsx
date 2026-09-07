"use client";

import { useState } from "react";

type Props = {
  command: string;
  variant?: "solid" | "ghost";
};

export function CopyCommand({ command, variant = "solid" }: Props) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      const el = document.createElement("textarea");
      el.value = command;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className={`group flex w-full items-center justify-between gap-3 rounded-[2px] border px-4 py-3.5 text-left transition duration-200 ${
        variant === "solid"
          ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] hover:border-[var(--teal-deep)] hover:bg-[var(--teal-deep)]"
          : "border-[var(--line)] bg-transparent text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)]"
      } ${copied ? "!border-[var(--teal)] !bg-[var(--teal)] !text-white" : ""}`}
    >
      <code className="mono truncate text-[0.82rem] sm:text-[0.92rem]">{command}</code>
      <span className="mono shrink-0 text-[0.7rem] opacity-70">
        {copied ? "copied" : "copy"}
      </span>
    </button>
  );
}
