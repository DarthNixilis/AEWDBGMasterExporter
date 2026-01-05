import { ui } from "./ui.js";
import { cardRules } from "../rules/cardRules.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeKey(s) {
  return String(s ?? "").trim().toLowerCase();
}

function displayName(card) {
  const name = String(card?.name ?? "");
  const t = String(card?.typeNormalized ?? "").toLowerCase();

  const suffixMap = {
    wrestler: " Wrestler",
    manager: " Manager",
    call_name: " Call Name",
    faction: " Faction",
  };

  const suffix = suffixMap[t];
  if (suffix && name.endsWith(suffix)) return name.slice(0, -suffix.length).trim();
  return name.trim();
}

function getPersonaCards(cards) {
  const personaTypes = new Set(["wrestler", "manager", "call_name", "faction"]);
  return (cards ?? [])
    .filter((c) => personaTypes.has(String(c.typeNormalized ?? "").toLowerCase()))
    // Personas themselves are never "kit" by Starting For anyway, but keep this safe:
    .filter((c) => !c.isKit);
}

function renderPersonaTab(state, allCards) {
  const personas = getPersonaCards(allCards);

  const currentId = state?.selectedPersonaId ?? "";
  const options =
    `<option value="">(none)</option>` +
    personas
      .map((p) => {
        const label = escapeHtml(displayName(p));
        const sel = String(p.id) === String(currentId) ? " selected" : "";
        return `<option value="${escapeHtml(p.id)}"${sel}>${label}</option>`;
      })
      .join("");

  const selected = personas.find((p) => String(p.id) === String(currentId)) || null;

  const selectedInfo = selected
    ? `
      <div class="card card--tight">
        <div class="card__title">${escapeHtml(displayName(selected))}</div>
        <div class="card__meta">
          ${escapeHtml(cardRules.cardLine(selected))}
        </div>
        <div class="card__text">${escapeHtml(selected.gameText || "")}</div>
      </div>
    `
    : `<div class="hint">Select a persona to load its Starting grid and Kit cards.</div>`;

  return `
    <div class="panel">
      <div class="row row--stack">
        <label class="label">Choose Persona:</label>
        <select id="personaSelect" class="select">
          ${options}
        </select>
      </div>

      <div class="spacer"></div>

      ${selectedInfo}
    </div>
  `;
}

function bindPersonaTab(store, allCards, rerenderAll) {
  const el = document.getElementById("personaSelect");
  if (!el) return;

  el.addEventListener("change", () => {
    const nextId = el.value || "";
    store.setState({ selectedPersonaId: nextId });
    rerenderAll();
  });
}

export const personaManager = {
  renderPersonaTab,
  bindPersonaTab,
  displayName, // exported for other tabs if needed later
  normalizeKey,
}; 
