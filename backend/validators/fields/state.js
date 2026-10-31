// Full state name list (canonical form)
const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Lakshadweep", "Puducherry"
];

// Abbreviation → full name reverse lookup
const ABBR_TO_FULL = {
  ap: "Andhra Pradesh", ar: "Arunachal Pradesh", as: "Assam", br: "Bihar",
  cg: "Chhattisgarh", ga: "Goa", gj: "Gujarat", hr: "Haryana",
  hp: "Himachal Pradesh", jh: "Jharkhand", ka: "Karnataka", kl: "Kerala",
  mp: "Madhya Pradesh", mh: "Maharashtra", mn: "Manipur", ml: "Meghalaya",
  mz: "Mizoram", nl: "Nagaland", od: "Odisha", pb: "Punjab",
  rj: "Rajasthan", sk: "Sikkim", tn: "Tamil Nadu", tg: "Telangana",
  tr: "Tripura", up: "Uttar Pradesh", ut: "Uttarakhand", wb: "West Bengal",
  dl: "Delhi", jk: "Jammu and Kashmir", la: "Ladakh",
  an: "Andaman and Nicobar Islands", ch: "Chandigarh",
  dn: "Dadra and Nagar Haveli and Daman and Diu",
  ld: "Lakshadweep", py: "Puducherry"
};

// Lower-case full name → canonical full name
const NAME_TO_FULL = {};
for (const s of STATES) {
  NAME_TO_FULL[s.toLowerCase()] = s;
}
// Also handle "orissa" as alias for Odisha
NAME_TO_FULL["orissa"] = "Odisha";

function normalize(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  // Check abbreviation first
  if (ABBR_TO_FULL[lower]) return ABBR_TO_FULL[lower];
  // Check full name (case-insensitive)
  if (NAME_TO_FULL[lower]) return NAME_TO_FULL[lower];
  // Return as-is (validate will catch invalid)
  return trimmed;
}

function validate(value) {
  if (!STATES.includes(value)) {
    return `Must be a valid Indian state/UT name`;
  }
  return null;
}

module.exports = { normalize, validate, STATES };