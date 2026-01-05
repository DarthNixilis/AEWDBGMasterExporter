import { ui } from "./ui.js";
import { setManager } from "./setManager.js";
import { personaManager } from "./personaManager.js";
import { cardPool } from "./cardPool.js";
import { startingGrid } from "./startingGrid.js";

function setTab(tabName) {
  const tabs = [
    { name: "persona", btn: "tabPersona", view: "viewPersona" },
    { name: "pool", btn: "tabPool", view: "viewPool" },
    { name: "deck", btn: "tabDeck", view: "viewDeck" },
    { name: "starting", btn: "tabStarting", view: "viewStarting" },
  ];

  for (const t of tabs) {
    const btn = document.getElementById(t.btn);
    const view = document.getElementById(t.view);
    const active = t.name === tabName;
    btn.setAttribute("aria-selected", active ? "true" : "false");
    view.style.display = active ? "" : "none";
  }
}

function wireTabs() {
  document.querySelectorAll(".tabBtn").forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  });
}

function setStatus(text, kind = "info") {
  ui.setStatus(text, kind);
}

function bindGlobalErrorPopups() {
  window.addEventListener("error", (e) => {
    ui.toast("Error", e?.message || "Unknown error", "err", true);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const msg =
      (e?.reason && (e.reason.message || String(e.reason))) ||
      "Unhandled promise rejection";
    ui.toast("Error", msg, "err", true);
  });
}

async function init() {
  bindGlobalErrorPopups();
  wireTabs();

  setStatus("Loading sets + cards…");
  const { cards, setsLoaded } = await setManager.loadAllSets();

  ui.setSets(setsLoaded);
  ui.setCardCount(cards.length);

  // Build Persona UI first (default: none selected)
  personaManager.mount(document.getElementById("viewPersona"), cards, (selectedPersona) => {
    // Whenever persona changes:
    startingGrid.render(document.getElementById("viewStarting"), cards, selectedPersona);
    cardPool.render(document.getElementById("viewPool"), cards, selectedPersona);
  });

  // Initial render with no persona selected
  startingGrid.render(document.getElementById("viewStarting"), cards, null);
  cardPool.render(document.getElementById("viewPool"), cards, null);

  // Deck placeholder
  document.getElementById("viewDeck").innerHTML = `
    <div class="row" style="justify-content:space-between;">
      <div>
        <div style="font-weight:800; font-size:18px;">Deck</div>
        <div class="hint">Next step after persona + starters + pool behave. We’ll wire deck building + validation + export here.</div>
      </div>
    </div>
    <div class="empty">Deck tab is intentionally minimal right now.</div>
  `;

  setStatus("Ready", "ok");
  ui.toast("Loaded", `Loaded ${cards.length} cards from ${setsLoaded.length} set(s).`, "ok");
}

init().catch((err) => {
  ui.toast("Startup failed", err?.message || String(err), "err", true);
  setStatus("Startup failed", "err");
});
