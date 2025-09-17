import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { emailVerificationLink } from "@/email/emailVerificationLink";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import { sendMail } from "@/lib/sendMail";
import { zSchema } from "@/lib/zodSchema";
import UserModel from "@/models/User.model";
import { SignJWT } from "jose";

export async function POST(request) {
  try {
    await connectDB();

    // validation schema
    const validationSchema = zSchema.pick({
      name: true,
      email: true,
      password: true,
    });

    const payload = await request.json();
    const validatedData = validationSchema.safeParse(payload);

    if (!validatedData.success) {
      return response(false, 401, "Invalid or missing input field.", validatedData.error);
    }

    const { name, email, password } = validatedData.data;

    // check already registered user
    const checkUser = await UserModel.exists({ email });
    if (checkUser) {
      return response(true, 409, "User already registered.");
    }

    // --- MLM: read referral cookie (if present) ---
    const cookieStore = await cookies(); // Await the cookies() function
    const refCode = cookieStore.get("ref_code")?.value || null;

    let referredBy = null;
    if (refCode) {
      const referrer = await UserModel.findOne({
        referralCode: refCode,
        mlmActive: true,
      })
        .select("_id")
        .lean();
      if (referrer) {
        referredBy = referrer._id;
      }
    }

    // new registration
    const NewRegistration = new UserModel({
      name,
      email,
      password,
      ...(referredBy ? { referredBy, referredAt: new Date() } : {}),
    });

    await NewRegistration.save();

    // email verification token
    const secret = new TextEncoder().encode(process.env.SECRET_KEY);
    const token = await new SignJWT({ userId: NewRegistration._id.toString() })
      .setIssuedAt()
      .setExpirationTime("1h")
      .setProtectedHeader({ alg: "HS256" })
      .sign(secret);

    await sendMail(
      "Email Verification request from Skillnera",
      email,
      emailVerificationLink(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/verify-email/${token}`)
    );

    // success response + clear referral cookie
    const res = NextResponse.json({
      success: true,
      message: "Registration successful! Please verify your email and device. A verification link was sent to your registered email. Check your inbox, spam, and trash folders.",
    });
    res.cookies.set("ref_code", "", { path: "/", maxAge: 0 });
    return res;
  } catch (error) {
    return catchError(error);
  }
}
