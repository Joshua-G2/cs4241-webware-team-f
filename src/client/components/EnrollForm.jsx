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
    const [suggestions, setSuggestions] = useState([]); //school suggestions as user types

    const navigate = useNavigate()

    const token = localStorage.getItem("token");
    const schoolId = localStorage.getItem("schoolId");
    const school = localStorage.getItem("school");

    function addEnrollmentRecord(e) {
        e.preventDefault();
        if(studentsAdded < 0 || graduating < 0 || exchangeStudents < 0 || dismissed < 0 || notInvited < 0 || notReturn < 0){
            alert("Every form item should be greater than or equal to 0 besides grade");
        } else if(grade < 0 || grade > 13){
            alert("Grade must be between -1 and 12 (Pre-K-12)")
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
                })

        navigate("/Dashboards");
    }

    return (
        <div className="page-layout">
            <h1> Add Enrollment Record</h1>
            <form action="" method="POST" onSubmit={addEnrollmentRecord} className="content-box flex flex-col gap-2">
                <label>
                    Your School:
                    <select name="school" disabled>
                        <option>{school}</option>
                    </select>
                </label> 
                <label>
                    School Year for This Enrollment:
                    <select name="schoolyr" onChange={(e) => setYear(e.target.value)}>
                        {Array.from({ length: 33 }, (_, i) => {
                            const yearValue = 1994 + i; /*years 1994 to 2026*/
                            const optionId = i + 1;
                            return (
                                <option key={optionId} value={optionId}>
                                    {yearValue}
                                </option>
                            );
                        })}
                    </select>
                </label> 
                <label>
                    Gender:
                    <select name="gender" onChange={(e) => setGender(e.target.value)}>
                        <option value="U">All Genders</option>
                        <option value="M">M</option>
                        <option value="F">F</option>
                    </select>
                </label> 
                <label>
                    Students Added this Year:
                    <input type={"number"} required name="added" onChange={(e) => setStudentsAdded(e.target.value)} />
                </label>
                <label>
                    Graduating Students:
                    <input type={"number"} requred name="added" onChange={(e) => setGraduating(e.target.value)} />
                </label>
                <label>
                    Number of Exchange Students:
                    <input type={"number"} required name="added" onChange={(e) => setExchangeStudents(e.target.value)} />
                </label> 
                <label>
                    Number of Dismissed Students:
                    <input type={"number"} required name="added" onChange={(e) => setDismissed(e.target.value)} />
                </label>
                <label>
                    Number of Students Not Invited Back Next Year:
                    <input type={"number"} required name="added" onChange={(e) => setNotInvited(e.target.value)} />
                </label>
                <label>
                    Students Choosing Not to Return Next Year:
                    <input type={"number"} required name="added" onChange={(e) => setNotReturn(e.target.value)} />
                </label>
                <label>
                    Grade Level (0 for Pre-k, 1 for Kindergarten, +1 for Each Additional Grade):
                    <input type={"number"} required name="added" onChange={(e) => setGrade(e.target.value)} />
                </label>
                <label>
                    Is This Data For SOC:
                    <input type="checkbox" checked={soc} onChange={(e) => setSoc(e.target.checked)}/>
                </label>
                <button type="submit">Add Enrollment</button>
            </form>
        </div>
    );
}

export default EnrollForm;