import { useState } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Test2 from "./components/Test2.jsx";
import Test1 from "./components/Test1.jsx";
import Test3 from "./components/Test3.jsx";

function App() {
  const [count, setCount] = useState(0)

    return (
        <Router>
            <Routes>
                <Route path="/" element={<Test1/>} />
                <Route path="/Test2" element={<Test2/>} />
                <Route path="/Test3" element={<Test3/>} />
            </Routes>
        </Router>
    );
}

export default App
