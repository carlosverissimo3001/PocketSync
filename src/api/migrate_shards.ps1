# migrate_all_shards.ps1
# This script applies Prisma migrations to all shard databases using the URLs defined in the .env file.

# Exit immediately if a command exits with a non-zero status.
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Path to your .env file
$envFilePath = ".\.env"

# Function to load environment variables from .env
function Load-EnvFile {
    param (
        [string]$Path
    )

    if (Test-Path $Path) {
        Write-Host "Loading environment variables from $Path..."
        Get-Content $Path | ForEach-Object {
            if ($_ -match "^\s*([^=#]+)\s*=\s*(.*)\s*$") {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim().Trim('"')
                [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
            }
        }
        Write-Host "Environment variables loaded successfully.`n"
    }
    else {
        Write-Error "Environment file $Path not found. Ensure the .env file exists."
        exit 1
    }
}

# Load environment variables
Load-EnvFile -Path $envFilePath

# Define the shard URLs (see .env)
$shardUrls = @(
    $env:SHARD_A_URL,
    $env:SHARD_B_URL,
    $env:SHARD_C_URL,
    $env:SHARD_D_URL,
    $env:SHARD_E_URL
)

# Path to your Prisma schema file
$prismaSchemaPath = "./prisma/schema.prisma"

# Check if Prisma schema exists
if (-Not (Test-Path $prismaSchemaPath)) {
    Write-Error "Prisma schema file not found at $prismaSchemaPath"
    exit 1
}

foreach ($url in $shardUrls) {
    if (-Not $url) {
        Write-Warning "Shard URL is empty. Skipping migration for this shard."
        continue
    }

    Write-Host "----------------------------------------"
    Write-Host "Migrating database at $url..."

    # Display the current DATABASE_URL for debugging
    Write-Host "Current DATABASE_URL: $env:DATABASE_URL"

    try {
        # Set the DATABASE_URL for the current shard
        $env:DATABASE_URL = $url

        # Run Prisma migrate deploy to apply existing migrations
        yarn prisma migrate deploy --schema="$prismaSchemaPath"

        Write-Host "Migration completed successfully for shard at $url.`n"
    }
    catch {
        Write-Error "ERROR - Migration failed for shard at $url."
        Write-Error $_.Exception.Message
        exit 1
    }
}

Write-Host "----------------------------------------"
Write-Host "All migrations applied successfully to all specified shards."
