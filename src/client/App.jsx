import { useState } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import DataDisplay from "./components/DataDisplay.jsx";
import Dashboards from "./components/Dashboards.jsx";
import Login from "./components/Login.jsx";
import EnrollForm from "./components/EnrollForm.jsx";

function App() {
  const [count, setCount] = useState(0)

    return (
        <Router>
            <NavBar />
            <Routes>
                <Route path="/" element={<Login/>} />
                <Route path="/DataDisplay" element={<DataDisplay/>} />
                <Route path="/Dashboards" element={<Dashboards/>} />
                <Route path="/enrollment" element={<EnrollForm/>} />
            </Routes>
        </Router>
    );
}

export default App
