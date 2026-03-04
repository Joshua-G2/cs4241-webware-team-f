import { MongoClient, ServerApiVersion } from "mongodb";
import { loadEnvFile } from "node:process";

loadEnvFile(".env");
const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let db;

export async function connectDB() {
    try {
        await client.connect();
        db = client.db("Webwware"); // Centralized reference to your DB name
        console.log("Connected to MongoDB: Webwware");
    } catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    }
}

export const getDb = () => {
    if (!db) throw new Error("Database not initialized. Call connectDB first.");
    return db;
};