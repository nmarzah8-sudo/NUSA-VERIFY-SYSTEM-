(function () {
  for (const slot of document.querySelectorAll("[data-logo-slot]")) {
    const image = document.createElement("img");
    image.alt = "";
    image.addEventListener("load", () => {
      slot.replaceChildren(image);
      slot.classList.add("has-logo");
    }, { once: true });
    image.addEventListener("error", () => image.remove(), { once: true });
    image.src = new URL("assets/logo.png", document.baseURI).href;
  }

  if ("serviceWorker" in navigator && (window.isSecureContext || window.location.hostname === "localhost")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(new URL("sw.js", document.baseURI)).catch(() => {});
    });
  }
})();