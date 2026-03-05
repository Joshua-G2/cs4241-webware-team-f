// Enrollment dashboard page that wires filters, data hooks, KPIs, and charts
// into a single view for the `/Dashboards` route.
import { useEffect } from "react";
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
    } = useDashboardFilters(navigate);

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
    });

    const err = filtersError || dataError;

    if (!schools.length) return <div style={{ padding: 16 }}>Loading…</div>;

    return (
        <div style={{ padding: 16 }}>
            <h1 style={{ marginTop: 0 }}>Enrollment Dashboard</h1>

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
                        />

                        <YearOverYearSection
                            yoyAdded={yoyAdded}
                            previousYearLabel={previousYearLabel}
                            year1Label={year1Label}
                            netChange={kpis.netChange}
                        />
                    </div>

                    <CompareYearsSection
                        comparing={comparing}
                        compareDelta={compareDelta}
                        year1Label={year1Label}
                        year2Label={year2Label}
                    />

                    <TotalsSection kpis={kpis} year1Label={year1Label} />

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
                    />
                </>
            )}
        </div>
    );
}
