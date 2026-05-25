// ─── APP INIT ───

document.addEventListener('DOMContentLoaded', async () => {
  // Restore body stats and settings
  restoreBodyStats();
  loadSettingsUI();
  calcTDEE();

  // Load goals
  loadGoals();

  // Register service worker for PWA offline support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Auto-sync from Drive on open if configured
  if (CONFIG.autoSync && CONFIG.driveFileId && CONFIG.googleApiKey) {
    await syncFromDrive();
  } else if (!CONFIG.driveFileId || !CONFIG.googleApiKey) {
    setStatus('err', 'Go to Settings to connect Google Drive');
    document.getElementById('sdot').classList.add('off');
  }
});
