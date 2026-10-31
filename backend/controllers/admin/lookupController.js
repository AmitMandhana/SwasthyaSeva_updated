const { getSpecializations } = require('../../queries/read/getSpecializations');
const { STATES } = require('../../validators/fields/state');
const { getTags } = require('../../queries/read/getTags');
const { getExtraQualifications } = require('../../queries/read/getExtraQualifications');

async function listSpecializationsHandler(req, res) {
  try {
    const specializations = await getSpecializations();
    return res.status(200).json({ specializations });
  } catch (err) {
    console.error('[Specializations List]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function listTagsHandler(req, res) {
  try {
    const tags = await getTags();
    return res.status(200).json({ tags });
  } catch (err) {
    console.error('[Tags List]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function listExtraQualificationsHandler(req, res) {
  try {
    const extraQualifications = await getExtraQualifications();
    return res.status(200).json({ extraQualifications });
  } catch (err) {
    console.error('[ExtraQualifications List]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

function listStatesHandler(req, res) {
  return res.status(200).json({ states: STATES.map(name => ({ value: name, label: name })) });
}

module.exports = {
  listSpecializationsHandler,
  listTagsHandler,
  listExtraQualificationsHandler,
  listStatesHandler,
};
