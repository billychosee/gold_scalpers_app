/**
 * Standalone WebSocket test for Deriv public socket.
 * Run: node test-ws.js
 *
 * Tests whether R_100 ticks stream for 60 seconds.
 * If socket dies quickly → network-level issue.
 * If socket stays open → problem is in React Native WebSocket wrapper.
 */

const WebSocket = require('ws');

const URL = 'wss://api.derivws.com/trading/v1/options/ws/public';
const DURATION_MS = 60_000;
const MAX_RECONNECT = 1;

let ws = null;
let reconnectCount = 0;
let messageCount = 0;
let firstTickTime = null;
let closedByUs = false;

function connect() {
  console.log(`[${new Date().toISOString()}] Connecting to ${URL}...`);
  ws = new WebSocket(URL);

  ws.on('open', () => {
    console.log(`[${new Date().toISOString()}] ✅ Socket OPEN`);
    const msg = { ticks: 'R_100', subscribe: 1, req_id: 1 };
    console.log(`[${new Date().toISOString()}] → Sending: ${JSON.stringify(msg)}`);
    ws.send(JSON.stringify(msg));
  });

  ws.on('message', (data) => {
    messageCount++;
    if (messageCount === 1) {
      firstTickTime = Date.now();
      console.log(`[${new Date().toISOString()}] ✅ First tick received`);
    }
    if (messageCount <= 5 || messageCount % 50 === 0) {
      console.log(`[${new Date().toISOString()}] ← Message #${messageCount}: ${String(data).substring(0, 200)}`);
    }
  });

  ws.on('close', (code, reason) => {
    const wasClean = ws._closeReceived || false;
    console.log(`\n[${new Date().toISOString()}] 🔴 Socket CLOSED`);
    console.log(`  code:    ${code}`);
    console.log(`  reason:  ${String(reason)}`);
    console.log(`  wasClean: ${wasClean}`);
    console.log(`  messages received: ${messageCount}`);

    if (closedByUs) {
      console.log('\nClosed by us (timeout) — test complete.');
      printSummary();
      process.exit(0);
    }

    if (reconnectCount < MAX_RECONNECT) {
      reconnectCount++;
      console.log(`\nReconnecting in 3s (attempt ${reconnectCount}/${MAX_RECONNECT})...`);
      setTimeout(connect, 3000);
    } else {
      console.log('\nMax reconnects reached — test complete.');
      printSummary();
      process.exit(1);
    }
  });

  ws.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] ❌ Error:`, err.message);
  });
}

function printSummary() {
  console.log('\n══════════════════════════════════════');
  console.log('TEST SUMMARY');
  console.log('══════════════════════════════════════');
  console.log(`Total messages:  ${messageCount}`);
  console.log(`Reconnects:      ${reconnectCount}`);
  if (firstTickTime) {
    console.log(`First tick at:   ${new Date(firstTickTime).toISOString()}`);
  }
  if (messageCount > 0) {
    console.log('Verdict: Socket works — issue is likely in RN WebSocket wrapper');
  } else {
    console.log('Verdict: No ticks received — network or rate-limit issue');
  }
  console.log('══════════════════════════════════════\n');
}

// Start
connect();

// Kill after 60 seconds
setTimeout(() => {
  console.log(`\n[${new Date().toISOString()}] ⏱ 60s timeout reached — closing socket`);
  closedByUs = true;
  if (ws) {
    ws.close(1000, 'Test complete');
  }
  printSummary();
  process.exit(0);
}, DURATION_MS);
