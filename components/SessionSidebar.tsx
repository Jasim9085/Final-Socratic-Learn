
import React, { useRef } from 'react';
import type { SessionData } from '../types';
import { CloseIcon, NewSessionIcon, TrashIcon, ExportIcon, ImportIcon } from './Icons';

interface SessionSidebarProps {
  isVisible: boolean;
  sessions: SessionData[];
  activeSessionId: string | null;
  onClose: () => void;
  onSwitchSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onExportSession: (id: string) => void;
  onImportSession: (fileContent: string) => void;
  onClearAllSessions: () => void;
}

const formatRelativeTime = (timestamp: number) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffSeconds < 60) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};


const SessionSidebar: React.FC<SessionSidebarProps> = ({ 
    isVisible, sessions, activeSessionId, onClose, onSwitchSession, onNewSession, onDeleteSession, onExportSession, onImportSession, onClearAllSessions
}) => {
    
    const importInputRef = useRef<HTMLInputElement>(null);

    const handleImportClick = () => {
        importInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result;
            if (typeof text === 'string') {
                onImportSession(text);
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Allow re-importing the same file
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to permanently delete this session?")) {
            onDeleteSession(id);
        }
    };

    const handleExport = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        onExportSession(id);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-30">
            <div
                className="sidebar-overlay absolute inset-0 bg-black/50"
                onClick={onClose}
                style={{ animation: 'fade-in 0.3s ease-out forwards' }}
            />
            <div className="sidebar relative h-full w-72 max-w-[80vw] bg-light-surface dark:bg-dark-surface border-r border-light-border dark:border-dark-border flex flex-col animate-slide-in-left">
                <div className="flex justify-between items-center p-4 border-b border-light-border dark:border-dark-border flex-shrink-0">
                    <h2 className="text-xl font-bold font-display">Sessions</h2>
                    <div className="flex items-center gap-2">
                         <button onClick={handleImportClick} className="p-2 rounded-md hover:bg-black/10 dark:hover:bg-white/10" aria-label="Import Session">
                            <ImportIcon className="w-5 h-5" />
                        </button>
                        <input
                            type="file"
                            ref={importInputRef}
                            onChange={handleFileChange}
                            accept=".json,application/json"
                            className="hidden"
                        />
                         <button onClick={onNewSession} className="p-2 rounded-md hover:bg-black/10 dark:hover:bg-white/10" aria-label="New Session">
                            <NewSessionIcon className="w-5 h-5" />
                        </button>
                         <button onClick={onClearAllSessions} className="p-2 rounded-md hover:bg-red-500/10 text-red-500" aria-label="Clear All Sessions">
                            <TrashIcon className="w-5 h-5" />
                        </button>
                        <button onClick={onClose} className="p-2 rounded-md hover:bg-black/10 dark:hover:bg-white/10" aria-label="Close sidebar">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                
                <div className="flex-grow overflow-y-auto p-2 space-y-1">
                    {sessions.map(session => (
                        <div
                            key={session.id}
                            onClick={() => onSwitchSession(session.id)}
                            className={`group p-3 rounded-lg cursor-pointer transition-colors relative ${activeSessionId === session.id ? 'bg-light-primary/10 dark:bg-dark-primary/20' : 'hover:bg-light-bg dark:hover:bg-dark-bg'}`}
                        >
                            <p className="font-semibold text-sm truncate pr-16">
                                {session.topic || "New Session"}
                            </p>
                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                                {formatRelativeTime(session.updatedAt)}
                            </p>
                            <div className={`absolute top-1/2 -translate-y-1/2 right-2 flex items-center transition-opacity ${activeSessionId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <button
                                    onClick={(e) => handleExport(e, session.id)}
                                    className="p-1.5 text-light-text-subtle dark:text-dark-text-subtle rounded-md hover:bg-blue-500/10 hover:text-blue-500 transition-all"
                                    aria-label="Export session"
                                >
                                    <ExportIcon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => handleDelete(e, session.id)}
                                    className="p-1.5 text-light-text-subtle dark:text-dark-text-subtle rounded-md hover:bg-red-500/10 hover:text-red-500 transition-all"
                                    aria-label="Delete session"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                     {sessions.length === 0 && (
                        <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary p-4">
                            No sessions yet. Start a new one!
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SessionSidebar;