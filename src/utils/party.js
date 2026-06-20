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
