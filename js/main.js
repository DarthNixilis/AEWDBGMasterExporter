import { loadAllSetsCards } from "./setManager.js";
import { normalizeCard, displayName } from "./ui.js";
import { getCardPool } from "./cardPool.js";
import { PersonaManager } from "./personaManager.js";

function showPopupError(title, err) {
  const msg =
    (err && (err.stack || err.message)) ? (err.stack || err.message) : String(err);
  alert(`❌ ${title}\n\n${msg}`);
  console.error(err);
}

function setStatus(text) {
  const el = document.getElementById("status");
  if (el) el.textContent = text;
}

function setupTabs() {
  const tabs = document.getElementById("tabs");
  const buttons = Array.from(tabs.querySelectorAll("button[data-tab]"));
  const panels = {
    persona: document.getElementById("panel-persona"),
    cardpool: document.getElementById("panel-cardpool"),
    deck: document.getElementById("panel-deck"),
    starting: document.getElementById("panel-starting"),
  };

  function activate(tab) {
    buttons.forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    Object.entries(panels).forEach(([k, p]) => p.classList.toggle("active", k === tab));
  }

  buttons.forEach((b) => {
    b.addEventListener("click", () => activate(b.dataset.tab));
  });

  return { activate };
}

function renderCards(container, cards, opts = {}) {
  if (!container) return;

  if (!cards || cards.length === 0) {
    container.innerHTML = `<div class="hint">No cards to show.</div>`;
    return;
  }

  const {
    showTypeLine = true,
    showTitleTypeSuffix = false, // you asked: do NOT show type in title line
  } = opts;

  container.innerHTML = cards
    .map((c) => {
      const n = showTitleTypeSuffix ? (c.name || "") : displayName(c.name || "");
      const type = c.type || "";
      const cost = c.cost ?? "";
      const dmg = c.damage ?? "";
      const mom = c.momentum ?? "";

      const metaParts = [];
      if (showTypeLine && type) metaParts.push(type);
      if (cost !== "" && cost !== null && cost !== undefined) metaParts.push(`C:${cost}`);
      if (dmg !== "" && dmg !== null && dmg !== undefined) metaParts.push(`D:${dmg}`);
      if (mom !== "" && mom !== null && mom !== undefined) metaParts.push(`M:${mom}`);

      const gameText = c.gameText || "";

      return `
        <div class="card">
          <h3>${escapeHtml(n || "(Unnamed)")}</h3>
          ${metaParts.length ? `<div class="meta">${escapeHtml(metaParts.join(" • "))}</div>` : ""}
          ${gameText ? `<div class="text">${escapeHtml(gameText)}</div>` : ""}
        </div>
      `;
    })
    .join("");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function init() {
  try {
    const { activate } = setupTabs();

    setStatus("Status: Loading card data…");

    // Load sets (future-proof). Falls back to AEW.txt if sets/setList.txt missing.
    const rawCards = await loadAllSetsCards();
    const allCards = rawCards.map(normalizeCard);

    // Persona manager decides what is a persona + what starters connect.
    const personaManager = new PersonaManager(allCards);

    // UI elements
    const personaSelect = document.getElementById("personaSelect");
    const clearPersonaBtn = document.getElementById("clearPersonaBtn");

    const personaGrid = document.getElementById("personaGrid");
    const startingGrid = document.getElementById("startingGrid");

    const poolSearch = document.getElementById("poolSearch");
    const cardPoolGrid = document.getElementById("cardPoolGrid");

    // Fill persona dropdown
    const personas = personaManager.getPersonaCards();
    personaSelect.innerHTML = "";

    // Default: none selected
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "— None Selected —";
    personaSelect.appendChild(placeholder);

    for (const p of personas) {
      const opt = document.createElement("option");
      opt.value = p.__id;
      opt.textContent = displayName(p.name);
      personaSelect.appendChild(opt);
    }

    // Card pool (kits/starters excluded)
    const fullPool = getCardPool(allCards);

    function renderPool(filtered) {
      renderCards(cardPoolGrid, filtered, {
        showTypeLine: false, // you asked: don’t display type in title line, and also hide type line here for cleaner pool
        showTitleTypeSuffix: false,
      });
    }

    renderPool(fullPool);

    poolSearch.addEventListener("input", () => {
      const q = (poolSearch.value || "").trim().toLowerCase();
      if (!q) return renderPool(fullPool);

      const filtered = fullPool.filter((c) => {
        const hay = `${c.name} ${c.type} ${c.gameText}`.toLowerCase();
        return hay.includes(q);
      });
      renderPool(filtered);
    });

    function clearPersonaViews() {
      renderCards(personaGrid, [], {});
      renderCards(startingGrid, [], {});
    }

    clearPersonaViews();

    personaSelect.addEventListener("change", () => {
      try {
        const id = personaSelect.value;
        if (!id) {
          personaManager.clearPersona();
          clearPersonaViews();
          setStatus(`Status: Loaded ${allCards.length} cards. Persona: none`);
          return;
        }

        const { persona, starters } = personaManager.selectPersonaById(id);

        // Persona panel can show persona + starters (so you can read everything in one place if you want)
        renderCards(personaGrid, [persona, ...starters], {
          showTypeLine: true,
          showTitleTypeSuffix: false,
        });

        // Starting tab should show all cards for selected persona (persona + starters)
        renderCards(startingGrid, [persona, ...starters], {
          showTypeLine: true,
          showTitleTypeSuffix: false,
        });

        setStatus(
          `Status: Loaded ${allCards.length} cards. Persona: ${displayName(persona.name)} (${starters.length} starters)`
        );
      } catch (err) {
        showPopupError("Persona selection failed", err);
      }
    });

    clearPersonaBtn.addEventListener("click", () => {
      personaSelect.value = "";
      personaManager.clearPersona();
      clearPersonaViews();
      setStatus(`Status: Loaded ${allCards.length} cards. Persona: none`);
      activate("persona");
    });

    setStatus(`Status: Loaded ${allCards.length} cards. Persona: none`);
  } catch (err) {
    showPopupError("App failed to load", err);
    setStatus("Status: Failed to load (see popup).");
  }
}

init();
