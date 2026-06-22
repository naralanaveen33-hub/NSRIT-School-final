const { execSync } = require('child_process');
const fs = require('fs');

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

function parseBounds(xml, textPattern) {
  // Case-insensitive patterns
  const patterns = [
    `text="([^"]*${textPattern}[^"]*)"[^>]+bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
    `content-desc="([^"]*${textPattern}[^"]*)"[^>]+bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`
  ];

  for (const pattern of patterns) {
    const regex = new RegExp(pattern, 'i');
    const match = xml.match(regex);
    if (match) {
      const x1 = parseInt(match[2]);
      const y1 = parseInt(match[3]);
      const x2 = parseInt(match[4]);
      const y2 = parseInt(match[5]);
      const coords = {
        x: Math.floor((x1 + x2) / 2),
        y: Math.floor((y1 + y2) / 2)
      };
      console.log(`Found pattern "${textPattern}" matching "${match[1]}" with bounds [${x1},${y1}][${x2},${y2}] -> center (${coords.x}, ${coords.y})`);
      return coords;
    }
  }
  return null;
}

async function main() {
  console.log('Starting automated Teacher login (Robust version 3)...');

  // 1. Force start the app to be sure we are on the login screen
  runCmd('adb shell am force-stop com.nsritschoolapp');
  runCmd('adb shell monkey -p com.nsritschoolapp -c android.intent.category.LAUNCHER 1');
  console.log('Waiting for app to start...');
  await sleep(6000);

  // Close keyboard first if it's somehow open
  runCmd('adb shell input keyevent 111');
  await sleep(1000);

  let xml = dumpUI();
  let phoneField = null;
  
  // Wait up to 10 seconds for the login screen to load
  for (let attempt = 1; attempt <= 10; attempt++) {
    console.log(`Attempt ${attempt} to find phone input field...`);
    phoneField = parseBounds(xml, '10-digit number');
    if (phoneField) break;
    await sleep(1000);
    xml = dumpUI();
  }

  if (!phoneField) {
    console.log('Failed to parse bounds for "10-digit number". Using fallback coordinates (710, 1431)...');
    phoneField = { x: 710, y: 1431 };
  }

  // 2. Input Phone Number
  console.log(`Focusing phone input field at (${phoneField.x}, ${phoneField.y})...`);
  runCmd(`adb shell input tap ${phoneField.x} ${phoneField.y}`);
  await sleep(1000);
  
  // Clear field in case there's old text
  runCmd('adb shell input keyevent KEYCODE_MOVE_END');
  for (let i = 0; i < 15; i++) {
    runCmd('adb shell input keyevent KEYCODE_DEL');
  }
  await sleep(500);

  console.log('Typing teacher phone number: 6666666666...');
  for (let i = 0; i < 10; i++) {
    runCmd('adb shell input keyevent 13'); // KEYCODE_6
    await sleep(100);
  }
  await sleep(1000);

  // Close keyboard to ensure Send OTP button is clickable and not covered
  console.log('Closing keyboard...');
  runCmd('adb shell input keyevent 111');
  await sleep(1000);

  // Redump UI to find button coordinates after keyboard is closed
  xml = dumpUI();
  let sendOtpBtn = parseBounds(xml, 'Send OTP');
  if (!sendOtpBtn) {
    console.log('Failed to parse bounds for "Send OTP". Using fallback coordinates (571, 1508)...');
    sendOtpBtn = { x: 571, y: 1508 };
  }

  console.log(`Clicking Send OTP at (${sendOtpBtn.x}, ${sendOtpBtn.y})...`);
  runCmd(`adb shell input tap ${sendOtpBtn.x} ${sendOtpBtn.y}`);
  await sleep(4000);

  // 3. Verify OTP screen
  xml = dumpUI();
  let otpLabel = null;
  for (let attempt = 1; attempt <= 10; attempt++) {
    console.log(`Attempt ${attempt} to verify OTP screen...`);
    otpLabel = parseBounds(xml, 'ENTER 6-DIGIT CODE') || parseBounds(xml, 'code sent to');
    if (otpLabel) break;
    await sleep(1500);
    xml = dumpUI();
  }

  if (!otpLabel) {
    console.log('Warning: ENTER 6-DIGIT CODE label not found. Using fallback coordinates (540, 811)...');
    otpLabel = { x: 540, y: 811 };
  }

  // Focus the input area which is located around y + 130 relative to the label
  const tapY = otpLabel.y + 130;
  console.log(`Tapping OTP input area near (${otpLabel.x}, ${tapY})...`);
  runCmd(`adb shell input tap ${otpLabel.x} ${tapY}`);
  await sleep(1000);

  console.log('Typing OTP 123456...');
  const otpcodes = [8, 9, 10, 11, 12, 13]; // KEYCODE_1 (8) to KEYCODE_6 (13)
  for (const code of otpcodes) {
    runCmd(`adb shell input keyevent ${code}`);
    await sleep(150);
  }
  await sleep(1500);

  // Close keyboard
  console.log('Closing keyboard...');
  runCmd('adb shell input keyevent 111');
  await sleep(1000);

  xml = dumpUI();
  let verifyBtn = parseBounds(xml, 'Verify & Continue') || parseBounds(xml, 'Verify &amp; Continue');
  if (!verifyBtn) {
    console.log('Failed to parse bounds for "Verify & Continue". Using fallback coordinates (540, 1142)...');
    verifyBtn = { x: 540, y: 1142 };
  }

  console.log(`Clicking Verify and Continue at (${verifyBtn.x}, ${verifyBtn.y})...`);
  runCmd(`adb shell input tap ${verifyBtn.x} ${verifyBtn.y}`);
  await sleep(8000);

  // 4. Verify we are on Dashboard
  xml = dumpUI();
  if (xml.includes('Teacher Dashboard') || xml.includes('Mark Attendance') || xml.includes('dots-vertical') || xml.includes('dots') || xml.includes('Attendance')) {
    console.log('SUCCESS: Logged in and currently on Teacher Dashboard!');
  } else {
    console.log('Check current screen. Current UI text contains:');
    const matches = xml.match(/text="([^"]+)"/g);
    if (matches) {
      console.log(matches.slice(0, 25).map(m => m.replace('text=', '')));
    }
  }
}

main();
