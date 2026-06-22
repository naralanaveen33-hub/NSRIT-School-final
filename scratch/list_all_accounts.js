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
    console.log('Connected to database!');

    // Get all branches
    const branchesRes = await client.query('SELECT id, name, branch_code FROM "branches"');
    const branchMap = {};
    branchesRes.rows.forEach(b => {
      branchMap[b.id] = `${b.name} (${b.branch_code})`;
    });

    // Get all users
    const usersRes = await client.query('SELECT * FROM "users"');
    console.log('DATABASE_USERS_START');
    console.log(JSON.stringify({
      users: usersRes.rows,
      branches: branchMap
    }, null, 2));
    console.log('DATABASE_USERS_END');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
