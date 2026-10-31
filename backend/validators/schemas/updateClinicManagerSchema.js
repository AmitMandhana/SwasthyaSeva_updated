const name = require("../fields/name");
const phone = require("../fields/phone");
const url = require("../fields/url");
const password = require("../fields/password");

module.exports = {
  name: { required: false, ...name },
  phone: { required: false, ...phone },
  pfp_link: { required: false, ...url },
  password: { required: false, ...password },
};
