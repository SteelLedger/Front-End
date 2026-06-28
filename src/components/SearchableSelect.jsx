import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

const BASE =
  "w-full rounded-md border px-3 py-2.5 pr-9 text-sm text-slate-700 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-1";

/**
 * SearchableSelect
 * A combobox: type to filter the options dropdown, click to pick — and (when
 * `allowCustom`) keep whatever is typed as the value so a brand-new entry can
 * still be added. The input value IS the selected value (controlled by parent).
 */
export default function SearchableSelect({
  value = "",
  onChange,
  options = [],
  placeholder = "Select…",
  inputRef,
  invalid = false,
  allowCustom = true,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const localRef = useRef(null);
  const ref = inputRef || localRef;

  const q = value.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.toLowerCase().includes(q))
    : options;
  const hasExact = options.some((o) => o.toLowerCase() === q);

  // Close the dropdown on any outside click.
  useEffect(() => {
    function onDocClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(opt) {
    onChange(opt);
    setOpen(false);
    ref.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={ref}
        type="text"
        role="combobox"
        aria-expanded={open}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          // Keep Escape / Enter from bubbling to the drawer (close/submit) while
          // the dropdown is open — they just dismiss the list instead.
          if ((e.key === "Escape" || e.key === "Enter") && open) {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className={
          invalid
            ? `${BASE} border-rose-400 focus:border-rose-500 focus:ring-rose-300`
            : `${BASE} border-slate-300 focus:border-[#1E4D96] focus:ring-[#1E4D96]/30`
        }
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => {
          setOpen((o) => !o);
          ref.current?.focus();
        }}
        aria-label="Toggle suppliers"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      >
        <ChevronDown
          size={16}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-slate-400">
              {value.trim()
                ? allowCustom
                  ? `No match — “${value.trim()}” will be added as new`
                  : "No matches"
                : "No suppliers yet"}
            </li>
          ) : (
            filtered.map((o) => {
              const selected = o.toLowerCase() === q;
              return (
                <li key={o}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(o)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-blue-50 ${
                      selected
                        ? "font-medium text-[#1E4D96]"
                        : "text-slate-700"
                    }`}
                  >
                    {o}
                    {selected && <Check size={14} className="text-[#1E4D96]" />}
                  </button>
                </li>
              );
            })
          )}
          {allowCustom && value.trim() && !hasExact && filtered.length > 0 && (
            <li className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400">
              Type to add a new supplier
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
