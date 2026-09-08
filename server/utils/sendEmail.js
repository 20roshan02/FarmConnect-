const { transporter } = require("./transporter");

async function sendVerificationEmail({ to, token, role = "customer", name = "User" }) {
  const normalizedRole = role === "farmer" ? "farmer" : "customer";
  const dashboardLabel = normalizedRole === "farmer" ? "Farmer" : "Customer";
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
  const senderEmail = process.env.MAIL_USER || "connectfarm98@gmail.com";

  const mailOptions = {
    from: `"FarmConnect" <${senderEmail}>`,
    replyTo: senderEmail,
    to,
    subject: `Verify your ${dashboardLabel} account`,
    text: `Hi ${name}, verify your ${dashboardLabel.toLowerCase()} account using this link: ${verifyUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 16px; color: #1f2937;">
        <h2 style="margin-bottom: 8px;">Welcome to FarmConnect</h2>
        <p style="margin-top: 0;">Hi ${name},</p>
        <p>Please verify your <strong>${dashboardLabel}</strong> account to activate login access.</p>
        <p style="margin: 24px 0;">
          <a href="${verifyUrl}" style="display: inline-block; background: #166534; color: #ffffff; text-decoration: none; padding: 10px 14px; border-radius: 8px;">Verify Email</a>
        </p>
        <p style="font-size: 13px; color: #6b7280;">If the button does not work, use this link:</p>
        <p style="font-size: 13px;"><a href="${verifyUrl}">${verifyUrl}</a></p>
      </div>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log("Verification email queued", {
    to,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  });
  return info;
}


module.exports = { sendVerificationEmail };
