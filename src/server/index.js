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
import {authenticateToken} from "./middleware/auth.js";

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

app.use(express.json()); //use json
app.use(cors()); // Enable CORS for all routes
app.use(authRouter)
app.use("/api", formsRouter);
app.use("/api", chartsRouter);
app.use("/api/lookups", lookupsRouter);



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

    async function startServer() {
        await connectDB();
        ViteExpress.listen(app, port, () => {
            console.log("Server is listening on port", port);
            console.log(`Client url: http://localhost:${port}`);
        });
    }

startServer();
