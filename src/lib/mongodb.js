import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI environment variable");
}

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
    if (cached.conn) {
        console.log("MongoDB: using cached connection");
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };

        cached.promise = mongoose
            .connect(MONGODB_URI, opts)
            .then((mongooseInstance) => {
                const { connection } = mongooseInstance;
                const host = connection?.host || connection?.client?.s?.options?.hosts?.[0]?.host || "unknown";
                console.log(`MongoDB connected successfully → host: ${host}`);
                return mongooseInstance;
            });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}
