import { useEffect, useRef } from "react";

/**
 * OtpInput
 * The 6 single-digit boxes for the emailed code. Typing advances, backspace
 * retreats, arrow keys move, and pasting the whole code fills every box.
 *
 * The value is a plain digit string, so clearing a box in the middle closes
 * the gap rather than leaving a hole — backspacing from the end, which is what
 * people actually do, behaves exactly as expected.
 */
export default function OtpInput({
  value = "",
  onChange,
  length = 6,
  invalid = false,
  disabled = false,
  autoFocus = false,
}) {
  const refs = useRef([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const focusAt = (i) => refs.current[Math.max(0, Math.min(i, length - 1))]?.focus();

  const digitsOnly = (raw) => raw.replace(/\D/g, "");

  function handleChange(index, raw) {
    const typed = digitsOnly(raw);
    if (!typed) return;
    const next = (
      value.slice(0, index) +
      typed +
      value.slice(index + typed.length)
    ).slice(0, length);
    onChange(next);
    focusAt(index + typed.length);
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace") {
      e.preventDefault();
      // Clear this box if it has a digit, otherwise clear the one before it.
      const target = chars[index] ? index : index - 1;
      if (target < 0) return;
      onChange(value.slice(0, target) + value.slice(target + 1));
      focusAt(target);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(index + 1);
    }
  }

  // maxLength truncates a paste to one character, so take it from the event.
  function handlePaste(index, e) {
    const pasted = digitsOnly(e.clipboardData.getData("text"));
    if (!pasted) return;
    e.preventDefault();
    const next = (value.slice(0, index) + pasted).slice(0, length);
    onChange(next);
    focusAt(next.length);
  }

  return (
    <div className="flex gap-2 sm:gap-2.5" role="group" aria-label="One-time code">
      {chars.map((char, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          value={char}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.target.select()}
          className={`h-12 w-full min-w-0 rounded-[10px] border-[1.5px] text-center text-lg font-semibold text-[#0A1628] transition focus:outline-none focus:ring-4 disabled:opacity-60 sm:h-14 sm:text-xl ${
            invalid
              ? "border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100"
              : "border-slate-200 bg-[#FAFAFA] focus:border-[#2563C4] focus:bg-white focus:ring-[#D6E4FA]"
          }`}
        />
      ))}
    </div>
  );
}
