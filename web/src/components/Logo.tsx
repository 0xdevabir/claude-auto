type LogoProps = {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
};

/** Minimal mark: wait-cycle arc + resume tip. */
export function Logo({
  className = "",
  markClassName = "h-8 w-8",
  showWordmark = true,
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        className={markClassName}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect width="40" height="40" rx="11" fill="var(--teal)" />
        <path
          d="M28.2 20a8.2 8.2 0 1 1-2.05-5.45"
          stroke="var(--paper)"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M26.1 11.4v6.2h6.2"
          stroke="var(--paper)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark ? (
        <span className="text-[1.05rem] font-bold tracking-[-0.03em]">
          Claude Auto
        </span>
      ) : null}
    </span>
  );
}
