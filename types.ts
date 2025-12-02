export interface ScriptRow {
  'Shot Number': string;
  Character: string;
  voice_id: string;
  text: string;
  emotion?: string;
}

export interface ProcessingItem {
  id: string; // Unique ID for React keys
  row: ScriptRow;
  status: 'idle' | 'loading' | 'success' | 'error';
  audioUrl?: string;
  errorMessage?: string;
}

export interface MinimaxConfig {
  apiKey: string;
  groupId: string;
}

export interface MinimaxResponse {
  base_resp: {
    status_code: number;
    status_msg: string;
  };
  data?: {
    audio: string; // Hex string often returned
    audio_file?: string; // Sometimes a URL
    status: number;
  };
}
