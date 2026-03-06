// Enrollment / Admissions dashboard page that wires filters, data hooks, KPIs, and charts
// into a single view for the `/Dashboards` route. Toggle between enrollment (attrition) and admissions data.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsDark } from "./DashboardHooks";
import {
    useDashboardFilters,
    useDashboardData,
    useDashboardDerivedMetrics,
    useDashboardCharts,
} from "./DashboardHooks";
import DashboardFilters from "./DashboardFilters";
import {
    PeerComparisonSection,
    YearOverYearSection,
    CompareYearsSection,
    TotalsSection,
} from "./DashboardKpiSections";
import ChartsGrid from "./DashboardChartsGrid";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from "chart.js";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

export default function Dashboards() {
    const navigate = useNavigate();
    // Toggle between enrollment (attrition) and admissions data; drives which API and KPIs/charts load
    const [dataMode, setDataMode] = useState("enrollment"); // "enrollment" | "admissions"

    // token guard
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) navigate("/Login");
    }, [navigate]);

    const isDark = useIsDark();

    const {
        schools,
        schoolId,
        setSchoolId,
        yearsForSchool,
        yearId,
        setYearId,
        yearId2,
        setYearId2,
        benchmark,
        setBenchmark,
        soc,
        setSoc,
        canCompareYears,
        isAdmin,
        lockedSchoolID,
        error: filtersError,
    } = useDashboardFilters(navigate, dataMode);

    const {
        payload,
        payload2,
        error: dataError,
        noYears,
    } = useDashboardData({
        navigate,
        schoolId,
        yearId,
        yearId2,
        benchmark,
        soc,
        canCompareYears,
        yearsForSchool,
        dataMode,
    });

    const {
        kpis,
        kpis2,
        benchKpis,
        headline,
        yoyAdded,
        previousYearLabel,
        benchmarkLabel,
        year1Label,
        year2Label,
        comparing,
        compareDelta,
    } = useDashboardDerivedMetrics({
        payload,
        payload2,
        yearsForSchool,
        yearId,
        yearId2,
        benchmark,
        canCompareYears,
        dataMode,
    });

    const {
        baseOptions,
        stackedOptions,
        gradeBarData,
        enrollStackedData,
        trendLineData,
        yearCompareBar,
    } = useDashboardCharts({
        isDark,
        payload,
        benchmarkLabel,
        comparing,
        year1Label,
        year2Label,
        kpis,
        kpis2,
        dataMode,
    });

    const err = filtersError || dataError;

    if (!schools.length) return <div style={{ padding: 16 }}>Loading…</div>;

    return (
        <div style={{ padding: 16 }}>
            {/* Swap to admissions: toggle and page title change; filters/hooks use dataMode for API and derived metrics */}
            <div style={{ marginBottom: 8 }}>
                <h1 style={{ marginTop: 0, marginBottom: 8 }}>
                    {dataMode === "admissions" ? "Admissions" : "Enrollment"} Dashboard
                </h1>
                <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 12, marginBottom: 12 }}>
                    <button
                        type="button"
                        onClick={() => setDataMode("enrollment")}
                        style={{
                            fontWeight: dataMode === "enrollment" ? 700 : 400,
                            // background: dataMode === "enrollment" ? "" : "transparent",
                            opacity: dataMode === "enrollment" ? 1 : 0.5,

                        }}
                    >
                        Enrollment
                    </button>
                    <button
                        type="button"
                        onClick={() => setDataMode("admissions")}
                        style={{
                            fontWeight: dataMode === "admissions" ? 700 : 400,
                            // background: dataMode === "admissions" ? "" : "transparent",
                            opacity: dataMode === "admissions" ? 1 : 0.5,
                        }}
                    >
                        Admissions
                    </button>
                </div>
            </div>

            <DashboardFilters
                schools={schools}
                schoolId={schoolId}
                onSchoolChange={setSchoolId}
                yearsForSchool={yearsForSchool}
                yearId={yearId}
                onYearChange={setYearId}
                benchmark={benchmark}
                onBenchmarkChange={setBenchmark}
                canCompareYears={canCompareYears}
                yearId2={yearId2}
                onYear2Change={setYearId2}
                soc={soc}
                onSocChange={setSoc}
                isAdmin={isAdmin}
                lockedSchoolID={lockedSchoolID}
            />

            {payload && (
                <div style={{ marginTop: 8, opacity: 0.8, textAlign: "center" }}>
                    {payload.school?.name ?? "School"} • Benchmark: {benchmarkLabel} • Group size:{" "}
                    {payload.benchmarkSchoolCount}
                    {comparing ? ` • Year compare: ${year1Label} vs ${year2Label}` : ""}
                </div>
            )}

            {noYears && (
                <div style={{ marginTop: 12, padding: 10, border: "1px solid #ddd", borderRadius: 10 }}>
                    No years with data for this school (try a different school).
                </div>
            )}

            {err && (
                <div className="error-box mt-3"> {err} </div>
            )}

            {!payload || !kpis ? (
                <div style={{ marginTop: 16 }}>Loading dashboard…</div>
            ) : (
                <>
                    <div
                        style={{
                            marginTop: 16,
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))",
                            gap: 14,
                            alignItems: "start",
                        }}
                    >
                        <PeerComparisonSection
                            headline={headline}
                            benchmarkLabel={benchmarkLabel}
                            year1Label={year1Label}
                            dataMode={dataMode}
                        />

                        <YearOverYearSection
                            yoyAdded={yoyAdded}
                            previousYearLabel={previousYearLabel}
                            year1Label={year1Label}
                            netChange={kpis.netChange ?? (dataMode === "admissions" ? kpis.totals?.newEnrollments : undefined)}
                            dataMode={dataMode}
                        />
                    </div>

                    <CompareYearsSection
                        comparing={comparing}
                        compareDelta={compareDelta}
                        year1Label={year1Label}
                        year2Label={year2Label}
                        dataMode={dataMode}
                    />

                    <TotalsSection kpis={kpis} year1Label={year1Label} dataMode={dataMode} />

                    <ChartsGrid
                        comparing={comparing}
                        year1Label={year1Label}
                        year2Label={year2Label}
                        yearCompareBar={yearCompareBar}
                        gradeBarData={gradeBarData}
                        trendLineData={trendLineData}
                        enrollStackedData={enrollStackedData}
                        baseOptions={baseOptions}
                        stackedOptions={stackedOptions}
                        payload={payload}
                        dataMode={dataMode}
                    />
                </>
            )}
        </div>
    );
}
