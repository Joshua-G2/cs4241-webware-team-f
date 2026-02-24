import {useState, useEffect} from 'react'

function EnrollForm() {


    const [year, setYear] = useState("24");
    const [gender, setGender] = useState("U");
    const [studentsAdded, setStudentsAdded] = useState("");
    const [graduating, setGraduating] = useState("");
    const [exchangeStudents, setExchangeStudents] = useState("");
    const [dismissed,setDismissed] = useState("");
    const [notInvited, setNotInvited] = useState("");
    const [notReturn, setNotReturn] = useState("");
    const [grade, setGrade] = useState("");
    const [school, setSchool] = useState("");
    const [suggestions, setSuggestions] = useState([]); //school suggestions as user types

    //code from login page
    useEffect( () => {
        console.log("school is now:", school);
        if (school.trim() === "") {
            return; //empty
        }

        const namesOnly = suggestions.map((sel) => sel.NAME_TX);
        console.log("namesOnly:", namesOnly);
        if (namesOnly.includes(school)) {
            setSuggestions([]);
            return; //clicked on option, don't display that 1 result
        }

        //top 10 suggestions from database
        const fetchSchoolSuggestions = async () => {
            console.log("querying db:", school);
            try {
                const response = await fetch(`/api/login/schools?query=${encodeURIComponent(school)}`);
                const schools = await response.json() //array
                console.log(schools)
                setSuggestions(schools);
            } catch (error) {
                console.error('Error fetching schools:', error);
            }
        }
        fetchSchoolSuggestions().then()
    }, [school] );


    const token = localStorage.getItem("token");

    function addEnrollmentRecord(e) {
        e.preventDefault();
        if(studentsAdded < 0 || graduating < 0 || exchangeStudents < 0 || dismissed < 0 || notInvited < 0 || notReturn < 0){
            alert("Every form item should be greater than or equal to 0 besides grade");
            window.location.href = "/enrollment";
        } else if(grade < 0 || grade > 13){
            alert("Grade must be between -1 and 12 (Pre-K-12)")
            window.location.href = "/enrollment";
        }



        const enrollment_data = {
            school: school,
            year: Number(year),
            gender: gender,
            studentsAdded: Number(studentsAdded),
            graduating: Number(graduating),
            exchangeStudents: Number(exchangeStudents),
            dismissed: Number(dismissed),
            notInvited: Number(notInvited),
            notReturn: Number(notReturn),
            grade: Number(grade)
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
                history.push("/");})
    }

    return (
        <div>
            <h1> Add Enrollment Record</h1>
            <form action="" method="POST" onSubmit={addEnrollmentRecord}>
                <label>
                    School Year for This Enrollment {" : "}
                    <select name="schoolyr" onChange={(e) => setYear(e.target.value)}>
                        <option value="24">2023-2024</option>
                        <option value="25">2024-2025</option>
                        <option value="26">2025-2026</option>
                        <option value="27">2026-2027</option>
                    </select>
                </label> <br />
                <label>
                    Gender {" : "}
                    <select name="gender" onChange={(e) => setGender(e.target.value)}>
                        <option value="U">All Genders</option>
                        <option value="M">M</option>
                        <option value="F">F</option>
                    </select>
                </label> <br />
                <label>
                    How Many Students Are You Adding this Year {" : "}
                    <input type={"number"} name="added" onChange={(e) => setStudentsAdded(e.target.value)} />
                </label><br/>
                <label>
                    How Many Students Will Be Graduating {" : "}
                    <input type={"number"} name="added" onChange={(e) => setGraduating(e.target.value)} />
                </label><br/>
                <label>
                    How Many Exchange Students Are Being Added {" : "}
                    <input type={"number"} name="added" onChange={(e) => setExchangeStudents(e.target.value)} />
                </label> <br/>
                <label>
                    How Many Students Are Being Dismissed {" : "}
                    <input type={"number"} name="added" onChange={(e) => setDismissed(e.target.value)} />
                </label><br/>
                <label>
                    How Many Students Will Not Be Invited Back Next Year {" : "}
                    <input type={"number"} name="added" onChange={(e) => setNotInvited(e.target.value)} />
                </label><br/>
                <label>
                    How Many Students Are Choosing Not to Return Next Year {" : "}
                    <input type={"number"} name="added" onChange={(e) => setNotReturn(e.target.value)} />
                </label><br/>
                <label>
                    What Grade is this for (0 for Pre-k, 1 for Kindergarten, +1 for Each Additional Grade) {" : "}
                    <input type={"number"} name="added" onChange={(e) => setGrade(e.target.value)} />
                </label><br/>
                <div>
                    <label htmlFor="school">School: </label>
                    <input type="text" placeholder="Start Typing..." value={school} required onChange={
                        (e) => setSchool(e.target.value)
                    }/>
                    <ul>
                        {(suggestions.length > 0 && school.length > 0) ? //not empty?
                            suggestions.map((suggestion, index) => (
                                <li id="school-item"
                                    key={suggestion._id || index}
                                    // value={suggestion.NAME_TX}
                                    onClick={(e) => {
                                        setSchool(suggestion.NAME_TX)
                                    }}>
                                    {suggestion.NAME_TX}</li>
                            ) ) : //if empty...
                            <li>No Schools found</li>
                        }
                    </ul>
                </div>


                <button type="submit">Add Enrollment</button>


            </form>
        </div>
    );
}


export default EnrollForm;