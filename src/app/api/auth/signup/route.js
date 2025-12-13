import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST(request) {
    try {
        console.log("[Signup] POST /api/auth/signup - incoming request");
        const { name, email, password, confirmPassword } = await request.json();
        console.log(`[Signup] Payload received for email: ${email}`);

        // Validate input
        if (!name || !email || !password || !confirmPassword) {
            return Response.json(
                { error: "Please provide all required fields" },
                { status: 400 }
            );
        }

        if (password !== confirmPassword) {
            return Response.json(
                { error: "Passwords do not match" },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return Response.json(
                { error: "Password must be at least 8 characters" },
                { status: 400 }
            );
        }

        // Connect to database
        await connectDB();
        console.log("[Signup] Database connected");

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return Response.json(
                { error: "Email already registered" },
                { status: 409 }
            );
        }

        // Create new user
        const user = new User({
            name,
            email,
            password,
        });

        await user.save();
        console.log(`[Signup] User created: ${user._id} (${user.email})`);

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

        console.log(`[Signup] Success for ${user.email}`);
        const res = NextResponse.json(
            {
                success: true,
                message: "User created successfully",
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                },
            },
            { status: 201 }
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
        console.error("[Signup] Error:", error);
        return Response.json(
            { error: "An error occurred during signup. Please try again." },
            { status: 500 }
        );
    }
}
