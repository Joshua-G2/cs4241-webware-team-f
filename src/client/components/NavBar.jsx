import {useEffect, useState} from "react";
// import "../   ... .css";
import { useNavigate } from 'react-router-dom'; //react router


function NavBar() {
    const navigate = useNavigate()
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const isAdmin = localStorage.getItem('isAdmin') === "1";

    const handleLogOut = async (e) => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("isAdmin");

        navigate("/") //Return to login page
    }

    //for swaping between light and dark mode
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) return savedTheme === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    //apply dark class to html tag when state change
    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark'); //local storage
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light'); //local storage
        }
    }, [isDarkMode]);

    return (
        <div className="nav-bar flex items-center px-6">
            {/* welcome message left aligned */}
            <div className="flex-1 flex justify-start">
                {token && (
                    <p className="font-bold text-lg whitespace-nowrap">
                        Welcome, {username}
                    </p>
                )}
                {!token && (
                    <button id="nav-button" className="nav-button bg-transparent border-none hover:text-blue-500" onClick={() => navigate("/")}>
                        Login
                    </button>
                )}
            </div>

            {/* nav buttons centered */}
            <div className="flex-none flex items-center justify-center">
                {token && (
                    <>
                        {/*<button className="bg-transparent border-none hover:text-blue-500" onClick={() => navigate("/DataDisplay")}>*/}
                        {/*    Test*/}
                        {/*</button>*/}

                        {/*<div className="nav-divider"></div>*/}

                        <button id="nav-button" className="nav-button hover:text-blue-500" onClick={() => navigate("/Dashboards")}>
                            Dashboards
                        </button>

                        {!isAdmin && (
                            <>
                                <div className="nav-divider"></div>
                                <button id="nav-button" className="nav-button hover:text-blue-500" onClick={() => navigate("/enrollment")}>
                                    Add Enrollment
                                </button>

                                <div className="nav-divider"></div>
                                <button id="nav-button" className="nav-button hover:text-blue-500" onClick={() => navigate("/admissions")}>
                                    Add Admissions
                                </button>
                            </>
                        )}

                        <div className="nav-divider"></div>

                        <button id="nav-button" className="nav-button hover:text-red-500" onClick={handleLogOut}>
                            Logout
                        </button>
                    </>
                )}
            </div>
            {/* credits right aligned */}
            <div className="flex-1 flex justify-end items-center gap-4">
                <button
                    className="nav-button"
                    onClick={() => setIsDarkMode(!isDarkMode)}>
                    {isDarkMode ? '☀️ Light' : '🌙 Dark'}
                </button>
                <p className="font-bold whitespace-nowrap">
                    Created by WPI Webware Team F
                </p>
            </div>
        </div>
    );
}

export default NavBar;