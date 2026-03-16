// ── Init events (workspace initialization via WebSocket) ──────────────

export type InitEvent =
  | { type: "INIT_STARTED"; message: string }
  | { type: "STORING_REPO_DETAILS"; message: string }
  | { type: "CHECKING_COMMITS"; message: string }
  | { type: "FETCHING_REPO"; message: string }
  | { type: "REPO_FETCHED"; size: string; fileCount: number }
  | { type: "EXTRACTING"; message: string }
  | { type: "ANALYZING"; message: string; file: string; progress: number }
  | { type: "GENERATING_MD"; message: string }
  | { type: "MARKDOWN_READY"; preview: string; wordCount?: number }
  | { type: "UPLOADING_S3"; message: string }
  | { type: "UPLOAD_COMPLETE"; version: string }
  | { type: "SAVING_DB"; message: string }
  | { type: "INIT_COMPLETE"; version: string }
  | { type: "INIT_ERROR"; message: string; details?: string };

// ── Deployment events ─────────────────────────────────────────────────

export type DeploymentEvent =
  | { type: "DEPLOY_STARTED"; strategy: string; message: string }
  | { type: "DEPLOY_BUILDING"; message: string; progress?: number }
  | { type: "DEPLOY_PUSHING"; message: string }
  | { type: "DEPLOY_PROVISIONING"; message: string }
  | { type: "DEPLOY_LIVE"; url: string; message: string }
  | { type: "DEPLOY_FAILED"; message: string; details?: string }
  | { type: "DEPLOY_DESTROYING"; message: string }
  | { type: "DEPLOY_DESTROYED"; message: string };

// ── Frontend-only synthetic events ────────────────────────────────────

export type FrontendEvent =
  | { type: "WS_CONNECTED"; message: string }
  | { type: "REDIRECT_COUNTDOWN"; seconds: number; destination: string };

// ── Discriminated union of ALL events (backend + frontend) ────────────

export type AnyEvent = InitEvent | DeploymentEvent | FrontendEvent;

// ── Frontend display event (enriched with id + timestamp) ─────────────

export interface DisplayEvent {
  id: string;
  timestamp: number;
  label: string;
  raw: AnyEvent;
}

// ── Helpers ────────────────────────────────────────────────────────────

/** Extract a human-readable label from any event. */
export function eventLabel(e: AnyEvent): string {
  switch (e.type) {
    case "INIT_STARTED":
    case "STORING_REPO_DETAILS":
    case "CHECKING_COMMITS":
    case "FETCHING_REPO":
    case "EXTRACTING":
    case "GENERATING_MD":
    case "UPLOADING_S3":
    case "SAVING_DB":
    case "INIT_ERROR":
      return e.message;
    case "REPO_FETCHED":
      return `Repository fetched — ${e.size}, ${e.fileCount} files`;
    case "ANALYZING":
      return e.message;
    case "MARKDOWN_READY":
      return `Documentation ready (${e.wordCount ?? "?"} words)`;
    case "UPLOAD_COMPLETE":
      return `Upload complete — ${e.version}`;
    case "INIT_COMPLETE":
      return `Initialization complete — ${e.version}`;

    case "DEPLOY_STARTED":
      return `Deployment started: ${e.message}`;
    case "DEPLOY_BUILDING":
      return e.message;
    case "DEPLOY_PUSHING":
      return e.message;
    case "DEPLOY_PROVISIONING":
      return e.message;
    case "DEPLOY_LIVE":
      return `Live: ${e.url}`;
    case "DEPLOY_FAILED":
      return e.message;
    case "DEPLOY_DESTROYING":
      return e.message;
    case "DEPLOY_DESTROYED":
      return e.message;

    case "WS_CONNECTED":
      return e.message;
    case "REDIRECT_COUNTDOWN":
      return `Redirecting to ${e.destination} in ${e.seconds}…`;
    default:
      return "Unknown event";
  }
}

/** Is this a terminal success event? */
export function isSuccessEvent(e: AnyEvent): boolean {
  return e.type === "INIT_COMPLETE" || e.type === "DEPLOY_LIVE";
}

/** Is this a terminal error event? */
export function isErrorEvent(e: AnyEvent): boolean {
  return e.type === "INIT_ERROR" || e.type === "DEPLOY_FAILED";
}

/** Is this an ANALYZING event (has progress)? */
export function isAnalyzingEvent(
  e: AnyEvent
): e is Extract<InitEvent, { type: "ANALYZING" }> {
  return e.type === "ANALYZING";
}

/** Is this a redirect countdown event? */
export function isRedirectEvent(
  e: AnyEvent
): e is Extract<FrontendEvent, { type: "REDIRECT_COUNTDOWN" }> {
  return e.type === "REDIRECT_COUNTDOWN";
}
