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
    const [soc, setSoc] = useState(true);
    const [suggestions, setSuggestions] = useState([]);
    const [draftsShowing, setDraftsShowing] = useState(false);
    const [drafts, setDrafts] = useState([]);

    const navigate = useNavigate()

    const token = localStorage.getItem("token");
    const schoolId = localStorage.getItem("schoolId");
    const school = localStorage.getItem("school");

    function addEnrollmentRecord(e) {
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
        fetch('http://localhost:3000/api/enrollment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(enrollment_data)
        }).then(res => res.json())
            .then(data => {
                console.log(data);
                navigate("/Dashboards");
            })
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

    return (
        <div className="page-layout">
            <h1> Add Enrollment Record</h1>
            {draftsShowing ? (
                <div className="flex flex-col gap-2">
                    {drafts.map((draft, index) => (
                        <button key={index} type="button" onClick={() => loadDraft(draft)} className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded text-left">
                            Draft {index + 1} – {draft.created}
                        </button>
                    ))}<br />
                    <button onClick={() => setDraftsShowing(false)} className="mt-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">Back</button>
                </div>
            ) : (
                <form action="" method="POST" onSubmit={addEnrollmentRecord} className="max-w-2xl mx-auto flex flex-col gap-4">
                    <button type="button" onClick={showDrafts} className="mt-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">Load Draft</button>

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
                        <button type="submit" className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">Add Enrollment</button>
                        <button type="button" onClick={addDraftEnrollmentRecord} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">Save Draft</button>
                    </div>
                </form>
            )}
        </div>
    );
}

export default EnrollForm;