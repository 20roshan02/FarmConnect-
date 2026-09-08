require('dotenv').config();
const { transporter } = require('./transporter');

(async () => {
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: 'connectfarm98@gmail.com',
      subject: 'SMTP test',
      text: 'Hello from Nodemailer',
    });
    console.log('SUCCESS', info.messageId, info.response);
  } catch (err) {
    console.error('ERROR', err.message);
    if (err.response) console.error(err.response);
    if (err.code) console.error('CODE', err.code);
    if (err.stack) console.error(err.stack);
  }
})();
