import express from "express";
import ViteExpress from "vite-express";
import dotenv from "dotenv";
import cors from "cors";
import {loadEnvFile} from "node:process";
import { MongoClient, ServerApiVersion } from "mongodb";
import jwt from "jsonwebtoken"

loadEnvFile(".env");
const app = express();
const port = process.env.PORT || 3000;
const uri = process.env.MONGO_URI
const SECRET_KEY = process.env.SECRET_KEY;

// console.log("uri:",uri)
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
let db;

async function connectDB() {
    try {
        await client.connect();
        db = client.db("Webwware");  //YES THE CONTAINER IS ACTUALLY CALLED Webwware that's my fault and mongo won't let me rename without dropping all the data
        await client.db("admin").command({ ping: 1 })// send ping
        console.log("Pinged deployment. Successfully connected to MongoDB!");
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


app.use(express.json()); //use json
app.use(cors()); // Enable CORS for all routes

//---------------JWT AUTH with token validation-----------------
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).send('Unauthorized');
    }
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; //add user for next step to use
        //we have verified token!
        console.log("verified decoded token:", decoded);
        next(); // move to next handler
    } catch (err) {
        res.status(403).send('Invalid token');
    }
};

//------------------ROUTES-------------------------
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send("Username and password required");
    }
    //verify login from database of users
    try {
        console.log("log in attempt with:", username, password);
        //does login info match?
        const results = await db.collection("Logins").find({"username": username, "password": password}).toArray();
        if (results.length > 0) { //found valid username/password combo?
            //give token
            const isAdmin = results[0].isAdmin;
            const payload = {username, isAdmin};
            const token = jwt.sign(payload, SECRET_KEY, {
                expiresIn: '1h'
            });
            console.log("Granting Token...", token)
            res.json({ token: token, isAdmin });
        }
        else {
            res.status(400).send("Invalid Login");
        }
    }
    catch(err) {
        res.status(400).send("Database Error");
    }
})

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
    try {
        const data = await db.collection("Admission_Activity").aggregate([
            {
                $group: {
                    _id: "$SCHOOL_ID",
                    count: {$sum: 1}
                }
            },
            {$sort: {_id: 1}}
        ]).toArray();

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.get("/api/chart/school-year-count", async (req, res) => {
    try {
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
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.get("/api/chart/first-10-rows", async (req, res) => {
    try {
        const data = await db
            .collection("Admission_Activity")
            .find({})
            .limit(10)
            .toArray();

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }

});

async function startServer() {
    await connectDB();
    ViteExpress.listen(app, port, () => {
        console.log("Server is listening on port", port);
        console.log(`Client url: http://localhost:${port}`);    });
}
const server = startServer();