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

    const formFields = [
        { label: "Students Added this Year", name: "studentsAdded", value: studentsAdded, setter: setStudentsAdded, type: "number" },
        { label: "Graduating Students", name: "graduating", value: graduating, setter: setGraduating, type: "number" },
        { label: "Exchange Students", name: "exchangeStudents", value: exchangeStudents, setter: setExchangeStudents, type: "number" },
        { label: "Dismissed Students", name: "dismissed", value: dismissed, setter: setDismissed, type: "number" },
        { label: "Students Not Invited Back Next Year", name: "notInvited", value: notInvited, setter: setNotInvited, type: "number" },
        { label: "Students Choosing Not to Return Next Year", name: "notReturn", value: notReturn, setter: setNotReturn, type: "number" },
        { label: "Grade Level (0 for Pre-k, 1 for Kindergarten, +1 for Each Additional Grade)", name: "grade", value: grade, setter: setGrade, type: "number", min: 0, max: 13 }
    ];

    const enrollment_data = formFields.reduce((acc, field) => {
        acc[field.name] = field.type === "number" ? Number(field.value) : field.value;
        return acc;
    }, {
        school: Number(schoolId),
        year: Number(year),
        gender: gender,
        soc: soc
    });

    function addEnrollmentRecord(e) {
        e.preventDefault();

        const gradeField = formFields.find(f => f.name === "grade");

        if (formFields.some(field => field.name !== "grade" && field.value < 0)) {
            alert("Every form item should be greater than or equal to 0 besides grade");
            return;
        }
        else if (gradeField && (gradeField.value < gradeField.min || gradeField.value > gradeField.max)) {
            alert(`Grade must be between ${gradeField.min} and ${gradeField.max} (Pre-K to 12)`);
            return;
        }

        fetch('/api/enrollment', {
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
            ...enrollment_data
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
        formFields.forEach(field => {
            if (draft[field.name] !== undefined) {
                field.setter(draft[field.name]); //grab draft fields
            }
        });

        setYear(draft.year);
        setGender(draft.gender);
        setSoc(draft.soc);
        setDraftsShowing(false);
    }

    function deleteDraft(draft) {
        const drafts = JSON.parse(localStorage.getItem("draftEnrollments"));
        const newDrafts = drafts.filter(item => item.created !== draft.created);
        setDrafts(newDrafts);
        localStorage.setItem("draftEnrollments", JSON.stringify(newDrafts));
    }

    return (
        <div className="page-layout">
            <h1> Add Enrollment Record</h1>
            {draftsShowing ? (
                <div className="content-box flex flex-col gap-2">
                    {drafts.map((draft, index) => (
                        <div>
                            <button key={index} type="button" onClick={() => loadDraft(draft)} className="text-left">
                                Draft {index + 1} – {draft.created}
                            </button>
                            {"  "}
                            <button key={index} type="button" onClick={() => deleteDraft(draft)} className="bg-red-500 hover:bg-red-700 text-left ">
                                Delete
                            </button>
                        </div>
                    ))}<br />
                    <button onClick={() => setDraftsShowing(false)} className="px-4 py-2">Back</button>
                </div>
            ) : (
                <form action="" method="POST" onSubmit={addEnrollmentRecord} className="content-box max-w-2xl mx-auto flex flex-col gap-4">
                    <button type="button" onClick={showDrafts} className="px-4 py-2">Load Draft</button>

                    <div className="flex items-center gap-4">
                        <label className="w-64">Your School</label>
                        <select name="school" disabled value={school} className="flex-1 border p-2 rounded">
                            <option>{school}</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="w-64">School Year for This Enrollment</label>
                        <select name="schoolyr" value={year} onChange={(e) => setYear(e.target.value)} className="flex-1 border p-2 rounded">
                            {Array.from({ length: 33 }, (_, i) => {
                                const yearValue = 1994 + i;
                                const optionId = i + 1;
                                return <option key={optionId} value={optionId}>{yearValue}</option>
                            })}
                        </select>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="w-64">Gender</label>
                        <select name="gender" value={gender} onChange={(e) => setGender(e.target.value)} className="flex-1 border p-2 rounded">
                            <option value="U">All Genders</option>
                            <option value="M">M</option>
                            <option value="F">F</option>
                        </select>
                    </div>

                    {/* Loop over standardized fields */}
                    {formFields.map((field) => (
                        <div key={field.name} className="flex items-center gap-4">
                            <label className="w-64">{field.label}</label>
                            <input
                                type={field.type}
                                required
                                name={field.name}
                                value={field.value}
                                onChange={(e) => field.setter(e.target.value)}
                                className="flex-1 border p-2 rounded"
                            />
                        </div>
                    ))}

                    <div className="flex items-center gap-4">
                        <label className="w-64">Is This Data For SOC</label>
                        <input type="checkbox" checked={soc} onChange={(e) => setSoc(e.target.checked)} className="h-5 w-5"/>
                    </div>

                    <div className="flex flex-row gap-2 mt-2 justify-center">
                        <button type="button" onClick={addDraftEnrollmentRecord} className="flex-1">Save Draft</button>
                        <button type="submit" className="flex-1">Add Enrollment</button>
                    </div>
                </form>
            )}
        </div>
    );
}

export default EnrollForm;