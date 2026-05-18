const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.krankit2007,
    pass: process.env.uecztwyrwjvolnuz,
  },
});

// ─── Send OTP Email ───────────────────────────────────────────
async function sendOtpEmail(toEmail, toName, otp) {
  const mailOptions = {
    from: process.env.MAIL_FROM || 'Commune <noreply@commune.app>',
    to: toEmail,
    subject: `${otp} is your Commune verification code`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background:#f5f0e8;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                <!-- Header -->
                <tr>
                  <td style="background:#0e0d0b;padding:28px 40px;">
                    <span style="font-family:Arial Black,Arial,sans-serif;font-size:28px;color:#ffffff;letter-spacing:0.04em;">
                      Com<span style="color:#e84d2b;">.</span>mune
                    </span>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:40px 40px 24px;">
                    <h2 style="margin:0 0 12px;font-size:22px;color:#0e0d0b;font-weight:700;">
                      Verify your email, ${toName.split(' ')[0]} 👋
                    </h2>
                    <p style="margin:0 0 28px;font-size:15px;color:#7a7367;line-height:1.6;">
                      Thanks for joining Commune! Use the code below to confirm your email address. It expires in <strong>10 minutes</strong>.
                    </p>

                    <!-- OTP Box -->
                    <div style="background:#f5f0e8;border-radius:6px;padding:28px;text-align:center;margin-bottom:28px;">
                      <div style="font-size:48px;font-weight:900;letter-spacing:14px;color:#0e0d0b;font-family:monospace;">
                        ${otp}
                      </div>
                      <div style="font-size:13px;color:#7a7367;margin-top:10px;">
                        Your verification code
                      </div>
                    </div>

                    <p style="margin:0;font-size:13px;color:#7a7367;line-height:1.6;">
                      If you didn't create a Commune account, you can safely ignore this email.
                      <br>Never share this code with anyone.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:20px 40px 32px;border-top:1px solid #f0e6d0;">
                    <p style="margin:0;font-size:12px;color:#a09880;">
                      © 2026 Commune Technologies · Jamshedpur, India
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `Your Commune verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't create a Commune account, ignore this email.`,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendOtpEmail };