import { appRouter } from '../server/routers';
import { createContext } from '../server/_core/context';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express from 'express';
import { registerOAuthRoutes } from '../server/_core/oauth';

// Vercel Serverless Function Entrypoint
const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Register OAuth Routes (auth flow)
registerOAuthRoutes(app);

// Register tRPC API
app.use(
    "/api/trpc",
    createExpressMiddleware({
        router: appRouter,
        createContext,
    })
);

// Helper route for checking health
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
});

export default app;
