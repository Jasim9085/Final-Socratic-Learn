

import React from 'react';
import type { SessionData } from '../types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { CloseIcon } from './Icons';

interface ExportModalProps {
  session: SessionData;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ session, onClose }) => {
  const { topic } = session;
  const [textCopied, copyText] = useCopyToClipboard();
  const [jsonCopied, copyJSON] = useCopyToClipboard();

  const isAndroidBridgeAvailable = typeof window.AndroidBridge?.saveFile === 'function';

  const formatAsText = () => {
    if (!session.turnOrder || !session.turns) return "No conversation data available.";
    return session.turnOrder
      .map(id => session.turns[id])
      .filter(Boolean) // Filter out any potential undefined turns
      .map(turn => `[${turn.role.toUpperCase()}]\n${turn.content}`)
      .join('\n\n---\n\n');
  };

  const formatAsJSON = () => {
    return JSON.stringify(session, null, 2);
  };

  const generateFileName = (extension: 'txt' | 'json') => {
    const sanitizedTopic = (topic || "Untitled Session").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `socratic_tutor_${sanitizedTopic}_${date}.${extension}`;
  };

  const handleDownload = (content: string, fileName: string, mimeType: string) => {
    try {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("File download failed:", e);
        alert("Could not download the file. Your browser may not support this feature.");
    }
  };

  const handleSaveFileNative = () => {
    if (!isAndroidBridgeAvailable) return;
    
    const fileName = generateFileName('json');
    const content = formatAsJSON();
    
    try {
      window.AndroidBridge!.saveFile(fileName, 'application/json', content);
      // Android bridge will show its own toast/confirmation.
    } catch (e) {
        console.error("Failed to save file via Android Bridge:", e);
        alert("Failed to save file. Please check app permissions.");
    }
  };
  

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start pt-12 p-4">
      <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-custom-lg-light dark:shadow-custom-lg-dark w-full max-w-lg border border-light-border dark:border-dark-border animate-scale-in">
        <div className="flex justify-between items-center p-4 border-b border-light-border dark:border-dark-border">
            <h2 className="text-xl font-bold font-display">Export Conversation</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                <CloseIcon className="h-6 w-6" />
            </button>
        </div>
        
        <div className="p-6 space-y-6">
            <div>
                <h3 className="font-semibold mb-2">Text Format</h3>
                <textarea 
                    readOnly 
                    value={formatAsText()} 
                    className="w-full h-32 p-2 border rounded bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border"
                />
                <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => copyText(formatAsText())} className="px-3 py-1 text-sm bg-light-primary text-white rounded-md hover:opacity-90 transition-opacity">
                        {textCopied ? 'Copied!' : 'Copy to Clipboard'}
                    </button>
                    <button onClick={() => handleDownload(formatAsText(), generateFileName('txt'), 'text/plain')} className="px-3 py-1 text-sm bg-light-accent text-white rounded-md hover:opacity-90 transition-opacity">
                        Download File
                    </button>
                </div>
            </div>
            <div>
                <h3 className="font-semibold mb-2">JSON Format</h3>
                <textarea 
                    readOnly 
                    value={formatAsJSON()} 
                    className="w-full h-32 p-2 border rounded bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border"
                />
                <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => copyJSON(formatAsJSON())} className="px-3 py-1 text-sm bg-light-primary text-white rounded-md hover:opacity-90 transition-opacity">
                        {jsonCopied ? 'Copied!' : 'Copy to Clipboard'}
                    </button>
                     <button onClick={() => handleDownload(formatAsJSON(), generateFileName('json'), 'application/json')} className="px-3 py-1 text-sm bg-light-accent text-white rounded-md hover:opacity-90 transition-opacity">
                        Download File
                    </button>
                </div>
            </div>
            {isAndroidBridgeAvailable && (
              <div>
                <h3 className="font-semibold mb-2">Save to Device (Android)</h3>
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-2">
                  Saves the conversation as a JSON file to your device's downloads folder.
                </p>
                <button
                  onClick={handleSaveFileNative}
                  className="w-full px-3 py-2 text-sm text-white rounded-md bg-green-700 hover:bg-green-600 transition-all"
                >
                  Save JSON via Android
                </button>
              </div>
            )}
        </div>

        <div className="p-4 flex justify-end bg-light-bg dark:bg-dark-bg rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border text-light-text dark:text-dark-text rounded-lg hover:bg-light-border dark:hover:bg-dark-border transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;