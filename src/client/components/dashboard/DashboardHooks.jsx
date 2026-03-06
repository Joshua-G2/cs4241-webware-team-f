// Custom React hooks and helpers for the enrollment dashboard:
// - manages filters/lookups, data fetching, derived KPIs, and chart configuration
// - exposes auth-aware fetch (`authFetch`) and a theme hook (`useIsDark`) for chart styling
import { useEffect, useMemo, useState } from "react";

export function authFetch(url, options = {}) {
    const token = localStorage.getItem("token");

    return fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
}

export function useIsDark() {
    const read = () =>
        document.documentElement.classList.contains("dark") ||
        document.documentElement.getAttribute("data-theme") === "dark";

    const [isDark, setIsDark] = useState(() => read());

    useEffect(() => {
        const obs = new MutationObserver(() => setIsDark(read()));
        obs.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class", "data-theme"],
        });
        return () => obs.disconnect();
    }, []);

    return isDark;
}

export function useDashboardFilters(navigate, dataMode = "enrollment") {
    const [schools, setSchools] = useState([]); // [{schoolId,name}]
    const [schoolId, setSchoolId] = useState(null);
    const [yearsForSchool, setYearsForSchool] = useState([]); // [{ID,SCHOOL_YEAR}]
    const [yearId, setYearId] = useState(null);
    // Compare year (only allowed for benchmark === "mine")
    const [yearId2, setYearId2] = useState(null);
    const [soc, setSoc] = useState(false);
    // backend expects mine | region | all
    const [benchmark, setBenchmark] = useState("mine"); // mine | region | all
    const [error, setError] = useState("");
    const isAdmin = localStorage.getItem("isAdmin") === "1";
    const lockedSchoolID = Number(localStorage.getItem("schoolId"));
    // Compare-year only allowed when peer group is My School (mine)
    const canCompareYears = benchmark === "mine";

    // When switching enrollment <-> admissions, clear year selection so we don't fetch with a yearId
    // that's valid for the other mode. The years effect will set yearId to a valid value for this mode.
    useEffect(() => {
        setYearId(null);
        setYearId2(null);
        setYearsForSchool([]);
    }, [dataMode]);

    // If user switches away from mine, clear compare year
    useEffect(() => {
        if (!canCompareYears) {
            setYearId2(null);
        }
    }, [canCompareYears]);

    // load schools once
    useEffect(() => {
        (async () => {
            try {
                setError("");
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
                setError(String(e.message || e));
            }
        })();
    }, [navigate, isAdmin, lockedSchoolID]);

    // Load years with data for this school; mode=dataMode swaps to admissions years when toggle is on
    useEffect(() => {
        if (!schoolId) return;

        (async () => {
            try {
                setError("");
                const res = await authFetch(
                    `/api/lookups/years-with-data?schoolId=${schoolId}&soc=${soc ? 1 : 0}&mode=${dataMode}`
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

                // Only update yearId when we have years; if list is empty keep current yearId so data effect can still fetch (may 404)
                if (json.length > 0) {
                    if (!yearId || !validIds.has(yearId)) setYearId(newest);
                }

                if (!canCompareYears) {
                    setYearId2(null);
                } else {
                    if (yearId2 && !validIds.has(yearId2)) setYearId2(null);
                    if (yearId2 && yearId2 === yearId) setYearId2(null);
                }
            } catch (e) {
                setYearsForSchool([]);
                setYearId(null);
                setYearId2(null);
                setError(String(e.message || e));
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schoolId, soc, navigate, canCompareYears, dataMode]);

    return {
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
        error,
    };
}

export function useDashboardData({
    navigate,
    schoolId,
    yearId,
    yearId2,
    benchmark,
    soc,
    canCompareYears,
    yearsForSchool,
    dataMode = "enrollment",
}) {
    const [payload, setPayload] = useState(null);
    const [payload2, setPayload2] = useState(null);
    const [error, setError] = useState("");

    // Clear stale payload when switching mode so we don't show wrong KPIs while loading
    useEffect(() => {
        setPayload(null);
        setPayload2(null);
    }, [dataMode]);

    // load dashboard payload (primary)
    useEffect(() => {
        if (!schoolId || !yearId) return;

        (async () => {
            try {
                setError("");
                setPayload(null);

                // Swap to admissions endpoint when dataMode is admissions
                const basePath = dataMode === "admissions" ? "/api/admissions/dashboard" : "/api/enrollment/dashboard";
                const url =
                    basePath +
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
                setError(String(e.message || e));
            }
        })();
    }, [schoolId, yearId, soc, benchmark, navigate, dataMode]);

    // load dashboard payload (compare year) — ONLY for mine
    useEffect(() => {
        if (!canCompareYears || !schoolId || !yearId2) {
            setPayload2(null);
            return;
        }

        (async () => {
            try {
                setError("");
                setPayload2(null);

                // Swap to admissions endpoint for compare-year when dataMode is admissions
                const basePath = dataMode === "admissions" ? "/api/admissions/dashboard" : "/api/enrollment/dashboard";
                const url =
                    basePath +
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
                setError(String(e.message || e));
            }
        })();
    }, [canCompareYears, schoolId, yearId2, soc, navigate, dataMode]);

    const noYears = schoolId && yearsForSchool && yearsForSchool.length === 0;

    return { payload, payload2, error, noYears };
}

export function useDashboardDerivedMetrics({
    payload,
    payload2,
    yearsForSchool,
    yearId,
    yearId2,
    benchmark,
    canCompareYears,
    dataMode = "enrollment",
}) {
    const isAdmissions = dataMode === "admissions";

    // KPIs: enrollment uses attritionByGrade; admissions uses admissionByGrade (capacity, contracted, apps, acceptances, new enrollments)
    const kpis = useMemo(() => {
        if (isAdmissions) {
            if (!payload?.admissionByGrade?.length) return null;
            const totals = payload.admissionByGrade.reduce(
                (acc, r) => {
                    acc.capacity += Number(r.capacity || 0);
                    acc.contractedTotal += Number(r.contractedTotal || 0);
                    acc.completedApplications += Number(r.completedApplications || 0);
                    acc.acceptances += Number(r.acceptances || 0);
                    acc.newEnrollments += Number(r.newEnrollments || 0);
                    return acc;
                },
                { capacity: 0, contractedTotal: 0, completedApplications: 0, acceptances: 0, newEnrollments: 0 }
            );
            return { totals, isAdmissions: true };
        }
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
    }, [payload, isAdmissions]);

    // KPIs (compare year)
    const kpis2 = useMemo(() => {
        if (isAdmissions) {
            if (!payload2?.admissionByGrade?.length) return null;
            const totals = payload2.admissionByGrade.reduce(
                (acc, r) => {
                    acc.capacity += Number(r.capacity || 0);
                    acc.contractedTotal += Number(r.contractedTotal || 0);
                    acc.completedApplications += Number(r.completedApplications || 0);
                    acc.acceptances += Number(r.acceptances || 0);
                    acc.newEnrollments += Number(r.newEnrollments || 0);
                    return acc;
                },
                { capacity: 0, contractedTotal: 0, completedApplications: 0, acceptances: 0, newEnrollments: 0 }
            );
            return { totals, isAdmissions: true };
        }
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
    }, [payload2, isAdmissions]);

    // YOY Added (enrollment) or YOY New Enrollments (admissions)
    const yoyAdded = useMemo(() => {
        if (!payload?.trend?.years?.length) return { value: null, label: "" };

        const years = payload.trend.years;
        const my = isAdmissions ? (payload.trend.myNewEnrollments || []) : (payload.trend.myAdded || []);

        const selectedYearLabel = yearsForSchool.find((y) => y.ID === yearId)?.SCHOOL_YEAR;
        let i = years.findIndex((x) => String(x) === String(selectedYearLabel));
        if (i === -1) i = years.length - 1;

        if (i <= 0) return { value: null, label: String(years[i] ?? "") };

        const cur = Number(my[i] ?? 0);
        const prev = Number(my[i - 1] ?? 0);

        return { value: cur - prev, label: String(years[i]) };
    }, [payload, yearsForSchool, yearId, isAdmissions]);

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
        if (isAdmissions) {
            return {
                totals: {
                    capacity: Number(t.capacity || 0),
                    contractedTotal: Number(t.contractedTotal || 0),
                    completedApplications: Number(t.completedApplications || 0),
                    acceptances: Number(t.acceptances || 0),
                    newEnrollments: Number(t.newEnrollments || 0),
                },
                isAdmissions: true,
            };
        }
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
    }, [payload, isAdmissions]);

    // Top row summary numbers (my vs peer + delta)
    const headline = useMemo(() => {
        if (!kpis || !benchKpis || !payload) return null;

        // Admissions: headline shows my vs benchmark new enrollments (no attrition rate)
        if (isAdmissions) {
            const myNew = kpis.totals.newEnrollments ?? 0;
            const benchNew = benchKpis.totals?.newEnrollments ?? 0;
            const diff = myNew - (payload.benchmarkSchoolCount ? benchNew / payload.benchmarkSchoolCount : benchNew);
            return {
                myNewEnrollments: myNew,
                benchNewEnrollments: benchNew,
                diff,
                groupSize: Number(payload.benchmarkSchoolCount || 0),
                isAdmissions: true,
            };
        }

        const mineRate = kpis.attritionRate;
        const benchRate = benchKpis.attritionRate;
        const diff = mineRate - benchRate;

        return {
            mineRate,
            benchRate,
            diff,
            groupSize: Number(payload.benchmarkSchoolCount || 0),
        };
    }, [kpis, benchKpis, payload, isAdmissions]);

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

    // Compare delta KPIs (Year1 - Year2); admissions uses capacity/contracted/apps/acceptances/newEnrollments deltas
    const compareDelta = useMemo(() => {
        if (!comparing || !kpis || !kpis2) return null;
        if (isAdmissions) {
            return {
                capacity: kpis.totals.capacity - kpis2.totals.capacity,
                contractedTotal: kpis.totals.contractedTotal - kpis2.totals.contractedTotal,
                completedApplications: kpis.totals.completedApplications - kpis2.totals.completedApplications,
                acceptances: kpis.totals.acceptances - kpis2.totals.acceptances,
                newEnrollments: kpis.totals.newEnrollments - kpis2.totals.newEnrollments,
                isAdmissions: true,
            };
        }
        return {
            added: kpis.totals.added - kpis2.totals.added,
            notReturning: kpis.totals.notReturning - kpis2.totals.notReturning,
            attritionPts: (kpis.attritionRate - kpis2.attritionRate) * 100,
            netChange: kpis.netChange - kpis2.netChange,
        };
    }, [comparing, kpis, kpis2, isAdmissions]);

    return {
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
    };
}

export function useDashboardCharts({
    isDark,
    payload,
    benchmarkLabel,
    comparing,
    year1Label,
    year2Label,
    kpis,
    kpis2,
    dataMode = "enrollment",
}) {
    const isAdmissions = dataMode === "admissions";
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

    // Bar chart: enrollment = attrition by grade; admissions = capacity/contracted/apps/acceptances by grade
    const gradeBarData = useMemo(() => {
        if (!payload) return null;

        if (isAdmissions) {
            if (!payload.admissionByGrade?.length) return null;
            const grouped = payload.admissionByGrade.reduce((acc, r) => {
                const label = String(r.gradeLabel ?? "Unknown");
                if (!acc[label])
                    acc[label] = {
                        label,
                        capacity: 0,
                        contractedTotal: 0,
                        completedApplications: 0,
                        acceptances: 0,
                        newEnrollments: 0,
                    };
                acc[label].capacity += Number(r.capacity || 0);
                acc[label].contractedTotal += Number(r.contractedTotal || 0);
                acc[label].completedApplications += Number(r.completedApplications || 0);
                acc[label].acceptances += Number(r.acceptances || 0);
                acc[label].newEnrollments += Number(r.newEnrollments || 0);
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
                    { label: "Capacity", data: rows.map((r) => r.capacity), backgroundColor: palette.c1 },
                    { label: "Contracted", data: rows.map((r) => r.contractedTotal), backgroundColor: palette.c2 },
                    { label: "Completed Apps", data: rows.map((r) => r.completedApplications), backgroundColor: palette.c3 },
                    { label: "Acceptances", data: rows.map((r) => r.acceptances), backgroundColor: palette.c4 },
                ],
            };
        }

        if (payload.soc) return null;
        if (!payload.attritionByGrade?.length) return null;

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
    }, [payload, palette, isAdmissions]);

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

    // Line chart: enrollment = added trend; admissions = new enrollments trend (my vs benchmark)
    const trendLineData = useMemo(() => {
        if (!payload?.trend?.years?.length) return null;
        if (isAdmissions) {
            return {
                labels: payload.trend.years,
                datasets: [
                    {
                        label: "My New Enrollments",
                        data: payload.trend.myNewEnrollments || [],
                        borderColor: palette.c1,
                        backgroundColor: palette.c1,
                        pointBackgroundColor: palette.c1,
                        tension: 0.25,
                    },
                    {
                        label: `Benchmark New Enrollments (${benchmarkLabel})`,
                        data: payload.trend.benchNewEnrollments || [],
                        borderColor: palette.c2,
                        backgroundColor: palette.c2,
                        pointBackgroundColor: palette.c2,
                        tension: 0.25,
                    },
                ],
            };
        }
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
    }, [payload, palette, benchmarkLabel, isAdmissions]);

    // Year-compare bar: enrollment = attrition categories; admissions = capacity/contracted/apps/acceptances/new enrollments
    const yearCompareBar = useMemo(() => {
        if (!comparing || !kpis || !kpis2) return null;

        if (isAdmissions) {
            const labels = ["Capacity", "Contracted", "Completed Apps", "Acceptances", "New Enrollments"];
            return {
                labels,
                datasets: [
                    {
                        label: year1Label,
                        data: [
                            kpis.totals.capacity,
                            kpis.totals.contractedTotal,
                            kpis.totals.completedApplications,
                            kpis.totals.acceptances,
                            kpis.totals.newEnrollments,
                        ],
                        backgroundColor: palette.c1,
                    },
                    {
                        label: year2Label,
                        data: [
                            kpis2.totals.capacity,
                            kpis2.totals.contractedTotal,
                            kpis2.totals.completedApplications,
                            kpis2.totals.acceptances,
                            kpis2.totals.newEnrollments,
                        ],
                        backgroundColor: palette.c2,
                    },
                ],
            };
        }

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
    }, [comparing, kpis, kpis2, year1Label, year2Label, palette, isAdmissions]);

    return {
        baseOptions,
        stackedOptions,
        gradeBarData,
        enrollStackedData,
        trendLineData,
        yearCompareBar,
    };
}

