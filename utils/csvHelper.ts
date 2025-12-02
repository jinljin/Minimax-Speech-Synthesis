import Papa from 'papaparse';
import { ScriptRow } from '../types';

export const parseCSV = (file: File): Promise<ScriptRow[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Map and clean data
        const validData = (results.data as any[]).map(row => ({
            'Shot Number': row['Shot Number']?.trim(),
            Character: row.Character?.trim(),
            voice_id: row.voice_id?.trim(),
            text: row.text?.trim(),
            emotion: row.emotion?.trim()
        })).filter(
          (row) => row.text && row.voice_id && row.Character
        ) as ScriptRow[];

        resolve(validData);
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};