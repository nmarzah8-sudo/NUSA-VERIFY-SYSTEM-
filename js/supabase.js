(function () {
  let client;

  function getClient() {
    if (client) return client;
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("The verification service is temporarily unavailable.");
    }
    const credentials = window.NusaConfig.supabaseCredentials();
    client = window.supabase.createClient(credentials.url, credentials.key, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
    });
    return client;
  }

  window.NusaSupabase = Object.freeze({ getClient });
})();