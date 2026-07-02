export type ConnectionHandle = "left" | "right" | "top" | "bottom";

export interface ConnectionAnchor {
  elementId: string;
  handle: ConnectionHandle;
}

export interface ConnectionStyle {
  stroke: string;
  strokeWidth: number;
  dashed?: boolean;
}

export interface Connection {
  id: string;
  source: ConnectionAnchor;
  target: ConnectionAnchor;
  style?: ConnectionStyle;
}
