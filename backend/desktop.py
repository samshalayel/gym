"""
Silver GYM — Desktop launcher (PyWebView + embedded FastAPI).

Runs the existing FastAPI app on a local port in a background thread,
then opens a native desktop window pointing at it. Works fully offline.

Dev run:
    python desktop.py

Build a single .exe:
    pyinstaller SilverGYM.spec
"""
import os
import sys
import socket
import threading
import time

import traceback

import uvicorn
import webview

HOST = "127.0.0.1"


def _log_dir() -> str:
    base = os.path.dirname(sys.executable) if getattr(sys, "frozen", False) else os.path.dirname(__file__)
    return base


def _log(msg: str):
    try:
        with open(os.path.join(_log_dir(), "desktop.log"), "a", encoding="utf-8") as f:
            f.write(f"{time.strftime('%H:%M:%S')}  {msg}\n")
    except Exception:
        pass


def _free_port() -> int:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind((HOST, 0))
    port = s.getsockname()[1]
    s.close()
    return port


def _run_server(port: int):
    try:
        _log("server thread: importing app...")
        from app.main import app
        _log("server thread: app imported, starting uvicorn")
        config = uvicorn.Config(app, host=HOST, port=port, log_level="warning")
        server = uvicorn.Server(config)
        # uvicorn installs OS signal handlers which only work on the main thread;
        # disable them since we run inside a background thread.
        server.install_signal_handlers = lambda: None
        server.run()
    except Exception:
        _log("server thread CRASHED:\n" + traceback.format_exc())


def _wait_until_up(port: int, timeout: float = 20.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((HOST, port), timeout=0.5):
                return True
        except OSError:
            time.sleep(0.2)
    return False


_LOCK_PORT = 49777  # fixed port used purely as a single-instance guard


def _acquire_single_instance():
    """Bind a fixed loopback port. If it's already taken, another copy is
    running — refuse to start so two instances never corrupt the same DB."""
    lock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        lock.bind((HOST, _LOCK_PORT))
        lock.listen(1)
        return lock  # keep reference alive for the whole process
    except OSError:
        return None


def main():
    _log("=== launch ===")

    lock = _acquire_single_instance()
    if lock is None:
        _log("another instance is already running — exiting")
        try:
            webview.create_window(
                "Silver GYM",
                html="<body style='background:#08080e;color:#e8e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0'>"
                     "<div style='text-align:center'><h2>Silver GYM</h2><p>التطبيق يعمل بالفعل في نافذة أخرى.</p>"
                     "<p style='color:#888'>The app is already running.</p></div></body>",
                width=420, height=240,
            )
            webview.start()
        except Exception:
            pass
        sys.exit(0)

    port = _free_port()
    _log(f"chosen port {port}")

    server = threading.Thread(target=_run_server, args=(port,), daemon=True)
    server.start()

    if not _wait_until_up(port):
        _log("server did not come up within timeout")
        sys.exit(1)
    _log("server is up, opening window")

    # Native window. http_port lets pywebview serve downloads/blobs correctly.
    webview.create_window(
        "Silver GYM",
        f"http://{HOST}:{port}/",
        width=1280,
        height=820,
        min_size=(1024, 680),
        text_select=True,
        confirm_close=True,
    )
    # private_mode=False keeps localStorage (token/role) between sessions.
    webview.start(private_mode=False)


if __name__ == "__main__":
    main()
