import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS via STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },

  // 🔑 TIMEOUTS → 60 seconds
  connectionTimeout: 60 * 1000, // 60000 ms
  greetingTimeout: 60 * 1000,
  socketTimeout: 60 * 1000,
});
