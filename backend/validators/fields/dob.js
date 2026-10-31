const minDate = new Date("1900-01-01");

function normalize(value) {
  if (typeof value === "string") {
    value = new Date(value);
  }
  return value;
}

function validate(value) {
  if (Object.prototype.toString.call(value) !== "[object Date]" || isNaN(value.getTime()))
    return "Must be a Date";
  if (value < minDate)
    return `Date cannot be before ${minDate.toLocaleDateString()}`;
  if (value > new Date())
    return "Date cannot be in the future";
  return null;
}

module.exports = { normalize, validate };