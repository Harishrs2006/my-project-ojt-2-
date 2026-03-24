docker exec -i ojt2_pgvector psql -U postgres -d recommender -c "TRUNCATE users, items RESTART IDENTITY CASCADE;"
Get-Content database\migrations\001_enable_pgvector.sql | docker exec -i ojt2_pgvector psql -U postgres -d recommender
Get-Content database\migrations\002_create_tables.sql | docker exec -i ojt2_pgvector psql -U postgres -d recommender
Get-Content database\migrations\003_indexes.sql | docker exec -i ojt2_pgvector psql -U postgres -d recommender
& .\seed.ps1
