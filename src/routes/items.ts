import { Router } from "express";
import { z } from "zod";
import { pool } from "../pool";

export const itemsRouter = Router();

// Validate item creation
const createItemSchema = z.object({
  title: z.string().min(1),
  language: z.string().optional(),
  region: z.string().optional(),
  genres: z.array(z.string()).optional(),
  emotion_tags: z.array(z.string()).optional(),
  embedding: z.array(z.number()).length(1536).optional(), // for pgvector
});

itemsRouter.post("/", async (req, res, next) => {
  try {
    const body = createItemSchema.parse(req.body);
    
    // We handle the array conversion for pgvector if embedding is provided
    const embeddingFormat = body.embedding ? `[${body.embedding.join(',')}]` : null;

    const result = await pool.query(
      `INSERT INTO items(title, language, region, genres, emotion_tags, embedding)
       VALUES($1, $2, $3, $4, $5, $6)
       RETURNING id, title, language, region, genres, emotion_tags, popularity_score, created_at`,
      [
        body.title, 
        body.language ?? null, 
        body.region ?? null, 
        body.genres ?? [], 
        body.emotion_tags ?? [], 
        embeddingFormat
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (e) {
    next(e);
  }
});

itemsRouter.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, title, language, region, genres, emotion_tags, popularity_score, created_at FROM items WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(result.rows[0]);
  } catch (e) {
    next(e);
  }
});
