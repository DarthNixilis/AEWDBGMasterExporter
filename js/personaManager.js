import { ui } from "./ui.js";

function isPersonaCard(card) {
  const t = (card.type ?? "").toLowerCase().trim();
  // Persona types you care about:
  return t === "wrestler" || t === "manager";
}

function mount(container, cards, onChange) {
  const personas = cards
    .filter(isPersonaCard)
    .map((c) => ({
      display: c.displayName || c.name,
      key: (c.displayName || c.name).toLowerCase(),
      card: c,
    }))
    .sort((a, b) => a.display.localeCompare(b.display));

  container.innerHTML = `
    <div style="font-weight:800; font-size:18px;">Persona</div>
    <div class="hint">
      Pick a Persona. Their starter cards (including Kits) auto-load using the <b>Starting For</b> column.<br>
      Card Pool never shows any card that has <b>Starting For</b> filled.
    </div>

    <div class="divider"></div>

    <div class="row">
      <label for="personaSelect">Choose Persona:</label>
      <select id="personaSelect">
        <option value="">(none selected)</option>
        ${personas.map((p) => `<option value="${escapeHtml(p.key)}">${escapeHtml(p.display)}</option>`).join("")}
      </select>
      <button id="personaClearBtn">Clear Persona</button>
    </div>

    <div class="hint">
      If a Persona isn’t showing up, make sure its <b>Type</b> column is exactly “Wrestler” or “Manager”.
    </div>
  `;

  const select = container.querySelector("#personaSelect");
  const clearBtn = container.querySelector("#personaClearBtn");

  function emitSelection() {
    const val = (select.value ?? "").trim();
    if (!val) {
      onChange(null);
      return;
    }
    const found = personas.find((p) => p.key === val);
    if (!found) {
      ui.toast("Persona missing", "Could not resolve selected Persona in list.", "warn");
      onChange(null);
      return;
    }
    onChange(found.card);
  }

  select.addEventListener("change", emitSelection);
  clearBtn.addEventListener("click", () => {
    select.value = "";
    onChange(null);
  });

  // Default: none
  onChange(null);
}

function escapeHtml(s) {
  return (s ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export const personaManager = { mount };
