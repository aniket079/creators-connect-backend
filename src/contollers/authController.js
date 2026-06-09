import { registerUser, loginUser } from "../services/authServices.js";
import { saveOtp, verifyOtpService, generateOtp } from "../services/otpServices.js";
import { sendEmail } from "../sendEmail.js";
import { pubClient } from "../config/redis.js";

const isProduction = process.env.NODE_ENV === "production";

const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
});

export const signup = async (req, res) => {
  try {
    const { user, token } = await registerUser(req.body);

    res.cookie("token", token, getAuthCookieOptions());

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const ip = req.ip;
    const key = `login_attempts:${ip}`;

    if (pubClient.isOpen) {
      const attempts = await pubClient.incr(key);
      if (attempts === 1) {
        await pubClient.expire(key, 300);
      }
    }

    const { user, token } = await loginUser(req.body);

    res.cookie("token", token, getAuthCookieOptions());

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      token: user.tokens
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const logout = (req, res) => {
  res.cookie("token", "", {
    ...getAuthCookieOptions(),
    maxAge: 0,
    expires: new Date(0)
  });

  res.json({ message: "Logged out" });
};

export const sendOtpController = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const otp = generateOtp();
    if (!isProduction) {
      console.log("otp", otp);
    }

    await saveOtp(email, otp);

    await sendEmail(
      email,
      "Your OTP Code",
      `Your OTP is ${otp}. It expires in 5 minutes.`
    );

    res.json({ message: "OTP sent successfully" });

  } catch (error) {
    const statusCode = error.message === "Email service is not configured" ? 503 : 400;
    res.status(statusCode).json({ message: error.message });
  }
};

export const verifyOtpController = async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;

    await verifyOtpService(email, otp);

    const { user, token } = await registerUser({
      name,
      email,
      password
    });

    res.cookie("token", token, getAuthCookieOptions());

    res.status(201).json(user);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
