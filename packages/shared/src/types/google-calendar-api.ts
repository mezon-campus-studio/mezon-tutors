export type GoogleCalendarConnectionStatus = {
  connected: boolean;
  googleEmail: string | null;
  lastSyncedAt: string | null;
  needsReconnect: boolean;
};

export type GoogleCalendarSyncResult = {
  synced: number;
  created: number;
  updated: number;
  removed: number;
  lastSyncedAt: string;
};
