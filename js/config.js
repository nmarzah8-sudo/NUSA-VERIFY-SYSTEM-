/* Supabase Dashboard > Project Settings > API: use the Project URL and publishable/anon key. */
/* Never place a service-role key or Supabase secret key in browser code. */
window.NUSA_CONFIG = Object.freeze({
  SUPABASE_URL: "https://zywonapqvzamduhrgxdr.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_ULLUQfFl8PDZ46Gfrn4Xrw_BZP-VvLL ",
  PUBLIC_BASE_URL: "https://nmarzah8-sudo.github.io/NUSA-VERIFY-SYSTEM-",
  STATUSES: Object.freeze(["Active", "Inactive", "Graduated", "Revoked"]),
  POSITIONS: Object.freeze(["President", "Vice President", "Secretary General", "Treasurer", "Member"])
});

window.NusaConfig = Object.freeze({
  uuidPattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  supabaseCredentials() {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.NUSA_CONFIG;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase is not configured.");
    let projectUrl;
    try {
      projectUrl = new URL(SUPABASE_URL);
    } catch {
      throw new Error("Supabase configuration is invalid.");
    }
    if (projectUrl.protocol !== "https:" || projectUrl.username || projectUrl.password ||
      projectUrl.pathname !== "/" || projectUrl.search || projectUrl.hash) {
      throw new Error("Supabase configuration is invalid.");
    }
    const segments = SUPABASE_ANON_KEY.split(".");
    let isServiceRole = false;
    if (segments.length === 3) {
      try {
        const payload = segments[1].replace(/-/g, "+").replace(/_/g, "/");
        isServiceRole = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "="))).role === "service_role";
      } catch {
        isServiceRole = false;
      }
    }
    if (SUPABASE_ANON_KEY.startsWith("sb_secret_") || isServiceRole) {
      throw new Error("A publishable Supabase key is required.");
    }
    return { url: projectUrl.origin, key: SUPABASE_ANON_KEY };
  },
  publicBaseUrl() {
    const explicit = window.NUSA_CONFIG.PUBLIC_BASE_URL.trim();
    let base;
    if (explicit) {
      try {
        base = new URL(explicit);
      } catch {
        throw new Error("Set PUBLIC_BASE_URL to a valid production HTTPS URL.");
      }
      const host = base.hostname.toLowerCase();
      if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash ||
          /(^localhost$|^127\.|\.app\.github\.dev$|\.trycloudflare\.com$|\.pages\.dev$|\.vercel\.app$|\.netlify\.app$)/i.test(host)) {
        throw new Error("QR links require a permanent production HTTPS URL.");
      }
    } else if (window.location.hostname.toLowerCase().endsWith(".github.io")) {
      base = new URL("./", window.location.href);
    } else {
      throw new Error("QR links are available after deployment to GitHub Pages. Configure PUBLIC_BASE_URL for a production domain.");
    }
    if (!base.pathname.endsWith("/")) base.pathname += "/";
    return base;
  },
  verificationUrl(token) {
    if (!this.uuidPattern.test(token)) throw new Error("This student record has an invalid verification token.");
    const url = new URL("verify.html", this.publicBaseUrl());
    url.searchParams.set("token", token);
    return url.href;
  }
});
