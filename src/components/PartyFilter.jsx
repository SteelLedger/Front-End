import { useEffect, useRef, useState } from "react";
import { Filter } from "lucide-react";

// Mirrors the backend `filter` param. Status values and balance values are
// AND-ed across groups; values within a group are OR-ed.
const FILTER_GROUPS = [
  {
    label: "Status",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
  {
    label: "Balance",
    options: [
      { value: "to_receive", label: "To receive" },
      { value: "to_pay", label: "To pay" },
    ],
  },
];

/**
 * PartyFilter
 * Funnel button + checkbox popover. Controlled by the parent via `value`
 * (array of selected filter strings) and `onChange(nextArray)`.
 */
export default function PartyFilter({ value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = value.length > 0;

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (v) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Filter parties"
        title="Filter parties"
        className={`relative flex h-6 w-6 items-center justify-center rounded transition-colors ${
          active
            ? "bg-blue-50 text-[#1E4D96]"
            : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        }`}
      >
        <Filter size={13} fill={active ? "currentColor" : "none"} />
        {active && (
          <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#1E4D96] text-[8px] font-bold text-white">
            {value.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-8 z-20 w-48 rounded-lg border border-slate-200 bg-white py-2 normal-case tracking-normal shadow-lg">
          {FILTER_GROUPS.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 && <div className="my-1.5 border-t border-slate-100" />}
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {group.label}
              </p>
              {group.options.map((o) => (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={value.includes(o.value)}
                    onChange={() => toggle(o.value)}
                    className="h-3.5 w-3.5 accent-[#1E4D96]"
                  />
                  {o.label}
                </label>
              ))}
            </div>
          ))}

          {active && (
            <>
              <div className="my-1.5 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full px-3 py-1.5 text-left text-sm text-rose-600 hover:bg-rose-50"
              >
                Clear filters
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
