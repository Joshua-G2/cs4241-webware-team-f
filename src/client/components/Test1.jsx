import { useState } from "react";
// import "../   ... .css";
import reactLogo from '/assets/react.svg'
import viteLogo from '/assets/vite.svg'
import { useNavigate } from 'react-router-dom'; //react router



function Test1() {
    const [count, setCount] = useState(0);
    const navigate = useNavigate()

    const handleClick = async (e) => {
        e.preventDefault();

        navigate("/Test2") //swap page
    }

    return (
        <div>
            <p>This is page 1!</p>
            <button className="button" onClick={handleClick}>Swap</button>

            <br/>

            <div>
                <a href="https://vite.dev" target="_blank">
                    <img src={viteLogo} className="logo" alt="Vite logo" />
                </a>
                <a href="https://react.dev" target="_blank">
                    <img src={reactLogo} className="logo react" alt="React logo" />
                </a>
            </div>
            <h1>Vite + React</h1>
            <div className="card">
                <button onClick={() => setCount((count) => count + 1)}>
                    count is {count}
                </button>
                <p>
                    Edit <code>src/client/App.jsx</code> and save to test HMR
                </p>
            </div>
            <p className="read-the-docs">
                Click on the Vite and React logos to learn more
            </p>
        </div>
    );
}

export default Test1;
