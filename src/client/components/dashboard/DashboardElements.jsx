// Shared presentational building blocks and small display helpers
// used across the enrollment dashboard (sections, cards, KPIs, and value formatting).
import React from "react";

export function Section({ title, subtitle, children }) {
    return (
        <div
            className="content-box"
            style={{
                padding: 14,
                borderRadius: 14,
            }}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12, textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{title}</div>
                {subtitle ? <div style={{ fontSize: 12, opacity: 0.75 }}>{subtitle}</div> : null}
            </div>
            {children}
        </div>
    );
}

export function Kpi({ title, value, sub }) {
    return (
        <div className="content-box hover:border-[#646cff] transition-colors duration-200">
            <div style={{ fontSize: 12, opacity: 0.8, textAlign: "center" }}>{title}</div>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, textAlign: "center" }}>{value}</div>
            {sub ? <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7, textAlign: "center" }}>{sub}</div> : null}
        </div>
    );
}

export function Card({ title, children }) {
    return (
        <div
            className="content-box hover:border-[#646cff] transition-colors duration-200"
            style={{
                minHeight: 360,
                display: "flex",
                flexDirection: "column",
            }}
        >
            <h3 style={{ marginTop: 0, textAlign: "center" }}>{title}</h3>

            {/* this wrapper lets charts grow but also keeps text cards sized nicely */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {children}
            </div>
        </div>
    );
}

export function formatDelta(n) {
    if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
    const num = Number(n);
    const sign = num > 0 ? "+" : "";
    return `${sign}${num}`;
}

