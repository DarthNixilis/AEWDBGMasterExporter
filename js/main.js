import { installPopupErrors, setStatus } from "./popupErrors.js";
import { loadTSVFromFile } from "./tsvLoader.js";
import { createStore } from "./store.js";
import { renderCardGrid, normalizeRow } from "./ui.js";

installPopupErrors();

const store = createStore({
  cards: [],
  persona: null,
  personaCards: [],
  kitCards: [],
  cardPoolCards: []
});

const TAB_BUTTONS = Array.from(document.querySelectorAll("nav button"));
const PANELS = {
  persona: document.getElementById("panel-persona"),
  cardpool: document.getElementById("panel-cardpool"),
  deck: document.getElementById("panel-deck"),
  starting: document.getElementById("panel-starting"),
};

function setTab(tab) {
  TAB_BUTTONS.forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  Object.entries(PANELS).forEach(([k, el]) => el.classList.toggle("active", k === tab));
}

TAB_BUTTONS.forEach(btn => {
  btn.addEventListener("click", () => setTab(btn.dataset.tab));
});

const personaSelect = document.getElementById("personaSelect");
const personaCardsEl = document.getElementById("personaCards");
const cardPoolGridEl = document.getElementById("cardPoolGrid");
const startingGridEl = document.getElementById("startingGrid");
const searchInput = document.getElementById("searchInput");

function isKitCard(card) {
  const type = (card.type || "").toLowerCase();
  const traits = (card.traits || "").toLowerCase();
  return type === "kit" || traits.includes("kit");
}

function isPersonaCard(card) {
  // Your TSV has Type=Wrestler for personas. Some of your data uses “Call Name”.
  // We treat personas as Type=Wrestler (primary).
  return (card.type || "").toLowerCase() === "wrestler";
}

function matchKitToPersona(kitCard, personaName) {
  // Uses “Wrestler Logo” column if present, otherwise tries “wrestlerlogo” fallback.
  const logo = (kitCard.wrestlerlogo || kitCard["wrestler logo"] || kitCard.wrestler_logo || "").toLowerCase();
  return logo.includes(personaName.toLowerCase());
}

function rebuildDerivedState() {
  const { cards, persona } = store.get();

  const allCards = cards;

  const personas = allCards.filter(isPersonaCard);
  // Keep kit hidden from pool
  const cardPoolCards = allCards.filter(c => !isKitCard(c));

  let personaCards = [];
  let kitCards = [];
  if (persona) {
    personaCards = personas.filter(p => (p.name || "").toLowerCase() === persona.toLowerCase());
    kitCards = allCards.filter(c => isKitCard(c) && matchKitToPersona(c, persona));
  }

  store.set({ cardPoolCards, personaCards, kitCards });
}

function renderAll() {
  const { cards, persona, cardPoolCards, personaCards, kitCards } = store.get();

  // Fill persona dropdown once we have cards
  const personas = cards.filter(isPersonaCard).map(c => c.name).filter(Boolean);
  const uniquePersonas = Array.from(new Set(personas)).sort((a,b)=>a.localeCompare(b));

  personaSelect.innerHTML = uniquePersonas.length
    ? uniquePersonas.map(n => `<option value="${escapeHtml(n)}"${n===persona ? " selected":""}>${escapeHtml(n)}</option>`).join("")
    : `<option value="">(No personas found)</option>`;

  // Persona view grid: show persona cards (usually 1) + kit cards
  renderCardGrid(personaCardsEl, [...personaCards, ...kitCards]);

  // Card pool search filtering
  const q = (searchInput.value || "").trim().toLowerCase();
  const filteredPool = q
    ? cardPoolCards.filter(c =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.type || "").toLowerCase().includes(q) ||
        (c.traits || "").toLowerCase().includes(q) ||
        (c.gametext || c["game text"] || "").toLowerCase().includes(q)
      )
    : cardPoolCards;

  renderCardGrid(cardPoolGridEl, filteredPool);

  // Starting grid = persona + kit
  renderCardGrid(startingGridEl, [...personaCards, ...kitCards]);

  setStatus(`Loaded ${cards.length} cards. Card Pool: ${cardPoolCards.length} (Kit hidden). Persona: ${persona || "(none)"}. Kit attached: ${kitCards.length}.`);
}

personaSelect.addEventListener("change", () => {
  const val = personaSelect.value || null;
  store.set({ persona: val });
  rebuildDerivedState();
  renderAll();
});

searchInput.addEventListener("input", () => renderAll());

// Boot
(async function init() {
  try {
    setStatus("Loading AEW.txt…");

    // IMPORTANT: AEW.txt must be in the same folder as index.html, or adjust this path.
    const rows = await loadTSVFromFile("./AEW.txt");
    const cards = rows.map(normalizeRow);

    store.set({ cards });

    // Default persona to first found
    const firstPersona = cards.find(isPersonaCard)?.name || null;
    store.set({ persona: firstPersona });

    rebuildDerivedState();
    renderAll();
  } catch (err) {
    // popupErrors will show, but also set status
    setStatus("FAILED to load. You should see a popup with the error.");
    throw err;
  }
})();

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
