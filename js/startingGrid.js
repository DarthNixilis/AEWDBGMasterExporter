function matchesStartingFor(card, persona) {
  const sf = (card.startingFor ?? "").trim().toLowerCase();
  if (!sf || !persona) return false;

  const personaName = (persona.displayName || persona.name || "").trim().toLowerCase();
  const personaRaw = (persona.name || "").trim().toLowerCase();

  // Match either to displayName (no suffix) or raw name (with suffix).
  return sf === personaName || sf === personaRaw;
}

function renderCard(c) {
  const name = c.displayName || c.name || "(unnamed)";
  const metaBits = [];
  if (c.type) metaBits.push(c.type);
  if (c.sets) metaBits.push(c.sets);
  const meta = metaBits.join(" • ");

  const tags = [];
  if (c.cost) tags.push(`C:${c.cost}`);
  if (c.damage) tags.push(`D:${c.damage}`);
  if (c.momentum) tags.push(`M:${c.momentum}`);
  if (c.target) tags.push(`T:${c.target}`);
  if (c.traits) tags.push(c.traits);

  return `
    <div class="card">
      <div class="cardTitle">
        <div class="name">${escapeHtml(name)}</div>
        <div class="meta">${escapeHtml(meta)}</div>
      </div>
      <div class="text">${escapeHtml(c.gameText || "")}</div>
      <div class="tagRow">
        ${tags.filter(Boolean).slice(0, 6).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
      </div>
    </div>
  `;
}

function render(container, cards, persona) {
  const title = `Starting Cards`;
  if (!persona) {
    container.innerHTML = `
      <div style="font-weight:800; font-size:18px;">${title}</div>
      <div class="hint">Default is none selected. Pick a Persona to see their starting grid.</div>
      <div class="empty">No Persona selected.</div>
    `;
    return;
  }

  const starters = cards.filter((c) => matchesStartingFor(c, persona));
  // Include the persona card itself in the grid too (you asked for this)
  const personaCard = persona;

  const all = [personaCard, ...starters];

  container.innerHTML = `
    <div style="font-weight:800; font-size:18px;">${title}</div>
    <div class="hint">
      Showing Persona + all cards whose <b>Starting For</b> matches: <b>${escapeHtml(persona.displayName || persona.name)}</b>
    </div>

    ${all.length ? `<div class="grid">${all.map(renderCard).join("")}</div>` : `<div class="empty">No starters found for this Persona.</div>`}
  `;
}

function escapeHtml(s) {
  return (s ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export const startingGrid = { render };
