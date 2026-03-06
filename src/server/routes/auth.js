import express from "express";
import jwt from "jsonwebtoken";
import { getDb } from "../config/db.js";

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY;

/** POST /login - issue JWT for valid username/password */
router.post("/login", async (req, res) => {
    const { username, password, school, schoolId } = req.body;
    if (!username || !password) {
        return res.status(400).send("Username and password required");
    }
    try {
        const db = getDb();
        const results = await db.collection("Logins").find({ username, password }).toArray();
        if (results.length > 0) {
            const isAdmin = results[0].isAdmin;
            const hasSchool = Boolean(school?.trim() || schoolId);
            if (!isAdmin && !hasSchool) {
                return res.status(400).json({ error: "School is required for non-admin users." });
            }
            const payload = { username, isAdmin };
            const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" });
            console.log("Granting Token...", token);
            res.json({ token, isAdmin });
        } else {
            res.status(400).send("Invalid Login");
        }
    } catch (err) {
        res.status(400).send("Database Error");
    }
});

/** GET /api/login/schools?query=... - school search for login/forms */
router.get("/api/login/schools", async (req, res) => {
    const searchTerm = req.query.query;
    if (!searchTerm) return res.json([]);
    try {
        const db = getDb();
        const data = await db.collection("School").aggregate([
            { $match: { NAME_TX: { $regex: searchTerm, $options: "i" } } },
            { $sort: { NAME_TX: 1 } },
            { $limit: 5 },
            { $project: { _id: 1, ID: 1, NAME_TX: 1 } },
        ]).toArray();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
