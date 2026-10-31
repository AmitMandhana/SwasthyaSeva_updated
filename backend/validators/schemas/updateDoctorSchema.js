const name = require("../fields/name");
const phone = require("../fields/phone");
const url = require("../fields/url");
const code = require("../fields/code");
const bio = require("../fields/bio");
const licenseNo = require("../fields/licenseNo");
const booleanField = require("../fields/booleanField");
const password = require("../fields/password");
const prescriptionFormat = require("../fields/prescriptionFormat");

module.exports = {
  first_name: { required: false, ...name },
  last_name: { required: false, ...name },
  phone: { required: false, ...phone },
  pfp_link: { required: false, ...url },
  postgrad_specialization_code: { required: false, ...code },
  super_specialization_code: { required: false, ...code },
  tag_1: { required: false, ...code },
  tag_2: { required: false, ...code },
  tag_3: { required: false, ...code },
  bio: { required: false, ...bio },
  license_no: { required: false, ...licenseNo },
  verified_doctor: { required: false, ...booleanField },
  banner_link: { required: false, ...url },
  signature_link: { required: false, ...url },
  password: { required: false, ...password },
  prescription_format: { required: false, ...prescriptionFormat },
};
