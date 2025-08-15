
// ============================================================================
// html BODY
// ============================================================================

// body.js
fetch("body.html")
  .then(res => res.text())
  .then(html => {
    document.body.innerHTML = html;
    // Set title from a global variable in index.html
    document.getElementById("page-title").textContent = window.pageTitle || "Docs";
    feather.replace();
  })
  .catch(err => console.error("Failed to load body.html:", err));