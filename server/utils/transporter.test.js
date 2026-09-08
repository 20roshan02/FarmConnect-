const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeSmtpCredential } = require('./transporter');

test('normalizes Gmail app passwords that contain spaces', () => {
  assert.equal(normalizeSmtpCredential('thpo osax tzzu wqkj'), 'thpoosaxtzzuwqkj');
});

test('keeps already normalized credentials unchanged', () => {
  assert.equal(normalizeSmtpCredential('thpoosaxtzzuwqkj'), 'thpoosaxtzzuwqkj');
});
