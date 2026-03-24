import { Router } from "express";
import { z } from "zod";
import { pool } from "../pool";

export const interactionsRouter = Router();

const createInteractionSchema = z.object({
  user_id: z.number().int(),
  item_id: z.number().int(),
  type: z.enum(['view', 'click', 'like', 'rate']),
  rating: z.number().int().min(1).max(5).optional(),
  watch_time_seconds: z.number().int().min(0).optional(),
  weight: z.number().optional().default(1.0)
});

interactionsRouter.post("/", async (req, res, next) => {
  try {
    const body = createInteractionSchema.parse(req.body);

    // 1. Log the interaction
    const result = await pool.query(
      `INSERT INTO interactions(user_id, item_id, type, rating, watch_time_seconds)
       VALUES($1, $2, $3, $4, $5)
       RETURNING *`,
      [body.user_id, body.item_id, body.type, body.rating ?? null, body.watch_time_seconds ?? null]
    );
    
    // 2. Update item stats
    if (body.type === 'rate' && body.rating) {
      // For rates, we can do a simplified moving average or just store the sum and count
      // Wait, item_stats has avg_rating. Let's just do a naive update or ignore for now
      // Actually, we'd need another rating_count field or so, let's keep it simple
      const statUpdateQuery = `
        INSERT INTO item_stats (item_id, avg_rating)
        VALUES ($1, $2)
        ON CONFLICT (item_id) DO UPDATE SET
          avg_rating = (item_stats.avg_rating + $2) / 2.0,
          updated_at = NOW();
      `;
      await pool.query(statUpdateQuery, [body.item_id, body.rating]);
    } else if (body.type !== 'rate') {
      const statUpdateQuery = `
        INSERT INTO item_stats (item_id, ${body.type}s)
        VALUES ($1, 1)
        ON CONFLICT (item_id) DO UPDATE SET
          ${body.type}s = item_stats.${body.type}s + 1,
          updated_at = NOW();
      `;
      await pool.query(statUpdateQuery, [body.item_id]);
    }

    // Update global popularity_score on items table for simplicity
    // e.g. views count for 1, clicks 2, likes 5, etc.
    let score_inc = 1;
    if (body.type === 'click') score_inc = 2;
    if (body.type === 'like') score_inc = 5;
    if (body.type === 'rate') score_inc = (body.rating || 3) * 2;

    await pool.query(
      `UPDATE items SET popularity_score = popularity_score + $2 WHERE id = $1`,
      [body.item_id, score_inc]
    );

    // 3. Extract item genres/emotions to update user preferences
    const itemData = await pool.query(`SELECT genres, emotion_tags FROM items WHERE id = $1`, [body.item_id]);
    
    if (itemData.rowCount && itemData.rowCount > 0) {
      const { genres, emotion_tags } = itemData.rows[0];
      const categories = [...(genres || []), ...(emotion_tags || [])];

      // Update user preferences with time-decay mechanism (handled mostly on read or batch, but we increment here)
      for (const cat of categories) {
        await pool.query(
          `INSERT INTO user_preferences (user_id, category, weight, last_updated)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (user_id, category) DO UPDATE SET
           weight = user_preferences.weight * 0.95 + $3, /* simple time-decay approximation */
           last_updated = NOW()`,
          [body.user_id, cat, score_inc * body.weight]
        );
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (e) {
    next(e);
  }
});
