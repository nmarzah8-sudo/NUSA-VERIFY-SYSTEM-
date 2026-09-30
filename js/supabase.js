(function () {
  let client;

  function getClient() {
    if (client) return client;

    const supaGlobal = window.supabase;

    if (!supaGlobal || typeof supaGlobal.createClient !== "function") {
      console.error("Supabase library not loaded");
      throw new Error("Sign-in is temporarily unavailable. Please try again.");
    }

    const cfg = window.NUSA_CONFIG || window.NusaConfig;

    if (!cfg) {
      throw new Error("Supabase configuration is not loaded.");
    }

    const url = cfg.SUPABASE_URL;
    const key = cfg.SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error("Supabase configuration is invalid.");
    }

    client = supaGlobal.createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });

    return client;
  }

  window.NusaSupabase = {
    getClient
  };
})();
