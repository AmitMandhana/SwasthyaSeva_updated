const username = require("../fields/username");
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
  username: { required: true, ...username },
  first_name: { required: true, ...name },
  last_name: { required: true, ...name },
  phone: { required: true, ...phone },
  base_degree_code: { required: true, ...code },
  license_no: { required: true, ...licenseNo },
  pfp_link: { required: false, ...url },
  banner_link: { required: false, ...url },
  signature_link: { required: false, ...url },
  postgrad_specialization_code: { required: false, ...code },
  super_specialization_code: { required: false, ...code },
  tag_1: { required: false, ...code },
  tag_2: { required: false, ...code },
  tag_3: { required: false, ...code },
  bio: { required: false, ...bio },
  verified_doctor: { required: false, ...booleanField },
  password: { required: false, ...password },
  prescription_format: { required: false, ...prescriptionFormat },
};
