const GENDER_MAP = {
  "m" : "male",
  "f" : "female",
  "o" : "other"
};

const GENDERS = ["male", "female", "other"];

function normalize(value) {
  if (typeof value !== "string") return value;
  const key = value.trim().toLowerCase();
  return GENDER_MAP[key] || key;
}

function validate(value) {
  if (typeof value !== "string") return "Gender must be a string";
  if (!GENDERS.includes(value)) {
    return `Gender must be one of: ${GENDERS.join(", ")}`;
  }
  return null;
}

module.exports = { normalize, validate };
