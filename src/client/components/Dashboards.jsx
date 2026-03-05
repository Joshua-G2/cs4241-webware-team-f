import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, Line } from "react-chartjs-2";
import { Section, Kpi, Card, authFetch, useIsDark, formatDelta } from "./DashboardElements";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
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

    const [schools, setSchools] = useState([]); // [{schoolId,name}]
    const [schoolId, setSchoolId] = useState(null);

    const [yearsForSchool, setYearsForSchool] = useState([]); // [{ID,SCHOOL_YEAR}]
    const [yearId, setYearId] = useState(null);

    // Compare year (only allowed for benchmark === "mine")
    const [yearId2, setYearId2] = useState(null);
    const [payload2, setPayload2] = useState(null);

    const [soc, setSoc] = useState(false);

    // backend expects mine | region | all
    const [benchmark, setBenchmark] = useState("mine"); // mine | region | all

    const [payload, setPayload] = useState(null);
    const [err, setErr] = useState("");

    const isAdmin = localStorage.getItem("isAdmin") === "1";
    const lockedSchoolID = Number(localStorage.getItem("schoolId"));

    // Compare-year only allowed when peer group is My School (mine)
    const canCompareYears = benchmark === "mine";

    const isDark = useIsDark();

    // Neutral chart text (JS-driven)
    const chartText = isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.72)";
    const chartGrid = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";

    // Fix tooltip in light mode + keep nice in dark mode
    const tooltipTheme = useMemo(() => {
        if (isDark) {
            return {
                backgroundColor: "rgba(15, 23, 42, 0.92)",
                borderColor: "rgba(148, 163, 184, 0.25)",
                borderWidth: 1,
                titleColor: "rgba(255,255,255,0.92)",
                bodyColor: "rgba(255,255,255,0.88)",
            };
        }
        return {
            backgroundColor: "rgba(255, 255, 255, 0.96)",
            borderColor: "rgba(15, 23, 42, 0.18)",
            borderWidth: 1,
            titleColor: "rgba(15, 23, 42, 0.92)",
            bodyColor: "rgba(15, 23, 42, 0.82)",
        };
    }, [isDark]);

    // Dataset palette (JS-driven)
    const palette = useMemo(() => {
        return isDark
            ? {
                c1: "rgba(96,165,250,0.95)",
                c2: "rgba(251,146,60,0.95)",
                c3: "rgba(52,211,153,0.95)",
                c4: "rgba(192,132,252,0.95)",
            }
            : {
                c1: "rgba(37,99,235,0.9)",
                c2: "rgba(249,115,22,0.9)",
                c3: "rgba(16,185,129,0.9)",
                c4: "rgba(168,85,247,0.9)",
            };
    }, [isDark]);

    // token guard
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) navigate("/Login");
    }, [navigate]);

    // If user switches away from mine, clear compare year and compare payload
    useEffect(() => {
        if (!canCompareYears) {
            setYearId2(null);
            setPayload2(null);
        }
    }, [canCompareYears]);

    // load schools once
    useEffect(() => {
        (async () => {
            try {
                setErr("");
                const sRes = await authFetch("/api/lookups/schools?limit=10000");
                if (sRes.status === 401 || sRes.status === 403) {
                    localStorage.removeItem("token");
                    navigate("/Login");
                    return;
                }
                const sJson = await sRes.json();
                if (!sRes.ok) throw new Error(sJson.error || "Failed to load schools");

                // dedupe + sort
                const byId = new Map();
                for (const s of sJson) {
                    if (s?.schoolId != null && !byId.has(s.schoolId)) byId.set(s.schoolId, s);
                }
                const clean = Array.from(byId.values()).sort((a, b) =>
                    String(a.name ?? `School ${a.schoolId}`).localeCompare(
                        String(b.name ?? `School ${b.schoolId}`)
                    )
                );

                setSchools(clean);

                // default school:
                if (isAdmin) setSchoolId(clean[0]?.schoolId ?? null);
                else
                    setSchoolId(
                        Number.isFinite(lockedSchoolID) ? lockedSchoolID : clean[0]?.schoolId ?? null
                    );
            } catch (e) {
                setErr(String(e.message || e));
            }
        })();
    }, [navigate, isAdmin, lockedSchoolID]);

    // load years WITH data for this school (and SOC toggle)
    useEffect(() => {
        if (!schoolId) return;

        (async () => {
            try {
                setErr("");
                const res = await authFetch(
                    `/api/lookups/years-with-data?schoolId=${schoolId}&soc=${soc ? 1 : 0}`
                );
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem("token");
                    navigate("/Login");
                    return;
                }
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || "Failed to load years with data");

                setYearsForSchool(json);

                const validIds = new Set(json.map((y) => y.ID));
                const newest = json.at(-1)?.ID ?? null;

                if (!yearId || !validIds.has(yearId)) setYearId(newest);

                if (!canCompareYears) {
                    setYearId2(null);
                    setPayload2(null);
                } else {
                    if (yearId2 && !validIds.has(yearId2)) setYearId2(null);
                    if (yearId2 && yearId2 === yearId) setYearId2(null);
                }
            } catch (e) {
                setYearsForSchool([]);
                setYearId(null);
                setYearId2(null);
                setPayload(null);
                setPayload2(null);
                setErr(String(e.message || e));
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schoolId, soc, navigate, canCompareYears]);

    // load dashboard payload (primary)
    useEffect(() => {
        if (!schoolId || !yearId) return;

        (async () => {
            try {
                setErr("");
                setPayload(null);

                const url =
                    `/api/enrollment/dashboard` +
                    `?schoolId=${schoolId}` +
                    `&yearId=${yearId}` +
                    `&soc=${soc ? 1 : 0}` +
                    `&benchmark=${benchmark}`;

                const res = await authFetch(url);
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem("token");
                    navigate("/Login");
                    return;
                }
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || "Failed to load dashboard");

                setPayload(json);
            } catch (e) {
                setPayload(null);
                setErr(String(e.message || e));
            }
        })();
    }, [schoolId, yearId, soc, benchmark, navigate]);

    // load dashboard payload (compare year) — ONLY for mine
    useEffect(() => {
        if (!canCompareYears || !schoolId || !yearId2) {
            setPayload2(null);
            return;
        }

        (async () => {
            try {
                setErr("");
                setPayload2(null);

                const url =
                    `/api/enrollment/dashboard` +
                    `?schoolId=${schoolId}` +
                    `&yearId=${yearId2}` +
                    `&soc=${soc ? 1 : 0}` +
                    `&benchmark=mine`;

                const res = await authFetch(url);
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem("token");
                    navigate("/Login");
                    return;
                }
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || "Failed to load dashboard (compare year)");

                setPayload2(json);
            } catch (e) {
                setPayload2(null);
                setErr(String(e.message || e));
            }
        })();
    }, [canCompareYears, schoolId, yearId2, soc, navigate]);

    // Chart options (neutral text via JS + fixed tooltips)
    const baseOptions = useMemo(
        () => ({
            responsive: true,
            plugins: {
                legend: { labels: { color: chartText } },
                tooltip: {
                    ...tooltipTheme,
                    displayColors: true,
                    padding: 10,
                },
                title: { color: chartText },
            },
            scales: {
                x: { ticks: { color: chartText }, grid: { color: chartGrid } },
                y: { ticks: { color: chartText }, grid: { color: chartGrid }, beginAtZero: true },
            },
        }),
        [chartText, chartGrid, tooltipTheme]
    );

    const stackedOptions = useMemo(
        () => ({
            ...baseOptions,
            scales: {
                x: { ...baseOptions.scales.x, stacked: true },
                y: { ...baseOptions.scales.y, stacked: true, beginAtZero: true },
            },
        }),
        [baseOptions]
    );

    // KPIs (primary year)
    const kpis = useMemo(() => {
        if (!payload?.attritionByGrade?.length) return null;

        const totals = payload.attritionByGrade.reduce(
            (acc, r) => {
                acc.added += Number(r.added || 0);
                acc.graduated += Number(r.graduated || 0);
                acc.dismissed += Number(r.dismissed || 0);
                acc.notInvited += Number(r.notInvited || 0);
                acc.notReturning += Number(r.notReturning || 0);
                return acc;
            },
            { added: 0, graduated: 0, dismissed: 0, notInvited: 0, notReturning: 0 }
        );

        const denom =
            totals.added + totals.graduated + totals.dismissed + totals.notInvited + totals.notReturning;

        const attritionRate = denom ? totals.notReturning / denom : 0;

        const netChange =
            totals.added - (totals.graduated + totals.dismissed + totals.notInvited + totals.notReturning);

        return { totals, attritionRate, netChange };
    }, [payload]);

    // KPIs (compare year)
    const kpis2 = useMemo(() => {
        if (!payload2?.attritionByGrade?.length) return null;

        const totals = payload2.attritionByGrade.reduce(
            (acc, r) => {
                acc.added += Number(r.added || 0);
                acc.graduated += Number(r.graduated || 0);
                acc.dismissed += Number(r.dismissed || 0);
                acc.notInvited += Number(r.notInvited || 0);
                acc.notReturning += Number(r.notReturning || 0);
                return acc;
            },
            { added: 0, graduated: 0, dismissed: 0, notInvited: 0, notReturning: 0 }
        );

        const denom =
            totals.added + totals.graduated + totals.dismissed + totals.notInvited + totals.notReturning;

        const attritionRate = denom ? totals.notReturning / denom : 0;

        const netChange =
            totals.added - (totals.graduated + totals.dismissed + totals.notInvited + totals.notReturning);

        return { totals, attritionRate, netChange };
    }, [payload2]);

    // YOY Added
    const yoyAdded = useMemo(() => {
        if (!payload?.trend?.years?.length) return { value: null, label: "" };

        const years = payload.trend.years;
        const my = payload.trend.myAdded || [];

        const selectedYearLabel = yearsForSchool.find((y) => y.ID === yearId)?.SCHOOL_YEAR;
        let i = years.findIndex((x) => String(x) === String(selectedYearLabel));
        if (i === -1) i = years.length - 1;

        if (i <= 0) return { value: null, label: String(years[i] ?? "") };

        const cur = Number(my[i] ?? 0);
        const prev = Number(my[i - 1] ?? 0);

        return { value: cur - prev, label: String(years[i]) };
    }, [payload, yearsForSchool, yearId]);

    // Actual previous-available year label (handles gaps)
    const previousYearLabel = useMemo(() => {
        if (!payload?.trend?.years?.length) return null;

        const years = payload.trend.years;
        const selectedYearLabel = yearsForSchool.find((y) => y.ID === yearId)?.SCHOOL_YEAR;

        let i = years.findIndex((x) => String(x) === String(selectedYearLabel));
        if (i === -1) i = years.length - 1;

        if (i <= 0) return null;
        return years[i - 1];
    }, [payload, yearsForSchool, yearId]);

    // Bench KPIs (peer group totals)
    const benchKpis = useMemo(() => {
        if (!payload) return null;

        const t = payload.benchTotals || {};
        const totals = {
            added: Number(t.added || 0),
            graduated: Number(t.graduated || 0),
            dismissed: Number(t.dismissed || 0),
            notInvited: Number(t.notInvited || 0),
            notReturning: Number(t.notReturning || 0),
        };

        const denom =
            totals.added + totals.graduated + totals.dismissed + totals.notInvited + totals.notReturning;

        const attritionRate = denom ? totals.notReturning / denom : 0;

        return { totals, attritionRate };
    }, [payload]);

    // Top row summary numbers (my vs peer + delta)
    const headline = useMemo(() => {
        if (!kpis || !benchKpis || !payload) return null;

        const mineRate = kpis.attritionRate;
        const benchRate = benchKpis.attritionRate;
        const diff = mineRate - benchRate;

        return {
            mineRate,
            benchRate,
            diff,
            groupSize: Number(payload.benchmarkSchoolCount || 0),
        };
    }, [kpis, benchKpis, payload]);

    // display label for benchmark (UI-friendly)
    const benchmarkLabel = useMemo(() => {
        if (benchmark === "mine") return "My School";
        if (benchmark === "region") return "My Region";
        return "All Schools";
    }, [benchmark]);

    // Year labels
    const year1Label = useMemo(
        () => yearsForSchool.find((y) => y.ID === yearId)?.SCHOOL_YEAR ?? "Year 1",
        [yearsForSchool, yearId]
    );
    const year2Label = useMemo(
        () => yearsForSchool.find((y) => y.ID === yearId2)?.SCHOOL_YEAR ?? "Year 2",
        [yearsForSchool, yearId2]
    );

    const comparing = canCompareYears && Boolean(yearId2 && payload2 && kpis2);

    // Compare chart
    const yearCompareBar = useMemo(() => {
        if (!comparing || !kpis || !kpis2) return null;

        const labels = ["Added", "Graduated", "Dismissed", "Not Invited", "Not Returning"];

        return {
            labels,
            datasets: [
                {
                    label: year1Label,
                    data: [
                        kpis.totals.added,
                        kpis.totals.graduated,
                        kpis.totals.dismissed,
                        kpis.totals.notInvited,
                        kpis.totals.notReturning,
                    ],
                    backgroundColor: palette.c1,
                },
                {
                    label: year2Label,
                    data: [
                        kpis2.totals.added,
                        kpis2.totals.graduated,
                        kpis2.totals.dismissed,
                        kpis2.totals.notInvited,
                        kpis2.totals.notReturning,
                    ],
                    backgroundColor: palette.c2,
                },
            ],
        };
    }, [comparing, kpis, kpis2, year1Label, year2Label, palette]);

    // Compare delta KPIs (Year1 - Year2)
    const compareDelta = useMemo(() => {
        if (!comparing || !kpis || !kpis2) return null;
        return {
            added: kpis.totals.added - kpis2.totals.added,
            notReturning: kpis.totals.notReturning - kpis2.totals.notReturning,
            attritionPts: (kpis.attritionRate - kpis2.attritionRate) * 100,
            netChange: kpis.netChange - kpis2.netChange,
        };
    }, [comparing, kpis, kpis2]);

    // Grade bar
    const gradeBarData = useMemo(() => {
        if (!payload) return null;
        if (payload.soc) return null;

        const grouped = payload.attritionByGrade.reduce((acc, r) => {
            const label = String(r.gradeLabel ?? "Unknown");
            if (!acc[label]) acc[label] = { label, added: 0, notReturning: 0, dismissed: 0 };
            acc[label].added += Number(r.added || 0);
            acc[label].notReturning += Number(r.notReturning || 0);
            acc[label].dismissed += Number(r.dismissed || 0);
            return acc;
        }, {});

        const rows = Object.values(grouped);

        const order = (label) => {
            const l = label.toLowerCase();
            if (l.includes("pre")) return 0;
            if (l.includes("kinder")) return 1;
            const m = label.match(/(\d+)/);
            return m ? 2 + Number(m[1]) : 999;
        };
        rows.sort((a, b) => order(a.label) - order(b.label));

        return {
            labels: rows.map((r) => r.label),
            datasets: [
                { label: "Added", data: rows.map((r) => r.added), backgroundColor: palette.c1 },
                { label: "Not Returning", data: rows.map((r) => r.notReturning), backgroundColor: palette.c2 },
                { label: "Dismissed", data: rows.map((r) => r.dismissed), backgroundColor: palette.c3 },
            ],
        };
    }, [payload, palette]);

    // Stacked enrollment
    const enrollStackedData = useMemo(() => {
        if (!payload?.enrollmentActivity?.length) return null;

        const grouped = payload.enrollmentActivity.reduce((acc, r) => {
            const type = String(r.ENROLLMENT_TYPE_CD ?? "Unknown");
            const gender = String(r.GENDER ?? "Unknown");
            const key = `${type}__${gender}`;
            if (!acc[key]) acc[key] = { type, gender, total: 0 };
            acc[key].total += Number(r.NR_ENROLLED || 0);
            return acc;
        }, {});

        const values = Object.values(grouped);
        const types = [...new Set(values.map((v) => v.type))].sort();
        const genders = [...new Set(values.map((v) => v.gender))].sort();

        const genderLabels = { F: "Female", M: "Male", U: "Unknown" };
        const pal = [palette.c1, palette.c2, palette.c3, palette.c4];

        return {
            labels: types,
            datasets: genders.map((g, idx) => ({
                label: genderLabels[g] || g,
                stack: "gender",
                data: types.map((t) => values.find((v) => v.type === t && v.gender === g)?.total ?? 0),
                backgroundColor: pal[idx % pal.length],
            })),
        };
    }, [payload, palette]);

    // Trend
    const trendLineData = useMemo(() => {
        if (!payload?.trend?.years?.length) return null;
        return {
            labels: payload.trend.years,
            datasets: [
                {
                    label: "My Added",
                    data: payload.trend.myAdded,
                    borderColor: palette.c1,
                    backgroundColor: palette.c1,
                    pointBackgroundColor: palette.c1,
                    tension: 0.25,
                },
                {
                    label: `Benchmark Added (${benchmarkLabel})`,
                    data: payload.trend.benchAdded,
                    borderColor: palette.c2,
                    backgroundColor: palette.c2,
                    pointBackgroundColor: palette.c2,
                    tension: 0.25,
                },
            ],
        };
    }, [payload, palette, benchmarkLabel]);

    // guards
    if (!schools.length) return <div style={{ padding: 16 }}>Loading…</div>;
    const noYears = schoolId && yearsForSchool.length === 0;

    return (
        <div style={{ padding: 16 }}>
            <h1 style={{ marginTop: 0 }}>Enrollment Dashboard</h1>

            {/* Filters */}
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
                        onChange={(e) => setSchoolId(Number(e.target.value))}
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
                        onChange={(e) => setYearId(Number(e.target.value))}
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
                    <select value={benchmark} onChange={(e) => setBenchmark(e.target.value)}>
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
                        onChange={(e) => setYearId2(e.target.value ? Number(e.target.value) : null)}
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
                    <input type="checkbox" checked={soc} onChange={(e) => setSoc(e.target.checked)} />
                </label>
            </div>

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
                <div
                    style={{
                        marginTop: 12,
                        padding: 10,
                        border: "1px solid #e7b6c2",
                        borderRadius: 10,
                        background: "#fff6f8",
                        color: "crimson",
                    }}
                >
                    {err}
                </div>
            )}

            {!payload || !kpis ? (
                <div style={{ marginTop: 16 }}>Loading dashboard…</div>
            ) : (
                <>
                    {/* KPI SECTIONS */}
                    {/* Top row: Peer Comparison + YOY side-by-side on wide screens */}
                    <div
                        style={{
                            marginTop: 16,
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))",
                            gap: 14,
                            alignItems: "start",
                        }}
                    >
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
                                    value={kpis.netChange > 0 ? `+${kpis.netChange}` : kpis.netChange}
                                    sub={`Selected year: ${year1Label}`}
                                />
                            </div>
                        </Section>
                    </div>

                    {/* Compare-year section spans full width when present */}
                    {comparing && compareDelta && (
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
                    )}

                    {/* Totals row */}
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

                    {/* CHARTS */}
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
                            {enrollStackedData ? <Bar data={enrollStackedData} options={stackedOptions} /> : <div>No enrollment activity data.</div>}
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
                </>
            )}
        </div>
    );
}
