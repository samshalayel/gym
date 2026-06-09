"""
One-way snapshot sync: local server  --->  VPS (silvergym.club).

The local machine is the single source of truth; the VPS is a read-only
mirror for the member portal. Pressing the "Sync" button in the app makes a
clean SQLite snapshot of the local DB and uploads it to the VPS, which atomically
swaps it in. Small DB (KBs) => full snapshot is simpler and safer than deltas.
"""
import os
import json
import sqlite3
import tempfile
import urllib.request
import urllib.error

from fastapi import APIRouter, Request, HTTPException, Depends
from app.database import engine
from app.auth.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/sync", tags=["sync"])

# ⚠️ Change this secret and keep it identical on local build AND the VPS.
SYNC_SECRET = "sg-sync-7Qx2Lm9Pv4Rt8Wz"
# Where the local app pushes to (the VPS). nginx proxies /api/ to the backend.
VPS_RECEIVE_URL = "http://silvergym.club/api/sync/receive"


def _db_path() -> str:
    return engine.url.database


@router.post("/receive")
async def receive(request: Request):
    """Runs on the VPS. Accepts a raw SQLite file and swaps it in atomically."""
    if request.headers.get("X-Sync-Secret") != SYNC_SECRET:
        raise HTTPException(status_code=403, detail="Invalid sync secret")

    body = await request.body()
    if len(body) < 1000:
        raise HTTPException(status_code=400, detail="Uploaded file too small")

    path = _db_path()
    incoming = path + ".incoming"
    with open(incoming, "wb") as f:
        f.write(body)

    # Validate it is a real, non-corrupt SQLite database before swapping.
    try:
        c = sqlite3.connect(incoming)
        ok = c.execute("PRAGMA integrity_check").fetchone()[0]
        members = c.execute("SELECT COUNT(*) FROM members").fetchone()[0]
        c.close()
        if ok != "ok":
            raise ValueError(f"integrity={ok}")
    except Exception as e:  # noqa
        try:
            os.remove(incoming)
        except OSError:
            pass
        raise HTTPException(status_code=400, detail=f"Invalid database: {e}")

    # Release pooled connections, then atomically replace the file on disk.
    engine.dispose()
    os.replace(incoming, path)
    return {"status": "ok", "members": members}


@router.post("/push")
def push(current_user: User = Depends(get_current_user)):
    """Runs on the LOCAL server. Snapshots the local DB and uploads it to the VPS."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")

    path = _db_path()
    if not path or not os.path.isfile(path):
        raise HTTPException(status_code=500, detail="Local database not found")

    # Consistent snapshot via the SQLite backup API (safe while the server runs).
    fd, snap = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    try:
        src = sqlite3.connect(path)
        dst = sqlite3.connect(snap)
        with dst:
            src.backup(dst)
        dst.close()
        src.close()

        with open(snap, "rb") as f:
            data = f.read()
    finally:
        try:
            os.remove(snap)
        except OSError:
            pass

    req = urllib.request.Request(
        VPS_RECEIVE_URL,
        data=data,
        headers={"X-Sync-Secret": SYNC_SECRET, "Content-Type": "application/octet-stream"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"VPS rejected sync: {e.code} {e.reason}")
    except urllib.error.URLError as e:
        raise HTTPException(status_code=502, detail=f"Cannot reach VPS (no internet?): {e.reason}")

    return {"status": "synced", "uploaded_kb": round(len(data) / 1024, 1), "vps": result}
