const phone = require("../fields/phone");
const url = require("../fields/url");
const streetAddress = require("../fields/streetAddress");
const city = require("../fields/city");
const state = require("../fields/state");
const country = require("../fields/country");
const pincode = require("../fields/pincode");
const location_x = require("../fields/location_x");
const location_y = require("../fields/location_y");
const clinicName = require("../fields/clinicName");
const positiveInteger = require("../fields/positiveInteger");
const booleanField = require("../fields/booleanField");
const password = require("../fields/password");
const licenseNo = require("../fields/licenseNo");
const username = require("../fields/username");

module.exports = {
  username: { required: true, ...username },
  phone: { required: true, ...phone },
  license_no: { required: true, ...licenseNo },
  pfp_link: { required: false, ...url },
  banner_link: { required: false, ...url },
  street_address: { required: true, ...streetAddress },
  city: { required: true, ...city },
  state: { required: false, ...state },
  pincode: { required: false, ...pincode },
  location_x: { required: false, ...location_x },
  location_y: { required: false, ...location_y },
  clinic_name: { required: false, ...clinicName },

  verified: { required: false, ...booleanField },
  country: { required: false, ...country },
  password: { required: false, ...password },
};
