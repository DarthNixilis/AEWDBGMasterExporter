// FILE: data-loader.js

function norm(v) {
  return String(v == null ? "" : v).trim();
}

function truthyCell(v) {
  var t = norm(v).toLowerCase();
  return t !== "" && t !== "false" && t !== "0" && t !== "n/a" && t !== "na" && t !== "null" && t !== "undefined";
}

function splitNames(cell) {
  return norm(cell)
    .split(/[,/;]+/g)
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return !!s; });
}

function getField(row, names) {
  for (var i = 0; i < names.length; i++) {
    var n = names[i];
    if (Object.prototype.hasOwnProperty.call(row, n)) return row[n];
  }
  return "";
}

function cardName(row) {
  return norm(getField(row, ["Card Name", "Name", "Title"]));
}

function cardType(row) {
  return norm(getField(row, ["Type"]));
}

function cardText(row) {
  return norm(getField(row, ["Game Text", "Rules Text", "Rules", "Text", "Effect", "Ability", "Abilities", "Card Text", "Text Box"]));
}

function isKit(row) {
  var v = getField(row, ["Wrestler Kit", "Kit", "Is Kit"]);
  return truthyCell(v);
}

function startingForNames(row) {
  var cell = getField(row, ["Starting For", "Signature For", "Starter For"]);
  return splitNames(cell);
}

function isPersonaRow(row) {
  var t = norm(cardType(row)).toLowerCase();

  // Known persona-like types (expand safely later)
  if (t === "wrestler") return true;
  if (t === "manager") return true;
  if (t === "call name") return true;
  if (t === "callname") return true;
  if (t === "faction") return true;

  // Some exports use a flag column
  var personaFlag = getField(row, ["Persona", "Is Persona", "Persona Card"]);
  if (truthyCell(personaFlag)) return true;

  return false;
}

async function fetchTextOrThrow(url) {
  var res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    var body = "";
    try { body = await res.text(); } catch (e) { body = ""; }
    throw new Error("Fetch failed " + res.status + " " + res.statusText + " for " + url + "\n" + body.slice(0, 300));
  }
  return await res.text();
}

function parseTSV(tsvText) {
  var text = String(tsvText || "");
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  var lines = text.split("\n").filter(function (l) { return l.trim() !== ""; });
  if (!lines.length) return [];

  var header = lines[0].split("\t").map(function (h) { return h.trim(); });
  var rows = [];

  for (var i = 1; i < lines.length; i++) {
    var cols = lines[i].split("\t");
    var obj = {};
    for (var c = 0; c < header.length; c++) {
      obj[header[c]] = cols[c] == null ? "" : cols[c];
    }
    rows.push(obj);
  }

  return rows;
}

export async function loadAllData() {
  var AEW = window.AEWDBG || {};
  var setStatus = AEW.setStatus ? AEW.setStatus : function () {};
  var showError = AEW.showError ? AEW.showError : function () {};

  try {
    var setListPath = "./sets/setList.txt";
    setStatus("Status: Loading...  Sets: (loading)  Cards: (loading)");

    var setListText = await fetchTextOrThrow(setListPath);
    var rawLines = setListText.split(/\r?\n/g).map(function (l) { return l.trim(); });
    var setFiles = rawLines.filter(function (l) { return l && l[0] !== "#"; });

    if (!setFiles.length) {
      throw new Error("setList.txt is empty. Path used: " + setListPath);
    }

    setStatus("Status: Loading...  Sets: " + setFiles.length + " (loading)  Cards: (loading)");

    var allRows = [];
    for (var i = 0; i < setFiles.length; i++) {
      var file = setFiles[i];
      var clean = file.replace(/^\.?\//, "");
      var url = clean.indexOf("sets/") === 0 ? ("./" + clean) : ("./sets/" + clean);

      var tsv = await fetchTextOrThrow(url);
      var rows = parseTSV(tsv);

      for (var r = 0; r < rows.length; r++) rows[r].__sourceFile = clean;
      allRows = allRows.concat(rows);
    }

    var personas = allRows
      .filter(function (r) { return isPersonaRow(r); })
      .map(function (r) { return { name: cardName(r), type: cardType(r), row: r }; })
      .filter(function (p) { return !!p.name; });

    var startersByPersona = new Map();
    for (var j = 0; j < allRows.length; j++) {
      var row = allRows[j];
      var nm = cardName(row);
      if (!nm) continue;

      var startersFor = startingForNames(row);
      if (!startersFor.length) continue;

      for (var k = 0; k < startersFor.length; k++) {
        var key = startersFor[k];
        if (!startersByPersona.has(key)) startersByPersona.set(key, []);
        startersByPersona.get(key).push(row);
      }
    }

    var pool = allRows.filter(function (row) {
      if (isPersonaRow(row)) return false;
      if (isKit(row)) return false;
      if (startingForNames(row).length) return false;
      return true;
    });

    var setsSet = new Set();
    for (var z = 0; z < allRows.length; z++) {
      var s = norm(getField(allRows[z], ["Set"]));
      if (s) setsSet.add(s);
    }
    var sets = Array.from(setsSet);

    setStatus("Status: Loaded  Sets: " + sets.length + "  Cards: " + allRows.length);

    return {
      sets: sets,
      allRows: allRows,
      personas: personas,
      pool: pool,
      startersByPersona: startersByPersona
    };
  } catch (err) {
    showError("Data load failed (fetch/parse).", err && err.stack ? err.stack : String(err));
    throw err;
  }
}
