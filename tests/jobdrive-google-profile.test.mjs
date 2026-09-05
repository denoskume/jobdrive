import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const auth =
  fs.readFileSync(
    "src/services/googleAuth.js",
    "utf8"
  );

const app =
  fs.readFileSync(
    "src/AppPro.jsx",
    "utf8"
  );

const dashboard =
  fs.readFileSync(
    "src/JobDriveDashboard.jsx",
    "utf8"
  );

test("Google OAuth requests profile identity scopes", () => {
  assert.match(
    auth,
    /openid email profile/
  );
});

test("Google profile is fetched from userinfo endpoint", () => {
  assert.match(
    auth,
    /openidconnect\.googleapis\.com\/v1\/userinfo/
  );

  assert.match(
    auth,
    /fetchGoogleProfile/
  );
});

test("AppPro stores and passes Google profile", () => {
  assert.match(
    app,
    /const \[userProfile, setUserProfile\]/
  );

  assert.match(
    app,
    /fetchGoogleProfile/
  );

  assert.match(
    app,
    /userProfile=\{userProfile\}/
  );
});

test("dashboard renders Google profile picture with fallback", () => {
  assert.match(
    dashboard,
    /userProfile\?\.picture/
  );

  assert.match(
    dashboard,
    /className="jd-avatar-photo"/
  );
});
