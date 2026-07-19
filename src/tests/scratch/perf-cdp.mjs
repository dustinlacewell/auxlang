// Minimal raw-WebSocket CDP driver: connects to the perf page, clicks Start,
// collects [PERF] console lines for a fixed duration, then reads window.__perf.
// No deps — implements just the client subset of RFC6455 needed to talk to CDP.
// Usage: node perf-cdp.mjs <wsUrl> <runSeconds>

import crypto from "node:crypto";
import net from "node:net";

const wsUrl = process.argv[2];
const runMs = (Number(process.argv[3]) || 30) * 1000;
const { hostname, port, pathname } = new URL(wsUrl);

const sock = net.connect(Number(port), hostname);
const key = crypto.randomBytes(16).toString("base64");
let handshakeDone = false;
let buf = Buffer.alloc(0);
let nextId = 1;
const pending = new Map();
const perfLines = [];

sock.on("connect", () => {
	sock.write(
		`GET ${pathname} HTTP/1.1\r\n` +
			`Host: ${hostname}:${port}\r\n` +
			`Upgrade: websocket\r\nConnection: Upgrade\r\n` +
			`Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`,
	);
});

sock.on("data", (d) => {
	buf = Buffer.concat([buf, d]);
	if (!handshakeDone) {
		const idx = buf.indexOf("\r\n\r\n");
		if (idx === -1) return;
		buf = buf.subarray(idx + 4);
		handshakeDone = true;
		onOpen();
	}
	drainFrames();
});

// --- WebSocket framing (client → server frames are masked) -----------------

function sendFrame(str) {
	const payload = Buffer.from(str);
	const len = payload.length;
	let header;
	if (len < 126) header = Buffer.from([0x81, 0x80 | len]);
	else if (len < 65536) header = Buffer.from([0x81, 0x80 | 126, len >> 8, len & 0xff]);
	else {
		header = Buffer.alloc(10);
		header[0] = 0x81;
		header[1] = 0x80 | 127;
		header.writeBigUInt64BE(BigInt(len), 2);
	}
	const mask = crypto.randomBytes(4);
	const masked = Buffer.alloc(len);
	for (let i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i & 3];
	sock.write(Buffer.concat([header, mask, masked]));
}

function drainFrames() {
	while (buf.length >= 2) {
		const b1 = buf[1];
		let len = b1 & 0x7f;
		let offset = 2;
		if (len === 126) {
			if (buf.length < 4) return;
			len = buf.readUInt16BE(2);
			offset = 4;
		} else if (len === 127) {
			if (buf.length < 10) return;
			len = Number(buf.readBigUInt64BE(2));
			offset = 10;
		}
		if (buf.length < offset + len) return;
		const payload = buf.subarray(offset, offset + len).toString();
		buf = buf.subarray(offset + len);
		if (payload) onMessage(payload);
	}
}

// --- CDP ------------------------------------------------------------------

function send(method, params = {}) {
	const id = nextId++;
	return new Promise((resolve) => {
		pending.set(id, resolve);
		sendFrame(JSON.stringify({ id, method, params }));
	});
}

function onMessage(raw) {
	const msg = JSON.parse(raw);
	if (msg.id && pending.has(msg.id)) {
		pending.get(msg.id)(msg.result);
		pending.delete(msg.id);
		return;
	}
	if (msg.method === "Runtime.consoleAPICalled") {
		const parts = (msg.params.args || []).map((a) =>
			a.value !== undefined ? a.value : a.description || "",
		);
		if (parts[0] === "[PERF]") perfLines.push(parts[1]);
	}
}

async function evalJs(expression) {
	const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
	return r?.result?.value;
}

async function onOpen() {
	await send("Runtime.enable");
	await send("Page.enable");
	// Click Start.
	await evalJs("document.querySelector('#start').click(); true");
	console.error(`[driver] started; collecting for ${runMs / 1000}s…`);
	setTimeout(finish, runMs);
}

async function finish() {
	const windows = await evalJs("JSON.stringify(window.__perf)");
	await evalJs("document.querySelector('#stop').click(); true");
	const parsed = windows ? JSON.parse(windows) : [];
	console.log(JSON.stringify({ consoleLines: perfLines.length, windows: parsed }, null, 2));
	sock.end();
	process.exit(0);
}

setTimeout(() => {
	console.error("[driver] timeout with no data");
	process.exit(1);
}, runMs + 15000);
