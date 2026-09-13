import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

const BASE =
  "w-full rounded-md border px-3 py-2.5 pr-9 text-sm text-slate-700 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-1";

/**
 * SearchableSelect
 * A combobox: type to filter the options dropdown, click to pick — and (when
 * `allowCustom`) keep whatever is typed as the value so a brand-new entry can
 * still be added. The input value IS the selected value (controlled by parent).
 *
 * The list opens on a deliberate action only — clicking the field or the
 * chevron, typing, or ArrowDown from the keyboard. It deliberately does NOT
 * open on focus: drawers autofocus their first field, so that had every drawer
 * springing open with a list of suggestions nobody had asked for.
 */
export default function SearchableSelect({
  value = "",
  onChange,
  options = [],
  placeholder = "Select…",
  inputRef,
  invalid = false,
  allowCustom = true,
  // What the list holds, for the empty/hint copy ("supplier", "product", …).
  noun = "option",
  emptyText,
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  // Which option the arrow keys have landed on; -1 is "none highlighted yet".
  const [active, setActive] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);
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

  // A highlight the user can't see is worse than none — keep it in view as the
  // arrow keys walk past the bottom of the 13rem-tall list.
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function pick(opt) {
    onChange(opt);
    setOpen(false);
    setActive(-1);
    ref.current?.focus();
  }

  /**
   * Arrow keys walk the list, Enter takes the highlighted option, Escape
   * closes. Enter with nothing highlighted just closes the list, so it stays
   * a way to dismiss rather than a way to pick something at random.
   *
   * Both keys stop propagating: the drawer above treats Enter as "next field"
   * and Escape as "close", and neither should fire while a list is open.
   */
  function onKeyDown(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(e.key === "ArrowDown" ? 0 : filtered.length - 1);
        return;
      }
      if (!filtered.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => {
        const next = i + step;
        if (next < 0) return filtered.length - 1;
        if (next >= filtered.length) return 0;
        return next;
      });
      return;
    }
    if (e.key === "Enter" && open) {
      e.preventDefault();
      e.stopPropagation();
      if (active >= 0 && filtered[active]) pick(filtered[active]);
      else setOpen(false);
      return;
    }
    if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      setActive(-1);
    }
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
        aria-autocomplete="list"
        aria-activedescendant={
          open && active >= 0 ? `${listId}-opt-${active}` : undefined
        }
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
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
        aria-label={`Toggle ${noun} list`}
        className="absolute right-2 top-1/2 -mr-2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600"
      >
        <ChevronDown
          size={16}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-slate-400">
              {value.trim()
                ? allowCustom
                  ? `No match — “${value.trim()}” will be added as new`
                  : "No matches"
                : (emptyText ?? `No ${noun}s yet`)}
            </li>
          ) : (
            filtered.map((o, i) => {
              const selected = o.toLowerCase() === q;
              const highlighted = i === active;
              return (
                <li
                  key={o}
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={selected}
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(o)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                      highlighted ? "bg-blue-50" : ""
                    } ${
                      selected ? "font-medium text-[#1E4D96]" : "text-slate-700"
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
              Type to add a new {noun}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
