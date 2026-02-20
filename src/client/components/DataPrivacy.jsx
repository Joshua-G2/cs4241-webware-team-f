import { useState } from "react";
// import "../   ... .css";
import { useNavigate } from 'react-router-dom'; //react router



function DataPrivacy() {
    const [item, setItem] = useState("Item");
    const navigate = useNavigate()

    const handleClick = async (e) => {
        e.preventDefault();

        navigate("/") //swap page
    }

    return (
        <div>
            <p>This is page data privacy!</p>
            <button className="button" onClick={handleClick}>Swap</button>
        </div>
    );
}

export default DataPrivacy;
