// Show/hide offline banner
function updateOnlineStatus() {
  var banner = document.getElementById('offline-banner');
  if (!navigator.onLine) {
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Initial check
updateOnlineStatus();

// iOS viewport fix
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
  window.addEventListener('orientationchange', function() {
    setTimeout(function() {
      window.scrollTo(0, 1);
    }, 500);
  });
}
