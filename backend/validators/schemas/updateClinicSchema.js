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

module.exports = {
  clinic_name: { required: false, ...clinicName },
  license_no: { required: false, ...licenseNo },
  phone: { required: false, ...phone },
  pfp_link: { required: false, ...url },

  verified: { required: false, ...booleanField },
  banner_link: { required: false, ...url },
  street_address: { required: false, ...streetAddress },
  city: { required: false, ...city },
  state: { required: false, ...state },
  pincode: { required: false, ...pincode },
  country: { required: false, ...country },
  location_x: { required: false, ...location_x },
  location_y: { required: false, ...location_y },
  password: { required: false, ...password },
};
