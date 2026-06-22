const http = require('http');

const configData = JSON.stringify({
  signIn: {
    allowVerifiedPhoneNumbers: true
  },
  testPhoneNumbers: {
    "+918888888888": "123456",
    "+917777777777": "123456",
    "+916666666666": "123456",
    "+914444444444": "123456",
    "+915555555555": "123456",
    "+912222222222": "123456"
  }
});

function makeRequest(method) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 9099,
      path: '/emulator/v1/projects/nsrit-school-2b749/config',
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(configData)
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`Success with ${method}:`, responseBody);
          resolve(true);
        } else {
          console.log(`Failed with ${method} (status ${res.statusCode}):`, responseBody);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.error(`Error with ${method}:`, err.message);
      resolve(false);
    });

    req.write(configData);
    req.end();
  });
}

async function main() {
  console.log('Registering test phone numbers in Firebase Auth Emulator...');
  // Try PATCH, if it fails try PUT
  let success = await makeRequest('PATCH');
  if (!success) {
    console.log('Retrying with PUT...');
    await makeRequest('PUT');
  }
}

main();
