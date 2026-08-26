const GOOGLE_IDENTITY_SCRIPT =
  "https://accounts.google.com/gsi/client";

let scriptPromise = null;

export function loadGoogleIdentity() {
  if (
    window.google?.accounts?.oauth2
  ) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise(
    (resolve, reject) => {
      const existing =
        document.getElementById(
          "jobdrive-google-identity"
        );

      if (existing) {
        existing.addEventListener(
          "load",
          () => resolve(),
          { once: true }
        );

        existing.addEventListener(
          "error",
          reject,
          { once: true }
        );

        return;
      }

      const script =
        document.createElement("script");

      script.id =
        "jobdrive-google-identity";

      script.src =
        GOOGLE_IDENTITY_SCRIPT;

      script.async = true;
      script.defer = true;

      script.onload = () => resolve();

      script.onerror = () =>
        reject(
          new Error(
            "Unable to load Google Identity Services."
          )
        );

      document.head.appendChild(script);
    }
  );

  return scriptPromise;
}

export async function requestGoogleToken(
  clientId
) {
  if (!clientId) {
    throw new Error(
      "VITE_GOOGLE_CLIENT_ID is missing."
    );
  }

  await loadGoogleIdentity();

  return new Promise(
    (resolve, reject) => {
      const client =
        window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,

          scope:
            "https://www.googleapis.com/auth/spreadsheets",

          callback: (response) => {
            if (
              response.error ||
              !response.access_token
            ) {
              reject(
                new Error(
                  response.error_description ||
                    response.error ||
                    "Google authorization failed."
                )
              );

              return;
            }

            resolve(response);
          },
        });

      client.requestAccessToken({
        prompt: "select_account",
      });
    }
  );
}

export async function revokeGoogleToken(
  accessToken
) {
  if (!accessToken) return;

  await loadGoogleIdentity();

  return new Promise((resolve) => {
    window.google.accounts.oauth2.revoke(
      accessToken,
      () => resolve()
    );
  });
}
