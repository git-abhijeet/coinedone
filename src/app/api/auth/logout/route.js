import { NextResponse } from "next/server";

export async function POST() {
    console.log("[Logout] POST /api/auth/logout - clearing auth cookie");

    const res = NextResponse.json(
        { success: true, message: "Logged out successfully" },
        { status: 200 }
    );

    // Clear the auth cookie
    res.cookies.set("token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0, // Expire immediately
    });

    console.log("[Logout] Cookie cleared");
    return res;
}
