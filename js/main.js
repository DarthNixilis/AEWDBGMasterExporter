import { store } from "./store.js";
import { loadAllSets } from "./setManager.js";
import { loadAllCards } from "./dataLoader.js";
import { renderUI, setStatus } from "./ui.js";
import { showError } from "./popupErrors.js";

async function bootApp() {
  try {
    setStatus("Loading sets…");
    renderUI();

    const sets = await loadAllSets();
    if (!sets.length) {
      throw new Error("No sets were loaded.");
    }

    setStatus(`Loaded ${sets.length} set(s). Loading cards…`);
    renderUI();

    const cards = await loadAllCards(sets);
    if (!cards.length) {
      throw new Error("All sets loaded but parsed zero cards.");
    }

    store.setState({
      sets,
      cards,
      status: "Ready"
    });

    renderUI();
  } catch (err) {
    console.error(err);
    store.setState({ status: "FAILED" });
    renderUI();
    showError(err.message || "Fatal load error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bootApp();
});
