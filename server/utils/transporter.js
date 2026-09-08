const nodemailer = require("nodemailer");

function normalizeSmtpCredential(value = "") {
  return value.replace(/\s+/g, "").trim();
}

const smtpUser = (process.env.MAIL_USER || "").trim();
const smtpPass = normalizeSmtpCredential(process.env.MAIL_PASS || "");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

module.exports = { transporter, normalizeSmtpCredential };