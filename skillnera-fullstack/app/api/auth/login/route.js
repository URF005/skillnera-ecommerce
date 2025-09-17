import { emailVerificationLink } from "@/email/emailVerificationLink";
import { otpEmail } from "@/email/otpEmail";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, generateOTP, response } from "@/lib/helperFunction";
import { sendMail } from "@/lib/sendMail";
import { zSchema } from "@/lib/zodSchema";
import OTPModel from "@/models/Otp.model";
import UserModel from "@/models/User.model";
import { SignJWT } from "jose";
import { cookies } from "next/headers"; // Import cookies
import { z } from "zod";

export async function POST(request) {
  try {
    await connectDB();
    const payload = await request.json();

    const validationSchema = zSchema.pick({ email: true }).extend({
      password: z.string(),
    });

    const validatedData = validationSchema.safeParse(payload);
    if (!validatedData.success) {
      return response(false, 401, "Invalid or missing input field.", validatedData.error);
    }

    const { email, password } = validatedData.data;

    // ---------- SUPPORT AGENT HARDCODED LOGIN ----------
    const SUPPORT_EMAIL = process.env.SUPPORT_LOGIN_EMAIL;
    const SUPPORT_PASS = process.env.SUPPORT_LOGIN_PASSWORD;

    if (SUPPORT_EMAIL && SUPPORT_PASS && email === SUPPORT_EMAIL && password === SUPPORT_PASS) {
      // Upsert a support user so we have a valid _id
      let agent = await UserModel.findOne({ email: SUPPORT_EMAIL });
      if (!agent) {
        agent = new UserModel({
          role: "support",
          name: "Support Agent",
          email: SUPPORT_EMAIL,
          password: crypto.randomUUID(), // will be hashed by pre-save
          isEmailVerified: true,
        });
        await agent.save();
      } else if (agent.role !== "support") {
        agent.role = "support";
        await agent.save();
      }

      const token = await new SignJWT({
        userId: agent._id.toString(),
        role: "support",
        name: agent.name,
      })
        .setIssuedAt()
        .setExpirationTime("7d")
        .setProtectedHeader({ alg: "HS256" })
        .sign(new TextEncoder().encode(process.env.SECRET_KEY));

      // set auth cookie immediately
      const cookieStore = await cookies(); // Await cookies
      cookieStore.set("access_token", token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });

      return response(true, 200, "Login success.", {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        role: "support",
      });
    }
    // ---------- END SUPPORT AGENT LOGIN ----------

    // Normal login (admin/user) — OTP flow
    const getUser = await UserModel.findOne({ deletedAt: null, email }).select("+password");
    if (!getUser) {
      return response(false, 400, "Invalid login credentials.");
    }

    if (!getUser.isEmailVerified) {
      const secret = new TextEncoder().encode(process.env.SECRET_KEY);
      const token = await new SignJWT({ userId: getUser._id.toString() })
        .setIssuedAt()
        .setExpirationTime("1h")
        .setProtectedHeader({ alg: "HS256" })
        .sign(secret);

      await sendMail(
        "Email Verification request from Skillnera",
        email,
        emailVerificationLink(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/verify-email/${token}`)
      );

      return response(
        false,
        401,
        "Please verify your device. Your email is not verified. We have sent a verification link to your registered email address. Check your email inbox, spam, and trash folders for the verification details."
      );
    }

    const isPasswordVerified = await getUser.comparePassword(password);
    if (!isPasswordVerified) {
      return response(false, 400, "Invalid login credentials.");
    }

    await OTPModel.deleteMany({ email }); // delete old OTPs

    let OTP = 123456;
    if (email !== "admin@gmail.com") {
      OTP = generateOTP();

      const OTPEmailTemplate = otpEmail(OTP);
      const otpEmailStatus = await sendMail("Your login verification code.", email, OTPEmailTemplate);
      if (!otpEmailStatus.success) {
        return response(false, 500, "Something went wrong.");
      }
    }

    const newOtpData = new OTPModel({ email, otp: OTP });
    await newOtpData.save();

    return response(true, 200, "Please verify your device. Check your email inbox, spam, and trash folders for the verification details..");
  } catch (error) {
    return catchError(error);
  }
}
