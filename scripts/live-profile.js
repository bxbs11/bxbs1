// live-profile.js — pulls your real Discord profile from YOUR bot server
// (bot/profile-server.js on orihost) and updates the card.
//
// If config.js -> api is empty (or the server is unreachable), the site
// falls back to the bundled static profile below and keeps working.

(function () {
	const FALLBACK = {
		username: "bxbs1",
		global_name: "bxb",
		avatar: "./public/avatar.png",
		banner: "./public/banner.png",
		accent_color: 16777215,
		display_name_styles: null,
		badges: [
			"GOLD_GEM",
			"HYPESQUAD_BRAVERY",
			"BOOST_GEM",
			"QUEST",
			"ORB",
			"GIFTING_GIFT",
		],
		status: null,
	};

	const BADGE_FILES = {
		GOLD_GEM: "./public/badges/gold-gem.png",
		HYPESQUAD_BRAVERY: "./public/badges/bravery.png",
		BOOST_GEM: "./public/badges/boost-gem.png",
		QUEST: "./public/badges/quest.png",
		ORB: "./public/badges/orb.png",
		GIFTING_GIFT: "./public/badges/gifting-gift.png",
	};
	const BADGE_LABELS = {
		GOLD_GEM: "Subscriber Gem",
		HYPESQUAD_BRAVERY: "HypeSquad Bravery",
		BOOST_GEM: "Server Boosting",
		QUEST: "Quest Champion",
		ORB: "Orb",
		GIFTING_GIFT: "Gifted Nitro",
	};
	const STATUS_LABELS = {
		online: "Online",
		idle: "Idle / AFK",
		dnd: "Do Not Disturb",
		offline: "Offline",
	};

	const cfg = window.PROFILE_CONFIG || {};
	const api = (cfg.api || "").replace(/\/+$/, "");

	async function fetchProfile() {
		if (!api) return FALLBACK;
		try {
			const r = await fetch(api, { cache: "no-store" });
			if (!r.ok) throw new Error("HTTP " + r.status);
			const d = await r.json();
			if (!d || !d.username) throw new Error("bad payload");
			return { ...FALLBACK, ...d };
		} catch (e) {
			console.warn("[live-profile] bridge unavailable, using static profile:", e.message);
			return FALLBACK;
		}
	}

	function apply(p) {
		// names
		const dn = document.querySelector(".display-name");
		if (dn) dn.textContent = p.global_name || p.username;
		const un = document.getElementById("textToCopy");
		if (un) un.textContent = p.username;

		// avatar + banner
		const av = document.getElementById("avatar-image");
		if (av && p.avatar) av.src = p.avatar;
		const bn = document.getElementById("banner-image");
		if (bn && p.banner) bn.src = p.banner;

		// badges
		const list = document.querySelector(".badges .badges-right");
		if (list && Array.isArray(p.badges) && p.badges.length) {
			list.innerHTML = "";
			for (const b of p.badges) {
				const file = BADGE_FILES[b];
				if (!file) continue;
				const a = document.createElement("a");
				a.className = "tooltip";
				a.setAttribute("aria-label", BADGE_LABELS[b] || b);
				const img = document.createElement("img");
				img.alt = " ";
				img.src = file;
				a.appendChild(img);
				list.appendChild(a);
			}
		}

		// status dot
		const stImg = document.getElementById("status-image");
		const stBox = document.querySelector(".status");
		if (p.status && STATUS_LABELS[p.status] && stImg) {
			stImg.src = `./public/status/${p.status}.svg`;
			if (stBox) stBox.setAttribute("aria-label", STATUS_LABELS[p.status]);
		}

		// accent color tint (optional)
		if (cfg.useAccent && typeof p.accent_color === "number" && p.accent_color !== 16777215) {
			const c = p.accent_color;
			const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
			const root = document.documentElement.style;
			root.setProperty("--primary-h-top", "0deg");
			root.setProperty("--primary-s-top", "0%");
			root.setProperty("--primary-l-top", "100%");
			root.setProperty("--primary-h-bottom", "0deg");
			root.setProperty("--primary-s-bottom", "0%");
			root.setProperty("--primary-l-bottom", "100%");
			document.querySelectorAll(".box-color").forEach(() => {});
			const card = document.querySelector(".card");
			if (card) {
				card.style.background = `linear-gradient(to bottom, rgb(${r},${g},${b}), rgb(${Math.round(r*0.85)},${Math.round(g*0.85)},${Math.round(b*0.85)}))`;
			}
		}
	}

	apply(FALLBACK); // instant paint with known-good data
	fetchProfile().then((p) => {
		apply(p);
		setInterval(() => fetchProfile().then(apply), 60_000); // refresh every minute
	});
})();
