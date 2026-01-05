export function normalizeRow(row) {
  // Make common keys available as dot props, while keeping the original header keys too.
  // This lets us support headers like "Game Text" without exploding the whole app.
  const name = row["name"] ?? row.name ?? "";
  const type = row["type"] ?? row.type ?? "";
  const traits = row["traits"] ?? row.traits ?? "";
  const imagefile = row["imagefile"] ?? row["image file"] ?? row["imagefile"] ?? row.imagefile ?? "";
  const gametext = row["game text"] ?? row["gametext"] ?? row.gametext ?? "";

  const wrestlerlogo = row["wrestler logo"] ?? row["wrestlerlogo"] ?? row.wrestlerlogo ?? "";

  return {
    ...row,
    name,
    type,
    traits,
    imagefile,
    gametext,
    wrestlerlogo
  };
}

export function renderCardGrid(container, cards) {
  if (!container) return;
  if (!cards || cards.length === 0) {
    container.innerHTML = `<div class="muted">No cards to show.</div>`;
    return;
  }

  container.innerHTML = cards.map(c => {
    const name = c.name || "(Unnamed)";
    const type = c.type || "";
    const cost = c.cost || c["cost"] || "";
    const dmg = c.damage || c["damage"] || "";
    const mom = c.momentum || c["momentum"] || "";
    const traits = c.traits || "";
    const text = c.gametext || c["game text"] || "";

    return `
      <div class="card">
        <h3>${escapeHtml(name)}</h3>
        <div class="muted">${escapeHtml(type)}${cost!=="" ? ` • C:${escapeHtml(cost)}` : ""}${dmg!=="" ? ` • D:${escapeHtml(dmg)}` : ""}${mom!=="" ? ` • M:${escapeHtml(mom)}` : ""}</div>
        ${traits ? `<div class="muted">Traits: ${escapeHtml(traits)}</div>` : ""}
        ${text ? `<div style="margin-top:8px; font-size:12px; line-height:1.35;">${escapeHtml(text)}</div>` : ""}
      </div>
    `;
  }).join("");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
