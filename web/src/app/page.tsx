import Link from "next/link";
import { CopyCommand } from "@/components/CopyCommand";
import { FlowStrip } from "@/components/FlowStrip";
import { LiveDemo } from "@/components/LiveDemo";

export default function HomePage() {
  return (
    <>
      <div className="site-bg" aria-hidden />
      <div className="shell">
        <header className="flex items-center justify-between border-b border-[var(--line)] px-[clamp(1.25rem,4vw,3rem)] py-5">
          <Link href="/" className="text-[1rem] font-bold tracking-[-0.02em]">
            Claude Auto
          </Link>
          <nav className="flex gap-5 text-[0.95rem] font-semibold text-[var(--ink-muted)]">
            <a className="hover:text-[var(--teal-deep)]" href="#use">
              Use
            </a>
            <a className="hover:text-[var(--teal-deep)]" href="#install">
              Install
            </a>
            <a
              className="hover:text-[var(--teal-deep)]"
              href="https://www.npmjs.com/package/claude-auto"
              target="_blank"
              rel="noreferrer"
            >
              npm
            </a>
          </nav>
        </header>

        <main>
          <section className="grid items-end gap-10 border-b border-[var(--line)] px-[clamp(1.25rem,4vw,3rem)] pb-[clamp(2.5rem,7vh,4.5rem)] pt-[clamp(2.5rem,8vh,5.5rem)] lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
            <div>
              <p className="mono mb-3 text-[0.8rem] text-[var(--ink-muted)] animate-[fadeUp_650ms_var(--ease)_both]">
                for Claude Code
              </p>
              <h1 className="m-0 text-[clamp(3.4rem,12vw,8.2rem)] font-extrabold leading-[0.9] tracking-[-0.055em]">
                <span className="block animate-[fadeUp_700ms_var(--ease)_both]">
                  Claude
                </span>
                <span
                  className="block text-[var(--teal)] animate-[fadeUp_750ms_var(--ease)_both]"
                  style={{ animationDelay: "80ms" }}
                >
                  Auto
                </span>
              </h1>
              <p
                className="mt-6 max-w-[22ch] text-[clamp(1.15rem,2.3vw,1.55rem)] font-semibold tracking-[-0.02em] text-[var(--ink-muted)] animate-[fadeUp_750ms_var(--ease)_both]"
                style={{ animationDelay: "140ms" }}
              >
                Limit hits. Wait. Same session continues.
              </p>
              <div
                className="mt-8 max-w-xl animate-[fadeUp_800ms_var(--ease)_both]"
                style={{ animationDelay: "200ms" }}
              >
                <CopyCommand command="npm install -g claude-auto" />
              </div>
            </div>

            <div
              className="animate-[fadeUp_850ms_var(--ease)_both]"
              style={{ animationDelay: "220ms" }}
            >
              <LiveDemo />
            </div>
          </section>

          <section
            id="use"
            className="border-b border-[var(--line)] px-[clamp(1.25rem,4vw,3rem)] py-[clamp(2.5rem,7vh,4.5rem)]"
          >
            <FlowStrip />
          </section>

          <section
            id="install"
            className="px-[clamp(1.25rem,4vw,3rem)] py-[clamp(2.5rem,7vh,4.5rem)]"
          >
            <h2 className="m-0 mb-8 text-[clamp(2rem,6vw,3.4rem)] font-extrabold tracking-[-0.04em]">
              Install
            </h2>
            <div className="grid gap-10 md:grid-cols-2 md:gap-14">
              <div className="flex flex-col gap-3">
                <h3 className="m-0 text-[1rem] font-bold tracking-[-0.02em]">CLI</h3>
                <CopyCommand variant="ghost" command="npm install -g claude-auto" />
                <CopyCommand
                  variant="ghost"
                  command='claude-auto --prompt "Build auth"'
                />
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="m-0 text-[1rem] font-bold tracking-[-0.02em]">
                  Inside Claude Code
                </h3>
                <CopyCommand variant="ghost" command="claude-auto ide install" />
                <CopyCommand variant="ghost" command="/claude-auto" />
              </div>
            </div>
          </section>
        </main>

        <footer className="mono flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-[clamp(1.25rem,4vw,3rem)] py-5 text-[0.72rem] text-[var(--ink-muted)]">
          <p className="m-0">Independent community tool. Not affiliated with Anthropic.</p>
          <p className="m-0">
            <a
              className="underline-offset-2 hover:underline"
              href="https://www.devabir.me/"
              target="_blank"
              rel="noreferrer"
            >
              devabir
            </a>
            {" · "}
            <a
              className="underline-offset-2 hover:underline"
              href="https://www.webnest.app/"
              target="_blank"
              rel="noreferrer"
            >
              webnest
            </a>
          </p>
        </footer>
      </div>
    </>
  );
}
