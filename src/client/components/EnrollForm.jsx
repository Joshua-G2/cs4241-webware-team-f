import {useState, useEffect} from 'react'
import { useNavigate } from 'react-router-dom';

function EnrollForm() {
    const [year, setYear] = useState("1");
    const [gender, setGender] = useState("U");
    const [studentsAdded, setStudentsAdded] = useState("");
    const [graduating, setGraduating] = useState("");
    const [exchangeStudents, setExchangeStudents] = useState("");
    const [dismissed,setDismissed] = useState("");
    const [notInvited, setNotInvited] = useState("");
    const [notReturn, setNotReturn] = useState("");
    const [grade, setGrade] = useState("");
    const [soc, setSoc] = useState(false);
    const [suggestions, setSuggestions] = useState(null);
    const [draftsShowing, setDraftsShowing] = useState(false);
    const [drafts, setDrafts] = useState([]);
    const [showSuggestion, setShowSuggestion] = useState(false);

    const navigate = useNavigate()

    const token = localStorage.getItem("token");
    const schoolId = localStorage.getItem("schoolId");
    const school = localStorage.getItem("school");

    async function addEnrollmentRecord(e) {
        e.preventDefault();
        if(studentsAdded < 0 || graduating < 0 || exchangeStudents < 0 || dismissed < 0 || notInvited < 0 || notReturn < 0){
            alert("Every form item should be greater than or equal to 0 besides grade");
            return;
        } else if(grade < 0 || grade > 13){
            alert("Grade must be between -1 and 12 (Pre-K-12)")
            return;
        }

        const enrollment_data = {
            school: Number(localStorage.getItem("schoolId")),
            year: Number(year),
            gender: gender,
            studentsAdded: Number(studentsAdded),
            graduating: Number(graduating),
            exchangeStudents: Number(exchangeStudents),
            dismissed: Number(dismissed),
            notInvited: Number(notInvited),
            notReturn: Number(notReturn),
            grade: Number(grade),
            soc: soc
        }

        const v = await fetch("http://localhost:3000/api/enrollment/validate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                schoolId: enrollment_data.school,
                soc: enrollment_data.soc,
                studentsAdded: enrollment_data.studentsAdded,
                graduating: enrollment_data.graduating,
                exchangeStudents: enrollment_data.exchangeStudents,
                dismissed: enrollment_data.dismissed,
                notInvited: enrollment_data.notInvited,
                notReturn: enrollment_data.notReturn,
                grade: enrollment_data.grade,
            }),
        }).then((r) => r.json());

        if (!v.ok) {
            alert(v.explanation || "Please fix validation issues before submitting.");
            return;
        }

        fetch('http://localhost:3000/api/enrollment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(enrollment_data)
        })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data?.message || "Insert failed");
                return data;
            })
            .then(() => navigate("/Dashboards"))
            .catch((err) => alert(err.message));
    }

    function addDraftEnrollmentRecord(e) {
        e.preventDefault();

        const draft_data = {
            created: new Date().toLocaleString(),
            school: Number(localStorage.getItem("schoolId")),
            year: Number(year),
            gender: gender,
            studentsAdded: Number(studentsAdded),
            graduating: Number(graduating),
            exchangeStudents: Number(exchangeStudents),
            dismissed: Number(dismissed),
            notInvited: Number(notInvited),
            notReturn: Number(notReturn),
            grade: Number(grade),
            soc: soc
        };

        if (localStorage.getItem("draftEnrollments") === null) {
            localStorage.setItem("draftEnrollments", JSON.stringify([draft_data]));
        }
        else {
            const drafts = JSON.parse(localStorage.getItem("draftEnrollments"));
            drafts.push(draft_data);
            localStorage.setItem("draftEnrollments", JSON.stringify(drafts));
        }

        alert("Draft saved!");
    }

    function showDrafts() {
        const savedDrafts = JSON.parse(localStorage.getItem("draftEnrollments"));
        if (savedDrafts === null) {
            alert("There are no saved drafts!");
            return;
        }
        setDrafts(savedDrafts);
        setDraftsShowing(true);
    }

    function loadDraft(draft) {
        setYear(draft.year);
        setGender(draft.gender);
        setStudentsAdded(draft.studentsAdded);
        setGraduating(draft.graduating);
        setExchangeStudents(draft.exchangeStudents);
        setDismissed(draft.dismissed);
        setNotInvited(draft.notInvited);
        setNotReturn(draft.notReturn);
        setGrade(draft.grade);
        setSoc(draft.soc);
        setDraftsShowing(false);
    }

    function deleteDraft(draft) {
        const drafts = JSON.parse(localStorage.getItem("draftEnrollments"));
        const newDrafts = drafts.filter(item => item.created !== draft.created);
        setDrafts(newDrafts);
        localStorage.setItem("draftEnrollments", JSON.stringify(newDrafts));

    }
    async function handleShowSuggestions() {
        if (!token || !schoolId) {
            alert("You must be logged in to view suggestions.");
            return;
        }

        try {
            // Only call backend when button is clicked
            const res = await fetch(
                `http://localhost:3000/api/enrollment/suggestions?schoolId=${Number(schoolId)}&soc=${soc ? 1 : 0}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                alert(data?.error || "Failed to load suggestions.");
                return;
            }

            setSuggestions(data);

            // Prefer AI text if available, otherwise fallback to numeric averages
            if (data.aiText && data.aiText !== "AI suggestions are unavailable right now.") {
                alert(data.aiText);
                return;
            }

            const avg = data.averagesPerYear;
            if (!avg) {
                alert("No historical data available yet.");
                return;
            }

            alert(
                `Suggested input data:\n\n` +
                `Students Added (avg/yr): ${avg.studentsAdded}\n` +
                `Graduating (avg/yr): ${avg.graduating}\n` +
                `Exchange Students (avg/yr): ${avg.exchangeStudents}\n` +
                `Dismissed (avg/yr): ${avg.dismissed}\n` +
                `Not Invited (avg/yr): ${avg.notInvited}\n` +
                `Not Return (avg/yr): ${avg.notReturn}`
            );
        } catch (err) {
            console.error(err);
            alert("Network error while loading suggestions.");
        }
    }


    return (
        <div className="page-layout">
            <h1> Add Enrollment Record</h1>
            {draftsShowing ? (
                <div className="content-box flex flex-col gap-2">
                    {drafts.map((draft, index) => (
                        <div>
                            <button key={index} type="button" onClick={() => loadDraft(draft)} className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded text-left text-black">
                                Draft {index + 1} – {draft.created}
                            </button>
                            {"  "}
                            <button key={index} type="button" onClick={() => deleteDraft(draft)} className="bg-red-500 hover:bg-red-700 px-3 py-2 rounded text-left text-black">
                                Delete
                            </button>
                        </div>
                    ))}<br />
                    <button onClick={() => setDraftsShowing(false)} className="px-4 py-2">Back</button>
                </div>
            ) : (
                <form action="" method="POST" onSubmit={addEnrollmentRecord} className="content-box max-w-2xl mx-auto flex flex-col gap-4">
                    <button type="button" onClick={showDrafts} className="px-4 py-2">Load Draft</button>
                    <button type="button" onClick={handleShowSuggestions} className="px-4 py-2">Show Suggestions</button>
                    <div className="flex items-center gap-4">
                        <label className="w-64">Your School:</label>
                        <select name="school" disabled value={school} className="flex-1 border p-2 rounded">
                            <option>{school}</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="w-64">School Year for This Enrollment:</label>
                        <select name="schoolyr" value={year} onChange={(e) => setYear(e.target.value)} className="flex-1 border p-2 rounded">
                            {Array.from({ length: 33 }, (_, i) => {
                                const yearValue = 1994 + i;
                                const optionId = i + 1;
                                return <option key={optionId} value={optionId}>{yearValue}</option>
                            })}
                        </select>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="w-64">Gender:</label>
                        <select name="gender" value={gender} onChange={(e) => setGender(e.target.value)} className="flex-1 border p-2 rounded">
                            <option value="U">All Genders</option>
                            <option value="M">M</option>
                            <option value="F">F</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="w-64">Students Added this Year:</label>
                        <input type="number" required value={studentsAdded} onChange={(e) => setStudentsAdded(e.target.value)} className="flex-1 border p-2 rounded"/>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="w-64">Graduating Students:</label>
                        <input type="number" required value={graduating} onChange={(e) => setGraduating(e.target.value)} className="flex-1 border p-2 rounded"/>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="w-64">Number of Exchange Students:</label>
                        <input type="number" required value={exchangeStudents} onChange={(e) => setExchangeStudents(e.target.value)} className="flex-1 border p-2 rounded"/>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="w-64">Number of Dismissed Students:</label>
                        <input type="number" required value={dismissed} onChange={(e) => setDismissed(e.target.value)} className="flex-1 border p-2 rounded"/>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="w-64">Number of Students Not Invited Back Next Year:</label>
                        <input type="number" required value={notInvited} onChange={(e) => setNotInvited(e.target.value)} className="flex-1 border p-2 rounded"/>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="w-64">Students Choosing Not to Return Next Year:</label>
                        <input type="number" required value={notReturn} onChange={(e) => setNotReturn(e.target.value)} className="flex-1 border p-2 rounded"/>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="w-64">Grade Level (0 for Pre-k, 1 for Kindergarten, +1 for Each Additional Grade):</label>
                        <input type="number" required value={grade} onChange={(e) => setGrade(e.target.value)} className="flex-1 border p-2 rounded"/>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="w-64">Is This Data For SOC:</label>
                        <input type="checkbox" checked={soc} onChange={(e) => setSoc(e.target.checked)} className="h-5 w-5"/>
                    </div>

                    <div className="flex flex-col gap-2 mt-4">
                        <button type="submit" className="px-4 py-2">Add Enrollment</button>
                        <button type="button" onClick={addDraftEnrollmentRecord} className="px-4 py-2 ">Save Draft</button>
                    </div>
                </form>
            )}
        </div>
    );
}

export default EnrollForm;