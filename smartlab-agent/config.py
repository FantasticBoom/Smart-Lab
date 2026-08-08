import json
import os
import sys
import keyring
from pathlib import Path

# Base directory for the agent
# Ketika di-build menjadi .exe oleh PyInstaller (--onefile), __file__ menunjuk ke
# folder TEMP sementara yang dihapus setelah .exe ditutup.
# Kita gunakan sys.executable agar config selalu disimpan di samping .exe itu sendiri
# (contoh: C:\SmartLabAgent\agent_config.json)
if getattr(sys, 'frozen', False):
    # Running sebagai .exe hasil PyInstaller build
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    # Running langsung sebagai .py (development)
    BASE_DIR = Path(__file__).resolve().parent

CONFIG_FILE = BASE_DIR / "agent_config.json"
SERVICE_NAME = "SmartLabAgent"

def load_config():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return {}
    return {}

def save_config(config):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=4)

def set_server_url(url):
    config = load_config()
    config["server_url"] = url
    save_config(config)

def get_server_url():
    config = load_config()
    return config.get("server_url")

def set_device_token(token):
    # Simpan token secara aman (Windows Credential Manager / macOS Keychain)
    keyring.set_password(SERVICE_NAME, "device_token", token)

def get_device_token():
    # Ambil token dari Credential Manager
    try:
        return keyring.get_password(SERVICE_NAME, "device_token")
    except Exception:
        return None

if __name__ == "__main__":
    print("=== Setup SmartLab Agent ===")
    
    current_url = get_server_url()
    print(f"Server URL saat ini: {current_url if current_url else 'Belum di-set'}")
    new_url = input("Masukkan Server URL baru (tekan enter untuk skip): ")
    if new_url.strip():
        set_server_url(new_url.strip())
        print("Server URL berhasil di-update.")
    
    current_token = get_device_token()
    print(f"Device Token: {'***' + current_token[-4:] if current_token else 'Belum di-set'}")
    new_token = input("Masukkan Device Token baru (tekan enter untuk skip): ")
    if new_token.strip():
        set_device_token(new_token.strip())
        print("Device Token berhasil di-update (disimpan aman).")
        
    print("\nKonfigurasi selesai.")
