import { Router } from "express";
import { z } from "zod";
import { pool } from "../pool";

export const recommendationsRouter = Router();

// final_score = (w1 × popularity) + (w2 × similarity) + (w3 × emotion) + (w4 × regional) + (w5 × time)

recommendationsRouter.get("/:user_id", async (req, res, next) => {
  try {
    const userId = parseInt(req.params.user_id, 10);
    const { k = 10 } = req.query;

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user_id" });
    }

    // 1. Get user preferences & region
    const userRes = await pool.query(
      `SELECT region, preferred_language FROM users WHERE id = $1`,
      [userId]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userRegion = userRes.rows[0].region;
    const userLanguage = userRes.rows[0].preferred_language;

    // 2. Get user's preferred categories to build an emotion/genre context
    const prefsRes = await pool.query(
      `SELECT category, weight FROM user_preferences WHERE user_id = $1 ORDER BY weight DESC LIMIT 10`,
      [userId]
    );
    const topCategories = prefsRes.rows.filter((r: any) => r.weight > 0);

    // 3. Time-based context (Morning: 0-11, Evening: 18-23, Weekend: Sat/Sun)
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    const isMorning = currentHour >= 5 && currentHour < 12;
    const isEvening = currentHour >= 18;
    const isWeekend = currentDay === 0 || currentDay === 6;

    // We can simulate time multipliers:
    // This could just be coefficients applied in the raw query.
    // Let's rely on a pg query to compute the final_score
    
    // 4. Retrieve user_profile embedding for cosine similarity
    const profileRes = await pool.query(
      `SELECT embedding FROM user_profiles WHERE user_id = $1`,
      [userId]
    );
    const hasEmbedding = profileRes.rowCount !== null && profileRes.rowCount > 0 && profileRes.rows[0].embedding;
    const userEmbedding = hasEmbedding ? profileRes.rows[0].embedding : null;

    let itemsQuery = "";
    const params: any[] = [userId, Number(k)];
    
    // We compute the hybrid score directly in postgres
    // popularity_score is part of `items` table.
    
    // Similarity part:
    // If user has an embedding, similarity is 1 - (i.embedding <=> user_embedding)
    // If not, similarity is 0.
    
    // Regional part:
    // If i.region == userRegion or i.language == userLanguage then score bonus (+1 each)
    
    // Emotion part:
    // We can map user's top categories and check if i.genres or i.emotion_tags overlap.
    // Time part (mocking simple logic, e.g., if item has 'Morning' emotion tag, etc.)
    // We'll give a static bonus if morning and item has tag 'morning'
    
    itemsQuery = `
      SELECT 
        i.id,
        i.title,
        i.genres,
        i.emotion_tags,
        i.popularity_score,
        ${userEmbedding ? `1 - (i.embedding <=> '${userEmbedding}') AS similarity_score,` : `0.0 AS similarity_score,`}
        (CASE WHEN i.region = $3 THEN 1.0 ELSE 0.0 END) + 
        (CASE WHEN i.language = $4 THEN 1.0 ELSE 0.0 END) AS regional_score,
        (
           SELECT COALESCE(SUM(p.weight), 0)
           FROM user_preferences p 
           WHERE p.user_id = $1 AND p.category = ANY(i.genres || i.emotion_tags)
        ) AS emotion_score,
        (CASE 
           WHEN $5::boolean AND 'morning' = ANY(i.emotion_tags) THEN 1.0 
           WHEN $6::boolean AND 'evening' = ANY(i.emotion_tags) THEN 1.0
           WHEN $7::boolean AND 'weekend' = ANY(i.emotion_tags) THEN 1.0
           ELSE 0.0
         END) AS time_score
      FROM items i
      LEFT JOIN interactions inter ON inter.item_id = i.id AND inter.user_id = $1
      WHERE inter.id IS NULL -- Exclude already interacted items
    `;
    
    // Wait, the above logic computes parts. We wrap it to compute final score:
    // w1: popularity 0.2
    // w2: similarity 0.4
    // w3: emotion 0.2
    // w4: regional 0.1
    // w5: time 0.1

    const finalQuery = `
      WITH scored_items AS (
        ${itemsQuery}
      )
      SELECT 
        id, title, genres, emotion_tags, popularity_score, 
        similarity_score, regional_score, emotion_score, time_score,
        (0.2 * COALESCE(popularity_score, 0)) +
        (0.4 * COALESCE(similarity_score, 0)) +
        (0.2 * COALESCE(emotion_score, 0)) +
        (0.1 * COALESCE(regional_score, 0)) +
        (0.1 * COALESCE(time_score, 0)) AS final_score
      FROM scored_items
      ORDER BY final_score DESC
      LIMIT $2;
    `;

    params.push(userRegion ?? '', userLanguage ?? '', isMorning, isEvening, isWeekend);

    const result = await pool.query(finalQuery, params);
    
    res.json(result.rows);
  } catch (e) {
    next(e);
  }
});
