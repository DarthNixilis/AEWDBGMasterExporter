import { ui } from "./ui.js";
import { toPascalCaseFilename } from "./dataLoader.js";

function isInCardPool(card) {
  // Hard rule:
  // - Anything with Starting For filled is NOT in the pool (kit/starter/etc)
  // - This is what you asked for and it prevents kit weirdness.
  const sf = (card.startingFor ?? "").trim();
  if (sf.length > 0) return false;

  // Also: if someone later adds Type=Kit, still exclude.
  const t = (card.type ?? "").toLowerCase().trim();
  if (t === "kit") return false;

  return true;
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

function exportAllCardsAsTSV(cards) {
  // Exports ALL loaded cards, but fills ImageFile with PascalCase if blank or wrong.
  const headers = [
    "Name","Sets","ImageFile","Cost","Damage","Momentum","Type","Target","Traits","Wrestler Logo","Game Text","Starting For"
  ];

  const lines = [headers.join("\t")];

  for (const c of cards) {
    // Prefer existing extension if present, else jpg
    const ext = (c.imagefile && c.imagefile.includes(".")) ? c.imagefile.split(".").pop() : "jpg";
    const computed = toPascalCaseFilename(c.displayName || c.name, ext);

    const imageOut = computed; // you said you keep forgetting, so we force it here

    const row = [
      c.displayName || c.name || "",
      c.sets || "",
      imageOut,
      c.cost || "",
      c.damage || "",
      c.momentum || "",
      c.type || "",
      c.target || "",
      c.traits || "",
      c.wrestlerLogo || "",
      c.gameText || "",
      c.startingFor || "",
    ];

    lines.push(row.map(cleanCell).join("\t"));
  }

  const tsv = lines.join("\n");
  downloadText(tsv, `AEW_AllCards_${Date.now()}.tsv`, "text/tab-separated-values");
}

function exportPoolAsTSV(cards) {
  const pool = cards.filter(isInCardPool);
  const headers = [
    "Name","Sets","ImageFile","Cost","Damage","Momentum","Type","Target","Traits","Wrestler Logo","Game Text","Starting For"
  ];
  const lines = [headers.join("\t")];

  for (const c of pool) {
    const ext = (c.imagefile && c.imagefile.includes(".")) ? c.imagefile.split(".").pop() : "jpg";
    const computed = toPascalCaseFilename(c.displayName || c.name, ext);
    const row = [
      c.displayName || c.name || "",
      c.sets || "",
      computed,
      c.cost || "",
      c.damage || "",
      c.momentum || "",
      c.type || "",
      c.target || "",
      c.traits || "",
      c.wrestlerLogo || "",
      c.gameText || "",
      c.startingFor || "",
    ];
    lines.push(row.map(cleanCell).join("\t"));
  }

  const tsv = lines.join("\n");
  downloadText(tsv, `AEW_CardPool_${Date.now()}.tsv`, "text/tab-separated-values");
}

function cleanCell(v) {
  return (v ?? "").toString().replace(/\t/g, " ").replace(/\r?\n/g, "\\n");
}

function downloadText(text, filename, mime) {
  const blob = new Blob([text], { type: mime || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function render(container, cards, persona) {
  const poolCards = cards.filter(isInCardPool);

  container.innerHTML = `
    <div class="row" style="justify-content:space-between;">
      <div>
        <div style="font-weight:800; font-size:18px;">Card Pool</div>
        <div class="hint">
          Pool excludes <b>any</b> card with <b>Starting For</b> filled (starters/kits/etc).<br>
          Persona selection does not change the pool, it only affects Starting tab.
        </div>
      </div>
      <div class="row">
        <button class="primary" id="btnExportPool">Export Pool TSV (PascalCase images)</button>
        <button id="btnExportAll">Export ALL Cards TSV (PascalCase images)</button>
      </div>
    </div>

    ${poolCards.length ? `<div class="grid">${poolCards.map(renderCard).join("")}</div>` : `<div class="empty">Card Pool is empty. Check your TSV headers and make sure cards have blank Starting For unless they are starters.</div>`}
  `;

  container.querySelector("#btnExportPool").addEventListener("click", () => {
    exportPoolAsTSV(cards);
    ui.toast("Exported", "Card Pool TSV downloaded with PascalCase ImageFile.", "ok");
  });

  container.querySelector("#btnExportAll").addEventListener("click", () => {
    exportAllCardsAsTSV(cards);
    ui.toast("Exported", "All Cards TSV downloaded with PascalCase ImageFile.", "ok");
  });
}

function escapeHtml(s) {
  return (s ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export const cardPool = { render };
