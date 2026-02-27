import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
    const token = localStorage.getItem("token");

    if (!token ) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export function ProtectedRouteForm({ children }) {
    const token = localStorage.getItem("token");
    const isAdmin = localStorage.getItem("isAdmin") === "true";

    if(!token) return <Navigate to="/" replace />;

    if (!isAdmin) {
        return <Navigate to="/Dashboards" replace />;
    }

    return children;
}