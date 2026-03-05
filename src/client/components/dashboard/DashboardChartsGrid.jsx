// Layout container for all enrollment dashboard charts and the peer-group totals
// card, consuming pre-shaped Chart.js data and options from dashboard hooks.
import React from "react";
import { Bar, Line } from "react-chartjs-2";
import { Card } from "./DashboardElements";
export default function ChartsGrid({
    comparing,
    year1Label,
    year2Label,
    yearCompareBar,
    gradeBarData,
    trendLineData,
    enrollStackedData,
    baseOptions,
    stackedOptions,
    payload,
}) {
    return (
        <div
            style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))",
                gap: 16,
                alignItems: "start",
            }}
        >
            <Card title={comparing ? `Year Comparison: ${year1Label} vs ${year2Label}` : "Attrition by Grade (Bar)"}>
                {comparing && yearCompareBar ? (
                    <Bar data={yearCompareBar} options={baseOptions} />
                ) : gradeBarData ? (
                    <Bar data={gradeBarData} options={baseOptions} />
                ) : (
                    <div>No grade-level data available.</div>
                )}
            </Card>

            <Card title="Added Trend (Line)">
                {trendLineData ? <Line data={trendLineData} options={baseOptions} /> : <div>No trend data.</div>}
            </Card>

            <Card title="Enrollment by Type & Gender (Stacked Bar)">
                {enrollStackedData ? (
                    <Bar data={enrollStackedData} options={stackedOptions} />
                ) : (
                    <div>No enrollment activity data.</div>
                )}
            </Card>

            <Card title="Peer Group Totals (Aggregate)">
                <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                    <div>Added: {payload.benchTotals.added}</div>
                    <div>Graduated: {payload.benchTotals.graduated}</div>
                    <div>Dismissed: {payload.benchTotals.dismissed}</div>
                    <div>Not Invited: {payload.benchTotals.notInvited}</div>
                    <div>Not Returning: {payload.benchTotals.notReturning}</div>
                </div>
            </Card>
        </div>
    );
}

