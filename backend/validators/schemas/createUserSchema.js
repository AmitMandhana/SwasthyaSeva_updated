const name = require("../fields/name");
const phone = require("../fields/phone");
const email = require("../fields/email");
const dob = require("../fields/dob");
const gender = require("../fields/gender");
const street = require("../fields/streetAddress");
const city = require("../fields/city");
const state = require("../fields/state");
const country = require("../fields/country");
const location_y = require("../fields/location_y");
const location_x = require("../fields/location_x");

module.exports = {
  first_name: { required: true, ...name },
  last_name: { required: true, ...name },
  phone: { required: true, ...phone },
  email: { required: false, ...email },
  dob: { required: true, ...dob },
  gender: { required: true, ...gender },
  street_address: { required: true, ...street },
  city: { required: true, ...city },
  state: { required: true, ...state },
  country: { required: true, ...country },
  location_x: { required: true, ...location_x },
  location_y: { required: true, ...location_y },
  occupation: { required: false, normalize: (v) => typeof v === 'string' ? v.trim() : v, validate: () => null },
  attendant_name: { required: false, normalize: (v) => typeof v === 'string' ? v.trim() : v, validate: () => null },
  attendant_relationship: { required: false, normalize: (v) => typeof v === 'string' ? v.trim() : v, validate: () => null },
};

