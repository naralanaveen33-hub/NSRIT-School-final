const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const roles = [
  { name: 'PRINCIPAL', phone: '8888888888' },
  { name: 'COORDINATOR', phone: '7777777777' },
  { name: 'TEACHER', phone: '6666666666' },
  { name: 'PARENT', phone: '4444444444' },
  { name: 'ACCOUNTANT', phone: '5555555555' },
  { name: 'FRONT_DESK', phone: '2222222222' }
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function runCmd(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe' }).toString();
  } catch (err) {
    console.error(`Command failed: ${cmd}`, err.message);
    return '';
  }
}

function dumpUI() {
  runCmd('adb shell uiautomator dump /sdcard/window_dump.xml');
  runCmd('adb pull /sdcard/window_dump.xml scratch/window_dump.xml');
  return fs.readFileSync('scratch/window_dump.xml', 'utf8');
}

async function handleStylusPopup(xml) {
  if (xml.includes('Try out your stylus') || xml.includes('stylus')) {
    console.log('Stylus popup detected! Dismissing...');
    runCmd('adb shell input tap 550 2250'); // Tap Cancel
    await sleep(1000);
    return true;
  }
  return false;
}

async function testRole(role) {
  console.log(`\n==================================================`);
  console.log(`TESTING ROLE: ${role.name} (${role.phone})`);
  console.log(`==================================================`);

  // 1. Ensure we are on login screen
  let xml = dumpUI();
  if (!xml.includes('Sign In') && !xml.includes('Send OTP')) {
    console.error('Not on Sign In screen! Trying to logout first...');
    // Try to find Logout button
    const logoutMatch = xml.match(/content-desc="Logout"[^>]+bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (logoutMatch) {
      const x1 = parseInt(logoutMatch[1]);
      const y1 = parseInt(logoutMatch[2]);
      const x2 = parseInt(logoutMatch[3]);
      const y2 = parseInt(logoutMatch[4]);
      const cx = Math.floor((x1 + x2) / 2);
      const cy = Math.floor((y1 + y2) / 2);
      console.log(`Found Logout button at (${cx}, ${cy}). Tapping...`);
      runCmd(`adb shell input tap ${cx} ${cy}`);
      await sleep(3000);
      xml = dumpUI();
    } else {
      console.error('Cannot find logout button. Please check current screen.');
      return false;
    }
  }

  // 2. Input Phone Number
  console.log('Focusing phone input field...');
  runCmd('adb shell input tap 663 1288');
  await sleep(500);
  
  // Clear field in case there's old text (move cursor to end, delete 15 chars)
  runCmd('adb shell input keyevent KEYCODE_MOVE_END');
  for (let i = 0; i < 15; i++) {
    runCmd('adb shell input keyevent KEYCODE_DEL');
  }

  console.log(`Typing phone number ${role.phone}...`);
  runCmd(`adb shell input text "${role.phone}"`);
  await sleep(500);

  console.log('Clicking Send OTP...');
  runCmd('adb shell input tap 540 1435');
  await sleep(3000);

  // 3. Verify OTP screen
  xml = dumpUI();
  if (!xml.includes('Security Verification') && !xml.includes('VERIFICATION CODE')) {
    console.error('Failed to navigate to OTP Verification Screen.');
    return false;
  }

  console.log('Focusing OTP input field...');
  runCmd('adb shell input tap 541 1312');
  await sleep(500);

  // Handle stylus popup if any
  xml = dumpUI();
  let stylusDismissed = await handleStylusPopup(xml);
  if (stylusDismissed) {
    // Tap again to refocus after cancel
    runCmd('adb shell input tap 541 1312');
    await sleep(500);
  }

  console.log('Typing OTP 123456...');
  runCmd('adb shell input text "123456"');
  await sleep(500);

  console.log('Clicking Verify and Continue...');
  runCmd('adb shell input tap 540 1460');
  await sleep(4000);

  // 4. Check if authenticated
  xml = dumpUI();
  if (xml.includes('content-desc="Logout"') || xml.includes('Logout')) {
    console.log(`SUCCESS: Logged in successfully as ${role.name}!`);
    
    // Find Logout button and log out
    const logoutMatch = xml.match(/content-desc="Logout"[^>]+bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (logoutMatch) {
      const x1 = parseInt(logoutMatch[1]);
      const y1 = parseInt(logoutMatch[2]);
      const x2 = parseInt(logoutMatch[3]);
      const y2 = parseInt(logoutMatch[4]);
      const cx = Math.floor((x1 + x2) / 2);
      const cy = Math.floor((y1 + y2) / 2);
      console.log(`Logging out... Tapping (${cx}, ${cy})`);
      runCmd(`adb shell input tap ${cx} ${cy}`);
      await sleep(2500);
    }
    return true;
  } else {
    console.error(`FAILED: Could not login as ${role.name}. Checking for error message...`);
    // Look for error helper text
    const errorMatch = xml.match(/class="android.widget.TextView"[^>]*text="([^"]+)"[^>]*resource-id=""[^>]*bounds="\[\d+,\d+\]\[\d+,\d+\]"/g);
    if (errorMatch) {
      console.log('Error elements found:');
      errorMatch.forEach(e => console.log('  ', e));
    }
    return false;
  }
}

async function main() {
  const results = {};
  for (const role of roles) {
    results[role.name] = await testRole(role);
    await sleep(2000);
  }

  console.log('\n==================================================');
  console.log('FINAL RESULTS:');
  console.log('==================================================');
  console.log(JSON.stringify(results, null, 2));
}

main();
