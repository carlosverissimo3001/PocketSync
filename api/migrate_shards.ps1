# Define the shard URLs (see .env)
$shardUrls = @(
    $env:SHARD_A_URL,
    $env:SHARD_B_URL,
    $env:SHARD_C_URL,
    $env:SHARD_D_URL,
    $env:SHARD_E_URL
)

foreach ($url in $shardUrls) {
    Write-Host "Migrating database at $url..."
    $env:DATABASE_URL = $url
    yarn prisma migrate dev
    Write-Host "Migration completed for $url.`n"
}