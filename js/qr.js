(function () {
  function assertLibrary() {
    if (!window.QRCode || typeof window.QRCode.toCanvas !== "function" || typeof window.QRCode.toDataURL !== "function") {
      throw new Error("QR generation is temporarily unavailable. Check your connection and try again.");
    }
  }

  async function render(canvas, url) {
    assertLibrary();
    await window.QRCode.toCanvas(canvas, url, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#171714", light: "#ffffff" }
    });
  }

  async function dataUrl(url) {
    assertLibrary();
    return window.QRCode.toDataURL(url, {
      width: 720,
      margin: 3,
      errorCorrectionLevel: "H",
      color: { dark: "#171714", light: "#ffffff" }
    });
  }

  window.NusaQr = Object.freeze({ render, dataUrl });
})();