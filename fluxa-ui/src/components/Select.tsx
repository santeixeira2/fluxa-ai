import { useState, useRef, useEffect, useCallback } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  variant?: 'default' | 'glass';
}

export default function Select({ options, value, onChange, placeholder = 'Selecione...', searchable = true, variant = 'default' }: SelectProps) {
  const isGlass = variant === 'glass';
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);

  const filtered = searchable && search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()) || o.sublabel?.toLowerCase().includes(search.toLowerCase()))
    : options;

  const close = useCallback(() => {
    setOpen(false);
    setSearch('');
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [close]);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  function select(val: string) {
    onChange(val);
    close();
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-3 border text-sm transition-all text-left ${
          isGlass
            ? `bg-black/[0.03] dark:bg-white/[0.03] px-6 py-4 ${open ? 'rounded-t-2xl rounded-b-none border-black/30 dark:border-white/30' : 'rounded-2xl border-black/[0.1] dark:border-white/[0.1] hover:border-black/20 dark:hover:border-white/20'}`
            : `bg-black/[0.04] dark:bg-white/[0.05] px-4 py-3 ${open ? 'rounded-t-lg rounded-b-none border-black/30 dark:border-white/30' : 'rounded-lg border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'}`
        }`}
      >
        <span className={
          selected 
            ? 'text-black dark:text-white' 
            : 'text-black/30 dark:text-white/30'
        }>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''} text-black/30 dark:text-white/30`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className={`absolute z-50 left-0 right-0 border border-t-0 shadow-2xl overflow-hidden animate-fade-down ${
          isGlass
            ? 'bg-white dark:bg-[#0d0d0d] border-black/[0.1] dark:border-white/[0.1] rounded-b-2xl'
            : 'bg-white dark:bg-[#111] border-black/10 dark:border-white/10 rounded-b-lg'
        }`}>
          {searchable && (
            <div className="p-2 border-b border-black/[0.06] dark:border-white/[0.06]">
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full rounded-md px-3 py-2 text-sm outline-none bg-black/[0.04] dark:bg-white/[0.05] text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
              />
            </div>
          )}

          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-black/30 dark:text-white/30">Nenhum resultado</li>
            ) : (
              filtered.map(opt => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => select(opt.value)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${
                      opt.value === value
                        ? 'bg-black/[0.06] dark:bg-white/[0.08] text-black dark:text-white font-medium'
                        : 'text-black/80 dark:text-white/80 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-xs font-mono ml-3 text-black/30 dark:text-white/30">{opt.sublabel}</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
