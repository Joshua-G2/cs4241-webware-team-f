import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Recreate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Point to root .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_URI);

let db;

async function connectDB() {
    try {
        await client.connect();
        db = client.db("Webwware");  //YES THE CONTAINER IS ACTUALLY CALLED Webwware that's my fault and mongo won't let me rename without dropping all the data
        console.log("Connected to MongoDB");
        // console.log("Using DB:", db.databaseName);
        // these comments are for Debugging and print Mongo Information into the webstorm terminal use if you need to see how I set up mongo or just ask me  - Ethan
        // const databases = await client.db().admin().listDatabases();
        // console.log(databases);
        // const collections = await db.listCollections().toArray();
        // console.log(collections);
    } catch (err) {
        console.error("MongoDB connection error:", err);
    }
}

connectDB();

app.get("/api/data", async (req, res) => {
    try {
        const data = await db
            .collection("Admission_Activity")
            .find({})
            .limit(50)
            .toArray();

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/chart/school-id-count", async (req, res) => {
    const data = await db.collection("Admission_Activity").aggregate([
        {
            $group: {
                _id: "$SCHOOL_ID",
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]).toArray();

    res.json(data);
});


app.get("/api/chart/school-year-count", async (req, res) => {
    const data = await db.collection("Admission_Activity").aggregate([
        {
            $group: {
                _id: "$SCHOOL_YR_ID",
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]).toArray();

    res.json(data);
});


app.get("/api/chart/first-10-rows", async (req, res) => {
    const data = await db
        .collection("Admission_Activity")
        .find({})
        .limit(10)
        .toArray();

    res.json(data);
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});