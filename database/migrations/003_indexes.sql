CREATE INDEX IF NOT EXISTS idx_interactions_user_time ON interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_item_time ON interactions(item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_items_embedding_hnsw
ON items USING hnsw (embedding vector_cosine_ops);
