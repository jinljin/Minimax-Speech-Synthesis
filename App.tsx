import React, { useState, useCallback, useMemo } from 'react';
import { Upload, FileText, Activity, AlertCircle, CheckCircle2, PlayCircle, Loader2 } from 'lucide-react';
import { parseCSV } from './utils/csvHelper';
import { generateSpeech } from './services/minimax';
import { ProcessingItem } from './types';
import { AudioPlayer } from './components/AudioPlayer';

const DEFAULT_MODEL = 'speech-2.6-turbo'; // Prompt requested this specific model

export default function App() {
  const [items, setItems] = useState<ProcessingItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  
  // In a real app, these might come from user input if not in env
  // Using optional chaining/defaults to avoid crashes if process.env is undefined in some environments
  const [apiKey, setApiKey] = useState((typeof process !== 'undefined' && process.env?.MINIMAX_API_KEY) || '');
  const [groupId, setGroupId] = useState((typeof process !== 'undefined' && process.env?.MINIMAX_GROUP_ID) || '');
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    try {
      const rows = await parseCSV(file);
      if (rows.length === 0) {
        setError("No valid data found in CSV. Ensure headers: 'Shot Number', 'Character', 'voice_id', 'text'.");
        return;
      }
      
      const newItems: ProcessingItem[] = rows.map((row, index) => ({
        id: `${index}-${Date.now()}`,
        row,
        status: 'idle',
      }));
      
      setItems(newItems);
    } catch (err) {
      setError("Failed to parse CSV file.");
      console.error(err);
    }
  };

  const processBatch = useCallback(async () => {
    if (!apiKey || !groupId) {
      setError("Please provide API Key and Group ID.");
      return;
    }

    setIsProcessing(true);
    const pendingItems = items.filter(i => i.status === 'idle' || i.status === 'error');
    setProgress({ current: 0, total: pendingItems.length });

    // Process one by one to avoid rate limits on client side
    let processedCount = 0;
    
    for (const item of pendingItems) {
        // Update status to loading
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'loading', errorMessage: undefined } : i));

        try {
            const blob = await generateSpeech(
                item.row.text,
                item.row.voice_id,
                { apiKey, groupId },
                DEFAULT_MODEL
            );
            const url = URL.createObjectURL(blob);
            
            // Update success
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'success', audioUrl: url } : i));
        } catch (err) {
            // Update error
            const msg = err instanceof Error ? err.message : 'Unknown error';
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', errorMessage: msg } : i));
        }

        processedCount++;
        setProgress(prev => ({ ...prev, current: processedCount }));
    }

    setIsProcessing(false);
  }, [items, apiKey, groupId]);

  const stats = useMemo(() => {
      const total = items.length;
      const success = items.filter(i => i.status === 'success').length;
      const error = items.filter(i => i.status === 'error').length;
      const pending = total - success - error;
      return { total, success, error, pending };
  }, [items]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
                <Activity className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Minimax Script Voicer</h1>
          </div>
          <div className="flex items-center space-x-4">
             {/* Configuration Inputs */}
             <input
              type="text"
              placeholder="Group ID"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
             />
             <input
              type="password"
              placeholder="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
             />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Upload Section */}
        {items.length === 0 && (
          <div className="max-w-xl mx-auto mt-12 text-center">
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 bg-white hover:border-indigo-500 transition-colors">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <Upload className="h-full w-full" />
              </div>
              <h3 className="mt-2 text-sm font-semibold text-gray-900">Upload Script CSV</h3>
              <p className="mt-1 text-sm text-gray-500">Ensure columns: Shot Number, Character, voice_id, text</p>
              <div className="mt-6">
                <label className="relative cursor-pointer rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                    <span>Select File</span>
                    <input type="file" className="sr-only" accept=".csv" onChange={handleFileUpload} />
                </label>
              </div>
            </div>
            {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md flex items-center justify-center space-x-2">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}
          </div>
        )}

        {/* Data Table */}
        {items.length > 0 && (
          <div className="space-y-6">
            {/* Actions Bar */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                        <FileText size={16} />
                        <span className="font-medium text-gray-900">{items.length}</span>
                        <span>Rows</span>
                    </div>
                    {stats.success > 0 && (
                         <div className="flex items-center space-x-2 text-green-600">
                            <CheckCircle2 size={16} />
                            <span className="font-medium">{stats.success}</span>
                            <span>Generated</span>
                         </div>
                    )}
                     {stats.error > 0 && (
                         <div className="flex items-center space-x-2 text-red-600">
                            <AlertCircle size={16} />
                            <span className="font-medium">{stats.error}</span>
                            <span>Failed</span>
                         </div>
                    )}
                </div>

                <div className="flex items-center space-x-4">
                    {isProcessing && (
                         <div className="flex items-center space-x-2 text-sm text-indigo-600">
                            <Loader2 className="animate-spin" size={16} />
                            <span>Processing {progress.current}/{progress.total}</span>
                         </div>
                    )}
                    <button 
                        onClick={processBatch}
                        disabled={isProcessing || (!apiKey || !groupId)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isProcessing || (!apiKey || !groupId)
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                        }`}
                    >
                        <PlayCircle size={18} />
                        <span>Generate Audio</span>
                    </button>
                    <button 
                         onClick={() => setItems([])}
                         className="text-sm text-gray-500 hover:text-red-600"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Shot ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Character</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Text</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Audio</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {item.row['Shot Number']}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900">{item.row.Character}</span>
                                            <span className="text-xs text-gray-400">{item.row.voice_id}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xl">
                                        <p className="line-clamp-2" title={item.row.text}>{item.row.text}</p>
                                        {item.row.emotion && (
                                            <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                                {item.row.emotion}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {item.status === 'success' && item.audioUrl && (
                                            <AudioPlayer src={item.audioUrl} fileName={`${item.row['Shot Number']}_${item.row.Character}.mp3`} />
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {item.status === 'idle' && <span className="text-gray-400 text-xs">Ready</span>}
                                        {item.status === 'loading' && (
                                            <span className="inline-flex items-center text-indigo-600 text-xs font-medium">
                                                <Loader2 className="animate-spin mr-1.5" size={14} />
                                                Generating...
                                            </span>
                                        )}
                                        {item.status === 'success' && (
                                            <span className="inline-flex items-center text-green-600 text-xs font-medium">
                                                <CheckCircle2 className="mr-1.5" size={14} />
                                                Done
                                            </span>
                                        )}
                                        {item.status === 'error' && (
                                            <div className="group relative cursor-help">
                                                <span className="inline-flex items-center text-red-600 text-xs font-medium">
                                                    <AlertCircle className="mr-1.5" size={14} />
                                                    Error
                                                </span>
                                                <div className="absolute bottom-full mb-2 left-0 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg hidden group-hover:block z-50">
                                                    {item.errorMessage || 'Unknown error'}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}