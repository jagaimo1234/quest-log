import "dotenv/config";
import { appRouter } from '../server/routers/index.js';
import { createContext } from '../server/_core/context.js';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express from 'express';
import { registerOAuthRoutes } from '../server/_core/oauth.js';
import { checkDbConnection } from '../server/db.js';

// Vercel Serverless Function Entrypoint
const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Register OAuth Routes (auth flow)
registerOAuthRoutes(app);

// Register tRPC API - support both /api/trpc and /trpc in case Vercel rewrites strip /api
const trpcMiddleware = createExpressMiddleware({
    router: appRouter,
    createContext,
});

app.use("/api/trpc", trpcMiddleware);
app.use("/trpc", trpcMiddleware);

// Helper route for checking health
app.get(["/api/health", "/health"], async (req, res) => {
    try {
        const dbStatus = await checkDbConnection();
        res.json({
            status: "ok",
            env: process.env.NODE_ENV,
            db: dbStatus
        });
    } catch (e: any) {
        res.status(500).json({
            status: "error",
            error: e?.message || String(e)
        });
    }
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
    console.error("[Vercel Serverless Error]", err);
    res.status(500).json({ error: err?.message || "Internal Server Error" });
});

export default function handler(req: any, res: any) {
    return app(req, res);
}
