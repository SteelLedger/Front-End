// Shared party-form helpers (kept out of component files so fast-refresh stays
// happy — component modules should export only components).

export function emptyAddress() {
  return {
    addressLabel: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    stateId: "",
    pincode: "",
    countryId: "",
  };
}

export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isoToDMY(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function dmyToISO(dmy) {
  if (!dmy) return "";
  const [d, m, y] = dmy.split("/");
  if (!d || !m || !y) return "";
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// Blank party form used by the Add/Edit Party drawer.
export function emptyPartyForm() {
  return {
    name: "",
    phone: "",
    email: "",
    billingName: "",
    tin: "",
    billingAddresses: [emptyAddress()],
    shippingAddresses: [emptyAddress()],
    sameAsShipping: false,
    openingBalance: "",
    asOfDate: todayISO(),
    balanceType: "to_receive",
    creditLimitType: "none",
    creditLimit: "",
  };
}

// Build the create/update payload in the backend's shape from a drawer form.
export function buildPartyPayload(formState) {
  const cleanAddress = (a) => ({
    ...(a._id ? { _id: a._id } : {}),
    addressLabel: a.addressLabel || "",
    addressLine1: a.addressLine1 || "",
    addressLine2: a.addressLine2 || "",
    city: a.city || "",
    stateId: a.stateId || "",
    pincode: a.pincode || "",
    countryId: a.countryId || "",
  });
  const isFilled = (a) =>
    a.addressLabel || a.addressLine1 || a.city || a.pincode || a.stateId;

  const billingAddresses = formState.billingAddresses
    .filter(isFilled)
    .map(cleanAddress);
  // "Same as billing" reuses the billing addresses (without their _id).
  const shippingAddresses = formState.sameAsShipping
    ? billingAddresses.map((a) => {
        const copy = { ...a };
        delete copy._id;
        return copy;
      })
    : formState.shippingAddresses.filter(isFilled).map(cleanAddress);

  return {
    name: formState.name.trim(),
    phone: formState.phone.trim(),
    email: formState.email.trim(),
    billingName: formState.billingName.trim(),
    tin: formState.tin.trim(),
    billingAddresses,
    shippingAddresses,
    openingBalance: Number(formState.openingBalance) || 0,
    asOfDate: isoToDMY(formState.asOfDate),
    balanceType: formState.balanceType,
  };
}
