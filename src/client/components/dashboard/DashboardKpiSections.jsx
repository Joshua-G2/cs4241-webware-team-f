// KPI and summary sections for the enrollment dashboard, composed from shared
// dashboard UI elements to describe peer comparisons and year-over-year changes.
import React from "react";
import { Section, Kpi, formatDelta } from "./DashboardElements";

// Displays peer-group attrition KPIs for the selected year and benchmark.
export function PeerComparisonSection({ headline, benchmarkLabel, year1Label }) {
    return (
        <Section
            title="Peer Group Comparison (Selected Year)"
            subtitle={`These compare your selected school in ${year1Label} to the chosen peer group (${benchmarkLabel}).`}
        >
            {headline && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                    <Kpi
                        title={`Peer Attrition Rate (${benchmarkLabel})`}
                        value={`${(headline.benchRate * 100).toFixed(1)}%`}
                        sub={`Across ${headline.groupSize} schools`}
                    />
                    <Kpi
                        title="My School Attrition vs Peers"
                        value={`${(headline.diff * 100).toFixed(1)} pts`}
                        sub={
                            headline.diff < 0
                                ? "Lower than peers"
                                : headline.diff > 0
                                    ? "Higher than peers"
                                    : "Same as peers"
                        }
                    />
                </div>
            )}
        </Section>
    );
}

// Shows year-over-year changes in added students and net enrollment for the selected school/year.
export function YearOverYearSection({ yoyAdded, previousYearLabel, year1Label, netChange }) {
    return (
        <Section
            title="Year-over-Year (Selected School)"
            subtitle={
                previousYearLabel
                    ? `These compare your selected year (${year1Label}) to the previous available year with data (${previousYearLabel}).`
                    : `These show year-over-year metrics for the selected year (${year1Label}). No previous year with data is available.`
            }
        >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                <Kpi
                    title="Added vs previous year"
                    value={formatDelta(yoyAdded.value)}
                    sub={previousYearLabel ? `${year1Label} vs ${previousYearLabel}` : "No previous year available"}
                />
                <Kpi
                    title="Net Enrollment Change"
                    value={netChange > 0 ? `+${netChange}` : netChange}
                    sub={`Selected year: ${year1Label}`}
                />
            </div>
        </Section>
    );
}

// Compares two selected years for the same school, highlighting deltas across key KPIs.
export function CompareYearsSection({ comparing, compareDelta, year1Label, year2Label }) {
    if (!comparing || !compareDelta) return null;

    return (
        <div style={{ marginTop: 14 }}>
            <Section
                title="Selected Year vs Compare Year (Selected School)"
                subtitle={`These compare your school in ${year1Label} vs ${year2Label}.`}
            >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                    <Kpi title={`Δ Added (${year1Label} - ${year2Label})`} value={formatDelta(compareDelta.added)} />
                    <Kpi title={`Δ Not Returning (${year1Label} - ${year2Label})`} value={formatDelta(compareDelta.notReturning)} />
                    <Kpi title="Δ Attrition Rate" value={`${formatDelta(compareDelta.attritionPts.toFixed(1))} pts`} />
                    <Kpi title="Δ Net Change" value={formatDelta(compareDelta.netChange)} />
                </div>
            </Section>
        </div>
    );
}

// Summarizes total counts and attrition rate for the selected school and year.
export function TotalsSection({ kpis, year1Label }) {
    return (
        <div style={{ marginTop: 14 }}>
            <Section
                title="Selected Year Totals (Selected School)"
                subtitle={`These are the raw totals for your selected school in ${year1Label}.`}
            >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
                    <Kpi title="Added" value={kpis.totals.added} />
                    <Kpi title="Graduated" value={kpis.totals.graduated} />
                    <Kpi title="Dismissed" value={kpis.totals.dismissed} />
                    <Kpi title="Not Invited" value={kpis.totals.notInvited} />
                    <Kpi title="Not Returning" value={kpis.totals.notReturning} />
                    <Kpi title="Attrition Rate" value={`${(kpis.attritionRate * 100).toFixed(1)}%`} />
                </div>
            </Section>
        </div>
    );
}

