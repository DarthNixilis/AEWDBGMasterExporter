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

function renderCard(card) {
  // You specifically do NOT want Type in the title line
  const title = escapeHtml(displayName(card));
  const meta = escapeHtml(cardRules.cardLine(card));
  const text = escapeHtml(card.gameText || "");

  return `
    <div class="card">
      <div class="card__title">${title}</div>
      <div class="card__meta">${meta}</div>
      ${text ? `<div class="card__text">${text}</div>` : ""}
    </div>
  `;
}

function renderCardPoolTab(state, allCards) {
  // Card Pool must exclude Kit cards (Starting For != blank)
  const pool = (allCards ?? []).filter((c) => !c.isKit);

  const q = String(state?.cardPoolQuery ?? "").trim().toLowerCase();
  const filtered = q
    ? pool.filter((c) => {
        const hay = `${c.name ?? ""} ${c.traits ?? ""} ${c.gameText ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
    : pool;

  const listHtml = filtered.map(renderCard).join("");

  return `
    <div class="panel">
      <div class="row row--stack">
        <label class="label">Search:</label>
        <input id="cardPoolSearch" class="input" placeholder="name, trait, text..." value="${escapeHtml(
          state?.cardPoolQuery ?? ""
        )}" />
      </div>

      <div class="spacer"></div>

      <div class="list">
        ${listHtml || `<div class="hint">No cards found.</div>`}
      </div>
    </div>
  `;
}

function bindCardPoolTab(store, allCards, rerenderAll) {
  const input = document.getElementById("cardPoolSearch");
  if (!input) return;

  input.addEventListener("input", () => {
    store.setState({ cardPoolQuery: input.value });
    rerenderAll();
  });
}

export const cardPool = {
  renderCardPoolTab,
  bindCardPoolTab,
};
