import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, text) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email service is not configured");
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

  await transporter.sendMail({
    from: `"CreatorConnect" <${process.env.EMAIL_USER}>`,
    to: to,          // 👈 Receiver email
    subject: subject,
    text: text
  });
};

// sendEmail("aniket@gmail.com","testingmail","asdfgkl");
