import React, { useEffect, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";

//THIS IS A TEST COMPONENT FOR THE DATA DISPLAY

function Charts() {
    const [schoolIdData, setSchoolIdData] = useState([]);
    const [schoolYearData, setSchoolYearData] = useState([]);
    const [firstTen, setFirstTen] = useState([]);

    useEffect( () => {
        const fetchAll = async () => {
            try {
                const res1 = await fetch("/api/chart/school-id-count")
                const data1 = await res1.json();
                console.log(data1);
                setSchoolIdData(data1);

                const res2 = await fetch("/api/chart/school-year-count");
                const data2 = await res2.json();
                setSchoolYearData(data2);

                const res3 = await fetch("/api/chart/first-10-rows");
                const data3 = await res3.json();
                setFirstTen(data3);
            } catch (err) {
                console.error("Failed to fetch data. Check if server is down or route is 404:", err);
            }
        };
        const unusedVar = fetchAll();
    }, []);

    return (
        <div className="page-layout">
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