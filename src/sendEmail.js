import nodemailer from "nodemailer";

const createEmailError = (message) => {
  const error = new Error(message);
  error.code = "EMAIL_SERVICE_ERROR";
  error.statusCode = 503;
  return error;
};

export const sendEmail = async (to, subject, text) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw createEmailError("Email service is not configured");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    await transporter.sendMail({
      from: `"CreatorConnect" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text
    });
  } catch (error) {
    console.error("Email send failed:", error.message);
    throw createEmailError("Failed to send OTP email");
  }
};
