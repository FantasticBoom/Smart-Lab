const AGENT_URL = 'http://127.0.0.1:13337/tabs';

// Mengirim daftar tab aktif ke Local Server (Agent)
async function syncTabs() {
  try {
    chrome.tabs.query({}, (tabs) => {
      // Hanya ambil tab yang ada judulnya dan bukan tab kosong/internal yang tidak berguna
      const tabTitles = tabs
        .map(t => t.title)
        .filter(title => title && title.trim().length > 0 && title !== 'New Tab');

      // Hindari duplikasi jika pengguna punya banyak jendela
      const uniqueTabs = [...new Set(tabTitles)];

      fetch(AGENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uniqueTabs)
      }).catch(err => {
        // Abaikan error jika agent sedang mati
        console.log('Failed to sync tabs, agent might be offline.', err);
      });
    });
  } catch (error) {
    console.error('Error in syncTabs:', error);
  }
}

// Dengarkan event ketika tab diupdate (judul berubah, loading selesai)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.title || changeInfo.status === 'complete') {
    syncTabs();
  }
});

// Dengarkan event ketika tab dihapus (ditutup)
chrome.tabs.onRemoved.addListener(() => {
  syncTabs();
});

// Jalankan sync secara berkala setiap 5 detik untuk memastikan data tetap akurat
setInterval(syncTabs, 5000);
syncTabs();
