/**
 * Shared formatters for API responses (dashboard, lookups, etc.)
 */
export function toNum(v) {
    if (v == null || v === "") return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

export function pickGradeLabel(g) {
    return g?.DESCRIPTION_TX ?? g?.NAME_TX ?? `Grade ${g?.ID ?? "?"}`;
}

export function pickSchoolName(s) {
    return s?.NAME_TX ?? s?.SCHOOL_NAME ?? s?.NAME ?? `School ${s?.ID ?? "?"}`;
}
