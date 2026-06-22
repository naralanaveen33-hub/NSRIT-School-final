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

    // 1. Create BRANCH_ADMIN
    const branchAdminId = 'abababab-abab-abab-abab-abababababab';
    const checkBranchAdmin = await client.query('SELECT id FROM "users" WHERE role = \'BRANCH_ADMIN\'');
    if (checkBranchAdmin.rows.length === 0) {
      console.log('Inserting BRANCH_ADMIN user...');
      await client.query(`
        INSERT INTO "users" (
          id, branch_id, wing_id, country_code, employee_id, firebase_u_i_d,
          full_name, is_active, phone_number, role, staff_type, created_at, updated_at
        ) VALUES (
          $1, $2, NULL, '+91', 'B001', '', 'Branch Administrator', true, '+913333333333', 'BRANCH_ADMIN', 'ADMINISTRATION', NOW(), NOW()
        )
      `, [branchAdminId, '11111111-1111-1111-1111-111111111111']);

      // Associate in branches table
      console.log('Associating BRANCH_ADMIN in branches table...');
      await client.query(`
        UPDATE "branches" 
        SET branch_admin_id = $1 
        WHERE id = '11111111-1111-1111-1111-111111111111'
      `, [branchAdminId]);
    } else {
      console.log('BRANCH_ADMIN already exists.');
    }

    // 2. Create FRONT_DESK
    const frontDeskId = '77777777-7777-7777-7777-777777777777';
    const checkFrontDesk = await client.query('SELECT id FROM "users" WHERE role = \'FRONT_DESK\'');
    if (checkFrontDesk.rows.length === 0) {
      console.log('Inserting FRONT_DESK user...');
      await client.query(`
        INSERT INTO "users" (
          id, branch_id, wing_id, country_code, employee_id, firebase_u_i_d,
          full_name, is_active, phone_number, role, staff_type, created_at, updated_at
        ) VALUES (
          $1, $2, NULL, '+91', 'F001', '', 'Front Desk Officer', true, '+912222222222', 'FRONT_DESK', 'SUPPORTING', NOW(), NOW()
        )
      `, [frontDeskId, '11111111-1111-1111-1111-111111111111']);
    } else {
      console.log('FRONT_DESK already exists.');
    }

    console.log('Database seeded successfully!');

  } catch (err) {
    console.error('Error during seeding:', err.message);
  } finally {
    await client.end();
  }
}

main();
