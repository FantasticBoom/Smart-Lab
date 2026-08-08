import websocket
import time
import threading
import json
import sys
import re
import requests
import socket
import logging
from pathlib import Path
import tkinter as tk
from tkinter import messagebox

import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer

try:
    import win32gui
    import wmi
    import pythoncom
except ImportError:
    win32gui = None
    wmi = None
    pythoncom = None

from config import get_server_url, get_device_token

# Setup Logging
log_dir = Path(sys.executable).resolve().parent if getattr(sys, 'frozen', False) else Path(__file__).resolve().parent
logging.basicConfig(
    filename=log_dir / "agent.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

class SmartLabAgent:
    def __init__(self):
        self.ws = None
        self.is_connected = False
        self.reconnect_delay = 2
        self.max_reconnect_delay = 30
        self.whitelist = {}
        self.is_locked = False
        self.browser_tabs = []
        
    def _get_ws_url(self):
        server_url = get_server_url()
        device_token = get_device_token()
        
        if not server_url or not device_token:
            return None, None
            
        base = server_url.replace("http://", "ws://").replace("https://", "wss://")
        base = base.rstrip('/')
        ws_url = f"{base}/api/v1/ws/agent?token={device_token}"
        return ws_url, device_token

    def connect_to_server(self):
        while True:
            ws_url, device_token = self._get_ws_url()
            if not ws_url or not device_token:
                logging.warning("Server URL atau Device Token belum di-set. Silakan jalankan config.exe untuk setup awal.")
                time.sleep(5)
                continue
                
            logging.info(f"Mencoba menyambungkan ke {ws_url}...")
            
            self.ws = websocket.WebSocketApp(
                ws_url,
                on_open=self.on_open,
                on_message=self.on_message,
                on_error=self.on_error,
                on_close=self.on_close,
            )
            
            self.ws.run_forever()
            
            logging.info(f"Koneksi terputus. Mencoba reconnect dalam {self.reconnect_delay} detik...")
            time.sleep(self.reconnect_delay)
            
            self.reconnect_delay = min(self.reconnect_delay * 2, self.max_reconnect_delay)

    def on_open(self, ws):
        logging.info("Koneksi WebSocket berhasil dibuka!")
        self.is_connected = True
        self.reconnect_delay = 2
        
        threading.Thread(target=self.heartbeat_loop, daemon=True).start()
        threading.Thread(target=self.wmi_listener_loop, daemon=True).start()
        self.start_local_server()

    def on_message(self, ws, message):
        logging.info(f"[Pesan dari Server]: {message}")
        try:
            data = json.loads(message)
            msg_type = data.get("type", "").upper()

            if msg_type == "COMMAND":
                action = data.get("action", "").lower()

                if action == "lock":
                    logging.info("[Command] Menerima perintah lock workstation.")
                    success = True
                    try:
                        if not self.is_locked:
                            self.is_locked = True
                            threading.Thread(target=self.show_lock_screen, daemon=True).start()
                    except Exception as e:
                        logging.error(f"[Error] Gagal mengunci: {e}")
                        success = False

                    self.ws.send(json.dumps({
                        "type": "COMMAND_ACK",
                        "action": "lock",
                        "success": success
                    }))
                    logging.info("[Command] Konfirmasi lock dikirim ke server.")

                elif action == "unlock":
                    logging.info("[Command] Menerima perintah unlock workstation.")
                    success = True
                    try:
                        self.is_locked = False
                    except Exception as e:
                        logging.error(f"[Error] Gagal membuka kunci: {e}")
                        success = False

                    self.ws.send(json.dumps({
                        "type": "COMMAND_ACK",
                        "action": "unlock",
                        "success": success
                    }))
                    logging.info("[Command] Konfirmasi unlock dikirim ke server.")

                else:
                    logging.warning(f"[Warning] Perintah tidak dikenal: {action}")

        except json.JSONDecodeError:
            pass
        except Exception as e:
            logging.error(f"[Error] Memproses pesan: {e}")

    def wmi_listener_loop(self):
        if wmi is None or pythoncom is None:
            logging.warning("[Warning] WMI API tidak tersedia (bukan Windows). WMI Listener dinonaktifkan.")
            return

        pythoncom.CoInitialize()
        c = wmi.WMI()
        
        process_watcher = c.ExecNotificationQuery(
            "SELECT * FROM __InstanceCreationEvent WITHIN 1 WHERE TargetInstance ISA 'Win32_Process'"
        )
        
        # Regex untuk nama file (setup, install, update, dll)
        name_pattern = re.compile(r'(?i)(setup|install|update|patch|msiexec\.exe)')
        
        # Regex untuk lokasi file (blokir semua .exe yang dijalankan dari folder Downloads atau Temp)
        path_pattern = re.compile(r'(?i)(\\Downloads\\|\\Temp\\|\\AppData\\Local\\Temp\\)')
        
        logging.info("[Security] WMI Listener aktif. Memantau instalasi aplikasi...")
        
        while self.is_connected:
            try:
                new_event = process_watcher.NextEvent(2000)
                process = new_event.TargetInstance
                process_name = process.Name
                
                if not process_name:
                    continue
                    
                current_time = time.time()
                keys_to_delete = [k for k, v in self.whitelist.items() if current_time > v]
                for k in keys_to_delete:
                    del self.whitelist[k]
                
                # Cek path executable-nya jika ada
                process_path = process.ExecutablePath if hasattr(process, 'ExecutablePath') and process.ExecutablePath else ""
                
                # Daftar pengecualian (Whitelist Sistem) untuk proses latar belakang bawaan Windows/Aplikasi yang aman
                exclude_pattern = re.compile(r'(?i)(trustedinstaller\.exe|googleupdate\.exe|mscorsvw\.exe|tiworker\.exe|wuauclt\.exe|updater\.exe|update\.exe)')
                
                if exclude_pattern.search(process_name):
                    continue
                
                # Blokir JIKA:
                # 1. Nama file mengandung unsur setup/install, ATAU
                # 2. File dijalankan dari folder Downloads / Temp (karena banyak installer pakai nama random)
                is_installer = False
                if name_pattern.search(process_name):
                    is_installer = True
                elif process_path and path_pattern.search(process_path):
                    is_installer = True
                    
                if is_installer:
                    if process_name.lower() in self.whitelist:
                        logging.info(f"[Security] Installer {process_name} diizinkan (whitelisted).")
                    else:
                        logging.warning(f"[Security] Mendeteksi percobaan instalasi: {process_name}")
                        try:
                            # Gunakan taskkill daripada process.Terminate() untuk menghindari bug IDispatch pada library wmi
                            # di mana process.Terminate mengeksekusi metode namun mengembalikan integer (0) sehingga error saat diberi tanda kurung ()
                            import subprocess
                            subprocess.run(['taskkill', '/F', '/PID', str(process.ProcessId)], capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)
                            logging.info(f"[Security] Berhasil menghentikan {process_name}.")
                            
                            # Jalankan dialog secara langsung (synchronous) untuk menghindari bug threading Tkinter di Windows
                            self.show_install_key_dialog(process_name)
                        except Exception as e:
                            logging.error(f"[Error] Gagal menghentikan {process_name}. (Mungkin butuh akses Admin atau proses sudah tertutup): {e}")
                            
            except wmi.x_wmi_timed_out:
                pass
            except Exception as e:
                time.sleep(2)

    def show_install_key_dialog(self, process_name):
        import subprocess
        import ctypes
        
        logging.info(f"Memunculkan dialog InputBox untuk {process_name}...")
        
        # Gunakan PowerShell untuk memunculkan InputBox native Windows (Thread-safe dan bebas crash)
        ps_code = f"""
Add-Type -AssemblyName Microsoft.VisualBasic
$key = [Microsoft.VisualBasic.Interaction]::InputBox('Instalasi diblokir: {process_name}`nMasukkan Install Key untuk melanjutkan:', 'Akses Ditolak')
Write-Output $key
"""
        try:
            res = subprocess.run(['powershell', '-Command', ps_code], capture_output=True, text=True, creationflags=subprocess.CREATE_NO_WINDOW)
            key = res.stdout.strip()
            
            if not key:
                return # User membatalkan atau mengosongkan input
                
            server_url = get_server_url()
            device_token = get_device_token()
            url = f"{server_url}/api/v1/install-keys/validate?device_token={device_token}"
            headers = {"Authorization": f"Bearer {device_token}", "Content-Type": "application/json"}
            payload = {"key_code": key}
            
            resp = requests.post(url, json=payload, headers=headers, timeout=5)
            if resp.status_code == 200 and resp.json().get("valid") == True:
                self.whitelist[process_name.lower()] = time.time() + 300
                # Munculkan MessageBox sukses
                ctypes.windll.user32.MessageBoxW(0, f"Install Key valid. Silakan jalankan ulang {process_name} dalam 5 menit.", "Sukses", 0x40 | 0x40000)
            else:
                ctypes.windll.user32.MessageBoxW(0, "Install Key tidak valid!", "Ditolak", 0x10 | 0x40000)
        except Exception as e:
            logging.error(f"Error pada validasi Install Key: {e}")
            ctypes.windll.user32.MessageBoxW(0, f"Gagal terhubung ke server: {e}", "Error", 0x10 | 0x40000)

    def show_lock_screen(self):
        def _run_lock():
            try:
                root = tk.Tk()
                root.attributes("-fullscreen", True)
                root.attributes("-topmost", True)
                root.configure(bg="black")
                
                root.protocol("WM_DELETE_WINDOW", lambda: None)
                
                tk.Label(
                    root, 
                    text="KAMU MELANGGAR PERATURAN PENGGUNAAN LAB", 
                    font=("Helvetica", 36, "bold"), 
                    fg="white", 
                    bg="black"
                ).pack(expand=True)
                
                def check_lock_status():
                    if not getattr(self, 'is_locked', False):
                        root.destroy()
                    else:
                        root.after(1000, check_lock_status)
                        
                check_lock_status()
                root.mainloop()
            except Exception as e:
                logging.error(f"Gagal memunculkan Lock Screen: {e}")

        lock_thread = threading.Thread(target=_run_lock)
        lock_thread.start()
        # Jangan di-join karena lock screen berjalan di background sampai di-unlock

    def get_active_window_title(self):
        if win32gui is None:
            return "Windows API not available (Requires Windows)"
        try:
            hwnd = win32gui.GetForegroundWindow()
            title = win32gui.GetWindowText(hwnd)
            return title
        except Exception as e:
            logging.error(f"[Error] Gagal mendapatkan window title: {e}")
            return "Unknown"

    def get_all_open_windows(self):
        if win32gui is None:
            return ["Windows API not available (Requires Windows)"]
        
        windows = []
        def enum_window_callback(hwnd, _):
            try:
                if win32gui.IsWindowVisible(hwnd):
                    title = win32gui.GetWindowText(hwnd)
                    if title and title.strip():
                        t = title.strip()
                        # Abaikan judul window browser bawaan jika kita menggunakan ekstensi
                        if not re.search(r'(?i)(- Google Chrome|- Microsoft Edge)$', t):
                            windows.append(t)
            except Exception:
                pass
            return True
        
        try:
            win32gui.EnumWindows(enum_window_callback, None)
        except Exception as e:
            logging.error(f"[Error] Gagal mendapatkan list window: {e}")
            
        if not windows:
            windows.append("[DEBUG] Tidak ada window yang terbaca oleh system.")
            
        return windows

    def on_error(self, ws, error):
        logging.error(f"[Error WebSocket]: {error}")

    def on_close(self, ws, close_status_code, close_msg):
        logging.info("Koneksi WebSocket ditutup.")
        self.is_connected = False

    def heartbeat_loop(self):
        while self.is_connected:
            try:
                active_window = self.get_active_window_title()
                open_windows = self.get_all_open_windows()
                
                # Gabungkan dengan tab browser yang dikirim dari ekstensi
                if self.browser_tabs:
                    open_windows.extend(self.browser_tabs)
                
                # Hapus duplikat dan bersihkan pesan debug jika ada data asli
                open_windows = list(set(open_windows))
                if len(open_windows) > 1 and "[DEBUG] Tidak ada window yang terbaca oleh system." in open_windows:
                    open_windows.remove("[DEBUG] Tidak ada window yang terbaca oleh system.")
                
                ip_address = "127.0.0.1"
                try:
                    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                    s.connect(("8.8.8.8", 80))
                    ip_address = s.getsockname()[0]
                    s.close()
                except Exception:
                    pass

                payload = json.dumps({
                    "type": "heartbeat", 
                    "status": "active",
                    "active_window": active_window,
                    "open_windows": open_windows,
                    "ip_address": ip_address
                })
                self.ws.send(payload)
                logging.info(f"[Heartbeat] Pesan heartbeat dikirim. Window: {active_window}, Total Apps: {len(open_windows)}")
            except Exception as e:
                logging.error(f"[Heartbeat] Gagal mengirim heartbeat: {e}")
                break
                
            time.sleep(20)

    def start_local_server(self):
        class TabHandler(BaseHTTPRequestHandler):
            agent_ref = self

            def log_message(self, format, *args):
                pass # Matikan log bawaan http.server agar tidak spamming

            def do_OPTIONS(self):
                self.send_response(200, "ok")
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.end_headers()

            def do_POST(self):
                if self.path == '/tabs':
                    content_length = int(self.headers.get('Content-Length', 0))
                    if content_length > 0:
                        post_data = self.rfile.read(content_length)
                        try:
                            tabs = json.loads(post_data.decode('utf-8'))
                            if isinstance(tabs, list):
                                self.agent_ref.browser_tabs = tabs
                                logging.info(f"[Local Server] Menerima {len(tabs)} tab dari browser ekstensi.")
                        except Exception as e:
                            logging.error(f"[Local Server] Error parsing tabs JSON: {e}")
                            
                    self.send_response(200)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                else:
                    self.send_response(404)
                    self.end_headers()

        def run_server():
            server_address = ('127.0.0.1', 13337)
            try:
                httpd = HTTPServer(server_address, TabHandler)
                logging.info("[Local Server] Berhasil menyala di port 13337 (Menunggu data dari ekstensi browser).")
                httpd.serve_forever()
            except OSError as e:
                logging.error(f"[Local Server] Gagal menyalakan server di port 13337 (Port mungkin sedang dipakai): {e}")

        server_thread = threading.Thread(target=run_server, daemon=True)
        server_thread.start()

if __name__ == "__main__":
    logging.info("=== Memulai SmartLab Agent ===")
    agent = SmartLabAgent()
    
    try:
        agent.connect_to_server()
    except KeyboardInterrupt:
        logging.info("Agent dihentikan oleh pengguna.")
