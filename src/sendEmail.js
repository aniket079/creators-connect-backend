import { Resend } from "resend";

const createEmailError = (message) => {
  const error = new Error(message);
  error.code = "EMAIL_SERVICE_ERROR";
  error.statusCode = 503;
  return error;
};

export const sendEmail = async (to, subject, text) => {
  if (!process.env.RESEND_API_KEY) {
    throw createEmailError("Email service is not configured");
  }

  const from = process.env.RESEND_FROM_EMAIL || "CreatorConnect <onboarding@resend.dev>";
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      text
    });

    if (error) {
      console.error("Email send failed:", error.message);
      throw createEmailError("Failed to send OTP email");
    }
  } catch (error) {
    console.error("Email send failed:", error.message);
    if (error.code === "EMAIL_SERVICE_ERROR") {
      throw error;
    }
    throw createEmailError("Failed to send OTP email");
  }
};
