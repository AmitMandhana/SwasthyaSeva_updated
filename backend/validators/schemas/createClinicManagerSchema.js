const positiveInteger = require("../fields/positiveInteger");
const name = require("../fields/name");
const username = require("../fields/username");
const phone = require("../fields/phone");
const url = require("../fields/url");
const password = require("../fields/password");

module.exports = {
  clinic_id: { required: true, ...positiveInteger },
  name: { required: true, ...name },
  username: { required: true, ...username },
  phone: { required: true, ...phone },
  pfp_link: { required: false, ...url },
  password: { required: false, ...password },
};
