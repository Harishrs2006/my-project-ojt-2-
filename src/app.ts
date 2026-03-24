import express from "express";
import { router } from "./routes/index";
import { errorHandler } from "./middlewares/errorHandler";

export const app = express();

app.use(express.json());
app.use("/", router);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use(errorHandler);
