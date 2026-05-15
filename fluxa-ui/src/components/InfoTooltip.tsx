import { useState, useRef, useEffect } from 'react';

interface Props {
  text: string;
}

export default function InfoTooltip({ text }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
        className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/20 text-[8px] font-bold text-black/30 dark:text-white/30 hover:border-black/40 dark:hover:border-white/40 hover:text-black/50 dark:hover:text-white/50 transition-colors flex items-center justify-center leading-none"
        aria-label="Mais informações"
      >
        ?
      </button>

      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52 px-3 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black text-[11px] leading-relaxed shadow-xl pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black dark:border-t-white" />
        </div>
      )}
    </div>
  );
}
