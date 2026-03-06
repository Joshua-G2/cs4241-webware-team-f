import express from "express";
import ViteExpress from "vite-express";
import cors from "cors";

import { connectDB } from "./config/db.js";
import authRouter from "./routes/auth.js";
import formsRouter from "./routes/forms.js";
import chartsRouter from "./routes/charts.js";
import lookupsRouter from "./routes/lookups.js";

const app = express();
const port = process.env.PORT || 3000;

await connectDB();

app.use(express.json());
app.use(cors());

// Mount route modules (auth uses base path so /login and /api/login/schools work)
app.use(authRouter);
app.use("/api", formsRouter);
app.use("/api", chartsRouter);
app.use("/api/lookups", lookupsRouter);

async function startServer() {
    ViteExpress.listen(app, port, () => {
        console.log("Server is listening on port", port);
        console.log(`Client url: http://localhost:${port}`);
    });
}

startServer();
