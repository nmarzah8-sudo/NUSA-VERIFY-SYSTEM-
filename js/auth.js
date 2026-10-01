(function () {
  function showMessage(element, message, isError = false) {
    if (!element) return;

    element.textContent = message;
    element.classList.toggle("notice-error", isError);
    element.classList.toggle("notice-success", !isError);
    element.hidden = false;
  }

  function waitWithTimeout(promise, milliseconds, message) {
    const timeout = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(message));
      }, milliseconds);
    });

    return Promise.race([promise, timeout]);
  }

  async function getSession(client) {
    if (!client) {
      throw new Error("Supabase client is unavailable.");
    }

    console.log("NUSA AUTH: Checking current session...");

    const result = await waitWithTimeout(
      client.auth.getSession(),
      10000,
      "Session check timed out after 10 seconds."
    );

    if (result.error) {
      console.error(
        "NUSA AUTH: Session error:",
        result.error
      );

      throw new Error(
        "Session check failed: " +
        result.error.message
      );
    }

    console.log(
      "NUSA AUTH: Session check completed.",
      result.data && result.data.session
        ? "Session found."
        : "No session found."
    );

    return result.data.session;
  }

  async function isAdministrator(client) {
    if (!client) {
      throw new Error("Supabase client is unavailable.");
    }

    console.log(
      "NUSA AUTH: Calling public.is_admin()..."
    );

    const started = Date.now();

    const rpcPromise = client.rpc("is_admin");

    const result = await waitWithTimeout(
      rpcPromise,
      10000,
      "Administrator check timed out after 10 seconds."
    );

    console.log(
      "NUSA AUTH: is_admin() returned after",
      Date.now() - started,
      "ms."
    );

    console.log(
      "NUSA AUTH: RPC data:",
      result.data
    );

    console.log(
      "NUSA AUTH: RPC error:",
      result.error
    );

    if (result.error) {
      throw new Error(
        "Administrator access check failed: " +
        result.error.message
      );
    }

    if (result.data === true) {
      console.log(
        "NUSA AUTH: Administrator confirmed."
      );

      return true;
    }

    console.warn(
      "NUSA AUTH: User authenticated but is not an administrator."
    );

    return false;
  }

  async function requireAdmin() {
    const accessMessage =
      document.getElementById("access-message");

    try {
      if (accessMessage) {
        showMessage(
          accessMessage,
          "Checking your administrator session...",
          false
        );
      }

      console.log(
        "NUSA AUTH: Starting administrator authorization..."
      );

      if (
        !window.NusaSupabase ||
        typeof window.NusaSupabase.getClient !== "function"
      ) {
        throw new Error(
          "Supabase client is not available."
        );
      }

      const client =
        window.NusaSupabase.getClient();

      if (accessMessage) {
        showMessage(
          accessMessage,
          "Checking your login session...",
          false
        );
      }

      const session =
        await getSession(client);

      if (!session) {
        console.warn(
          "NUSA AUTH: No active session. Redirecting to login."
        );

        window.location.replace("login.html");
        return null;
      }

      console.log(
        "NUSA AUTH: Authenticated user:",
        session.user.email
      );

      if (accessMessage) {
        showMessage(
          accessMessage,
          "Checking administrator access...",
          false
        );
      }

      const administrator =
        await isAdministrator(client);

      if (!administrator) {
        console.warn(
          "NUSA AUTH: Administrator authorization denied."
        );

        if (accessMessage) {
          showMessage(
            accessMessage,
            "Your account is not authorized as a NUSA administrator.",
            true
          );
        }

        try {
          await waitWithTimeout(
            client.auth.signOut(),
            5000,
            "Sign-out timed out."
          );
        } catch (signOutError) {
          console.warn(
            "NUSA AUTH: Sign-out warning:",
            signOutError
          );
        }

        setTimeout(() => {
          window.location.replace("login.html");
        }, 1500);

        return null;
      }

      console.log(
        "NUSA AUTH: Administrator authorization successful."
      );

      if (accessMessage) {
        showMessage(
          accessMessage,
          "Administrator access confirmed.",
          false
        );
      }

      return {
        session: session,
        client: client
      };

    } catch (err) {
      console.error(
        "NUSA AUTH: Administrator authorization error:",
        err
      );

      if (accessMessage) {
        showMessage(
          accessMessage,
          err.message ||
            "Administrator access could not be verified.",
          true
        );
      }

      return null;
    }
  }

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      const form =
        document.getElementById("login-form");

      const emailInput =
        document.getElementById("email");

      const passwordInput =
        document.getElementById("password");

      const messageEl =
        document.getElementById("login-message");

      if (!form) {
        return;
      }

      form.addEventListener(
        "submit",
        async (event) => {
          event.preventDefault();

          const button =
            form.querySelector(
              'button[type="submit"]'
            );

          const originalText =
            button
              ? button.textContent
              : "";

          if (button) {
            button.disabled = true;
            button.textContent = "Signing in...";
          }

          if (messageEl) {
            messageEl.hidden = true;
          }

          try {
            const client =
              window.NusaSupabase.getClient();

            console.log(
              "NUSA AUTH: Starting sign-in..."
            );

            const signInResult =
              await waitWithTimeout(
                client.auth.signInWithPassword({
                  email:
                    emailInput.value.trim(),

                  password:
                    passwordInput.value
                }),
                10000,
                "Sign-in request timed out after 10 seconds."
              );

            const {
              data,
              error
            } = signInResult;

            if (error) {
              throw error;
            }

            if (!data || !data.session) {
              throw new Error(
                "Sign-in completed but no active session was returned."
              );
            }

            console.log(
              "NUSA AUTH: Sign-in successful."
            );

            const administrator =
              await isAdministrator(client);

            if (!administrator) {
              throw new Error(
                "Your account is not authorized as administrator."
              );
            }

            console.log(
              "NUSA AUTH: Redirecting to dashboard..."
            );

            window.location.replace(
              "dashboard.html"
            );

          } catch (err) {
            console.error(
              "NUSA AUTH: Sign-in error:",
              err
            );

            showMessage(
              messageEl,
              err.message ||
                "Sign-in failed. Please try again.",
              true
            );

          } finally {
            if (button) {
              button.disabled = false;
              button.textContent =
                originalText ||
                "Sign in";
            }
          }
        }
      );
    }
  );

  window.NusaAuth = {
    requireAdmin: requireAdmin,
    isAdministrator: isAdministrator
  };
})();
