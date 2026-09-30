(function () {
  function showMessage(element, message, isError = false) {
    if (!element) return;

    element.textContent = message;
    element.classList.toggle("notice-error", isError);
    element.hidden = false;
  }

  async function isAdministrator(client, userId) {
    if (!userId) return false;

    const { data, error } = await client
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Administrator check failed:", error);
      throw error;
    }

    return !!data;
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

      const userId = session.user?.id;

      const administrator = await isAdministrator(client, userId);

      if (!administrator) {
        if (accessMessage) {
          showMessage(
            accessMessage,
            "Access is restricted to designated administrators.",
            true
          );
        }

        await client.auth.signOut();
        window.location.replace("login.html");
        return null;
      }

      return {
        session,
        client
      };

    } catch (err) {
      console.error("Administrator authorization error:", err);

      if (accessMessage) {
        showMessage(
          accessMessage,
          err.message || "Administrator access could not be verified.",
          true
        );
      }

      return null;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const messageEl = document.getElementById("login-message");

    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const button = form.querySelector('button[type="submit"]');
      const originalText = button ? button.textContent : "";

      if (button) {
        button.disabled = true;
        button.textContent = "Signing in...";
      }

      if (messageEl) {
        messageEl.hidden = true;
      }

      try {
        const client = window.NusaSupabase.getClient();

        const { data, error } = await client.auth.signInWithPassword({
          email: emailInput.value.trim(),
          password: passwordInput.value
        });

        if (error) throw error;

        const userId =
          data.user?.id ||
          data.session?.user?.id;

        const administrator = await isAdministrator(
          client,
          userId
        );

        if (!administrator) {
          throw new Error(
            "Your account is not authorized as administrator."
          );
        }

        window.location.replace("dashboard.html");

      } catch (err) {
        console.error("Sign-in error:", err);

        showMessage(
          messageEl,
          err.message || "Sign-in failed. Please try again.",
          true
        );

      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = originalText || "Sign in";
        }
      }
    });
  });

  window.NusaAuth = {
    requireAdmin,
    isAdministrator
  };
})();
