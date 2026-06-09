"""
Silver GYM — LAN server.

Runs the system on this machine and serves it to every device on the same
local network (router/Wi-Fi), no internet required. Staff devices just open
http://<this-pc-ip>:8000 in a browser and log in with their own accounts.

Keep this window open while the gym is operating.

Dev run:
    python server_lan.py
Build .exe:
    pyinstaller SilverGYM-Server.spec
"""
import os
import socket
import sys

import uvicorn

PORT = 8000


def _lan_ip() -> str:
    """Best-effort primary LAN IPv4 of this machine."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))  # no packets sent; just picks the egress iface
        ip = s.getsockname()[0]
    except OSError:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


def main():
    ip = _lan_ip()
    bar = "=" * 52
    print(bar)
    print("            SILVER GYM  —  LAN SERVER")
    print(bar)
    print()
    print("  هذا الجهاز هو الخادم. اترك هذه النافذة مفتوحة.")
    print("  This PC is the server. Keep this window open.")
    print()
    print("  من أي جهاز على نفس الشبكة، افتح المتصفح على:")
    print("  On any device on the same network, open:")
    print()
    print(f"      >>>   http://{ip}:{PORT}   <<<")
    print()
    print(f"  وعلى هذا الجهاز نفسه:  http://localhost:{PORT}")
    print()
    print("  الحسابات / Accounts:")
    print("    admin   / admin123     (مدير)")
    print("    cashier / cashier123   (كاشير)")
    print()
    print(bar)
    print("  لإيقاف الخادم: أغلق هذه النافذة أو اضغط Ctrl+C")
    print(bar)

    # Import after banner so any startup log appears below it.
    from app.main import app
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="warning")


if __name__ == "__main__":
    main()
