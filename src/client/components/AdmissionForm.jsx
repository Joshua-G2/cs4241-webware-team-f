import {useState, useEffect} from 'react'
import { useNavigate } from 'react-router-dom';

function AdmissionForm() {
    const [year, setYear] = useState("1"); //year of the record
    const [enrollmentCapacity, setEnrollmentCapacity] = useState(""); //enrollment capacity number
    const [contractedBoys, setContractedBoys] = useState(""); //student that have signed a contract, paid deposit
    const [contractedGirls, setContractedGirls] = useState(""); //student that have signed a contract, paid deposit
    const [grade, setGrade] = useState(""); //id for grade, pre-k through 12
    const [contractedNB, setContractedNB] = useState(""); //student that have signed a contract, paid deposit, nonbinary
    const [completedApplications, setCompletedApplications] = useState(""); // # of completed applications
    const [acceptances, setAcceptances] = useState(""); // # of acceptances
    const [totalNewlyEnrolled, setTotalNewlyEnrolled] = useState("");// total newly enrolled
    const [soc, setSoc] = useState(true); //students of color entry?

    const [draftsShowing, setDraftsShowing] = useState(false);
    const [drafts, setDrafts] = useState([]);

    const [submitted, setSubmitted] = useState(false);
    const navigate = useNavigate()

    const token = localStorage.getItem("token");
    const schoolId = localStorage.getItem("schoolId");
    const school = localStorage.getItem("school");

    const formFields = [
        { label: "Enrollment Capacity", name: "enrollmentCapacity", value: enrollmentCapacity, setter: setEnrollmentCapacity, type: "number" },
        { label: "Contracted Boys", name: "contractedBoys", value: contractedBoys, setter: setContractedBoys, type: "number" },
        { label: "Contracted Girls", name: "contractedGirls", value: contractedGirls, setter: setContractedGirls, type: "number" },
        { label: "Contracted Non-Binary", name: "contractedNB", value: contractedNB, setter: setContractedNB, type: "number" },
        { label: "Completed Applications", name: "completedApplications", value: completedApplications, setter: setCompletedApplications, type: "number" },
        { label: "Acceptances", name: "acceptances", value: acceptances, setter: setAcceptances, type: "number" },
        { label: "Total Newly Enrolled", name: "totalNewlyEnrolled", value: totalNewlyEnrolled, setter: setTotalNewlyEnrolled, type: "number" },
        { label: "Grade Level (0 for Pre-k, 1 for Kindergarten, etc.)", name: "grade", value: grade, setter: setGrade, type: "number", min: 0, max: 13},
    ];

    const admission_data = formFields.reduce((acc, field) => {
        //convert to Number if number type, else dont touch
        acc[field.name] = field.type === "number" ? Number(field.value) : field.value;
        return acc;
    }, {
        //other values
        schoolId: Number(schoolId), //the school name
        year: Number(year),
        soc: soc
    });

    function addAdmissionRecord(e) {
        e.preventDefault();

        const gradeField = formFields.find(f => f.name === "grade");

        if (formFields.some(field => field.type === "number" && field.value < 0)) {
            // at least one field is negative
            alert("Number Entries cannot be negative.");
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
            body: JSON.stringify(admission_data)
        }).then(res => {
            if (res.ok) {
                setSubmitted(true);
                //wait 2 seconds before moving to dash, to see green box
                setTimeout(() => {
                    navigate("/Dashboards");
                }, 2000);
            }
            return res.json();
        })
            .then(data => {
                console.log(data);
            })
    }

    function addDraftAdmissionRecord(e) {
        e.preventDefault();

        const draft_data = {
            created: new Date().toLocaleString(),
            ...admission_data //use already packaged data
        };

        if (localStorage.getItem("draftAdmissions") === null) {
            localStorage.setItem("draftAdmissions", JSON.stringify([draft_data]));
        }
        else {
            const drafts = JSON.parse(localStorage.getItem("draftAdmissions"));
            drafts.push(draft_data);
            localStorage.setItem("draftAdmissions", JSON.stringify(drafts));
        }
        alert("Draft saved!");
    }

    function showDrafts() {
        const savedDrafts = JSON.parse(localStorage.getItem("draftAdmissions"));
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

    return (
        <div className="page-layout">
            <h1> Add Admission Record</h1>
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
                <form action="" method="POST" onSubmit={addAdmissionRecord} className="content-box max-w-2xl mx-auto flex flex-col gap-4">
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

                    {/* loop over other fields from dictionary */}
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

                    {/* Checkbox: SOC */}
                    <div className="flex items-center gap-4">
                        <label className="w-64">Is This Data For SOC</label>
                        <input type="checkbox" checked={soc} onChange={(e) => setSoc(e.target.checked)} className="h-5 w-5"/>
                    </div>

                    <div className="flex flex-row gap-2 mt-2 justify-center">
                        <button type="button" onClick={addDraftAdmissionRecord} className="flex-1">Save Draft</button>
                        <button type="submit" className="flex-1">Add Admissions</button>
                    </div>
                </form>
            )}
        </div>
    );
}

export default AdmissionForm;