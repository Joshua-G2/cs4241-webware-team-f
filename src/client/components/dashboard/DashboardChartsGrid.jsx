// Charts grid: same layout for enrollment and admissions; dataMode drives bar/trend titles and peer-totals fields
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
    dataMode = "enrollment",
}) {
    const isAdmissions = dataMode === "admissions";
    const benchTotals = payload?.benchTotals || {};

    // Swap titles and peer-totals content for admissions (capacity, contracted, apps, acceptances, new enrollments)
    const barChartTitle = comparing
        ? `Year Comparison: ${year1Label} vs ${year2Label}`
        : isAdmissions
            ? "Admissions by Grade (Bar)"
            : "Attrition by Grade (Bar)";
    const trendTitle = isAdmissions ? "New Enrollments Trend (Line)" : "Added Trend (Line)";

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
            <Card title={barChartTitle}>
                {comparing && yearCompareBar ? (
                    <Bar data={yearCompareBar} options={baseOptions} />
                ) : gradeBarData ? (
                    <Bar data={gradeBarData} options={baseOptions} />
                ) : (
                    <div>No grade-level data available.</div>
                )}
            </Card>

            <Card title={trendTitle}>
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
                    {/* Admissions: capacity, contracted, completed apps, acceptances, new enrollments; else attrition fields */}
                    {isAdmissions ? (
                        <>
                            <div>Capacity: {benchTotals.capacity ?? "—"}</div>
                            <div>Contracted: {benchTotals.contractedTotal ?? "—"}</div>
                            <div>Completed Applications: {benchTotals.completedApplications ?? "—"}</div>
                            <div>Acceptances: {benchTotals.acceptances ?? "—"}</div>
                            <div>New Enrollments: {benchTotals.newEnrollments ?? "—"}</div>
                        </>
                    ) : (
                        <>
                            <div>Added: {benchTotals.added ?? "—"}</div>
                            <div>Graduated: {benchTotals.graduated ?? "—"}</div>
                            <div>Dismissed: {benchTotals.dismissed ?? "—"}</div>
                            <div>Not Invited: {benchTotals.notInvited ?? "—"}</div>
                            <div>Not Returning: {benchTotals.notReturning ?? "—"}</div>
                        </>
                    )}
                </div>
            </Card>
        </div>
    );
}

