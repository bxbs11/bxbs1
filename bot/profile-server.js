// profile-server.js — Safe profile bridge for the "eye" Discord bot on orihost.
//
// WHAT THIS IS:
//   A tiny HTTP server that READS your Discord profile (avatar, banner,
//   accent color, username, badges, name style, presence) using the bot
//   token, and serves ONLY that public data to your website as JSON.
//
// SECURITY MODEL — WHY THE TOKEN CANNOT LEAK:
//   - The token lives ONLY in this file (or better: the TOKEN env var) on
//     the orihost server. It is NEVER sent to the browser.
//   - The website calls  /profile  and receives public profile fields only.
//   - Anyone who downloads or copies the website gets ZERO token.
//
// RUN IT (on orihost, in the bot folder):
//     node profile-server.js
//     -> listens on port 8474. On the panel, open/forward that port.
//
// OPTIONAL (recommended): put the token in an env var instead of this file:
//     Linux:   TOKEN=xxxxx node profile-server.js
//     Windows: set TOKEN=xxxxx && node profile-server.js
//   If TOKEN is set, the BOT_TOKEN line below is ignored.

const http = require("http");
const https = require("https");

// === CONFIG ================================================================
const BOT_TOKEN = process.env.TOKEN || "PASTE_YOUR_BOT_TOKEN_HERE";
const USER_ID = "930902242385621043";
const PORT = Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 8474;
// Origins allowed to read this endpoint ("*" = any website can read it).
const ALLOW_ORIGIN = "*";
// ============================================================================

if (BOT_TOKEN === "PASTE_YOUR_BOT_TOKEN_HERE") {
	console.error("[profile-server] No token set! Set TOKEN env var or edit BOT_TOKEN.");
}

const API = "https://discord.com/api/v10";

function discordFetch(path) {
	return new Promise((resolve, reject) => {
		const req = https.request(
			API + path,
			{
				method: "GET",
				headers: {
					Authorization: `Bot ${BOT_TOKEN}`,
					"Content-Type": "application/json",
				},
			},
			(res) => {
				let body = "";
				res.on("data", (c) => (body += c));
				res.on("end", () => {
					try {
						resolve({ status: res.statusCode, json: JSON.parse(body) });
					} catch {
						reject(new Error(`Bad JSON from Discord (${res.statusCode})`));
					}
				});
			}
		);
		req.on("error", reject);
		req.setTimeout(8000, () => req.destroy(new Error("timeout")));
		req.end();
	});
}

const CDN = "https://cdn.discordapp.com";
const FLAG_BADGES = [
	["STAFF", 1],
	["PARTNER", 2],
	["HYPESQUAD", 4],
	["BUG_HUNTER_LEVEL_1", 8],
	["HYPESQUAD_BRAVERY", 64],
	["HYPESQUAD_BRILLIANCE", 128],
	["HYPESQUAD_BALANCE", 256],
	["EARLY_SUPPORTER", 512],
	["BUG_HUNTER_LEVEL_2", 16384],
	["VERIFIED_DEVELOPER", 131072],
	["CERTIFIED_MODERATOR", 262144],
	["ACTIVE_DEVELOPER", 4194304],
];

let cache = { data: null, at: 0 };

async function buildProfile() {
	if (cache.data && Date.now() - cache.at < 30_000) return cache.data;

	const [{ status, json: user }, presence] = await Promise.all([
		discordFetch(`/users/${USER_ID}`),
		discordFetch(`/users/${USER_ID}/presence`).catch(() => ({ json: null })),
	]);
	if (status !== 200) throw new Error(`Discord API ${status}`);

	const flags = user.public_flags || 0;
	const badges = FLAG_BADGES.filter(([, bit]) => flags & bit).map(([k]) => k);
	if (user.premium_type) badges.push("NITRO");
	if (user.avatar_decoration_data?.asset)
		badges.push("avatar_decoration:" + user.avatar_decoration_data.asset);

	const out = {
		id: user.id,
		username: user.username,
		global_name: user.global_name,
		avatar: user.avatar
			? `${CDN}/avatars/${user.id}/${user.avatar}.png?size=512`
			: null,
		banner: user.banner
			? `${CDN}/banners/${user.id}/${user.banner}.png?size=1024`
			: null,
		accent_color: user.accent_color, // may be null
		banner_color: user.banner_color ?? null,
		display_name_styles: user.display_name_styles ?? null,
		badges,
		status: presence?.json?.status ?? null, // online/idle/dnd/offline
		fetched_at: new Date().toISOString(),
	};
	cache = { data: out, at: Date.now() };
	return out;
}

const server = http.createServer(async (req, res) => {
	res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
	res.setHeader("Content-Type", "application/json");

	if (req.url.split("?")[0] !== "/profile") {
		res.writeHead(404).end(JSON.stringify({ error: "not found" }));
		return;
	}
	try {
		const data = await buildProfile();
		res.writeHead(200).end(JSON.stringify(data));
	} catch (e) {
		res.writeHead(502).end(JSON.stringify({ error: String(e.message || e) }));
	}
});

server.listen(PORT, () => {
	console.log(`[profile-server] listening on :${PORT}  ->  /profile`);
	console.log("[profile-server] token is NOT exposed; only public profile data leaves this process.");
});
