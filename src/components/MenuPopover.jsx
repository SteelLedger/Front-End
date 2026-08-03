import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const GAP = 6;
const EDGE = 8;

/**
 * MenuPopover
 * A dropdown panel rendered into <body> and positioned against `anchorRef`.
 * Living outside the normal flow means an `overflow-x-auto` ancestor (the
 * table wrapper, say) can't clip it or grow a scrollbar around it. Flips above
 * the anchor when there isn't room below. Closes on outside click and Escape.
 *
 * The parent owns `open` and renders its own trigger.
 */
export default function MenuPopover({
  open,
  anchorRef,
  onClose,
  align = "left",
  width,
  className = "",
  children,
}) {
  const panelRef = useRef(null);
  const [style, setStyle] = useState(null);

  useLayoutEffect(() => {
    if (!open) return;

    function place() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const w = width ?? Math.max(r.width, 160);
      // Before the first paint the panel has no height — assume a typical one
      // so the flip decision is sane, then re-run once it's measurable.
      const h = panelRef.current?.offsetHeight || 240;

      let left = align === "right" ? r.right - w : r.left;
      left = Math.min(Math.max(EDGE, left), window.innerWidth - w - EDGE);

      const below = window.innerHeight - r.bottom;
      const flip = below < h + GAP + EDGE && r.top > below;

      setStyle({
        position: "fixed",
        left,
        width: w,
        ...(flip
          ? { bottom: window.innerHeight - r.top + GAP }
          : { top: r.bottom + GAP }),
        maxHeight: Math.max(140, (flip ? r.top : below) - GAP - EDGE),
      });
    }

    place();
    const raf = requestAnimationFrame(place); // re-place with a real height
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef, align, width]);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (panelRef.current?.contains(e.target)) return;
      if (anchorRef.current?.contains(e.target)) return;
      onClose();
    }
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, anchorRef, onClose]);

  if (!open || !style) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={style}
      role="menu"
      className={`z-[70] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10 ${className}`}
    >
      {children}
    </div>,
    document.body,
  );
}
