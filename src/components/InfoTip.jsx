import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

const MAX_WIDTH = 240;
const GAP = 6;
const EDGE = 8;

/**
 * InfoTip
 * Small info icon that reveals a tooltip on hover (desktop) or tap (mobile).
 *
 * The bubble is rendered into <body> rather than beside the icon. Positioned
 * inline it was clipped by any scrolling ancestor — `overflow-y-auto` computes
 * overflow-x to `auto` as well, so the app's main scroll area cut the left half
 * off a tooltip near the edge of the screen. Out here nothing can clip it, and
 * it can be nudged away from the viewport edges instead.
 */
export default function InfoTip({ text, size = 13 }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const tipRef = useRef(null);
  const [style, setStyle] = useState(null);

  useLayoutEffect(() => {
    if (!open) return;

    function place() {
      const anchor = btnRef.current;
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const cap = Math.min(MAX_WIDTH, window.innerWidth - EDGE * 2);
      // First pass has no rendered bubble to measure, so assume the widest it
      // could be; the rAF pass below re-runs with its true size.
      const w = tipRef.current?.offsetWidth || cap;
      const h = tipRef.current?.offsetHeight || 32;

      let left = r.left + r.width / 2 - w / 2;
      left = Math.min(Math.max(EDGE, left), window.innerWidth - w - EDGE);

      // Above by preference; below when there isn't room for it up there.
      const fitsAbove = r.top - GAP - h >= EDGE;

      setStyle({
        position: "fixed",
        left,
        maxWidth: cap,
        ...(fitsAbove ? { top: r.top - GAP - h } : { top: r.bottom + GAP }),
      });
    }

    place();
    const raf = requestAnimationFrame(place); // re-place at its real size
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, text]);

  // Tapping elsewhere dismisses it — on a touch screen there is no mouseleave.
  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (btnRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        aria-label={text}
        className="-m-2 p-2 text-slate-400 transition-colors hover:text-[#1E4D96] focus:outline-none"
      >
        <Info size={size} />
      </button>

      {open &&
        createPortal(
          <span
            ref={tipRef}
            role="tooltip"
            style={style ?? { position: "fixed", left: -9999, top: -9999 }}
            // `normal-case` because the icon often sits inside an uppercase
            // label, and a shouted sentence is hard to read.
            className="pointer-events-none z-[80] block w-max rounded-md bg-slate-800 px-2 py-1 text-[11px] font-medium normal-case leading-snug tracking-normal text-white shadow-lg"
          >
            {text}
          </span>,
          document.body,
        )}
    </>
  );
}
