// js/main.js
import { loadAllSets } from "./setManager.js";

// Global error popups (mobile friendly)
function showErrorPopup(title, message) {
  alert(`${title}\n\n${message}`);
}

window.addEventListener("error", (e) => {
  showErrorPopup("Runtime Error", e?.error?.message || e.message || String(e));
});

window.addEventListener("unhandledrejection", (e) => {
  showErrorPopup(
    "Unhandled Promise Rejection",
    e?.reason?.message || String(e.reason || e)
  );
});

function setStatus(text, ok = true) {
  const el = document.getElementById("statusText");
  if (!el) return;
  el.textContent = text;
  el.className = ok ? "status-ok" : "status-bad";
}

async function init() {
  try {
    setStatus("Loading sets…", true);

    const { setPaths, cards } = await loadAllSets("sets/setList.txt");

    // Make cards available everywhere
    window.AEW = window.AEW || {};
    window.AEW.setPaths = setPaths;
    window.AEW.cards = cards;

    setStatus(`Loaded ${cards.length} cards from ${setPaths.length} set file(s).`, true);

    // If you already have modules that render UI, call them here safely:
    // They can read from window.AEW.cards
    if (window.AEW?.boot) {
      window.AEW.boot();
    }
  } catch (err) {
    setStatus("FAILED to load. You should see a popup with the error.", false);
    showErrorPopup("Load Failed", err?.message || String(err));
  }
}

document.addEventListener("DOMContentLoaded", init); 
