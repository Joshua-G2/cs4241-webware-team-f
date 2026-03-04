import express from "express";
import { getDb } from "../config/db.js";
import { authenticateToken } from "../middleware/auth.js";
import { COLLECTIONS_DASH } from "../constants/collections.js";

const router = express.Router();

/** GET /api/lookups/years - all years (protected) */
router.get("/years", authenticateToken, async (req, res) => {
    try {
        const db = getDb();
        const years = await db
            .collection(COLLECTIONS_DASH.SCHOOL_YEAR)
            .find({}, { projection: { _id: 0, ID: 1, SCHOOL_YEAR: 1 } })
            .sort({ SCHOOL_YEAR: 1 })
            .toArray();
        res.json(years.filter((y) => y?.ID != null && y?.SCHOOL_YEAR != null));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/** GET /api/lookups/schools?q=pa&limit=50 (protected) */
router.get("/schools", authenticateToken, async (req, res) => {
    try {
        const db = getDb();
        const q = String(req.query.q ?? "").trim().toLowerCase();
        const limit = Math.max(0, Number(req.query.limit ?? 50));

        let schools = await db
            .collection(COLLECTIONS_DASH.SCHOOL)
            .find({}, { projection: { _id: 0, ID: 1, NAME_TX: 1, REGION_CD: 1, GROUP_CD: 1 } })
            .toArray();

        if (q) {
            schools = schools.filter((s) =>
                String(s?.NAME_TX ?? "").toLowerCase().includes(q)
            );
        }

        const byId = new Map();
        for (const s of schools) {
            if (s?.ID != null && !byId.has(s.ID)) byId.set(s.ID, s);
        }
        schools = Array.from(byId.values());

        schools.sort((a, b) => String(a?.NAME_TX ?? "").localeCompare(String(b?.NAME_TX ?? "")));
        if (limit > 0) schools = schools.slice(0, limit);

        res.json(
            schools.map((s) => ({
                schoolId: s.ID,
                name: s.NAME_TX || `School ${s.ID}`,
                region: s.REGION_CD ?? null,
                group: s.GROUP_CD ?? null,
            }))
        );
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/** GET /api/lookups/schools-with-attrition?yearId=33&limit=50&soc=0 (protected) */
router.get("/schools-with-attrition", authenticateToken, async (req, res) => {
    try {
        const db = getDb();
        const yearId = Number(req.query.yearId);
        const limit = Math.max(0, Number(req.query.limit ?? 50));
        const soc = String(req.query.soc ?? "0") === "1";

        if (!Number.isFinite(yearId)) {
            return res.status(400).json({ error: "yearId is required, ex: ?yearId=33" });
        }

        const attrCol = db.collection(
            soc ? COLLECTIONS_DASH.ENROLL_ATTRITION_SOC : COLLECTIONS_DASH.ENROLL_ATTRITION
        );

        const rows = await attrCol
            .aggregate([
                { $match: { SCHOOL_YR_ID: yearId } },
                { $group: { _id: "$SCHOOL_ID", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 500 },
            ])
            .toArray();

        const top = rows.slice(0, limit);
        const ids = top.map((r) => r._id);

        const schoolDocs = await db
            .collection(COLLECTIONS_DASH.SCHOOL)
            .find({ ID: { $in: ids } }, { projection: { _id: 0, ID: 1, NAME_TX: 1 } })
            .toArray();

        const nameById = new Map(schoolDocs.map((s) => [s.ID, s.NAME_TX]));

        res.json(
            top.map((r) => ({
                schoolId: r._id,
                name: nameById.get(r._id) || `School ${r._id}`,
                rows: r.count,
            }))
        );
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/** GET /api/lookups/years-with-data?schoolId=13&soc=0 (protected) */
router.get("/years-with-data", authenticateToken, async (req, res) => {
    try {
        const db = getDb();
        const schoolId = Number(req.query.schoolId);
        const soc = String(req.query.soc ?? "0") === "1";

        if (!Number.isFinite(schoolId)) {
            return res.status(400).json({ error: "schoolId is required" });
        }

        const attrCol = db.collection(
            soc ? COLLECTIONS_DASH.ENROLL_ATTRITION_SOC : COLLECTIONS_DASH.ENROLL_ATTRITION
        );

        const yearIdRows = await attrCol
            .aggregate([
                { $match: { SCHOOL_ID: schoolId } },
                { $group: { _id: "$SCHOOL_YR_ID" } },
            ])
            .toArray();

        const yearIds = yearIdRows.map((r) => r._id).filter((v) => v != null);

        const years = await db
            .collection(COLLECTIONS_DASH.SCHOOL_YEAR)
            .find({ ID: { $in: yearIds } }, { projection: { _id: 0, ID: 1, SCHOOL_YEAR: 1 } })
            .sort({ SCHOOL_YEAR: 1 })
            .toArray();

        return res.json(years);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

export default router;
