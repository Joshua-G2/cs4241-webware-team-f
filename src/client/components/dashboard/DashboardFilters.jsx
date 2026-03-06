// Controlled filter bar UI for the enrollment dashboard, driving school, year,
// peer-group, compare-year, and SOC selections via callbacks from hooks.
import React from "react";
export default function DashboardFilters({
    schools,
    schoolId,
    onSchoolChange,
    yearsForSchool,
    yearId,
    onYearChange,
    benchmark,
    onBenchmarkChange,
    canCompareYears,
    yearId2,
    onYear2Change,
    soc,
    onSocChange,
    isAdmin,
    lockedSchoolID,
}) {
    return (
        <div
            className="content-box"
            style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
                justifyContent: "center",
            }}
        >
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                School
                <select
                    value={schoolId ?? ""}
                    onChange={(e) => onSchoolChange(Number(e.target.value))}
                    disabled={!isAdmin}
                >
                    {schools
                        .filter((s) => isAdmin || Number(s.schoolId) === lockedSchoolID)
                        .map((s) => (
                            <option key={s.schoolId} value={s.schoolId}>
                                {(s.name ?? `School ${s.schoolId}`)} (ID {s.schoolId})
                            </option>
                        ))}
                </select>
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                Year
                <select
                    value={yearId ?? ""}
                    onChange={(e) => onYearChange(Number(e.target.value))}
                    disabled={!yearsForSchool.length}
                >
                    {yearsForSchool.map((y) => (
                        <option key={y.ID} value={y.ID}>
                            {y.SCHOOL_YEAR}
                        </option>
                    ))}
                </select>
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                Peer Group
                <select value={benchmark} onChange={(e) => onBenchmarkChange(e.target.value)}>
                    <option value="mine">My School</option>
                    <option value="region">My Region</option>
                    <option value="all">All Schools</option>
                </select>
            </label>

            {/* Compare year only allowed in My School */}
            <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: canCompareYears ? 1 : 0.6 }}>
                Compare Year
                <select
                    value={yearId2 ?? ""}
                    onChange={(e) => onYear2Change(e.target.value ? Number(e.target.value) : null)}
                    disabled={!canCompareYears || !yearsForSchool.length}
                    title={!canCompareYears ? "Switch Peer Group to 'My School' to compare two years." : ""}
                >
                    <option value="">(none)</option>
                    {yearsForSchool
                        .filter((y) => y.ID !== yearId)
                        .map((y) => (
                            <option key={y.ID} value={y.ID}>
                                {y.SCHOOL_YEAR}
                            </option>
                        ))}
                </select>
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                SOC
                <input type="checkbox" checked={soc} onChange={(e) => onSocChange(e.target.checked)} />
            </label>
        </div>
    );
}

