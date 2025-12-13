import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = new Set(["/", "/login", "/signup"]);

async function verifyToken(token) {
    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");
        const { payload } = await jwtVerify(token, secret);
        return payload;
    } catch {
        return null;
    }
}

export async function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.cookies.get("token")?.value;

    // Redirect logged-in users away from auth pages
    if (pathname === "/login" || pathname === "/signup") {
        if (token) {
            const valid = await verifyToken(token);
            if (valid) {
                const chatUrl = new URL("/chat", req.url);
                return NextResponse.redirect(chatUrl);
            }
        }
        return NextResponse.next();
    }

    // Allow static assets and home page
    if (
        pathname === "/" ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/public") ||
        pathname.startsWith("/favicon") ||
        pathname.startsWith("/api/auth/")
    ) {
        return NextResponse.next();
    }

    // Protect chat page and chat API
    if (pathname.startsWith("/chat") || pathname.startsWith("/api/chat")) {
        if (!token) {
            const loginUrl = new URL("/login", req.url);
            return NextResponse.redirect(loginUrl);
        }
        const valid = await verifyToken(token);
        if (!valid) {
            const loginUrl = new URL("/login", req.url);
            return NextResponse.redirect(loginUrl);
        }
        return NextResponse.next();
    }

    // Default allow
    return NextResponse.next();
}

export const config = {
    matcher: ["/(.*)"],
};
