import { registerUser, loginUser } from "../services/authServices.js";
import generateToken from "../utils/generateToken.js";
import { saveOtp } from "../services/otpServices.js";
import { sendEmail } from "../sendEmail.js";
import { verifyOtpService } from "../services/otpServices.js";
import { generateOtp } from "../services/otpServices.js";
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
    console.log("login request recieved",req.body);

    const ip = req.ip;
    // console.log("ïp address",ip);
    const key = `login_attempts:${ip}`;
    // console.log("key",key);
    // console.log("public client",pubClient)
    // console.log("redis status", pubClient.isOpen);
    if (pubClient.isOpen) {
      const attempts = await pubClient.incr(key);
      if (attempts === 1) {
        await pubClient.expire(key, 300);
      }
    }

    // if (attempts === 1) {
    // await pubClient.expire(key, 300);
    // console.log("Getting attempts issue") // 1 minute window
    // }
  //   if (attempts > 5) {
  //     console.log("to many attempts")
  //   return res.status(429).json({
  //           message: "Too many login attempts. Try again later."
  //   });
  //  }
    const { user, token } = await loginUser(req.body);
    //  console.log("user and token",user,token)
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

    const otp =  generateOtp();
    console.log("otp",otp);
    await saveOtp(email, otp);
    console.log()
       await sendEmail(
      email, // 👈 THIS IS THE RECEIVER
      "Your OTP Code",
      `Your OTP is ${otp}. It expires in 5 minutes.`
    );


    res.json({ message: "OTP sent successfully" });

  } catch (error) {
    res.status(400).json({ message: error.message });
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
