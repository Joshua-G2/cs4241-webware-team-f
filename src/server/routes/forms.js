import express from "express";
import { getDb } from "../config/db.js";
import { COLLECTIONS_DASH } from "../constants/collections.js";

const router = express.Router();
const getDbSafe = () => getDb();

/** POST /api/enrollment - create enrollment (attrition) record */
router.post("/enrollment", async (req, res) => {
    const formData = req.body;
    const db = getDbSafe();
    try {
        const collectionName = formData.soc ? "Enroll_Attrition_Soc" : "Enroll_Attrition";
        const admissionCollection = db.collection(collectionName);

        const enroll_attrition_data = {
            SCHOOL_ID: formData.school,
            SCHOOL_YR_ID: formData.year,
            STUDENTS_ADDED_DURING_YEAR: formData.studentsAdded,
            STUDENTS_GRADUATED: formData.graduating,
            EXCH_STUD_REPTS: formData.exchangeStudents,
            STUD_DISS_WTHD: formData.dismissed,
            STUD_NOT_INV: formData.notInvited,
            STUD_NOT_RETURN: formData.notReturn,
            GRADE_DEF_ID: formData.grade,
        };
        console.log(`Inserting into ${collectionName}:`, enroll_attrition_data);

        await admissionCollection.insertOne(enroll_attrition_data);

        const admissionEnrollment = db.collection(COLLECTIONS_DASH.ADMISSION_ACTIVITY_ENROLLMENT);
        const admission_enrollment_data = {
            SCHOOL_ID: formData.school,
            SCHOOL_YR_ID: formData.year,
            ENROLLMENT_TYPE_CD: "INQUIRIES",
            GENDER: formData.gender,
            NR_ENROLLED: formData.studentsAdded,
        };
        await admissionEnrollment.insertOne(admission_enrollment_data);
        console.log(admission_enrollment_data);
        res.status(201).json({ message: "Enrollment record created successfully" });
    } catch (error) {
        console.log("error:", error);
        res.status(500).json({ message: "Enrollment record failed" });
    }
});

/** POST /api/admission - create admission record */
router.post("/admission", async (req, res) => {
    const formData = req.body;
    const db = getDbSafe();
    try {
        const collectionName = formData.soc ? "Admission_Activity_Soc" : "Admission_Activity";
        const admissionCollection = db.collection(collectionName);

        const admission_data = {
            SCHOOL_ID: formData.schoolId,
            SCHOOL_YR_ID: formData.year,
            CAPACITY_ENROLL: formData.enrollmentCapacity,
            CONTRACTED_ENROLL_BOYS: formData.contractedBoys,
            CONTRACTED_ENROLL_GIRLS: formData.contractedGirls,
            GRADE_DEF_ID: formData.grade,
            CONTRACTED_ENROLL_NB: formData.contractedNB,
            COMPLETED_APPLICATION_TOTAL: formData.completedApplications,
            ACCEPTANCES_TOTAL: formData.acceptances,
            NEW_ENROLLMENTS_TOTAL: formData.totalNewlyEnrolled,
        };

        console.log(`Inserting into ${collectionName}:`, admission_data);
        await admissionCollection.insertOne(admission_data);

        const admissionEnrollment = db.collection(COLLECTIONS_DASH.ADMISSION_ACTIVITY_ENROLLMENT);
        const gender = () => {
            if (formData.contractedBoys === 0) return "F";
            if (formData.contractedGirls === 0) return "M";
            return "U";
        };
        const admission_enrollment_data = {
            SCHOOL_ID: formData.schoolId,
            SCHOOL_YR_ID: formData.year,
            ENROLLMENT_TYPE_CD: "INQUIRIES",
            GENDER: gender(),
            NR_ENROLLED: formData.totalNewlyEnrolled,
        };
        await admissionEnrollment.insertOne(admission_enrollment_data);
        console.log(admission_enrollment_data);

        res.status(201).json({ message: "Admission record created successfully" });
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ message: "Admission record failed" });
    }
});

export default router;
