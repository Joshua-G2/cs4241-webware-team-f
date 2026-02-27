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
    const [school, setSchool] = useState("");
    const [soc, setSoc] = useState(true);
    const [suggestions, setSuggestions] = useState([]); //school suggestions as user types

    const navigate = useNavigate()

    //code from login page
    useEffect( () => {
        console.log("school is now:", school);
        if (school.trim() === "") {
            return;
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
        <div>
            <h1> Add Enrollment Record</h1>
            <form action="" method="POST" className="space-y-4" onSubmit={addEnrollmentRecord}>
                <label>
                    School Year for This Enrollment {" : "}
                    <select name="schoolyr" className="bg-gray-200 border border-gray-500 text-gray-900 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-gray-700"  onChange={(e) => setYear(e.target.value)}>
                        <option value="1">1994</option>
                        <option value="2">1995</option>
                        <option value="3">1996</option>
                        <option value="4">1997</option>
                        <option value="5">1998</option>
                        <option value="6">1999</option>
                        <option value="7">2000</option>
                        <option value="8">2001</option>
                        <option value="9">2002</option>
                        <option value="10">2003</option>
                        <option value="11">2004</option>
                        <option value="12">2005</option>
                        <option value="13">2006</option>
                        <option value="14">2007</option>
                        <option value="15">2008</option>
                        <option value="16">2009</option>
                        <option value="17">2010</option>
                        <option value="18">2011</option>
                        <option value="19">2012</option>
                        <option value="20">2013</option>
                        <option value="21">2014</option>
                        <option value="22">2015</option>
                        <option value="23">2016</option>
                        <option value="24">2017</option>
                        <option value="25">2018</option>
                        <option value="26">2019</option>
                        <option value="27">2020</option>
                        <option value="28">2021</option>
                        <option value="29">2022</option>
                        <option value="30">2023</option>
                        <option value="31">2024</option>
                        <option value="32">2025</option>
                        <option value="33">2026</option>
                    </select>
                </label> <br />
                <label>
                    Gender {" : "}
                    <select name="gender" className="bg-gray-200 border border-gray-500 text-gray-900 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-gray-700" onChange={(e) => setGender(e.target.value)}>
                        <option value="U">All Genders</option>
                        <option value="M">M</option>
                        <option value="F">F</option>
                    </select>
                </label> <br />
                <label>
                    How Many Students Are You Adding this Year {" : "}
                    <input type={"number"} required name="added" className="bg-gray-200 border border-gray-500 text-gray-900 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-gray-700" onChange={(e) => setStudentsAdded(e.target.value)} />
                </label><br/>
                <label>
                    How Many Students Will Be Graduating {" : "}
                    <input type={"number"} requred name="added" className="bg-gray-200 border border-gray-500 text-gray-900 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-gray-700" onChange={(e) => setGraduating(e.target.value)} />
                </label><br/>
                <label>
                    How Many Exchange Students Are Being Added {" : "}
                    <input type={"number"} required name="added" className="bg-gray-200 border border-gray-500 text-gray-900 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-gray-700" onChange={(e) => setExchangeStudents(e.target.value)} />
                </label> <br/>
                <label>
                    How Many Students Are Being Dismissed {" : "}
                    <input type={"number"} required name="added" className="bg-gray-200 border border-gray-500 text-gray-900 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-gray-700" onChange={(e) => setDismissed(e.target.value)} />
                </label><br/>
                <label>
                    How Many Students Will Not Be Invited Back Next Year {" : "}
                    <input type={"number"} required name="added" className="bg-gray-200 border border-gray-500 text-gray-900 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-gray-700" onChange={(e) => setNotInvited(e.target.value)} />
                </label><br/>
                <label>
                    How Many Students Are Choosing Not to Return Next Year {" : "}
                    <input type={"number"} required name="added" className="bg-gray-200 border border-gray-500 text-gray-900 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-gray-700" onChange={(e) => setNotReturn(e.target.value)} />
                </label><br/>
                <label>
                    What Grade is this for (0 for Pre-k, 1 for Kindergarten, +1 for Each Additional Grade) {" : "}
                    <input type={"number"} required className="bg-gray-200 border border-gray-500 text-gray-900 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-gray-700" name="added" onChange={(e) => setGrade(e.target.value)} />
                </label><br/>
                <label>
                    Is This Data For SOC {" : "}
                    <input type="checkbox" checked={soc} onChange={(e) => setSoc(e.target.checked)} className="h-4 w-4 rounded accent-gray-600"/>
                </label><br/>


                <button type="submit">Add Enrollment</button>


            </form>
        </div>
    );
}


export default EnrollForm;