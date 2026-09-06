// config.js — website settings. SAFE TO SHARE: no token ever goes here.
//
// STEP 1: run bot/profile-server.js on your orihost "eye" server (see DEPLOY-orihost.md)
// STEP 2: put its address below, e.g. "http://YOUR-SERVER-IP:8474/profile"
//
// Leave "" to use the bundled static profile (site works either way).
window.PROFILE_CONFIG = {
	api: "",
	// Set true to tint the card with your Discord accent color
	// (yours is white — leave false to keep the navy banner theme).
	useAccent: false,
};
