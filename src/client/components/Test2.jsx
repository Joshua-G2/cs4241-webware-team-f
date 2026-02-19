import { useState } from "react";
// import "../   ... .css";
import { useNavigate } from 'react-router-dom'; //react router



function Test2() {
    const [item, setItem] = useState("Item");
    const navigate = useNavigate()

    const handleClick = async (e) => {
        e.preventDefault();

        navigate("/") //swap page
    }

    return (
        <div>
            <p>This is page 2!</p>
            <button className="button" onClick={handleClick}>Swap</button>
        </div>
    );
}

export default Test2;
