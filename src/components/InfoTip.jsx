import { useState } from "react";
import { Info } from "lucide-react";

/**
 * InfoTip
 * Small info icon that reveals a tooltip on hover (desktop) or tap (mobile).
 */
export default function InfoTip({ text, size = 13 }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        aria-label={text}
        title={text}
        className="-m-2 p-2 text-slate-400 transition-colors hover:text-[#1E4D96] focus:outline-none"
      >
        <Info size={size} />
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-40 mb-1 w-max max-w-[220px] -translate-x-1/2 rounded-md bg-slate-800 px-2 py-1 text-[11px] font-medium leading-snug text-white shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}
