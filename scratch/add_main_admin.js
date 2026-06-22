const http = require('http');
const { Client } = require('pg');

const PROJECT_ID = 'nsrit-school-2b749';
const PHONE = '+918074638336';
const TEST_OTP = '123456';
const FULL_NAME = 'Main Admin';

function post(port, path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1', port,
      path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function patch(port, path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1', port,
      path, method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  // Step 1: Register as test phone number with fixed OTP
  console.log('Registering test phone number...');
  const cfgRes = await patch(9099, `/emulator/v1/projects/${PROJECT_ID}/config`, {
    signIn: { allowVerifiedPhoneNumbers: true },
    testPhoneNumbers: { [PHONE]: TEST_OTP },
  });
  if (cfgRes.status !== 200) {
    console.error('Failed to set test phone:', cfgRes.body);
    process.exit(1);
  }
  console.log('Test phone registered.');

  // Step 2: Send OTP
  console.log('Sending OTP...');
  const otpRes = await post(9099,
    '/identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=test',
    { phoneNumber: PHONE, recaptchaToken: 'test' },
  );
  const sessionInfo = otpRes.body.sessionInfo;
  if (!sessionInfo) { console.error('No sessionInfo:', otpRes.body); process.exit(1); }

  // Step 3: Verify OTP → get UID
  console.log('Verifying OTP...');
  const verifyRes = await post(9099,
    '/identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=test',
    { sessionInfo, code: TEST_OTP },
  );
  const uid = verifyRes.body.localId;
  if (!uid) { console.error('No UID:', verifyRes.body); process.exit(1); }
  console.log(`Firebase Auth UID: ${uid}`);

  // Step 4: Insert into PostgreSQL
  const db = new Client({
    host: '127.0.0.1', port: 5432,
    database: 'nsrit-school-2b749-2-database',
    user: 'postgres',
  });
  await db.connect();

  const existing = await db.query('SELECT id FROM "users" WHERE firebase_u_i_d = $1', [uid]);
  if (existing.rows.length > 0) {
    console.log('User already in DB:', existing.rows[0].id);
    await db.end(); return;
  }

  const ins = await db.query(`
    INSERT INTO "users" (
      id, firebase_u_i_d, full_name, country_code, phone_number,
      role, is_active, created_at, updated_at
    ) VALUES (gen_random_uuid(), $1, $2, '+91', $3, 'MAIN_ADMIN', true, NOW(), NOW())
    RETURNING id
  `, [uid, FULL_NAME, PHONE]);

  const userId = ins.rows[0].id;
  console.log(`DB user inserted: ${userId}`);

  await db.query(
    'INSERT INTO "user_roles" (user_id, role) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userId, 'MAIN_ADMIN'],
  );
  console.log('user_roles inserted.');
  await db.end();

  console.log(`\nSuccess! Login with ${PHONE} OTP: ${TEST_OTP} → MAIN_ADMIN`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
