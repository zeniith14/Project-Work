function accettaCookie() {
  localStorage.setItem('cookie_consenso', JSON.stringify({
    accettato: true,
    data: new Date().toISOString(),
  }));
  const banner = document.getElementById('cookie-banner');
  if (banner) banner.classList.add('nascosta');
}

(function () {
  const consenso = localStorage.getItem('cookie_consenso');
  const banner = document.getElementById('cookie-banner');
  if (!consenso && banner) banner.classList.remove('nascosta');
})();
