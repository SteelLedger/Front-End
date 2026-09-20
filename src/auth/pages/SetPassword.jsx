import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AuthShell, { AuthError, AuthButton } from "../components/AuthShell";
import { PasswordField, Rule } from "../components/PasswordFields";
import { passwordRules, validateNewPassword } from "../../utils/password";
import { changePassword } from "../../services/apiServices";
import { clearSession, markPasswordReset } from "../../utils/auth";

/**
 * SetPassword
 * The first-login gate. An invited member signs in with the temporary password
 * the backend emailed them, which comes back as `isPasswordReset: false` on the
 * login payload; ProtectedRoute then parks them here until they pick their own.
 *
 * It is a full screen rather than a modal on purpose: there is no app shell to
 * wander off into and nothing to dismiss, which is the whole point of a forced
 * step. The only ways out are setting a password or signing out.
 *
 * It posts to the ordinary PUT /auth/change-password, which needs the current
 * password — hence the temporary-password field. Asking for it again rather
 * than carrying it over from the login form keeps the password out of history
 * state and localStorage, and means a page reload here still works.
 */
export default function SetPassword() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const currentRef = useRef(null);

  useEffect(() => {
    const id = setTimeout(() => currentRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, []);

  const rules = passwordRules({
    newPassword,
    confirmPassword,
    currentPassword,
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!currentPassword) {
      setError("Enter the temporary password you signed in with.");
      currentRef.current?.focus();
      return;
    }
    const problem = validateNewPassword({
      newPassword,
      confirmPassword,
      currentPassword,
    });
    if (problem) {
      setError(problem.message);
      return;
    }

    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      // Flip the stored flag before navigating, or ProtectedRoute's gate
      // bounces us straight back here.
      markPasswordReset();
      toast.success("Password set. Welcome aboard!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Couldn't set your password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  // Nobody should be stuck on this screen; signing out is the way back.
  function handleSignOut() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <AuthShell>
      <h1 className="mb-1.5 text-[28px] font-bold tracking-tight text-[#0A1628]">
        Set your password
      </h1>
      <p className="mb-10 text-[15px] leading-relaxed text-slate-500">
        You're signed in with a temporary password. Choose one of your own to
        finish setting up your account.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <AuthError message={error} />

        <PasswordField
          label="Temporary password"
          id="current-password"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
          inputRef={currentRef}
        />
        <PasswordField
          label="New password"
          id="new-password"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm new password"
          id="confirm-password"
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
          Set password and continue
        </AuthButton>
      </form>

      <p className="mt-7 text-center text-[13px] text-slate-500">
        Not your account?{" "}
        <button
          type="button"
          onClick={handleSignOut}
          className="-my-1.5 inline-block py-1.5 align-baseline font-semibold text-[#2563C4] no-underline hover:underline"
        >
          Sign out
        </button>
      </p>
    </AuthShell>
  );
}
