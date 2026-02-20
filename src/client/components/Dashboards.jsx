import { useMemo, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import { enrollmentMock } from "../mockData/mockEnrollmentData.js";

export default function EnrollmentDashboard() {
    const [data, setData] = useState(enrollmentMock);
    const [year, setYear] = useState(enrollmentMock.year);

    async function onYearChange(e) {
        const y = Number(e.target.value);
        setYear(y);

        // Later replace with:
        // const next = await fetch(`/api/enrollment/${y}`).then(r => r.json());
        // setData(next);

        setData((prev) => ({ ...prev, year: y }));
    }

    const years = data.trend?.years?.length ? data.trend.years : [2022, 2023, 2024];

    const barData = useMemo(() => ({
        labels: data.attritionByGrade.map(r => r.gradeLabel),
        datasets: [
            { label: "Added", data: data.attritionByGrade.map(r => r.added) },
            { label: "Not Returning", data: data.attritionByGrade.map(r => r.notReturning) },
            { label: "Dismissed", data: data.attritionByGrade.map(r => r.dismissed) },
        ],
    }), [data]);

    const barOptions = {
        responsive: true,
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { position: "top" } },
    };

    const lineData = useMemo(() => ({
        labels: data.trend.years,
        datasets: [
            { label: "My Added", data: data.trend.myAdded },
            { label: "Peer Avg Added", data: data.trend.peerAvgAdded },
        ],
    }), [data]);

    const lineOptions = {
        responsive: true,
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { position: "top" } },
    };

    return (
        <div style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h2>Enrollment Dashboard</h2>
                    <div>{data.mySchool.name}</div>
                </div>

                <select value={year} onChange={onYearChange}>
                    {years.map(y => <option key={y}>{y}</option>)}
                </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginTop: 16 }}>
                <Kpi title="Added" value={data.totals.added} />
                <Kpi title="Graduated" value={data.totals.graduated} />
                <Kpi title="Dismissed" value={data.totals.dismissed} />
                <Kpi title="Not Invited" value={data.totals.notInvited} />
                <Kpi title="Not Returning" value={data.totals.notReturning} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                <Bar data={barData} options={barOptions} />
                <Line data={lineData} options={lineOptions} />
            </div>
        </div>
    );
}

function Kpi({ title, value }) {
    return (
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
            <div>{title}</div>
            <div style={{ fontSize: 22 }}>{value}</div>
        </div>
    );
}