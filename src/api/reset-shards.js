const { PrismaClient } = require('@prisma/client');
const { Client } = require('pg');

const shardUrls = [
  process.env.SHARD_A_URL,
  process.env.SHARD_B_URL,
  process.env.SHARD_C_URL,
  process.env.SHARD_D_URL,
  process.env.SHARD_E_URL,
];

async function resetShard(url) {
  const client = new Client({ connectionString: url });

  try {
    await client.connect();

    console.log(`Connected to shard: ${url}`);

    // Disable foreign key constraints to avoid issues while truncating
    await client.query('SET session_replication_role = \'replica\';');

    // Retrieve all table names from the current shard
    const result = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public';
    `);

    const tables = result.rows.map(row => row.tablename);

    for (const table of tables) {
      console.log(`Truncating table: ${table}`);
      await client.query(`TRUNCATE TABLE \"${table}\" RESTART IDENTITY CASCADE;`);
    }

    // Re-enable foreign key constraints
    await client.query('SET session_replication_role = \'origin\';');

    console.log(`Shard reset completed: ${url}`);
  } catch (error) {
    console.error(`Error resetting shard ${url}:`, error);
  } finally {
    await client.end();
    console.log(`Disconnected from shard: ${url}`);
  }
}

async function resetAllShards() {
  for (const url of shardUrls) {
    if (!url) {
      console.error('Shard URL not found. Please ensure all shard URLs are set in the environment variables.');
      continue;
    }
    await resetShard(url);
  }

  console.log('All shards have been reset.');
}

resetAllShards().catch(error => {
  console.error('An error occurred while resetting the shards:', error);
});
