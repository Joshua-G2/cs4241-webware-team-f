import { useState } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import Test2 from "./components/Test2.jsx";
import Test1 from "./components/Test1.jsx";
import DataPrivacy from "./components/DataPrivacy.jsx";
import Login from "./components/Login.jsx";
import EnrollForm from "./components/EnrollForm.jsx";

function App() {
  const [count, setCount] = useState(0)

    return (
        <Router>
            <NavBar />
            <Routes>
                <Route path="/" element={<Login/>} />
                <Route path="/Test1" element={<Test1/>} />
                <Route path="/Test2" element={<Test2/>} />
                <Route path="/data-privacy" element={<DataPrivacy/>} />
                <Route path="/enrollment" element={<EnrollForm/>} />
            </Routes>
        </Router>
    );
}

export default App
