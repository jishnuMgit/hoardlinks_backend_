import { transporter } from "../config/mailer.js";

export const sendOtpMail = async (email: string, otp: string) => {
  await transporter.sendMail({
    from: `"Secure App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Password Reset OTP",
    html: `
      <h2>Password Reset</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP expires in 5 minutes.</p>
    `
  });
};
