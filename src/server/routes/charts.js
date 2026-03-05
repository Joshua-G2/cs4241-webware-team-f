import express from "express";
import { getDb } from "../config/db.js";
import { authenticateToken } from "../middleware/auth.js";
import { COLLECTIONS_DASH } from "../constants/collections.js";
import { toNum, pickGradeLabel, pickSchoolName } from "../utils/formatters.js";

const router = express.Router();

/**
 * GET /api/enrollment/dashboard?schoolId=10&yearId=33&soc=0&benchmark=mine|region|all
 * Protected
 */
router.get("/enrollment/dashboard", authenticateToken, async (req, res) => {
    try {
        const db = getDb();
        const schoolId = Number(req.query.schoolId);
        const yearId = Number(req.query.yearId);
        const soc = String(req.query.soc ?? "0") === "1";
        const benchmark = String(req.query.benchmark ?? "region");

        if (!Number.isFinite(schoolId)) return res.status(400).json({ error: "schoolId is required" });
        if (!Number.isFinite(yearId)) return res.status(400).json({ error: "yearId is required" });

        const schoolCol = db.collection(COLLECTIONS_DASH.SCHOOL);
        const yearCol = db.collection(COLLECTIONS_DASH.SCHOOL_YEAR);
        const gradeCol = db.collection(COLLECTIONS_DASH.GRADE_DEFINITIONS);
        const attrCol = db.collection(
            soc ? COLLECTIONS_DASH.ENROLL_ATTRITION_SOC : COLLECTIONS_DASH.ENROLL_ATTRITION
        );
        const enrollCol = db.collection(COLLECTIONS_DASH.ADMISSION_ACTIVITY_ENROLLMENT);

        const school = await schoolCol.findOne({ ID: schoolId }, { projection: { _id: 0 } });
        if (!school) return res.status(404).json({ error: `School ${schoolId} not found` });

        const yearDoc = await yearCol.findOne({ ID: yearId }, { projection: { _id: 0, ID: 1, SCHOOL_YEAR: 1 } });
        if (!yearDoc) return res.status(404).json({ error: `School_Year ID ${yearId} not found` });

        let benchSchoolIds = [schoolId];
        if (benchmark === "all") {
            const ids = await schoolCol.find({}, { projection: { _id: 0, ID: 1 } }).toArray();
            benchSchoolIds = ids.map((d) => d.ID);
        } else if (benchmark === "region") {
            const ids = await schoolCol
                .find({ REGION_CD: school.REGION_CD }, { projection: { _id: 0, ID: 1 } })
                .toArray();
            benchSchoolIds = ids.map((d) => d.ID);
            if (benchSchoolIds.length < 10) {
                const all = await schoolCol.find({}, { projection: { _id: 0, ID: 1 } }).toArray();
                benchSchoolIds = all.map((d) => d.ID);
            }
        }

        const myAttrRows = await attrCol
            .find({ SCHOOL_ID: schoolId, SCHOOL_YR_ID: yearId }, { projection: { _id: 0 } })
            .toArray();

        if (myAttrRows.length === 0) {
            return res.status(404).json({
                error: `No attrition rows for schoolId = ${schoolId} and yearId = ${yearId}. Please change selections above.`,
            });
        }

        const gradeIds = [...new Set(myAttrRows.map((r) => r.GRADE_DEF_ID).filter((v) => v != null))];
        const gradeDocs = await gradeCol
            .find({ ID: { $in: gradeIds } }, { projection: { _id: 0, ID: 1, NAME_TX: 1, DESCRIPTION_TX: 1 } })
            .toArray();

        const gradeLabelById = new Map(gradeDocs.map((g) => [g.ID, pickGradeLabel(g)]));

        const attritionByGrade = myAttrRows.map((r) => ({
            gradeDefId: r.GRADE_DEF_ID,
            gradeLabel: gradeLabelById.get(r.GRADE_DEF_ID) || `Grade ${r.GRADE_DEF_ID}`,
            added: toNum(r.STUDENTS_ADDED_DURING_YEAR),
            graduated: toNum(r.STUDENTS_GRADUATED),
            dismissed: toNum(r.STUD_DISS_WTHD),
            notInvited: toNum(r.STUD_NOT_INV),
            notReturning: toNum(r.STUD_NOT_RETURN),
        }));

        const benchRows = await attrCol
            .find({ SCHOOL_ID: { $in: benchSchoolIds }, SCHOOL_YR_ID: yearId }, { projection: { _id: 0 } })
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
            { added: 0, graduated: 0, dismissed: 0, notInvited: 0, notReturning: 0 }
        );

        const enrollmentActivity = await enrollCol
            .find({ SCHOOL_ID: schoolId, SCHOOL_YR_ID: yearId }, { projection: { _id: 0 } })
            .toArray();

        const baseYear = Number(yearDoc.SCHOOL_YEAR);
        const trendYears = [baseYear - 2, baseYear - 1, baseYear];

        const trendDocs = await yearCol
            .find({ SCHOOL_YEAR: { $in: trendYears } }, { projection: { _id: 0, ID: 1, SCHOOL_YEAR: 1 } })
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

            const myYRows = await attrCol.find({ SCHOOL_ID: schoolId, SCHOOL_YR_ID: yId }, { projection: { _id: 0 } }).toArray();
            myAdded.push(myYRows.reduce((sum, r) => sum + toNum(r.STUDENTS_ADDED_DURING_YEAR), 0));

            const benchYRows = await attrCol
                .find({ SCHOOL_ID: { $in: benchSchoolIds }, SCHOOL_YR_ID: yId }, { projection: { _id: 0 } })
                .toArray();
            benchAdded.push(benchYRows.reduce((sum, r) => sum + toNum(r.STUDENTS_ADDED_DURING_YEAR), 0));
        }

        res.json({
            school: { id: schoolId, name: pickSchoolName(school), region: school.REGION_CD ?? null },
            year: yearDoc.SCHOOL_YEAR,
            yearId: yearDoc.ID,
            soc,
            benchmark,
            benchmarkSchoolCount: benchSchoolIds.length,
            benchTotals,
            attritionByGrade,
            enrollmentActivity,
            trend: { years: trendYears, myAdded, benchAdded },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/admissions/dashboard?schoolId=10&yearId=33&soc=0&benchmark=mine|region|all
 * Protected. Returns admissions data: admissionByGrade, enrollmentActivity, benchTotals, trend.
 */
router.get("/admissions/dashboard", authenticateToken, async (req, res) => {
    try {
        const db = getDb();
        const schoolId = Number(req.query.schoolId);
        const yearId = Number(req.query.yearId);
        const soc = String(req.query.soc ?? "0") === "1";
        const benchmark = String(req.query.benchmark ?? "region");

        if (!Number.isFinite(schoolId)) return res.status(400).json({ error: "schoolId is required" });
        if (!Number.isFinite(yearId)) return res.status(400).json({ error: "yearId is required" });

        const schoolCol = db.collection(COLLECTIONS_DASH.SCHOOL);
        const yearCol = db.collection(COLLECTIONS_DASH.SCHOOL_YEAR);
        const gradeCol = db.collection(COLLECTIONS_DASH.GRADE_DEFINITIONS);
        // Swap to admissions collections (SOC vs main) for dashboard data
        const admissionCol = db.collection(
            soc ? COLLECTIONS_DASH.ADMISSION_ACTIVITY_SOC : COLLECTIONS_DASH.ADMISSION_ACTIVITY
        );
        const enrollCol = db.collection(COLLECTIONS_DASH.ADMISSION_ACTIVITY_ENROLLMENT);

        const school = await schoolCol.findOne({ ID: schoolId }, { projection: { _id: 0 } });
        if (!school) return res.status(404).json({ error: `School ${schoolId} not found` });

        const yearDoc = await yearCol.findOne({ ID: yearId }, { projection: { _id: 0, ID: 1, SCHOOL_YEAR: 1 } });
        if (!yearDoc) return res.status(404).json({ error: `School_Year ID ${yearId} not found` });

        let benchSchoolIds = [schoolId];
        if (benchmark === "all") {
            const ids = await schoolCol.find({}, { projection: { _id: 0, ID: 1 } }).toArray();
            benchSchoolIds = ids.map((d) => d.ID);
        } else if (benchmark === "region") {
            const ids = await schoolCol
                .find({ REGION_CD: school.REGION_CD }, { projection: { _id: 0, ID: 1 } })
                .toArray();
            benchSchoolIds = ids.map((d) => d.ID);
            if (benchSchoolIds.length < 10) {
                const all = await schoolCol.find({}, { projection: { _id: 0, ID: 1 } }).toArray();
                benchSchoolIds = all.map((d) => d.ID);
            }
        }

        const myAdmissionRows = await admissionCol
            .find({ SCHOOL_ID: schoolId, SCHOOL_YR_ID: yearId }, { projection: { _id: 0 } })
            .toArray();

        if (myAdmissionRows.length === 0) {
            return res.status(404).json({
                error: `No admission rows for schoolId = ${schoolId} and yearId = ${yearId}. Please change selections above.`,
            });
        }

        const gradeIds = [...new Set(myAdmissionRows.map((r) => r.GRADE_DEF_ID).filter((v) => v != null))];
        const gradeDocs = await gradeCol
            .find({ ID: { $in: gradeIds } }, { projection: { _id: 0, ID: 1, NAME_TX: 1, DESCRIPTION_TX: 1 } })
            .toArray();

        const gradeLabelById = new Map(gradeDocs.map((g) => [g.ID, pickGradeLabel(g)]));

        // Build per-grade admissions metrics (capacity, contracted, applications, acceptances, new enrollments)
        const admissionByGrade = myAdmissionRows.map((r) => {
            const contractedTotal =
                toNum(r.CONTRACTED_ENROLL_BOYS) + toNum(r.CONTRACTED_ENROLL_GIRLS) + toNum(r.CONTRACTED_ENROLL_NB);
            return {
                gradeDefId: r.GRADE_DEF_ID,
                gradeLabel: gradeLabelById.get(r.GRADE_DEF_ID) || `Grade ${r.GRADE_DEF_ID}`,
                capacity: toNum(r.CAPACITY_ENROLL),
                contractedBoys: toNum(r.CONTRACTED_ENROLL_BOYS),
                contractedGirls: toNum(r.CONTRACTED_ENROLL_GIRLS),
                contractedNB: toNum(r.CONTRACTED_ENROLL_NB),
                contractedTotal,
                completedApplications: toNum(r.COMPLETED_APPLICATION_TOTAL),
                acceptances: toNum(r.ACCEPTANCES_TOTAL),
                newEnrollments: toNum(r.NEW_ENROLLMENTS_TOTAL),
            };
        });

        const benchRows = await admissionCol
            .find({ SCHOOL_ID: { $in: benchSchoolIds }, SCHOOL_YR_ID: yearId }, { projection: { _id: 0 } })
            .toArray();

        // Peer-group totals for admissions (same shape as admissionByGrade totals)
        const benchTotals = benchRows.reduce(
            (acc, r) => {
                acc.capacity += toNum(r.CAPACITY_ENROLL);
                acc.contractedBoys += toNum(r.CONTRACTED_ENROLL_BOYS);
                acc.contractedGirls += toNum(r.CONTRACTED_ENROLL_GIRLS);
                acc.contractedNB += toNum(r.CONTRACTED_ENROLL_NB);
                acc.contractedTotal +=
                    toNum(r.CONTRACTED_ENROLL_BOYS) + toNum(r.CONTRACTED_ENROLL_GIRLS) + toNum(r.CONTRACTED_ENROLL_NB);
                acc.completedApplications += toNum(r.COMPLETED_APPLICATION_TOTAL);
                acc.acceptances += toNum(r.ACCEPTANCES_TOTAL);
                acc.newEnrollments += toNum(r.NEW_ENROLLMENTS_TOTAL);
                return acc;
            },
            {
                capacity: 0,
                contractedBoys: 0,
                contractedGirls: 0,
                contractedNB: 0,
                contractedTotal: 0,
                completedApplications: 0,
                acceptances: 0,
                newEnrollments: 0,
            }
        );

        const enrollmentActivity = await enrollCol
            .find({ SCHOOL_ID: schoolId, SCHOOL_YR_ID: yearId }, { projection: { _id: 0 } })
            .toArray();

        const baseYear = Number(yearDoc.SCHOOL_YEAR);
        const trendYears = [baseYear - 2, baseYear - 1, baseYear];

        const trendDocs = await yearCol
            .find({ SCHOOL_YEAR: { $in: trendYears } }, { projection: { _id: 0, ID: 1, SCHOOL_YEAR: 1 } })
            .toArray();

        const yearIdByYear = new Map(trendDocs.map((d) => [Number(d.SCHOOL_YEAR), d.ID]));

        // Three-year trend: new enrollments for my school vs benchmark (for line chart)
        const myNewEnrollments = [];
        const benchNewEnrollments = [];

        for (const y of trendYears) {
            const yId = yearIdByYear.get(y);
            if (!yId) {
                myNewEnrollments.push(0);
                benchNewEnrollments.push(0);
                continue;
            }

            const myYRows = await admissionCol
                .find({ SCHOOL_ID: schoolId, SCHOOL_YR_ID: yId }, { projection: { _id: 0 } })
                .toArray();
            myNewEnrollments.push(myYRows.reduce((sum, r) => sum + toNum(r.NEW_ENROLLMENTS_TOTAL), 0));

            const benchYRows = await admissionCol
                .find({ SCHOOL_ID: { $in: benchSchoolIds }, SCHOOL_YR_ID: yId }, { projection: { _id: 0 } })
                .toArray();
            benchNewEnrollments.push(
                benchYRows.reduce((sum, r) => sum + toNum(r.NEW_ENROLLMENTS_TOTAL), 0)
            );
        }

        res.json({
            school: { id: schoolId, name: pickSchoolName(school), region: school.REGION_CD ?? null },
            year: yearDoc.SCHOOL_YEAR,
            yearId: yearDoc.ID,
            soc,
            benchmark,
            benchmarkSchoolCount: benchSchoolIds.length,
            benchTotals,
            admissionByGrade,
            enrollmentActivity,
            trend: { years: trendYears, myNewEnrollments, benchNewEnrollments },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


/*----------------UNUSED------------------------------ */
/** GET /api/data - first 50 Admission_Activity rows */
router.get("/data", async (req, res) => {
    try {
        const db = getDb();
        const data = await db.collection("Admission_Activity").find({}).limit(50).toArray();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/** GET /api/chart/school-id-count */
router.get("/chart/school-id-count", async (req, res) => {
    try {
        const db = getDb();
        const data = await db.collection("Admission_Activity").aggregate([
            { $group: { _id: "$SCHOOL_ID", count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]).toArray();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/** GET /api/chart/school-year-count */
router.get("/chart/school-year-count", async (req, res) => {
    try {
        const db = getDb();
        const data = await db.collection("Admission_Activity").aggregate([
            { $group: { _id: "$SCHOOL_YR_ID", count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]).toArray();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/** GET /api/chart/first-10-rows */
router.get("/chart/first-10-rows", async (req, res) => {
    try {
        const db = getDb();
        const data = await db.collection("Admission_Activity").find({}).limit(10).toArray();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
