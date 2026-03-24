$headers = @{ "Content-Type" = "application/json" }

Write-Host "Creating User..."
$userBody = @{
    name = "Harish"
    preferred_language = "Tamil"
    region = "Tamil Nadu"
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/users" -Method POST -Headers $headers -Body $userBody

$items = @(
    @{ title = "Vikram"; language = "Tamil"; region = "Tamil Nadu"; genres = @("Action", "Thriller"); emotion_tags = @("Dark", "Intense") },
    @{ title = "Leo"; language = "Tamil"; region = "Tamil Nadu"; genres = @("Action"); emotion_tags = @("Violent", "Epic") },
    @{ title = "Ponniyin Selvan"; language = "Tamil"; region = "Tamil Nadu"; genres = @("Historical", "Drama"); emotion_tags = @("Epic", "Grand") },
    @{ title = "Jawan"; language = "Hindi"; region = "India"; genres = @("Action"); emotion_tags = @("Thrilling", "Vengeful") },
    @{ title = "Pathaan"; language = "Hindi"; region = "India"; genres = @("Action", "Spy"); emotion_tags = @("Fast-paced") },
    @{ title = "KGF"; language = "Kannada"; region = "Karnataka"; genres = @("Action", "Drama"); emotion_tags = @("Dark", "Gritty") },
    @{ title = "Inception"; language = "English"; region = "USA"; genres = @("Sci-Fi", "Thriller"); emotion_tags = @("Mind-bending") },
    @{ title = "Interstellar"; language = "English"; region = "USA"; genres = @("Sci-Fi", "Drama"); emotion_tags = @("Emotional") },
    @{ title = "The Dark Knight"; language = "English"; region = "USA"; genres = @("Action", "Thriller"); emotion_tags = @("Dark", "Intense") },
    @{ title = "Oppenheimer"; language = "English"; region = "USA"; genres = @("Biography", "Drama"); emotion_tags = @("Suspenseful", "Historical") }
)

Write-Host "Creating Items..."
foreach ($item in $items) {
    $itemBody = $item | ConvertTo-Json -Depth 10 -Compress
    Invoke-RestMethod -Uri "http://localhost:3000/items" -Method POST -Headers $headers -Body $itemBody
}

$interactions = @(
    @{ user_id = 1; item_id = 1; type = "view" },
    @{ user_id = 1; item_id = 1; type = "like" },
    @{ user_id = 1; item_id = 2; type = "rate"; rating = 5 },
    @{ user_id = 1; item_id = 7; type = "view" },
    @{ user_id = 1; item_id = 3; type = "like" }
)

Write-Host "Creating Interactions..."
foreach ($interaction in $interactions) {
    $intBody = $interaction | ConvertTo-Json -Depth 10 -Compress
    Invoke-RestMethod -Uri "http://localhost:3000/interactions" -Method POST -Headers $headers -Body $intBody
}

Write-Host "Getting Recommendations..."
$recs = Invoke-RestMethod -Uri "http://localhost:3000/recommendations/1" -Method GET
$recs | ConvertTo-Json -Depth 10
