const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 9099,
  path: '/emulator/v1/projects/nsrit-school-2b749/accounts',
  method: 'GET',
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('AUTH_USERS_START');
      console.log(JSON.stringify(parsed, null, 2));
      console.log('AUTH_USERS_END');
    } catch (e) {
      console.error('Failed to parse response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
