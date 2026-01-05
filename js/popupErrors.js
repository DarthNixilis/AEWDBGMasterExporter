export function installPopupErrors() {
  window.addEventListener("error", (e) => {
    const msg = e?.error?.stack || e?.message || "Unknown error";
    alert(`JS Error:\n\n${msg}`);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e?.reason?.stack || e?.reason?.message || String(e?.reason || "Unknown rejection");
    alert(`Unhandled Promise Rejection:\n\n${reason}`);
  });
}

export function setStatus(text) {
  const el = document.getElementById("status");
  if (!el) return;
  el.innerHTML = `
    <div><strong>Status:</strong> ${escapeHtml(text)}</div>
    <div class="muted">If something breaks, you should see a popup error.</div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
