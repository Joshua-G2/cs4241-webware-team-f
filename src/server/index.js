import express from "express";
import ViteExpress from "vite-express";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import { MongoClient, ServerApiVersion } from "mongodb";
import jwt from "jsonwebtoken"
import { GoogleGenAI } from "@google/genai";

import { connectDB } from "./config/db.js";
import authRouter from "./routes/auth.js";
import formsRouter from "./routes/forms.js";
import chartsRouter from "./routes/charts.js";
import lookupsRouter from "./routes/lookups.js";

const app = express();
const port = process.env.PORT || 3000;
const uri = process.env.MONGO_URI
const SECRET_KEY = process.env.SECRET_KEY;
const genAI = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

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

app.get("/api/login/schools", async (req, res) => {
    const searchTerm = req.query.query;
    if (!searchTerm) { //nothing given
        return res.json([]);
    }
    try {
        console.log("db is searching for school with:", searchTerm);
        const data = await db.collection("School").aggregate([
            {
                $match: {NAME_TX: {$regex: searchTerm, $options: "i"} //contains searchTerm?
                }
            },
            {
                $sort: {NAME_TX: 1}
            },
            {
                $limit: 5
            },
            {
              $project: {_id: 1, ID:1, NAME_TX: 1},
            }
        ]).toArray();

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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

app.post("/api/enrollment", async (req, res) => {
    const formData = req.body;
    try {
        const schoolId = Number(formData.school);
        const yearId = Number(formData.year);

        const collectionName = formData.soc ? "Enroll_Attrition_Soc" : "Enroll_Attrition";
        const admissionCollection = await db.collection(collectionName);

        const enroll_attrition_data = {
            SCHOOL_ID: schoolId,
            SCHOOL_YR_ID: yearId,
            STUDENTS_ADDED_DURING_YEAR: formData.studentsAdded,
            STUDENTS_GRADUATED: formData.graduating,
            EXCH_STUD_REPTS: formData.exchangeStudents,
            STUD_DISS_WTHD: formData.dismissed,
            STUD_NOT_INV: formData.notInvited,
            STUD_NOT_RETURN: formData.notReturn,
            GRADE_DEF_ID: formData.grade
        };
        console.log(enroll_attrition_data);
        const insertAttrition = await admissionCollection.insertOne(enroll_attrition_data);

        //add to admission/enrollment table
        const admissionEnrollment = await db.collection("Admission_Activity_Enrollment");
        const admission_enrollment_data = {
            SCHOOL_ID: schoolId,
            SCHOOL_YR_ID: yearId,
            ENROLLMENT_TYPE_CD: "INQUIRIES",
            GENDER: formData.gender,
            NR_ENROLLED: formData.studentsAdded,
        };
        const insertAdmissionEnrollment = await admissionEnrollment.insertOne(admission_enrollment_data);
        console.log(admission_enrollment_data);
        res.status(201).json({ message: "Enrollment record created successfully" });

    } catch(error){
        console.log("error:", error);
        res.status(500).json({ message: "Enrollment record failed" });
    }
})

await connectDB();

app.use(express.json());
app.use(cors());

// Mount route modules (auth uses base path so /login and /api/login/schools work)
app.use(authRouter);
app.use("/api", formsRouter);
app.use("/api", chartsRouter);
app.use("/api/lookups", lookupsRouter);

async function startServer() {
    app.post("/api/admission", async (req, res) => {
        const formData = req.body;
        try {
            const schools = await db.collection("School");
            const school = await schools.findOne({NAME_TX: formData.school});
            const schoolId = school.ID;

            //check collection based on SOC flag
            const collectionName = formData.soc ? "Admission_Activity_Soc" : "Admission_Activity";
            const admissionCollection = await db.collection(collectionName);

            //map data to database columns
            //TODO SET UNUSED DB VALUES TO NULL?
            const admission_data = {
                SCHOOL_ID: schoolId,
                SCHOOL_YR_ID: Number(formData.year),
                CAPACITY_ENROLL: Number(formData.enrollmentCapacity),
                CONTRACTED_ENROLL_BOYS: Number(formData.contractedBoys),
                CONTRACTED_ENROLL_GIRLS: Number(formData.contractedGirls),
                GRADE_DEF_ID: Number(formData.grade),
                CONTRACTED_ENROLL_NB: Number(formData.contractedNB),
                COMPLETED_APPLICATION_TOTAL: Number(formData.completedApplications),
                ACCEPTANCES_TOTAL: Number(formData.acceptances),
                NEW_ENROLLMENTS_TOTAL: Number(formData.totalNewlyEnrolled),
            };

            console.log(`Inserting into ${collectionName}:`, admission_data);
            await admissionCollection.insertOne(admission_data);

            //update admission activity enrollment
            // const admissionEnrollment = await db.collection("Admission_Activity_Enrollment");
            // const admission_enrollment_data = {
            //     SCHOOL_ID: schoolId,
            //     SCHOOL_YR_ID: Number(formData.year),
            //     ENROLLMENT_TYPE_CD: "INQUIRIES",
            //     GENDER: formData.gender,
            //     NR_ENROLLED: Number(formData.totalNewlyEnrolled),
            // };
            // await admissionEnrollment.insertOne(admission_enrollment_data);

            res.status(201).json({message: "Admission record created successfully"});

        } catch (error) {
            console.error("Database Error:", error);
            res.status(500).json({message: "Admission record failed"});
        }
    });

    const COLLECTIONS_DASH = {
        SCHOOL: "School",
        SCHOOL_YEAR: "School_Year",
        GRADE_DEFINITIONS: "Grade_Definitions",
        ENROLL_ATTRITION: "Enroll_Attrition",
        ENROLL_ATTRITION_SOC: "Enroll_Attrition_Soc",
        ADMISSION_ACTIVITY_ENROLLMENT: "Admission_Activity_Enrollment", // NOTE: your current collection name
    };

    function toNum(v) {
        if (v == null || v === "") return 0;
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    }

    function pickGradeLabel(g) {
        return g?.DESCRIPTION_TX ?? g?.NAME_TX ?? `Grade ${g?.ID ?? "?"}`;
    }

    function pickSchoolName(s) {
        return s?.NAME_TX ?? s?.SCHOOL_NAME ?? s?.NAME ?? `School ${s?.ID ?? "?"}`;
    }

    app.get("/api/enrollment/suggestions", authenticateToken, async (req, res) => {
        try {
            const schoolId = Number(req.query.schoolId);
            if (!Number.isFinite(schoolId)) {
                return res.status(400).json({error: "schoolId is required and must be a number"});
            }

            // SOC defaults to OFF
            const soc = String(req.query.soc ?? "0") === "1";

            const attrCol = db.collection(
                soc ? COLLECTIONS_DASH.ENROLL_ATTRITION_SOC : COLLECTIONS_DASH.ENROLL_ATTRITION
            );

            // Pull ALL rows for that school
            const rows = await attrCol.find({SCHOOL_ID: schoolId}, {projection: {_id: 0}}).toArray();

            if (!rows.length) {
                return res.json({
                    schoolId,
                    soc,
                    yearsCount: 0,
                    yearIdsUsed: [],
                    totals: {},
                    averagesPerYear: {},
                });
            }

            const toNum0 = (v) => {
                const n = Number(v);
                return Number.isFinite(n) ? n : 0;
            };

            // unique years
            const yearIdsUsed = [...new Set(rows.map(r => r.SCHOOL_YR_ID).filter(v => v != null))];
            const yearsCount = yearIdsUsed.length || 1; // avoid /0

            // totals across ALL rows (all grades, all years)
            const totals = rows.reduce(
                (acc, r) => {
                    acc.studentsAdded += toNum0(r.STUDENTS_ADDED_DURING_YEAR);
                    acc.graduating += toNum0(r.STUDENTS_GRADUATED);
                    acc.exchangeStudents += toNum0(r.EXCH_STUD_REPTS);
                    acc.dismissed += toNum0(r.STUD_DISS_WTHD);
                    acc.notInvited += toNum0(r.STUD_NOT_INV);
                    acc.notReturn += toNum0(r.STUD_NOT_RETURN);
                    return acc;
                },
                {
                    studentsAdded: 0,
                    graduating: 0,
                    exchangeStudents: 0,
                    dismissed: 0,
                    notInvited: 0,
                    notReturn: 0,
                }
            );

            // averages per year = totals / unique years
            const averagesPerYear = Object.fromEntries(
                Object.entries(totals).map(([k, v]) => [k, Math.round(v / yearsCount)])
            );

            let aiText = "";
            try {
                const avg = averagesPerYear; // whatever your variable is called (keep your DB logic)
                const years = yearsCount;

                const prompt = `
You are an assistant helping a user fill out a school enrollment form.

Task:
Given the averagesPerYear below, recommend a reasonable RANGE (min/max) for EACH field.
- Use ONLY the numbers provided (do not invent extra stats).
- Each range should be integers.
- Use this rule: min = round(avg * 0.8), max = round(avg * 1.2).
- If avg is 0, return min=0 and max=0.
- Ensure min <= max.
- IF THE MIN AND MAX ARE BOTH 1 MAKE THE MIN 0

Return test in this exact shape:

  Recommended Ranges for Each input: 
    Students Added: Min: number, Max: number
    Graduating: Min: number, Max: number
    Exchange Students: Min: number, Max: number
    Dismissed: Min: number, Max: number
    Not Invited Back: Min: number, Max: number
    Did Not Return: Min: number, Max: number

Context:
yearsCount: ${yearsCount}
averagesPerYear: ${JSON.stringify(averagesPerYear, null, 2)}
`;
                const resp = await genAI.models.generateContent({
                    model: "gemini-2.5-flash-lite",
                    contents: [
                        {role: "user", parts: [{text: prompt}]}
                    ],
                });
                aiText = resp?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            } catch (e) {
                console.log("Gemini error:", e);
                aiText = `AI suggestions failed: ${e?.message || e}`;
            }

            return res.json({
                schoolId,
                soc,
                yearsCount,
                yearIdsUsed,
                totals,
                averagesPerYear,
                aiText,
            });
        } catch (err) {
            return res.status(500).json({error: err.message});
        }
    });


    function validateSuspicious(input, averages) {
        const warnings = [];

        const checkNonNeg = (field, v) => {
            if (!Number.isFinite(v)) warnings.push({field, severity: "error", code: "nan"});
            else if (v < 0) warnings.push({field, severity: "error", code: "negative"});
        };

        checkNonNeg("studentsAdded", input.studentsAdded);
        checkNonNeg("graduating", input.graduating);
        checkNonNeg("exchangeStudents", input.exchangeStudents);
        checkNonNeg("dismissed", input.dismissed);
        checkNonNeg("notInvited", input.notInvited);
        checkNonNeg("notReturn", input.notReturn);

        if (!Number.isFinite(input.grade) || input.grade < 0 || input.grade > 13) {
            warnings.push({field: "grade", severity: "error", code: "grade_range"});
        }

        const avgAdded = averages?.studentsAdded ?? 0;
        if (avgAdded > 0 && input.studentsAdded > avgAdded * 2) {
            warnings.push({field: "studentsAdded", severity: "warning", code: "outlier_added"});
        }

        const outcomes = input.graduating + input.dismissed + input.notInvited + input.notReturn;
        if (input.studentsAdded > 0 && outcomes > input.studentsAdded * 3) {
            warnings.push({field: "studentsAdded", severity: "warning", code: "outcomes_ratio"});
        }

        return warnings;
    }

    app.post("/api/enrollment/validate", authenticateToken, async (req, res) => {
        try {
            const schoolId = Number(req.body.schoolId);
            const soc = Boolean(req.body.soc);

            if (!Number.isFinite(schoolId)) return res.status(400).json({error: "schoolId required"});

            const attrCol = db.collection(
                soc ? COLLECTIONS_DASH.ENROLL_ATTRITION_SOC : COLLECTIONS_DASH.ENROLL_ATTRITION
            );

            const rows = await attrCol
                .find({SCHOOL_ID: schoolId}, {projection: {_id: 0}})
                .sort({SCHOOL_YR_ID: -1})
                .limit(5)
                .toArray();

            const avgStudentsAdded =
                rows.length ? rows.reduce((s, r) => s + toNum(r.STUDENTS_ADDED_DURING_YEAR), 0) / rows.length : 0;

            const input = {
                studentsAdded: Number(req.body.studentsAdded),
                graduating: Number(req.body.graduating),
                exchangeStudents: Number(req.body.exchangeStudents),
                dismissed: Number(req.body.dismissed),
                notInvited: Number(req.body.notInvited),
                notReturn: Number(req.body.notReturn),
                grade: Number(req.body.grade),
            };

            const warnings = validateSuspicious(input, {studentsAdded: avgStudentsAdded});

            // Ask Gemini to explain warnings in natural language
            const explainPrompt = `
You are a data validation assistant.
Explain the validation issues to the user in plain English, 1-2 sentences each.
Do not mention internal codes. Do not invent any numbers.

Input values:
${JSON.stringify(input)}

Computed context:
avgStudentsAdded (recent): ${avgStudentsAdded}

Warnings (field, severity, code):
${JSON.stringify(warnings)}
`;

            let explanation = "";
            try {
                const resp = await genAI.models.generateContent({
                    model: "gemini-3-flash-preview",
                    contents: explainPrompt,
                });
                explanation = resp.text ?? "";
            } catch (e) {
                explanation = "Validation ran. (AI explanation unavailable right now.)";
            }

            return res.json({
                ok: warnings.every(w => w.severity !== "error"),
                warnings,
                explanation,
            });
        } catch (err) {
            return res.status(500).json({error: err.message});
        }
    });


    /**
     * GET /api/lookups/years
     * Returns: [{ ID, SCHOOL_YEAR }]
     * Protected (requires login token)
     */
    app.get("/api/lookups/years", authenticateToken, async (req, res) => {
        try {
            const years = await db
                .collection(COLLECTIONS_DASH.SCHOOL_YEAR)
                .find({}, {projection: {_id: 0, ID: 1, SCHOOL_YEAR: 1}})
                .sort({SCHOOL_YEAR: 1})
                .toArray();

            res.json(years.filter((y) => y?.ID != null && y?.SCHOOL_YEAR != null));
        } catch (err) {
            res.status(500).json({error: err.message});
        }
    });

    /**
     * GET /api/lookups/schools?q=pa&limit=50
     * Returns: [{ schoolId, name, region, group }]
     * Protected
     */
    app.get("/api/lookups/schools", authenticateToken, async (req, res) => {
        try {
            const q = String(req.query.q ?? "").trim().toLowerCase();
            const limit = Math.max(0, Number(req.query.limit ?? 50));

            let schools = await db
                .collection(COLLECTIONS_DASH.SCHOOL)
                .find(
                    {},
                    {
                        projection: {_id: 0, ID: 1, NAME_TX: 1, REGION_CD: 1, GROUP_CD: 1},
                    }
                )
                .toArray();

            if (q) {
                schools = schools.filter((s) =>
                    String(s?.NAME_TX ?? "").toLowerCase().includes(q)
                );
            }

            // dedupe by ID (prevents duplicate React keys)
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
            res.status(500).json({error: err.message});
        }
    });

    /**
     * GET /api/lookups/schools-with-attrition?yearId=33&limit=50&soc=0
     * Returns schools that have attrition rows for that yearId.
     * Protected
     */
    app.get("/api/lookups/schools-with-attrition", authenticateToken, async (req, res) => {
        try {
            const yearId = Number(req.query.yearId);
            const limit = Math.max(0, Number(req.query.limit ?? 50));
            const soc = String(req.query.soc ?? "0") === "1";

            if (!Number.isFinite(yearId)) {
                return res.status(400).json({error: "yearId is required, ex: ?yearId=33"});
            }

            const attrCol = db.collection(
                soc ? COLLECTIONS_DASH.ENROLL_ATTRITION_SOC : COLLECTIONS_DASH.ENROLL_ATTRITION
            );

            const rows = await attrCol
                .aggregate([
                    {$match: {SCHOOL_YR_ID: yearId}},
                    {$group: {_id: "$SCHOOL_ID", count: {$sum: 1}}},
                    {$sort: {count: -1}},
                    {$limit: 500},
                ])
                .toArray();

            const top = rows.slice(0, limit);
            const ids = top.map((r) => r._id);

            const schoolDocs = await db
                .collection(COLLECTIONS_DASH.SCHOOL)
                .find({ID: {$in: ids}}, {projection: {_id: 0, ID: 1, NAME_TX: 1}})
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
            res.status(500).json({error: err.message});
        }
    });

    /**
     * GET /api/lookups/years-with-data?schoolId=13&soc=0
     * Returns: [{ ID, SCHOOL_YEAR }] ONLY for years that have attrition rows for that school
     * Protected
     */
    app.get("/api/lookups/years-with-data", authenticateToken, async (req, res) => {
        try {
            const schoolId = Number(req.query.schoolId);
            const soc = String(req.query.soc ?? "0") === "1";

            if (!Number.isFinite(schoolId)) {
                return res.status(400).json({error: "schoolId is required"});
            }

            const attrCol = db.collection(
                soc ? COLLECTIONS_DASH.ENROLL_ATTRITION_SOC : COLLECTIONS_DASH.ENROLL_ATTRITION
            );

            // Stable API friendly: get yearIds via $group (instead of distinct)
            const yearIdRows = await attrCol
                .aggregate([
                    {$match: {SCHOOL_ID: schoolId}},
                    {$group: {_id: "$SCHOOL_YR_ID"}},
                ])
                .toArray();

            const yearIds = yearIdRows.map((r) => r._id).filter((v) => v != null);

            const years = await db
                .collection(COLLECTIONS_DASH.SCHOOL_YEAR)
                .find({ID: {$in: yearIds}}, {projection: {_id: 0, ID: 1, SCHOOL_YEAR: 1}})
                .sort({SCHOOL_YEAR: 1})
                .toArray();

            return res.json(years);
        } catch (err) {
            return res.status(500).json({error: err.message});
        }
    });

    /**
     * GET /api/enrollment/dashboard?schoolId=10&yearId=33&soc=0&benchmark=mine|region|all
     * Returns:
     *  - KPIs based on Enroll_Attrition (your fields)
     *  - Demographic-ish graph using Admission_Activity_Enrollment grouped by ENROLLMENT_TYPE_CD + GENDER
     *  - Trend (added) last 3 years (by SCHOOL_YEAR value)
     * Protected
     */
    app.get("/api/enrollment/dashboard", authenticateToken, async (req, res) => {
        try {
            const schoolId = Number(req.query.schoolId);
            const yearId = Number(req.query.yearId);
            const soc = String(req.query.soc ?? "0") === "1";
            const benchmark = String(req.query.benchmark ?? "region"); // mine | region | all

            if (!Number.isFinite(schoolId)) return res.status(400).json({error: "schoolId is required"});
            if (!Number.isFinite(yearId)) return res.status(400).json({error: "yearId is required"});

            const schoolCol = db.collection(COLLECTIONS_DASH.SCHOOL);
            const yearCol = db.collection(COLLECTIONS_DASH.SCHOOL_YEAR);
            const gradeCol = db.collection(COLLECTIONS_DASH.GRADE_DEFINITIONS);
            const attrCol = db.collection(
                soc ? COLLECTIONS_DASH.ENROLL_ATTRITION_SOC : COLLECTIONS_DASH.ENROLL_ATTRITION
            );
            const enrollCol = db.collection(COLLECTIONS_DASH.ADMISSION_ACTIVITY_ENROLLMENT);

            const school = await schoolCol.findOne({ID: schoolId}, {projection: {_id: 0}});
            if (!school) return res.status(404).json({error: `School ${schoolId} not found`});

            const yearDoc = await yearCol.findOne({ID: yearId}, {projection: {_id: 0, ID: 1, SCHOOL_YEAR: 1}});
            if (!yearDoc) return res.status(404).json({error: `School_Year ID ${yearId} not found`});

            // build benchmark set
            let benchSchoolIds = [schoolId];
            if (benchmark === "all") {
                const ids = await schoolCol.find({}, {projection: {_id: 0, ID: 1}}).toArray();
                benchSchoolIds = ids.map((d) => d.ID);
            } else if (benchmark === "region") {
                const ids = await schoolCol
                    .find({REGION_CD: school.REGION_CD}, {projection: {_id: 0, ID: 1}})
                    .toArray();
                benchSchoolIds = ids.map((d) => d.ID);

                if (benchSchoolIds.length < 10) {
                    const all = await schoolCol.find({}, {projection: {_id: 0, ID: 1}}).toArray();
                    benchSchoolIds = all.map((d) => d.ID);
                }
            }

            // pull my rows
            const myAttrRows = await attrCol
                .find({SCHOOL_ID: schoolId, SCHOOL_YR_ID: yearId}, {projection: {_id: 0}})
                .toArray();

            if (myAttrRows.length === 0) {
                return res.status(404).json({
                    error: `No attrition rows for schoolId = ${schoolId} and yearId = ${yearId}. Please change selections above.`,
                });
            }

            // grade labels
            const gradeIds = [...new Set(myAttrRows.map((r) => r.GRADE_DEF_ID).filter((v) => v != null))];
            const gradeDocs = await gradeCol
                .find({ID: {$in: gradeIds}}, {projection: {_id: 0, ID: 1, NAME_TX: 1, DESCRIPTION_TX: 1}})
                .toArray();

            const gradeLabelById = new Map(gradeDocs.map((g) => [g.ID, pickGradeLabel(g)]));

            // normalize attrition rows for client
            const attritionByGrade = myAttrRows.map((r) => ({
                gradeDefId: r.GRADE_DEF_ID,
                gradeLabel: gradeLabelById.get(r.GRADE_DEF_ID) || `Grade ${r.GRADE_DEF_ID}`,
                added: toNum(r.STUDENTS_ADDED_DURING_YEAR),
                graduated: toNum(r.STUDENTS_GRADUATED),
                dismissed: toNum(r.STUD_DISS_WTHD),
                notInvited: toNum(r.STUD_NOT_INV),
                notReturning: toNum(r.STUD_NOT_RETURN),
            }));

            // benchmark totals (reduce)
            const benchRows = await attrCol
                .find({SCHOOL_ID: {$in: benchSchoolIds}, SCHOOL_YR_ID: yearId}, {projection: {_id: 0}})
                .toArray();

            const benchTotals = benchRows.reduce(
                (acc, r) => {
                    acc.added += toNum(r.STUDENTS_ADDED_DURING_YEAR);
                    acc.graduated += toNum(r.STUDENTS_GRADUATED);
                    acc.dismissed += toNum(r.STUD_DISS_WTHD);
                    acc.notInvited += toNum(r.STUD_NOT_INV);
                    acc.notReturning += toNum(r.STUD_NOT_RETURN);
                    return acc;
                },
                {added: 0, graduated: 0, dismissed: 0, notInvited: 0, notReturning: 0}
            );

            // enrollment activity for that school/year (demographic-ish: type + gender)
            const enrollmentActivity = await enrollCol
                .find({SCHOOL_ID: schoolId, SCHOOL_YR_ID: yearId}, {projection: {_id: 0}})
                .toArray();

            // trend: last 3 years by numeric SCHOOL_YEAR
            const baseYear = Number(yearDoc.SCHOOL_YEAR);
            const trendYears = [baseYear - 2, baseYear - 1, baseYear];

            const trendDocs = await yearCol
                .find({SCHOOL_YEAR: {$in: trendYears}}, {projection: {_id: 0, ID: 1, SCHOOL_YEAR: 1}})
                .toArray();

            const yearIdByYear = new Map(trendDocs.map((d) => [Number(d.SCHOOL_YEAR), d.ID]));

            const myAdded = [];
            const benchAdded = [];

            for (const y of trendYears) {
                const yId = yearIdByYear.get(y);
                if (!yId) {
                    myAdded.push(0);
                    benchAdded.push(0);
                    continue;
                }

                const myYRows = await attrCol.find({
                    SCHOOL_ID: schoolId,
                    SCHOOL_YR_ID: yId
                }, {projection: {_id: 0}}).toArray();
                myAdded.push(myYRows.reduce((sum, r) => sum + toNum(r.STUDENTS_ADDED_DURING_YEAR), 0));

                const benchYRows = await attrCol
                    .find({SCHOOL_ID: {$in: benchSchoolIds}, SCHOOL_YR_ID: yId}, {projection: {_id: 0}})
                    .toArray();
                benchAdded.push(benchYRows.reduce((sum, r) => sum + toNum(r.STUDENTS_ADDED_DURING_YEAR), 0));
            }

            res.json({
                school: {id: schoolId, name: pickSchoolName(school), region: school.REGION_CD ?? null},
                year: yearDoc.SCHOOL_YEAR,
                yearId: yearDoc.ID,
                soc,
                benchmark,
                benchmarkSchoolCount: benchSchoolIds.length,
                benchTotals,
                attritionByGrade,
                enrollmentActivity,
                trend: {years: trendYears, myAdded, benchAdded},
            });
        } catch (err) {
            res.status(500).json({error: err.message});
        }
    });


    async function startServer() {
        await connectDB();
        ViteExpress.listen(app, port, () => {
            console.log("Server is listening on port", port);
            console.log(`Client url: http://localhost:${port}`);
        });
    }
}
startServer();
