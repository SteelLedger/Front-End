import { useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import MenuPopover from "./MenuPopover";

/**
 * FilterSelect
 * A filter chip with a styled dropdown. Replaces a native <select>, whose
 * popup can't be themed and renders as an OS-default list over the page.
 * Reads as "Label · Value" and tints itself blue while a filter is active.
 */
export default function FilterSelect({
  label,
  value,
  options,
  onChange,
  active = false,
  displayLabel,
  width = 200,
  // Slimmer padding for toolbars that carry the chip inline beside a title.
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  const current =
    displayLabel ?? options.find((o) => o.value === value)?.label ?? "—";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center gap-2 rounded-lg border text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40 ${
          compact ? "px-3 py-1.5" : "px-3.5 py-2"
        } ${
          active
            ? "border-[#BBD0EC] bg-[#EEF3FB] text-[#1E4D96]"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        {label && (
          <span className={active ? "text-[#1E4D96]/60" : "text-slate-400"}>
            {label}
          </span>
        )}
        <span className="font-semibold">{current}</span>
        <ChevronDown
          size={compact ? 14 : 15}
          className={`transition-transform ${open ? "rotate-180" : ""} ${
            active ? "text-[#1E4D96]/70" : "text-slate-400"
          }`}
        />
      </button>

      <MenuPopover
        open={open}
        anchorRef={btnRef}
        onClose={() => setOpen(false)}
        width={width}
      >
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="menuitem"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-blue-50 ${
                selected ? "font-semibold text-[#1E4D96]" : "text-slate-700"
              }`}
            >
              {o.label}
              {selected && <Check size={14} className="text-[#1E4D96]" />}
            </button>
          );
        })}
      </MenuPopover>
    </>
  );
}
