# Deploying the live profile bridge on orihost ("eye" server)

## What you have now

```
My website/
├── index.html                  ← the card (loads config.js + live-profile.js)
├── config.js                   ← website settings — NO token, safe to share
├── scripts/
│   ├── script.js               ← copy-username on click
│   └── live-profile.js         ← fetches live profile from the bridge
└── bot/
    ├── profile-server.js       ← Node bridge (token lives here, on the server only)
    └── profile-server.py       ← Python bridge (same thing, if "eye" runs Python)
```

## Why the token is safe

The token is only ever placed in `bot/profile-server.js` (or `profile-server.py`)
**on the orihost server**. The website never receives it — it only talks to the
bridge's `/profile` endpoint, which returns public profile data (username,
avatar URL, banner URL, colors, badges, status). Anyone who copies/downloads
your website gets **zero token**.

## Steps

1. **Open the orihost panel** → server **eye** → **Files** (or use SFTP).
2. Upload `bot/profile-server.js` (Node) **or** `bot/profile-server.py` (Python)
   into your bot's folder.
3. Put your bot token in it:
   - Easiest: open the bot's `.env` file, note the token value (e.g.
     `DISCORD_TOKEN=MTIz...`), and start the bridge with the env var:
     - Node: `TOKEN=MTIz... node profile-server.js`
     - Python: `TOKEN=MTIz... python profile-server.py`
   - Or edit the file and replace `PASTE_YOUR_BOT_TOKEN_HERE`.
4. **Open/forward port 8474** in the orihost panel (Network → port allocation),
   and note the server's public IP.
5. Edit your website's `config.js`:
   ```js
   api: "http://YOUR-SERVER-IP:8474/profile",
   ```
6. Reload your site — the card now shows live data (username, avatar, banner,
   colors, badges, status) straight from Discord via your bot, refreshing
   every 60 seconds.

## If your site will be on HTTPS

Browsers block `http://` calls from `https://` pages (mixed content). Two fixes:

- Serve the bridge through a free Cloudflare tunnel: `cloudflared tunnel --url http://localhost:8474`
  and use the `https://xxx.trycloudflare.com/profile` URL in `config.js`; or
- Ask orihost support to enable an SSL origin/ reverse proxy on port 8474.

## Note on the token

Because the token was discussed in chat, it's good hygiene to go to
**discord.com/developers/applications → your bot → Bot → Reset Token**, paste
the NEW token into the bridge on orihost, and update the bot's own `.env` to
match. The website never needs it, so nothing else changes.
