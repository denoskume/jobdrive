export const ACTION_TIME_ZONE = "Europe/Paris";

export const ACTION_TYPES = Object.freeze({
  APPLY_NOW: "APPLY_NOW",
  DEADLINE_RISK: "DEADLINE_RISK",
  FOLLOW_UP_OVERDUE: "FOLLOW_UP_OVERDUE",
  FOLLOW_UP_TODAY: "FOLLOW_UP_TODAY",
  FOLLOW_UP_TOMORROW: "FOLLOW_UP_TOMORROW",
  UPCOMING_FOLLOW_UP: "UPCOMING_FOLLOW_UP",
  SCHEDULE_FOLLOW_UP: "SCHEDULE_FOLLOW_UP",
  NONE: "NONE",
});

export const TERMINAL_STATUSES = new Set([
  "Accepté",
  "Refusé",
  "Expiré",
]);

export const APPLICATION_TRACKING_STATUSES = new Set([
  "Candidature envoyée",
  "Entretien",
  "Offre",
]);

export const PRE_APPLICATION_STATUSES = new Set([
  "Nouveau",
  "À candidater",
]);

export const ACTION_PRIORITY_ORDER = Object.freeze({
  Critical: 0,
  High: 1,
  Normal: 2,
  None: 3,
});

export const ACTION_TYPE_ORDER = Object.freeze({
  FOLLOW_UP_OVERDUE: 0,
  FOLLOW_UP_TODAY: 1,
  DEADLINE_RISK: 2,
  FOLLOW_UP_TOMORROW: 3,
  APPLY_NOW: 4,
  UPCOMING_FOLLOW_UP: 5,
  SCHEDULE_FOLLOW_UP: 6,
  NONE: 7,
});
