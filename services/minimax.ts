import { MinimaxConfig, MinimaxResponse } from '../types';

// Helper to convert hex string to Uint8Array
const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

export const generateSpeech = async (
  text: string,
  voiceId: string,
  config: MinimaxConfig,
  modelName: string = 'speech-01-turbo'
): Promise<Blob> => {
  // Trim whitespace to avoid "token not match group" errors caused by accidental spaces
  const groupId = config.groupId.trim();
  const apiKey = config.apiKey.trim();
  
  const url = `https://api.minimax.chat/v1/t2a_v2?GroupId=${groupId}`;

  const payload = {
    model: modelName,
    text: text,
    stream: false,
    voice_setting: {
      voice_id: voiceId,
      speed: 1.0,
      vol: 1.0,
      pitch: 0,
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3",
      channel: 1,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const json: MinimaxResponse = await response.json();

    if (json.base_resp.status_code !== 0) {
      throw new Error(`Minimax Error: ${json.base_resp.status_msg}`);
    }

    if (json.data?.audio) {
      // API often returns hex string for audio data
      const audioBytes = hexToBytes(json.data.audio);
      return new Blob([audioBytes], { type: 'audio/mp3' });
    } else if (json.data?.audio_file) {
      // If it returns a URL
      const audioRes = await fetch(json.data.audio_file);
      return await audioRes.blob();
    } else {
      throw new Error('No audio data received in response');
    }

  } catch (error) {
    console.error("Speech generation failed", error);
    throw error;
  }
};