# profile-server.py — Python twin of profile-server.js for orihost "eye".
#
# Same security model: token stays in this file / env var on the server;
# the website only ever receives PUBLIC profile data.
#
# Run:  python profile-server.py          (listens on :8474, endpoint /profile)
#       TOKEN=xxxx python profile-server.py   (env var preferred)

import json
import os
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

BOT_TOKEN = os.environ.get("TOKEN", "PASTE_YOUR_BOT_TOKEN_HERE")
USER_ID = "930902242385621043"
PORT = int(os.environ.get("PORT") or 0) or 8474
API = "https://discord.com/api/v10"
CDN = "https://cdn.discordapp.com"

FLAG_BADGES = [
    ("STAFF", 1),
    ("PARTNER", 2),
    ("HYPESQUAD", 4),
    ("BUG_HUNTER_LEVEL_1", 8),
    ("HYPESQUAD_BRAVERY", 64),
    ("HYPESQUAD_BRILLIANCE", 128),
    ("HYPESQUAD_BALANCE", 256),
    ("EARLY_SUPPORTER", 512),
    ("BUG_HUNTER_LEVEL_2", 16384),
    ("VERIFIED_DEVELOPER", 131072),
    ("CERTIFIED_MODERATOR", 262144),
    ("ACTIVE_DEVELOPER", 4194304),
]

_cache = {"data": None, "at": 0.0}


def discord_get(path):
    req = urllib.request.Request(
        API + path,
        headers={
            "Authorization": f"Bot {BOT_TOKEN}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=8) as r:
        return json.loads(r.read().decode())


def build_profile():
    if _cache["data"] and time.time() - _cache["at"] < 30:
        return _cache["data"]

    user = discord_get(f"/users/{USER_ID}")
    try:
        presence = discord_get(f"/users/{USER_ID}/presence")
    except Exception:
        presence = None

    flags = user.get("public_flags", 0)
    badges = [name for name, bit in FLAG_BADGES if flags & bit]
    if user.get("premium_type"):
        badges.append("NITRO")

    out = {
        "id": user["id"],
        "username": user["username"],
        "global_name": user.get("global_name"),
        "avatar": f"{CDN}/avatars/{user['id']}/{user['avatar']}.png?size=512" if user.get("avatar") else None,
        "banner": f"{CDN}/banners/{user['id']}/{user['banner']}.png?size=1024" if user.get("banner") else None,
        "accent_color": user.get("accent_color"),
        "banner_color": user.get("banner_color"),
        "display_name_styles": user.get("display_name_styles"),
        "badges": badges,
        "status": (presence or {}).get("status"),
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    _cache["data"] = out
    _cache["at"] = time.time()
    return out


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, payload):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.split("?")[0] != "/profile":
            self._send(404, {"error": "not found"})
            return
        try:
            self._send(200, build_profile())
        except Exception as e:
            self._send(502, {"error": str(e)})

    def log_message(self, fmt, *args):
        print("[profile-server]", fmt % args)


if __name__ == "__main__":
    if BOT_TOKEN == "PASTE_YOUR_BOT_TOKEN_HERE":
        print("[profile-server] WARNING: no token set (set TOKEN env var or edit BOT_TOKEN)")

    print(f"[profile-server] listening on :{PORT} -> /profile")
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
