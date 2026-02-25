// Event types for WebSocket streaming

export type InitEventType =
  | "ANALYZING"
  | "EXTRACTING"
  | "INIT_COMPLETE"
  | "INIT_ERROR"
  | "CONNECTING"
  | "PROCESSING";

export type TerraformEventType =
  | "PLANNING"
  | "APPLYING"
  | "TERRAFORM_COMPLETE"
  | "TERRAFORM_ERROR";

export interface BaseEvent {
  id: string;
  timestamp: number;
  message: string;
}

export interface InitEvent extends BaseEvent {
  type: "INIT";
  eventType: InitEventType;
  progress?: number; // 0-100 for ANALYZING events
  repoId?: string;
  error?: string; // For INIT_ERROR
}

export interface TerraformEvent extends BaseEvent {
  type: "TERRAFORM";
  eventType: TerraformEventType;
  progress?: number; // 0-100
  error?: string; // For TERRAFORM_ERROR
}

export type AppEvent = InitEvent | TerraformEvent;

