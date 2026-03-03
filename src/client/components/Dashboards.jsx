import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, Line } from "react-chartjs-2";

// ✅ Chart.js register (prevents blank page crashes)
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

// Auth wrapper
function authFetch(url, options = {}) {
    const token = localStorage.getItem("token");
    return fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
}

export default function Dashboards() {
    const navigate = useNavigate();

    const [schools, setSchools] = useState([]);         // [{schoolId,name}]
    const [schoolId, setSchoolId] = useState(null);

    const [yearsForSchool, setYearsForSchool] = useState([]); // [{ID,SCHOOL_YEAR}]
    const [yearId, setYearId] = useState(null);

    const [soc, setSoc] = useState(false);
    const [benchmark, setBenchmark] = useState("mine"); // mine | region | all

    const [payload, setPayload] = useState(null);
    const [err, setErr] = useState("");

    const isAdmin = localStorage.getItem("isAdmin") === "1";
    const lockedSchoolID = Number(localStorage.getItem("schoolId"));

    // token guard
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) navigate("/Login");
    }, [navigate]);

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
                for (const s of sJson) if (s?.schoolId != null && !byId.has(s.schoolId)) byId.set(s.schoolId, s);
                const clean = Array.from(byId.values()).sort((a, b) =>
                    String(a.name ?? `School ${a.schoolId}`).localeCompare(String(b.name ?? `School ${b.schoolId}`))
                );

                setSchools(clean);
                setSchoolId(clean[0]?.schoolId ?? null);
            } catch (e) {
                setErr(String(e.message || e));
            }
        })();
    }, [navigate]);

    // load years WITH data for this school (and SOC toggle)
    useEffect(() => {
        if (!schoolId) return;

        (async () => {
            try {
                setErr("");
                const res = await authFetch(`/api/lookups/years-with-data?schoolId=${schoolId}&soc=${soc ? 1 : 0}`);
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
            } catch (e) {
                setYearsForSchool([]);
                setYearId(null);
                setPayload(null);
                setErr(String(e.message || e));
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schoolId, soc, navigate]);

    // load dashboard payload
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

    // KPIs
    const kpis = useMemo(() => {
        if (!payload) return null;

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

        const denom = totals.added + totals.graduated + totals.dismissed + totals.notInvited + totals.notReturning;
        const attritionRate = denom ? totals.notReturning / denom : 0;

        const netChange = totals.added - (totals.graduated + totals.dismissed + totals.notInvited + totals.notReturning);

        return { totals, attritionRate, netChange };
    }, [payload]);

    const yoyAdded = useMemo(() => {
        if (!payload?.trend?.years?.length) return { value: null, label: "" };

        const years = payload.trend.years;      // labels
        const my = payload.trend.myAdded || []; // numbers

        // best-effort: use the selected year label from the dropdown
        const selectedYearLabel = yearsForSchool.find((y) => y.ID === yearId)?.SCHOOL_YEAR;

        // find index in trend array for that year label; fallback to last item
        let i = years.findIndex((x) => String(x) === String(selectedYearLabel));
        if (i === -1) i = years.length - 1;

        if (i <= 0) return { value: null, label: String(years[i] ?? "") };

        const cur = Number(my[i] ?? 0);
        const prev = Number(my[i - 1] ?? 0);

        return { value: cur - prev, label: String(years[i]) };
    }, [payload, yearsForSchool, yearId]);

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
            totals.added +
            totals.graduated +
            totals.dismissed +
            totals.notInvited +
            totals.notReturning;

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


    // Attrition by grade (Bar) — hide when SOC
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
                { label: "Added", data: rows.map((r) => r.added) },
                { label: "Not Returning", data: rows.map((r) => r.notReturning) },
                { label: "Dismissed", data: rows.map((r) => r.dismissed) },
            ],
        };
    }, [payload]);

    // Enrollment by type & gender (Stacked Bar)
    const enrollStackedData = useMemo(() => {
        if (!payload) return null;

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

        return {
            labels: types,
            datasets: genders.map((g) => ({
                label: g,
                stack: "gender",
                data: types.map((t) => values.find((v) => v.type === t && v.gender === g)?.total ?? 0),
            })),
        };
    }, [payload]);

    const stackedOptions = useMemo(
        () => ({
            responsive: true,
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
        }),
        []
    );

    // Trend (Line)
    const trendLineData = useMemo(() => {
        if (!payload) return null;
        return {
            labels: payload.trend.years,
            datasets: [
                { label: "My Added", data: payload.trend.myAdded },
                { label: `Benchmark Added (${payload.benchmark})`, data: payload.trend.benchAdded },
            ],
        };
    }, [payload]);

    // render guards
    if (!schools.length) return <div style={{ padding: 16 }}>Loading…</div>;

    const noYears = schoolId && yearsForSchool.length === 0;

    return (
        <div style={{ padding: 16 }}>
            <h1 style={{ marginTop: 0 }}>Enrollment Dashboard</h1>

            {/* Filters */}
            <div className="content-box" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "center"}}>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    School
                    <select value={schoolId ?? ""} onChange={(e) => setSchoolId(Number(e.target.value))} disabled={!isAdmin}>
                        {schools.filter((s) => isAdmin || Number(s.schoolId) === lockedSchoolID).map((s) => (
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

                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    SOC
                    <input type="checkbox" checked={soc} onChange={(e) => setSoc(e.target.checked)} />
                </label>
            </div>

            {payload && (
                <div style={{ marginTop: 8, opacity: 0.8 }}>
                    {payload.school.name} • Benchmark: {payload.benchmark} • Group size: {payload.benchmarkSchoolCount}
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
                    {/* Headline stats (readability row) */}
                    {headline && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 16 }}>
                            <Kpi
                                title={`Peer Attrition Rate (${payload.benchmark})`}
                                value={`${(headline.benchRate * 100).toFixed(1)}%`}
                                sub={`Across ${headline.groupSize} schools`}
                            />
                            <Kpi
                                title="My School Attrition vs Peers Attrition"
                                value={`${(headline.diff * 100).toFixed(1)} pts`}
                                sub={headline.diff < 0 ? "Lower than peers" : headline.diff > 0 ? "Higher than peers " : "Same as peers"}
                            />
                            <Kpi
                                title={`Enrollment change (Added) vs previous year`}
                                value={formatDelta(yoyAdded.value)}
                                sub={yoyAdded.value == null ? "No previous year available" : `Selected year: ${yoyAdded.label}`}
                            />
                            <Kpi
                                title="Net Enrollment Change"
                                value={
                                    kpis.netChange > 0
                                        ? `+${kpis.netChange}`
                                        : kpis.netChange
                                }
                                sub={`Selected year: ${yoyAdded.label}`}
                            />
                        </div>
                    )}

                    {/* KPI tiles */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginTop: 16 }}>
                        <Kpi title="Added" value={kpis.totals.added} />
                        <Kpi title="Graduated" value={kpis.totals.graduated} />
                        <Kpi title="Dismissed" value={kpis.totals.dismissed} />
                        <Kpi title="Not Invited" value={kpis.totals.notInvited} />
                        <Kpi title="Not Returning" value={kpis.totals.notReturning} />
                        <Kpi title="Attrition Rate" value={`${(kpis.attritionRate * 100).toFixed(1)}%`} />
                    </div>

                    {/* Charts */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                        {!payload.soc && gradeBarData && (
                            <Card title="Attrition by Grade (Bar)">
                                <Bar data={gradeBarData} options={{ responsive: true, scales: { y: { beginAtZero: true } } }} />
                            </Card>
                        )}

                        <Card title="Enrollment by Type & Gender (Stacked Bar)">
                            <Bar data={enrollStackedData} options={stackedOptions} />
                        </Card>

                        <Card title="Added Trend (Line)">
                            <Line data={trendLineData} options={{ responsive: true, scales: { y: { beginAtZero: true } } }} />
                        </Card>

                        <Card title="Peer Group Totals (Aggregate)">
                            <div style={{ display: "grid", gap: 6 }}>
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

function Kpi({ title, value, sub }) {
    return (
        <div className="content-box hover:border-[#646cff] transition-colors duration-200">
            <div style={{ fontSize: 12, opacity: 0.8 }}>{title}</div>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
            {sub ? <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>{sub}</div> : null}
        </div>
    );
}
function Card({ title, children }) {
    return (
        <div className="content-box hover:border-[#646cff] transition-colors duration-200">
            <h3 style={{ marginTop: 0 }}>{title}</h3>
            {children}
        </div>
    );
}
function formatDelta(n) {
    if (n === null || n === undefined) return "—";
    const num = Number(n);
    const sign = num > 0 ? "+" : "";
    return `${sign}${num}`;
}