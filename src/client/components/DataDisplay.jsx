import React, { useEffect, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";

function Charts() {
    const [schoolIdData, setSchoolIdData] = useState([]);
    const [schoolYearData, setSchoolYearData] = useState([]);
    const [firstTen, setFirstTen] = useState([]);

    useEffect(() => {
        fetch("http://localhost:5000/api/chart/school-id-count")
            .then(res => res.json())
            .then(setSchoolIdData);

        fetch("http://localhost:5000/api/chart/school-year-count")
            .then(res => res.json())
            .then(setSchoolYearData);

        fetch("http://localhost:5000/api/chart/first-10-rows")
            .then(res => res.json())
            .then(setFirstTen);
    }, []);

    return (
        <div>
            <h1> MONGO DATA: </h1>
            <h2>Count by School ID</h2>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={schoolIdData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" />
                </BarChart>
            </ResponsiveContainer>

            <h2>Count by School Year</h2>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={schoolYearData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" />
                </BarChart>
            </ResponsiveContainer>

            <h2>First 10 Rows (All Fields)</h2>
            <pre>
        {JSON.stringify(firstTen, null, 2)}
      </pre>

        </div>
    );
}

export default Charts;