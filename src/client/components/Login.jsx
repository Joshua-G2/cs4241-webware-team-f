import {useEffect, useState} from "react";
// import "../Login.css";
import { useNavigate } from 'react-router-dom'; //react router

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate()
    // let token = localStorage.getItem('token'); //store as global var
    const [badLogin, setBadLogin] = useState("");

    useEffect( () => {
        console.log("badLogin is now:", badLogin);
    }, [badLogin] );

    const handleLogin = async (e) => {
        e.preventDefault();
        console.log("Login Received: ", username, password);

        // const body = JSON.stringify( {username: username, password: password} );
        // const response = await fetch( "/login", {
        //     method:'POST',
        //     headers: {
        //         'Content-Type': 'application/json' //tell server using json!
        //     },
        //     body
        // })
        setUsername("");
        setPassword("");

        // const text = await response.text()
        // console.log("text:", text)
        // try {
        //     const received_tk = JSON.parse(text)
        //     console.log("received_tk:", received_tk)
        //
        //     if (received_tk && received_tk.token) {
        //         console.log("received token", received_tk.token);
        //         localStorage.setItem('token', received_tk.token); //STORE THE TOKEN
        //         localStorage.setItem('username', username); //STORE FOR USE LATER
        //         setBadLogin("");
        //         navigate('/grocery-list')
        //     } else {
        //         console.log("Bad Login")
        //         setBadLogin("Invalid username or password.");
        //     }
        // } catch (error) {
        //     console.log(error);
        //     setBadLogin("Invalid username or password.");
        // }




    }

    return (
        <div className="Login">
            <h1 className="page-top"> Login </h1>
            <h2 className="subtext"> Please log in. </h2>

            <form id="login-form">
                <h2> Login / Register </h2>
                <div>
                    <label htmlFor="username">Username: </label>
                    <input type="text" id="username" placeholder="Username" value={username} required onChange={
                        (e) => setUsername(e.target.value)
                    }/>
                </div>
                <div>
                    <label htmlFor="password">Password: </label>
                    <input type="password" id="password" placeholder="Password" value={password} required onChange={
                        (e) => setPassword(e.target.value)
                    }/>
                </div>
                {badLogin && (
                    <p>{badLogin}</p>
                )}
                <button className="button" id="login-button" onClick={handleLogin}>Login</button>
                <p className="subtext"> * Note: There are no signups currently.</p>
            </form>
        </div>
    );
}

export default Login;
