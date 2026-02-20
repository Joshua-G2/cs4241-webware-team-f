import { useState } from "react";
// import "../   ... .css";
import { useNavigate } from 'react-router-dom'; //react router


function NavBar() {
    const [isAdmin, setisAdmin] = useState(0);
    const navigate = useNavigate()

    const handleClick = async (e) => {
        e.preventDefault();

        navigate("/Test2") //swap page
    }

    return (
        <div className="nav-bar">
            <button className="button" onClick={(e) => {
                e.preventDefault();
                navigate("/");
            }}>Login</button>
            <button className="button" onClick={(e) => {
                e.preventDefault();
                navigate("/Test1");
            }}>Test1</button>
            <button className="button" onClick={(e) => {
                e.preventDefault();
                navigate("/Test2");
            }}>Test2</button>
            <button className="button" onClick={(e) => {
                e.preventDefault();
                navigate("/Dashboards");
            }}>Dashboards</button>
        </div>
    );
}

export default NavBar;
