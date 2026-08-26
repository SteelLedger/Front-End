import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AuthShell, { AuthError, AuthButton } from "../components/AuthShell";
import OtpInput from "../components/OtpInput";
import { AUTH_INPUT_CLASS, AUTH_LINK_CLASS } from "../../utils/authStyles";
import { passwordRules, validateNewPassword } from "../../utils/password";
import { isValidEmail } from "../../utils/members";
import {
  forgotPassword,
  verifyOtp,
  resetPassword,
} from "../../services/apiServices";

const OTP_LENGTH = 6;
// How long before "Resend code" wakes up again.
const RESEND_COOLDOWN_MS = 30_000;
// How long the success screen sits before it hands over to the login page.
const REDIRECT_DELAY_MS = 2500;

const STEP_COPY = {
  email: {
    title: "Forgot password?",
    body: "Enter the email you sign in with and we'll send you a 6-digit code.",
  },
  otp: {
    title: "Check your email",
    body: "We sent a 6-digit code to",
  },
  reset: {
    title: "Set a new password",
    body: "Almost there — choose a password you don't use anywhere else.",
  },
  done: {
    title: "Password reset",
    body: "You can now sign in with your new password.",
  },
};

/** ms -> "9:05". Never renders below zero. */
function countdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/* -------------------------------- pieces ---------------------------------- */

function Field({ label, htmlFor, children }) {
  return (
    <div className="mb-5">
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[13px] font-semibold text-[#0D2140]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function PasswordField({ label, id, value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          placeholder="••••••••"
          onChange={(e) => onChange(e.target.value)}
          className={AUTH_INPUT_CLASS}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z"
              stroke="#9CA3AF"
              strokeWidth="1.3"
            />
            <circle cx="8" cy="8" r="1.8" stroke="#9CA3AF" strokeWidth="1.3" />
            {visible && (
              <path
                d="M3 3l10 10"
                stroke="#9CA3AF"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>
    </Field>
  );
}

function Rule({ met, children }) {
  return (
    <li
      className={`flex items-center gap-2 text-xs ${
        met ? "text-emerald-600" : "text-slate-400"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
          met ? "bg-emerald-100" : "bg-slate-100"
        }`}
      >
        {met && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6.5l2.5 2.5 4.5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      {children}
    </li>
  );
}

/* ---------------------------------- page ---------------------------------- */

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  // Deadlines for the two timers on the OTP step.
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const emailRef = useRef(null);

  // One ticker drives both countdowns; it only runs while they're on screen.
  useEffect(() => {
    if (step !== "otp") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step]);

  // Hand over to the login page once the success screen has been read.
  useEffect(() => {
    if (step !== "done") return;
    const id = setTimeout(
      () => navigate("/login", { replace: true }),
      REDIRECT_DELAY_MS,
    );
    return () => clearTimeout(id);
  }, [step, navigate]);

  const otpExpired = step === "otp" && otpExpiresAt > 0 && now >= otpExpiresAt;
  const canResend = !resending && now >= resendAt;
  const copy = STEP_COPY[step];

  const apiMessage = (err, fallback) =>
    err?.response?.data?.message || fallback;

  /** Start (or restart) the OTP clock from what the API reports. */
  function startOtpTimers(data) {
    const minutes = Number(data?.expiresInMinutes) || 10;
    setOtpExpiresAt(Date.now() + minutes * 60_000);
    setResendAt(Date.now() + RESEND_COOLDOWN_MS);
    setNow(Date.now());
  }

  /* ------------------------------- handlers ------------------------------- */

  async function handleSendCode(e) {
    e.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!trimmed) return setError("Enter your email address.");
    if (!isValidEmail(trimmed))
      return setError("Enter a valid email address.");

    setLoading(true);
    try {
      const res = await forgotPassword({ email: trimmed });
      setEmail(trimmed);
      startOtpTimers(res?.data?.data);
      setOtp("");
      setStep("otp");
    } catch (err) {
      setError(
        apiMessage(
          err,
          err?.response?.status === 404
            ? "No account uses that email address."
            : "Couldn't send the code. Try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!canResend) return;
    setError("");
    setResending(true);
    try {
      const res = await forgotPassword({ email });
      startOtpTimers(res?.data?.data);
      setOtp("");
      toast.success("A new code is on its way");
    } catch (err) {
      setError(apiMessage(err, "Couldn't resend the code. Try again."));
    } finally {
      setResending(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError("");

    if (otp.length < OTP_LENGTH)
      return setError(`Enter all ${OTP_LENGTH} digits of the code.`);
    if (otpExpired)
      return setError("That code has expired. Send yourself a new one.");

    setLoading(true);
    try {
      const res = await verifyOtp({ email, otp });
      const token = res?.data?.data?.resetToken;
      if (!token) throw new Error("No reset token in response.");
      setResetToken(token);
      setStep("reset");
    } catch (err) {
      // 400 covers wrong, expired, and too many attempts — the API's wording
      // says which, and the difference matters here.
      setError(apiMessage(err, "That code isn't right. Check it and retry."));
      setOtp("");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError("");

    const problem = validateNewPassword({ newPassword, confirmPassword });
    if (problem) return setError(problem.message);

    setLoading(true);
    try {
      await resetPassword({ email, resetToken, newPassword });
      setStep("done");
    } catch (err) {
      setError(
        apiMessage(
          err,
          "Couldn't reset your password. The link may have expired.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  /** Back to square one — used when the reset token has gone stale. */
  function startOver() {
    setStep("email");
    setOtp("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    requestAnimationFrame(() => emailRef.current?.focus());
  }

  /* -------------------------------- render -------------------------------- */

  const rules = passwordRules({ newPassword, confirmPassword });

  return (
    <AuthShell>
      <h1 className="mb-1.5 text-[28px] font-bold tracking-tight text-[#0A1628]">
        {copy.title}
      </h1>
      <p className="mb-10 text-[15px] leading-relaxed text-slate-500">
        {copy.body}
        {step === "otp" && (
          <>
            {" "}
            <span className="font-semibold text-[#0D2140]">{email}</span>. It
            expires in{" "}
            <span className="font-semibold text-[#0D2140]">
              {countdown(otpExpiresAt - now)}
            </span>
            .
          </>
        )}
      </p>

      <AuthError message={error} />

      {/* ── Step 1: email ── */}
      {step === "email" && (
        <form onSubmit={handleSendCode} noValidate>
          <Field label="Email address" htmlFor="reset-email">
            <div className="relative">
              <input
                id="reset-email"
                ref={emailRef}
                type="email"
                autoFocus
                placeholder="you@company.com"
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                className={AUTH_INPUT_CLASS}
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect
                    x="1.5"
                    y="3.5"
                    width="13"
                    height="9"
                    rx="1.5"
                    stroke="#9CA3AF"
                    strokeWidth="1.3"
                  />
                  <path
                    d="M1.5 5.5l6.5 4 6.5-4"
                    stroke="#9CA3AF"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </div>
          </Field>

          <AuthButton loading={loading} loadingLabel="Sending…">
            Send code
          </AuthButton>
        </form>
      )}

      {/* ── Step 2: OTP ── */}
      {step === "otp" && (
        <form onSubmit={handleVerifyOtp} noValidate>
          <div className="mb-5">
            <span className="mb-1.5 block text-[13px] font-semibold text-[#0D2140]">
              6-digit code
            </span>
            <OtpInput
              autoFocus
              value={otp}
              onChange={setOtp}
              length={OTP_LENGTH}
              invalid={!!error || otpExpired}
              disabled={loading}
            />
          </div>

          <AuthButton loading={loading} loadingLabel="Verifying…">
            Verify code
          </AuthButton>

          <div className="mt-5 flex items-center justify-between gap-3 text-[13px]">
            <button
              type="button"
              onClick={startOver}
              className="font-medium text-slate-500 hover:text-slate-700"
            >
              Use a different email
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={!canResend}
              className={
                canResend
                  ? AUTH_LINK_CLASS
                  : "cursor-not-allowed text-[13px] font-medium text-slate-400"
              }
            >
              {resending
                ? "Sending…"
                : canResend
                  ? "Resend code"
                  : `Resend in ${countdown(resendAt - now)}`}
            </button>
          </div>
        </form>
      )}

      {/* ── Step 3: new password ── */}
      {step === "reset" && (
        <form onSubmit={handleResetPassword} noValidate>
          <PasswordField
            id="new-password"
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
          />
          <PasswordField
            id="confirm-password"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />

          <ul className="mb-6 space-y-1.5 rounded-lg bg-slate-50 px-3 py-2.5">
            {rules.map((r) => (
              <Rule key={r.key} met={r.met}>
                {r.label}
              </Rule>
            ))}
          </ul>

          <AuthButton loading={loading} loadingLabel="Saving…">
            Reset password
          </AuthButton>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={startOver}
              className="text-[13px] font-medium text-slate-500 hover:text-slate-700"
            >
              Start over
            </button>
          </div>
        </form>
      )}

      {/* ── Done ── */}
      {step === "done" && (
        <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-5 text-center">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <p className="text-sm font-semibold text-emerald-800">
            All set — taking you to sign in…
          </p>
        </div>
      )}

      {step !== "done" && (
        <p className="mt-7 text-center text-[13px] text-slate-500">
          Remembered it?{" "}
          <Link to="/login" className="font-semibold text-[#2563C4] no-underline">
            Back to sign in
          </Link>
        </p>
      )}
    </AuthShell>
  );
}
