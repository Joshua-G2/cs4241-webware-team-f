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
    const [soc, setSoc] = useState(false); //students of color entry?

    const [draftsShowing, setDraftsShowing] = useState(false);
    const [drafts, setDrafts] = useState([]);

    const [submitted, setSubmitted] = useState(false);
    const navigate = useNavigate()

    //voice to text STUFF
    const [voiceText, setVoiceText] = useState("");
    const [isListening, setIsListening] = useState(false);

    const token = localStorage.getItem("token");
    const schoolId = localStorage.getItem("schoolId");
    const school = localStorage.getItem("school");
    const [showHelp, setShowHelp] = useState(false);
    const [showSuggestion, setShowSuggestion] = useState(false);
    const [showAiBox, setShowAiBox] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiMessages, setAiMessages] = useState([
        { sender: "ai", text: "Hi! Click “AI Suggestions” and I’ll suggest recommended ranges for each admission field based on your school's previous data." }
    ]);


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
    }


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

    function clearAllFields() {
        setEnrollmentCapacity("");
        setContractedBoys("");
        setContractedGirls("");
        setContractedNB("");
        setCompletedApplications("");
        setAcceptances("");
        setTotalNewlyEnrolled("");
        setGrade("");
        setVoiceText("");
        setSoc(false);
    }

    async function handleShowSuggestions() {
        if (!token || !schoolId) {
            alert("You must be logged in to view suggestions.");
            return;
        }

        setShowAiBox(true);
        setAiLoading(true);

        try {
            const res = await fetch(
                `http://localhost:3000/api/admission/suggestions?schoolId=${Number(schoolId)}&soc=${soc ? 1 : 0}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setAiMessages(prev => [
                    ...prev,
                    { sender: "ai", text: data?.error || "Failed to load suggestions." }
                ]);
                return;
            }

            if (data.aiText && !data.aiText.includes("failed")) {
                setAiMessages(prev => [
                    ...prev,
                    { sender: "ai", text: data.aiText }
                ]);
                return;
            }

            const avg = data.averagesPerYear;
            if (!avg) {
                setAiMessages(prev => [
                    ...prev,
                    { sender: "ai", text: "No historical data available yet." }
                ]);
                return;
            }

            const fallbackMessage =
                `Suggested input data:\n\n` +
                `Students Added (avg/yr): ${avg.studentsAdded}\n` +
                `Graduating (avg/yr): ${avg.graduating}\n` +
                `Exchange Students (avg/yr): ${avg.exchangeStudents}\n` +
                `Dismissed (avg/yr): ${avg.dismissed}\n` +
                `Not Invited (avg/yr): ${avg.notInvited}\n` +
                `Not Return (avg/yr): ${avg.notReturn}`;

            setAiMessages(prev => [
                ...prev,
                { sender: "ai", text: fallbackMessage }
            ]);
        } catch (err) {
            console.error(err);
            setAiMessages(prev => [
                ...prev,
                { sender: "ai", text: "Network error while loading suggestions." }
            ]);
        } finally {
            setAiLoading(false);
        }
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

                    <div className="flex flex-row gap-2 mt-2 justify-center">
                        <button type="button" onClick={addDraftAdmissionRecord} className="flex-1">Save Draft</button>
                        <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">Add Admissions</button>

                    </div>
                </form>
            )}

            {/* Floating AI Button */}
            <button
                type="button"
                onClick={() => setShowAiBox(prev => !prev)}
                className="fixed bottom-4 right-4 bg-gray-700 text-white w-20 h-20 flex items-center justify-center rounded-full shadow-lg z-50 hover:bg-gray-800 text-lg" >
                AI
            </button>

            {/* Floating AI Chat Box */}
            {showAiBox && (
                <div className="fixed bottom-20 right-4 w-105 bg-white border border-gray-300 rounded-lg shadow-xl z-50 flex flex-col overflow-hidden">
                    <div className="bg-gray-700 text-white px-4 py-2 flex justify-between items-center">
                        <span className="font-semibold">Admission Assistant</span>
                        <button
                            type="button"
                            onClick={() => setShowAiBox(false)}
                            className="text-white font-bold"
                        >
                            ×
                        </button>
                    </div>

                    <div className="p-3 h-72 overflow-y-auto flex flex-col gap-2 bg-gray-50">
                        {aiMessages.map((msg, index) => (
                            <div
                                key={index}
                                className={`max-w-[85%] p-2 rounded-lg whitespace-pre-line ${
                                    msg.sender === "ai"
                                        ? "bg-gray-200 text-black self-start"
                                        : "bg-blue-500 text-white self-end"
                                }`}
                            >
                                {msg.text}
                            </div>
                        ))}

                        {aiLoading && (
                            <div className="bg-gray-200 text-black self-start p-2 rounded-lg max-w-[85%]">
                                Thinking...
                            </div>
                        )}
                    </div>

                    <div className="p-2 border-t bg-white flex gap-2">
                        <button
                            type="button"
                            onClick={handleShowSuggestions}
                            className="flex-1 bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600"
                        >
                            AI Suggestions
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setAiMessages([
                                    { sender: "ai", text: "Hi! Click “AI Suggestions” and I’ll help with admission recommendations." }
                                ])
                            }
                            className="px-3 py-2 bg-gray-300 rounded hover:bg-gray-400"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}

export default AdmissionForm;