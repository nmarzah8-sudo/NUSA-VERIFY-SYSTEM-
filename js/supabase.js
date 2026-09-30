(function () {
  let client;

  function getClient() {
    if (client) return client;
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("The verification service is temporarily unavailable.");
    }
    // Use NUSA_CONFIG you already fixed
    const cfg = window.NUSA_CONFIG || window.NusaConfig;
    if (!cfg) {
      throw new Error("The verification service is temporarily unavailable.");
    }
    const url = cfg.SUPABASE_URL || (cfg.supabaseCredentials && cfg.supabaseCredentials().url);
    const key = cfg.SUPABASE_ANON_KEY || (cfg.supabaseCredentials && cfg.supabaseCredentials().key);

    if (!url || !key) {
      throw new Error("Supabase configuration is invalid.");
    }
    client = window.supabase.createClient(url, key, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
    });
    return client;
  }

  window.NusaSupabase = Object.freeze({ getClient });
})();
