(function () {
  function showMessage(element, message, isError = false) {
    element.textContent = message;
    element.classList.toggle("notice-error", isError);
    element.hidden = false;
  }

  async function isAdministrator(client, userId) {
    const { data, error } = await client.rpc("is_admin");
    if (error) throw error;
    return data === true && Boolean(userId);
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
      if (!await isAdministrator(client, session.user.id)) {
        await client.auth.signOut();
        window.location.replace("login.html?denied=1");
        return null;
      }
      document.getElementById("account-email").textContent = session.user.email || "Authorized administrator";
      document.getElementById("admin-app").hidden = false;
      accessMessage.hidden = true;
      client.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT" || event === "USER_DELETED") window.location.replace("login.html");
      });
      return { client, user: session.user };
    } catch {
      showMessage(accessMessage, "Administrator access could not be verified. Check the service configuration and try again.", true);
      return null;
    }
  }

  async function initializeLogin() {
    const form = document.getElementById("login-form");
    if (!form) return;
    const message = document.getElementById("login-message");
    const submit = document.getElementById("login-submit");
    const parameters = new URLSearchParams(window.location.search);
    if (parameters.get("denied") === "1") showMessage(message, "This account is not authorized to administer NUSA Verify.", true);

    try {
      const client = window.NusaSupabase.getClient();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (data.session && await isAdministrator(client, data.session.user.id)) {
        window.location.replace("dashboard.html");
        return;
      }
    } catch {
      showMessage(message, "Sign-in is temporarily unavailable. Check the service configuration and try again.", true);
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      message.hidden = true;
      submit.disabled = true;
      submit.textContent = "Signing in...";
      try {
        const client = window.NusaSupabase.getClient();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error || !data.user || !await isAdministrator(client, data.user.id)) {
          if (data.user) await client.auth.signOut();
          showMessage(message, "Sign-in failed. Check your credentials or administrator access and try again.", true);
          return;
        }
        window.location.replace("dashboard.html");
      } catch {
        showMessage(message, "Sign-in is temporarily unavailable. Please try again.", true);
      } finally {
        submit.disabled = false;
        submit.textContent = "Sign in";
      }
    });
  }

  window.NusaAuth = Object.freeze({ requireAdmin, initializeLogin });
  document.addEventListener("DOMContentLoaded", initializeLogin);
})();