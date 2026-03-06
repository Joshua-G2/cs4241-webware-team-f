import {useEffect, useState} from "react";
// import "../Login.css";
import { useNavigate } from 'react-router-dom'; //react router

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [school, setSchool] = useState("");
    const [suggestions, setSuggestions] = useState([]); //school suggestions as user types
    const [schoolId, setSchoolId] = useState(null);
    const navigate = useNavigate()
    let token = localStorage.getItem('token'); //store as global var
    const [badLogin, setBadLogin] = useState("");

    useEffect( () => {
        console.log("badLogin is now:", badLogin);
    }, [badLogin] );

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



    const handleLogin = async (e) => {
        e.preventDefault();
        console.log("Login Received: ", username, password);

        const body = JSON.stringify( { username, password, school: school.trim() || undefined, schoolId: schoolId || undefined } );
        const response = await fetch( "/login", {
            method:'POST',
            headers: {
                'Content-Type': 'application/json' //tell server using json!
            },
            body
        })
        setUsername("");
        setPassword("");

        //parse token
        const text = await response.text()
        console.log("text:", text)
        try {
            const received_tk = JSON.parse(text)
            console.log("received_tk:", received_tk)

            if (received_tk && received_tk.token) {
                console.log("received token", received_tk.token);
                localStorage.setItem('token', received_tk.token); //STORE THE TOKEN
                localStorage.setItem('username', username); //STORE FOR USE LATER
                localStorage.setItem("isAdmin", received_tk.isAdmin ? "1" : "0");
                localStorage.setItem("schoolId", String(schoolId ?? ""));
                localStorage.setItem("school", school);
                console.log(schoolId)
                setBadLogin("");
                navigate('/Dashboards')
            } else if (received_tk && received_tk.error) {
                setBadLogin(received_tk.error);
            } else {
                console.log("Bad Login")
                setBadLogin("Invalid username or password.");
            }
        } catch (error) {
            console.log(error);
            setBadLogin("Invalid username or password.");
        }
    }

    return (
        <div className="page-layout">
            <h1> Login </h1>
            <form className="content-box flex flex-col items-center" id="login-form">
                {/* 3x2 Grid Container */}
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-4 items-center w-full max-w-md text-left">
                    {/* Row 1: Username */}
                    <label htmlFor="username" className="justify-start">Username:</label>
                    <input
                        type="text"
                        id="username"
                        placeholder="Username"
                        value={username}
                        required
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    {/* Row 2: Password */}
                    <label htmlFor="password" className="justify-start">Password:</label>
                    <input
                        type="password"
                        id="password"
                        placeholder="Password"
                        value={password}
                        required
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {/* Row 3: School */}
                    <label htmlFor="school" className="justify-start">School:</label>
                    <div className="relative w-full">
                        {/* Input is wrapped in a relative div so the dropdown anchors to it */}
                        <input
                            type="text"
                            className="w-full"
                            id="school"
                            placeholder="Start Typing..."
                            value={school}
                            autoComplete="off"
                            onChange={(e) => {
                                setSchool(e.target.value);
                                setSchoolId(null);
                            }}
                        />

                        {/* School Suggestions Dropdown */}
                        {school.trim() !== "" && !suggestions.some(s => s.NAME_TX === school) && (
                            <ul className="dropdown-list border border-gray-300 shadow-lg bg-white dark:bg-gray-800">
                                {(suggestions.length > 0) ? (
                                    suggestions.map((suggestion, index) => (
                                        <li className="dropdown-item"
                                            key={suggestion._id || index}
                                            onClick={() => {
                                                setSchool(suggestion.NAME_TX);
                                                setSchoolId(suggestion.ID);
                                                setSuggestions([]);
                                            }}>
                                            {suggestion.NAME_TX}
                                        </li>
                                    ))
                                ) : (
                                    <li className="no-results error-box text-xs">
                                        <span>⚠️</span> No Schools found
                                    </li>
                                )}
                            </ul>
                        )}
                    </div>
                </div>
                {/* Error Message & Login Button */}
                {badLogin && (
                    <p className="error-box text-red-500 mt-4 font-medium">{badLogin}</p>
                )}

                <button className="button mt-6 w-full max-w-[200px]" id="login-button" onClick={handleLogin}>
                    Login
                </button>
            </form>
        </div>
    );
}

export default Login;
