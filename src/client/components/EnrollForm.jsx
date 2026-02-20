import {useState, useEffect} from 'react'

function EnrollForm() {


    const [title, setTitle] = useState("");
    const [schoolID, setSchoolID] = useState("");
    const [choice, setChoice] = useState("");
    const [subtractReason, setSubtractReason] = useState("");
    const [additionReason, setAdditionReason] = useState("");
    const [changeInStudents, setChangeInStudents] = useState("");

    function addEnrollmentRecord(e) {
        e.preventDefault();
        if(changeInStudents === 0){
            alert("Please enter a change in students larger than 0");
            window.location.href = "/enrollment";
        }



        const enrollment_data = {

        }
    }

    return (
        <div>
            <h1> Add Enrollment Record</h1>
            <form action="" method="POST" onSubmit={addEnrollmentRecord}>
                <label>
                    School Year for This Enrollment
                    <select name="schoolyr" onChange={(e) => setTitle(e.target.value)}>
                        <option value="2023-2024">2023-2024</option>
                        <option value="2024-2025">2024-2025</option>
                        <option value="2025-2026">2025-2026</option>
                        <option value="2026-2027">2026-2027</option>
                    </select>
                </label> <br />
                <label>
                    Add Students
                    <input name="add_students" type="radio" value="add_students" checked={choice === "add_students"} onChange={(e) => setChoice(e.target.value)} />
                </label><br />
                <label>
                    Subtract Students
                    <input name="subtract_students" type="radio" value="subtract_students" checked={choice === "subtract_students"} onChange={(e) => setChoice(e.target.value)} />
                </label> <br/>
                <label>
                    {choice === "subtract_students" ? "How Many Students to Remove" : "How Many Students To Add"}
                    <input name="changeInStudents"  onChange={(e) => setChangeInStudents(e.target.value)} />
                </label> <br />
                {choice === "subtract_students" ? (
                <label>
                    Reason for Subtraction of students
                    <select name="reason_for_subtraction" onChange={(e) => setSubtractReason(e.target.value)}>
                        <option value="Graduation">Graduation</option>
                        <option value="Student Dismissed">Student Dismissed</option>
                        <option value="Student not Invited">Student not Invited</option>
                        <option value="Chose not to Return">Chose not to Return</option>
                    </select>
                </label>) : choice === "add_students" ? (
                <label>
                    Reason for Addition of students
                    <select name="reason_for_subtraction" onChange={(e) => setAdditionReason(e.target.value)}>
                        <option value="Enrollment">Enrollment</option>
                        <option value="Exchange">Exchange</option>
                    </select>
                </label>
                    ): ""}< br/>

                <button type="submit">Add Enrollment</button>


            </form>
        </div>
    );
}


export default EnrollForm;