import { Router } from "express";
import { z } from "zod";
import { pool } from "../pool";

export const usersRouter = Router();

const createUserSchema = z.object({
    name: z.string().min(1),
    region: z.string().optional(),
    preferred_language: z.string().optional(),
});

usersRouter.post("/", async (req, res, next) => {
    try {
        const body = createUserSchema.parse(req.body);
        const result = await pool.query(
            `INSERT INTO users(name, region, preferred_language)
       VALUES($1,$2,$3)
       RETURNING *`,
            [body.name, body.region ?? null, body.preferred_language ?? null]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        next(e);
    }
});
