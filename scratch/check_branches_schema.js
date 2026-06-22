const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'nsrit-school-2b749-2-database',
    user: 'postgres',
  });

  try {
    await client.connect();
    console.log('Connected!');
    const res = await client.query('SELECT * FROM "branches" LIMIT 1');
    console.log(JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
