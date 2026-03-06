// KPI and summary sections for the enrollment dashboard, composed from shared
// dashboard UI elements to describe peer comparisons and year-over-year changes.
import React from "react";
import { Section, Kpi, formatDelta } from "./DashboardElements";

// Peer comparison: enrollment = attrition rate; admissions = new enrollments (my vs benchmark)
export function PeerComparisonSection({ headline, benchmarkLabel, year1Label, dataMode }) {
    const isAdmissions = dataMode === "admissions";

    return (
        <Section
            title="Peer Group Comparison (Selected Year)"
            subtitle={`These compare your selected school in ${year1Label} to the chosen peer group (${benchmarkLabel}).`}
        >
            {headline && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                    {/* Admissions: show benchmark and my new enrollments instead of attrition rate */}
                    {isAdmissions ? (
                        <>
                            <Kpi
                                title={`Benchmark New Enrollments (${benchmarkLabel})`}
                                value={headline.benchNewEnrollments ?? "—"}
                                sub={`Across ${headline.groupSize} schools`}
                            />
                            <Kpi
                                title="My School New Enrollments"
                                value={headline.myNewEnrollments ?? "—"}
                                sub={`Total for ${year1Label}`}
                            />
                        </>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>
            )}
        </Section>
    );
}

// YOY: enrollment = added vs previous / net change; admissions = new enrollments vs previous / selected-year total
export function YearOverYearSection({ yoyAdded, previousYearLabel, year1Label, netChange, dataMode }) {
    const isAdmissions = dataMode === "admissions";

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
                    title={isAdmissions ? "New Enrollments vs previous year" : "Added vs previous year"}
                    value={formatDelta(yoyAdded.value)}
                    sub={previousYearLabel ? `${year1Label} vs ${previousYearLabel}` : "No previous year available"}
                />
                <Kpi
                    title={isAdmissions ? "New Enrollments (selected year)" : "Net Enrollment Change"}
                    value={formatDelta(netChange)}
                    sub={`Selected year: ${year1Label}`}
                />
            </div>
        </Section>
    );
}

// Compare years: enrollment = attrition deltas; admissions = capacity/contracted/apps/acceptances/newEnrollments deltas
export function CompareYearsSection({ comparing, compareDelta, year1Label, year2Label, dataMode }) {
    if (!comparing || !compareDelta) return null;

    const isAdmissions = dataMode === "admissions";

    return (
        <div style={{ marginTop: 14 }}>
            <Section
                title="Selected Year vs Compare Year (Selected School)"
                subtitle={`These compare your school in ${year1Label} vs ${year2Label}.`}
            >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                    {/* Admissions: deltas for capacity, contracted, completed apps, acceptances, new enrollments */}
                    {isAdmissions ? (
                        <>
                            <Kpi title={`Δ Capacity (${year1Label} - ${year2Label})`} value={formatDelta(compareDelta.capacity)} />
                            <Kpi title={`Δ Contracted`} value={formatDelta(compareDelta.contractedTotal)} />
                            <Kpi title="Δ Completed Apps" value={formatDelta(compareDelta.completedApplications)} />
                            <Kpi title="Δ Acceptances" value={formatDelta(compareDelta.acceptances)} />
                            <Kpi title="Δ New Enrollments" value={formatDelta(compareDelta.newEnrollments)} />
                        </>
                    ) : (
                        <>
                            <Kpi title={`Δ Added (${year1Label} - ${year2Label})`} value={formatDelta(compareDelta.added)} />
                            <Kpi title={`Δ Not Returning (${year1Label} - ${year2Label})`} value={formatDelta(compareDelta.notReturning)} />
                            <Kpi title="Δ Attrition Rate" value={`${formatDelta(compareDelta.attritionPts?.toFixed(1))} pts`} />
                            <Kpi title="Δ Net Change" value={formatDelta(compareDelta.netChange)} />
                        </>
                    )}
                </div>
            </Section>
        </div>
    );
}

// Totals: enrollment = added/graduated/dismissed/etc. + attrition rate; admissions = capacity/contracted/apps/acceptances/new enrollments
export function TotalsSection({ kpis, year1Label, dataMode }) {
    const isAdmissions = dataMode === "admissions";

    return (
        <div style={{ marginTop: 14 }}>
            <Section
                title="Selected Year Totals (Selected School)"
                subtitle={`These are the raw totals for your selected school in ${year1Label}.`}
            >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
                    {/* Admissions: capacity, contracted, completed applications, acceptances, new enrollments */}
                    {isAdmissions ? (
                        <>
                            <Kpi title="Capacity" value={kpis.totals.capacity} />
                            <Kpi title="Contracted" value={kpis.totals.contractedTotal} />
                            <Kpi title="Completed Applications" value={kpis.totals.completedApplications} />
                            <Kpi title="Acceptances" value={kpis.totals.acceptances} />
                            <Kpi title="New Enrollments" value={kpis.totals.newEnrollments} />
                        </>
                    ) : (
                        <>
                            <Kpi title="Added" value={kpis.totals.added} />
                            <Kpi title="Graduated" value={kpis.totals.graduated} />
                            <Kpi title="Dismissed" value={kpis.totals.dismissed} />
                            <Kpi title="Not Invited" value={kpis.totals.notInvited} />
                            <Kpi title="Not Returning" value={kpis.totals.notReturning} />
                            <Kpi title="Attrition Rate" value={`${(kpis.attritionRate * 100).toFixed(1)}%`} />
                        </>
                    )}
                </div>
            </Section>
        </div>
    );
}

