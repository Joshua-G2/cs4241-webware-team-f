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

    //voice to text STUFF
    const [voiceText, setVoiceText] = useState("");
    const [isListening, setIsListening] = useState(false);

    const token = localStorage.getItem("token");
    const schoolId = localStorage.getItem("schoolId");
    const school = localStorage.getItem("school");
    const [showHelp, setShowHelp] = useState(false);

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

    function startListening() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert("Speech Recognition not supported in this browser. Use Chrome.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        recognition.onresult = (event) => {
            let transcript = event.results[0][0].transcript.toLowerCase();

            // Convert spoken "comma" into actual comma
            transcript = transcript.replace(/comma/g, ",");

            setVoiceText(transcript);
            processVoiceInput(transcript);
        };

        recognition.start();
    }

    function processVoiceInput(text) {

        let transcript = text.toLowerCase();

        // Normalize variations
        transcript = transcript.replace(/students? of color/g, "soc");
        transcript = transcript.replace(/comma/g, ",");
        transcript = transcript.replace(/student of color/g, "soc");

        const yearMatch = transcript.match(/year\s*(\d{4})/);

        if (yearMatch) {
            const spokenYear = parseInt(yearMatch[1]);

            if (spokenYear >= 1990 && spokenYear <= 2026) {
                const dropdownIndex = spokenYear - 1993;
                setYear(dropdownIndex.toString());
            }

            transcript = transcript.replace(yearMatch[0], "");
        }

        const socMatch = transcript.match(/soc\s*(yes|no|true|false)/);

        if (socMatch) {
            const value = socMatch[1];
            setSoc(value === "yes" || value === "true");
            transcript = transcript.replace(socMatch[0], "");
        }

        transcript = transcript
            .replace(/,+/g, ",")
            .replace(/^,|,$/g, "")
            .trim();

        let values = transcript.split(",")
            .map(v => v.trim())
            .filter(v => v !== "");

        if (values.length === 0) {
            values = transcript.match(/\d+/g) || [];
        }

        values.forEach((val, index) => {
            const number = val.match(/\d+/);
            if (number && formFields[index]) {
                formFields[index].setter(number[0]);
            }
        });

        const genderMatch = transcript.match(/(gender\s*)?(male|female|all genders|all|m|f)\b/);

        if (genderMatch) {

            const spokenGender = genderMatch[2];

            if (spokenGender === "male" || spokenGender === "m") {
                setGender("M");
            }
            else if (spokenGender === "female" || spokenGender === "f") {
                setGender("F");
            }
            else if (spokenGender === "all" || spokenGender === "all genders") {
                setGender("U");
            }

            transcript = transcript.replace(genderMatch[0], "");
        }
    }

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

    function clearAllFields() {
        setStudentsAdded("");
        setGraduating("");
        setExchangeStudents("");
        setDismissed("");
        setNotInvited("");
        setNotReturn("");
        setGrade("");
        setSoc(false);
        setGender("U");
        setYear("1994");
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

                    <div className="flex flex-col gap-2 mt-4 border-t pt-4">
                        <label>Voice Input (Say numbers in order)</label>

                        <textarea
                            value={voiceText}
                            onChange={(e) => {
                                const newText = e.target.value.toLowerCase();
                                setVoiceText(newText);
                                processVoiceInput(newText);
                            }}
                            className="border p-2 rounded"
                            placeholder="Say numbers separated by comma, or type manually..."
                        />

                        <button
                            type="button"
                            onClick={startListening}
                            className="bg-blue-500 text-white px-4 py-2 rounded"
                        >
                            {isListening ? "Listening..." : "Start Voice Input"}
                        </button>
                    </div>

                    <div className="border-2 border-gray-400 rounded-lg p-4 mt-4">
                        <button
                            type="button"
                            onClick={() => setShowHelp(!showHelp)}
                            className="font-semibold underline"
                        >
                            {showHelp ? "Hide Voice Instructions ▲" : "Show Voice Instructions ▼"}
                        </button>

                        {showHelp && (
                            <div className="mt-3 text-sm leading-relaxed text-black dark:text-white">
                                <p>
                                    This is a Voice to Text feature that enables you to record data while speaking.
                                </p>

                                <p className="mt-2">
                                    Press Start and say the numbers you would like to input from top to bottom.
                                </p>

                                <p className="mt-2">
                                    Say <strong>“Comma”</strong> when you want to go into a new row.
                                </p>

                                <p className="mt-2">
                                    Say <strong>“Year”</strong> and then a value to change the year of enrollment.
                                </p>

                                <p className="mt-2">
                                    Say <strong>“Students of Color”</strong>, <strong>“Student of Color”</strong>, or <strong>“SOC”</strong>
                                    then either <strong>Yes</strong> or <strong>No</strong> to add the data to the SOC database.
                                </p>

                                <p className="mt-2">
                                    Say <strong>“Gender”</strong>, or <strong>“Genders”</strong>
                                    then either <strong>Male</strong>, <strong>M</strong>, <strong>Female</strong>, <strong>F</strong>, <strong>All</strong>  or <strong>All Genders</strong> to change the Gender of the enrollment
                                </p>

                                <p className="mt-3 font-medium">
                                    Example:
                                </p>

                                <p className="italic">
                                    "6 Comma 8 Comma 14 Comma Year 2015 Comma SOC yes"
                                </p>

                                <p className="mt-2">
                                    Will fill out the first 3 fields and Year and SOC.
                                </p>

                                <p className="mt-2">
                                    If you want to delete your text use the <strong>Clear All Fields</strong> button.
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={clearAllFields}
                        className="bg-red-500 text-white px-4 py-2 rounded"
                    >
                        Clear All Fields
                    </button>

                    <div className="flex flex-row gap-2 mt-2 justify-center">
                        <button type="button" onClick={addDraftEnrollmentRecord} className="flex-1">Save Draft</button>
                        <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">Add Enrollment</button>
                    </div>
                </form>
            )}
        </div>
    );
}

export default EnrollForm;