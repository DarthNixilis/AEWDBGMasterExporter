// FILE: renderer.js
import { loadAllData } from "./data-loader.js";

function norm(s) { return String(s ?? "").trim(); }
function getField(row, ...names) {
  for (const n of names) if (Object.prototype.hasOwnProperty.call(row, n)) return row[n];
  return "";
}

function cardName(row) { return norm(getField(row, "Card Name", "Name", "Title")); }
function cardType(row) { return norm(getField(row, "Type")); }
function cardSet(row) { return norm(getField(row, "Set")); }
function cardCost(row) { return norm(getField(row, "Cost", "C")); }
function cardMomentum(row) { return norm(getField(row, "Momentum", "M")); }
function cardDamage(row) { return norm(getField(row, "Damage", "D")); }

function cardGameText(row) {
  return norm(getField(
    row,
    "Game Text",
    "Rules Text",
    "Rules",
    "Text",
    "Effect",
    "Ability",
    "Abilities",
    "Card Text",
    "Text Box"
  ));
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;