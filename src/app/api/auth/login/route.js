import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST(request) {
    try {
        console.log("[Login] POST /api/auth/login - incoming request");
        const { email, password } = await request.json();
        console.log(`[Login] Payload received for email: ${email}`);

        // Validate input
        if (!email || !password) {
            return Response.json(
                { error: "Please provide email and password" },
                { status: 400 }
            );
        }

        // Connect to database
        await connectDB();
        console.log("[Login] Database connected");

        // Find user and include password field for comparison
        const user = await User.findOne({ email }).select("+password");

        if (!user) {
            console.warn(`[Login] User not found for email: ${email}`);
            return Response.json(
                { error: "Invalid email or password" },
                { status: 401 }
            );
        }

        // Check password
        const isPasswordValid = await user.matchPassword(password);

        if (!isPasswordValid) {
            console.warn(`[Login] Invalid password for email: ${email}`);
            return Response.json(
                { error: "Invalid email or password" },
                { status: 401 }
            );
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
            },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Remove password from response
        user.password = undefined;

        console.log(`[Login] Success for ${user.email}`);
        const res = NextResponse.json(
            {
                success: true,
                message: "Login successful",
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                },
            },
            { status: 200 }
        );
        res.cookies.set("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        });
        return res;
    } catch (error) {
        console.error("[Login] Error:", error);
        return Response.json(
            { error: "An error occurred during login. Please try again." },
            { status: 500 }
        );
    }
}
