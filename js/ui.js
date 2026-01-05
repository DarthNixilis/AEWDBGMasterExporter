function el(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

function safeText(s) {
  return (s ?? "").toString();
}

function toast(title, message, kind = "info", sticky = false) {
  const wrap = el("toastWrap");
  const t = document.createElement("div");
  t.className = `toast ${kind === "ok" ? "ok" : kind === "warn" ? "warn" : kind === "err" ? "err" : ""}`;
  t.innerHTML = `<strong>${safeText(title)}</strong><div>${safeText(message)}</div>`;

  const close = document.createElement("button");
  close.textContent = "Close";
  close.style.marginTop = "8px";
  close.addEventListener("click", () => t.remove());
  t.appendChild(close);

  wrap.appendChild(t);

  if (!sticky) {
    setTimeout(() => {
      if (t.isConnected) t.remove();
    }, 4500);
  }
}

function setStatus(text, kind = "info") {
  const pill = el("statusPill");
  pill.textContent = `Status: ${safeText(text)}`;
  pill.style.borderColor =
    kind === "ok"
      ? "rgba(71,209,140,0.5)"
      : kind === "err"
      ? "rgba(255,59,59,0.55)"
      : kind === "warn"
      ? "rgba(255,204,102,0.5)"
      : "rgba(255,255,255,0.12)";
}

function setSets(sets) {
  el("setPill").textContent = `Sets: ${sets.length ? sets.join(", ") : "(none)"}`;
}

function setCardCount(n) {
  el("countPill").textContent = `Cards: ${n}`;
}

export const ui = { toast, setStatus, setSets, setCardCount };
