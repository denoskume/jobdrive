import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const dashboard =
  fs.readFileSync(
    "src/JobDriveDashboard.jsx",
    "utf8"
  );

test("topbar notification button is wired to real notifications", () => {
  assert.match(
    dashboard,
    /onClick=\{onToggleNotifications\}/
  );

  assert.match(
    dashboard,
    /notificationCount/
  );
});

test("dashboard tracks seen job ids in localStorage", () => {
  assert.match(
    dashboard,
    /jobdrive\.seenJobIds/
  );

  assert.match(
    dashboard,
    /newJobNotifications/
  );
});

test("notification panel renders real incoming jobs", () => {
  assert.match(
    dashboard,
    /jd-notification-panel/
  );

  assert.match(
    dashboard,
    /New internships/
  );

  assert.match(
    dashboard,
    /job\.company/
  );

  assert.match(
    dashboard,
    /job\.role/
  );
});
