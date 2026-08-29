import React, { useEffect, useMemo, useRef, useState } from 'react';
import { VIETNAM_PROVINCES, searchProvinces, type Province } from '../data/provinces';
import type { Language } from '../types';

/**
 * A combo box over Vietnam's 34 provincial-level units.
 *
 * It replaces two different things that were both wrong. The Creator Studio had
 * a `<select>` of eight hard-coded destinations, so a host in Cà Mau could not
 * file a listing at all. The profile editor had a bare text input, so the same
 * province arrived as "Da Nang", "Đà Nẵng" and "đà nẵng" and never grouped.
 *
 * The design point is that typing is the primary interaction, not the fallback:
 * the field is an ordinary input, filtering as you type, and matching without
 * diacritics because that is how people type on a phone. What you type is kept
 * even if it matches nothing — Hội An, Sa Pa and Mũi Né are real answers to
 * "where is this tour" and none of them is a province — so the list narrows the
 * common case without ever becoming a wall.
 */
interface ProvinceSelectProps {
  value: string;
  onChange: (value: string, province: Province | null) => void;
  language: Language;
  placeholder?: string;
  className?: string;
  /** Rendered inside the field on the left; defaults to a location pin. */
  icon?: string;
  id?: string;
}

export const ProvinceSelect: React.FC<ProvinceSelectProps> = ({
  value,
  onChange,
  language,
  placeholder,
  className,
  icon = 'fa-solid fa-location-dot',
  id,
}) => {
  const isVi = language === 'vi';
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // While the menu is closed the input shows the saved value; while it is open
  // it shows what is being typed. Editing the saved value directly would make
  // every keystroke a save, and the list would jump under the user's fingers.
  const shown = open ? query : value;

  const matches = useMemo(() => (open ? searchProvinces(query) : VIETNAM_PROVINCES), [open, query]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        // Clicking away commits whatever was typed. Discarding it would throw
        // away the one thing the free-text escape hatch exists for.
        if (query.trim()) onChange(query.trim(), null);
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open, query, onChange]);

  const commit = (p: Province) => {
    onChange(p.name, p);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setCursor((c) => Math.min(c + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (matches[cursor]) commit(matches[cursor]);
      else if (query.trim()) {
        onChange(query.trim(), null);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  const inputClass =
    className ??
    'w-full pl-9 pr-8 py-2.5 bg-stone-50 focus:bg-white border border-stone-200 focus:border-[#A82323] focus:ring-1 focus:ring-[#A82323] rounded-xl text-sm text-stone-900 outline-hidden transition-all';

  return (
    <div className="relative" ref={boxRef}>
      <i className={`${icon} absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs pointer-events-none`}></i>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        value={shown}
        placeholder={placeholder ?? (isVi ? 'Gõ để tìm tỉnh / thành phố…' : 'Type to search a province…')}
        onFocus={() => {
          setOpen(true);
          setQuery('');
          setCursor(0);
        }}
        onChange={(e) => {
          setOpen(true);
          setQuery(e.target.value);
          setCursor(0);
        }}
        onKeyDown={onKeyDown}
        className={inputClass}
      />
      <i
        className={`fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 text-[10px] transition-transform pointer-events-none ${
          open ? 'rotate-180' : ''
        }`}
      ></i>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-stone-200 rounded-2xl shadow-xl py-1">
          {matches.length === 0 ? (
            <div className="px-3.5 py-3 text-xs text-stone-500 leading-relaxed">
              {isVi
                ? 'Không có tỉnh nào khớp. Bấm Enter để dùng đúng những gì bạn vừa gõ — địa danh như Hội An hay Sa Pa vẫn hợp lệ.'
                : 'No province matches. Press Enter to keep exactly what you typed — places like Hoi An or Sa Pa are valid answers.'}
            </div>
          ) : (
            matches.map((p, i) => (
              <button
                key={p.name}
                type="button"
                onMouseEnter={() => setCursor(i)}
                onClick={() => commit(p)}
                className={`w-full text-left px-3.5 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                  i === cursor ? 'bg-red-50' : 'hover:bg-stone-50'
                }`}
              >
                <span className="text-sm text-stone-900 font-medium">{p.name}</span>
                <span className="text-[10px] text-stone-400 shrink-0">
                  {p.kind === 'city' ? (isVi ? 'TP trực thuộc TW' : 'Central city') : p.en}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
