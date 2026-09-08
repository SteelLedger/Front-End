// Password rules, shared by the two places a password gets set: Settings
// (change password, signed in) and the reset step of the forgot-password flow.
//
// They mirror what the API enforces rather than adding house rules of their
// own — 8 characters minimum (the OpenAPI `minLength`), and, when changing a
// known current password, it has to actually change. The confirm field is
// purely a client-side typo guard; the API never sees it.

export const MIN_PASSWORD_LENGTH = 8;

/**
 * The live checklist shown under the fields. Pass `currentPassword` only when
 * there is one to compare against — the reset flow doesn't have it, so that
 * rule is left out rather than shown permanently unticked.
 */
export function passwordRules({
  newPassword = "",
  confirmPassword = "",
  currentPassword = null,
}) {
  const rules = [
    {
      key: "length",
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      met: newPassword.length >= MIN_PASSWORD_LENGTH,
    },
  ];

  if (currentPassword !== null) {
    rules.push({
      key: "different",
      label: "Different from your current password",
      met: !!newPassword && newPassword !== currentPassword,
    });
  }

  rules.push({
    key: "match",
    label: "Both new password fields match",
    met: !!confirmPassword && newPassword === confirmPassword,
  });

  return rules;
}

/**
 * First problem with the entered password, as `{ field, message }` — or null
 * when it's ready to send. Ordered so the user fixes one thing at a time.
 */
export function validateNewPassword({
  newPassword = "",
  confirmPassword = "",
  currentPassword = null,
}) {
  if (!newPassword) {
    return { field: "newPassword", message: "Enter a new password." };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      field: "newPassword",
      message: `Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (currentPassword !== null && newPassword === currentPassword) {
    return {
      field: "newPassword",
      message: "Your new password has to be different from the current one.",
    };
  }
  if (newPassword !== confirmPassword) {
    return {
      field: "confirmPassword",
      message: "The two new passwords don't match.",
    };
  }
  return null;
}
