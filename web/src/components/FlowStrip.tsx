const steps = [
  { n: "01", label: "Working" },
  { n: "02", label: "Usage limit" },
  { n: "03", label: "Wait for reset" },
  { n: "04", label: "Same session" },
];

export function FlowStrip() {
  return (
    <ol className="m-0 grid list-none grid-cols-1 gap-0 p-0 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-stretch md:gap-2">
      {steps.map((step, index) => (
        <li key={step.n} className="contents">
          <div
            className="border-t-2 border-[var(--ink)] py-5 md:min-h-[7.5rem] md:px-2 animate-[fadeUp_700ms_var(--ease)_both]"
            style={{ animationDelay: `${120 + index * 90}ms` }}
          >
            <span className="mono mb-2 block text-[0.75rem] text-[var(--teal-deep)]">
              {step.n}
            </span>
            <span className="block text-[1.15rem] font-bold tracking-[-0.03em] sm:text-[1.35rem]">
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 ? (
            <div
              aria-hidden
              className="relative my-auto hidden h-px bg-gradient-to-r from-[var(--line)] to-[var(--teal)] md:block"
            >
              <span className="absolute -right-0.5 top-1/2 size-2 -translate-y-1/2 rotate-45 border-r-2 border-t-2 border-[var(--teal)]" />
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
