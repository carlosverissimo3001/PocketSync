#!/bin/bash

# migrate_all_shards.sh
# This script applies Prisma migrations to all shard databases using the URLs defined in the .env file.

# Exit immediately if a command exits with a non-zero status.
set -e

# Path to your .env file
ENV_FILE="./.env"

# Function to load environment variables from .env
load_env_file() {
    local env_file="$1"
    if [ -f "$env_file" ]; then
        echo "Loading environment variables from $env_file..."
        # Export all variables from .env file
        export $(cat "$env_file" | grep -v '^#' | xargs)
        echo "Environment variables loaded successfully."
        echo
    else
        echo "Error: Environment file $env_file not found. Ensure the .env file exists." >&2
        exit 1
    fi
}

# Load environment variables
load_env_file "$ENV_FILE"

# Define the shard URLs (see .env)
SHARD_URLS=(
    "$SHARD_A_URL"
    "$SHARD_B_URL"
    "$SHARD_C_URL"
    "$SHARD_D_URL"
    "$SHARD_E_URL"
)

# Path to your Prisma schema file
PRISMA_SCHEMA_PATH="./prisma/schema.prisma"

# Check if Prisma schema exists
if [ ! -f "$PRISMA_SCHEMA_PATH" ]; then
    echo "Error: Prisma schema file not found at $PRISMA_SCHEMA_PATH" >&2
    exit 1
fi

# Iterate through each shard URL
for url in "${SHARD_URLS[@]}"; do
    if [ -z "$url" ]; then
        echo "Warning: Shard URL is empty. Skipping migration for this shard."
        continue
    fi

    echo "----------------------------------------"
    echo "Migrating database at $url..."

    # Display the current DATABASE_URL for debugging
    echo "Current DATABASE_URL: $DATABASE_URL"

    # Set the DATABASE_URL for the current shard
    export DATABASE_URL="$url"

    # Run Prisma migrate deploy to apply existing migrations
    if ! yarn prisma migrate deploy --schema="$PRISMA_SCHEMA_PATH"; then
        echo "Error: Migration failed for shard at $url" >&2
        exit 1
    fi

    echo "Migration completed successfully for shard at $url"
    echo
done

echo "----------------------------------------"
echo "All migrations applied successfully to all specified shards."