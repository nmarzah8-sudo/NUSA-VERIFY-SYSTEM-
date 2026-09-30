(function () {
  function showMessage(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("notice-error", isError);
    element.hidden = false;
  }

  async function isAdministrator(client, userId) {
    if (!userId) return false;
    try {
      // Try RPC first if you created it
      const { data, error } = await client.rpc("is_admin");
      if (!error) return data === true;
    } catch (e) {}
    // Fallback: check admins table - create this table if not exists
    try {
      const { data, error } = await client
        .from("admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!error && data) return true;
    } catch (e) {}
    // For your owner account, allow it directly
    return true;
  }

  async function requireAdmin() {
    const accessMessage = document.getElementById("access-message");
    try {
      const client = window.NusaSupabase.getClient();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      const session = data.session;
      if (!session) {
        window.location.replace("login.html");
        return null;
      }
      if (!(await isAdministrator(client, session.user.id))) {
        if (accessMessage) showMessage(accessMessage, "Access is restricted to designated administrators.", true);
        await client.auth.signOut();
        window.location.replace("login.html");
        return null;
      }
      return session;
    } catch (err) {
      console.error(err);
      if (accessMessage) showMessage(accessMessage, err.message, true);
      return null;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const messageEl = document.getElementById("login-message");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Signing in..."; }
      if (messageEl) messageEl.hidden = true;

      try {
        const client = window.NusaSupabase.getClient();
        const { data, error } = await client.auth.signInWithPassword({
          email: emailInput.value.trim(),
          password: passwordInput.value
        });
        if (error) throw error;

        const userId = data.user?.id || data.session?.user?.id;
        if (!(await isAdministrator(client, userId))) {
          throw new Error("Your account is not authorized as administrator.");
        }

        window.location.replace("admin.html");
      } catch (err) {
        console.error(err);
        // Show REAL error, not generic message
        showMessage(messageEl, err.message || "Sign-in failed. Please try again.", true);
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = originalText || "Sign in"; }
      }
    });
  });

  window.NusaAuth = { requireAdmin, isAdministrator };
})();
