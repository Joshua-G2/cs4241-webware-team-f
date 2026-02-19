import { useState } from "react";
// import "../   ... .css";
import { useNavigate } from 'react-router-dom'; //react router



function Test1() {
    const [item, setItem] = useState("Item");
    const navigate = useNavigate()

    const handleClick = async (e) => {
        e.preventDefault();

        navigate("/Test2") //swap page
    }

    return (
        <div>
            <p>This is page 1!</p>
            <button className="button" onClick={handleClick}>Swap</button>
        </div>
    );
}

export default Test1;
