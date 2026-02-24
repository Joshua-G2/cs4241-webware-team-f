import { useState } from "react";
// import "../   ... .css";
import { useNavigate } from 'react-router-dom'; //react router


function NavBar() {
    const navigate = useNavigate()
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('isAdmin') === "1";

    const handleLogOut = async (e) => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("isAdmin");

        navigate("/") //Return to login page
    }

    return (
        <div className="nav-bar">
            {!token && (
                <button className="button" onClick={() => navigate("/")}>
                    Login
                </button>)}

            {token && (
                <>
                    <button className="button" onClick={() => navigate("/DataDisplay")}>
                        DataDisplay
                    </button>
                    <button className="button" onClick={() => navigate("/Dashboards")}>
                        Dashboards
                    </button>
                    {isAdmin && (
                        <button className="button" onClick={() => navigate("/enrollment")}>
                            Add Enrollment
                        </button>
                    )}
                    <button className="button" onClick={handleLogOut}>
                        Logout
                    </button>

                </>)}
        </div>
    );
}

export default NavBar;