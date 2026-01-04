alert("MAIN.JS: file loaded");

try {
  alert("MAIN.JS: starting imports");

  import("./personaManager.js")
    .then(module => {
      alert("MAIN.JS: personaManager loaded");
      return import("./cardPool.js");
    })
    .then(module => {
      alert("MAIN.JS: cardPool loaded");
      return import("./ui.js");
    })
    .then(module => {
      alert("MAIN.JS: ui loaded");
      alert("BOOT COMPLETE");
    })
    .catch(err => {
      alert("IMPORT ERROR:\n" + err.message);
    });

} catch (e) {
  alert("FATAL ERROR:\n" + e.message);
}
