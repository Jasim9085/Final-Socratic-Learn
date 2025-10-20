
import React, { useState, useRef, useEffect } from 'react';
import type { SessionState, Turn, Attachment, AppSettings } from '../types';
import { SendIcon, NewSessionIcon, PauseIcon, ResumeIcon, ExportIcon, QuizIcon, MindMapIcon, ImageIcon, DocumentIcon, CloseIcon, AgentIcon } from './Icons';
import * as fileUtils from '../utils/fileUtils';

interface ControlPanelProps {
  sessionState: SessionState;
  settings: AppSettings;
  onSend: (message: string, attachments: Attachment[]) => void;
  onNewSession: () => void;
  onContinueAgentTurn: () => void;
  onAutoContinueToggle: () => void;
  onGenerateQuiz: () => void;
  onGenerateConceptMap: () => void;
  isGeneratingConceptMap: boolean;
  turns: Turn[];
  onExport: () => void;
  onError: (message: string) => void;
}

const IconButton: React.FC<{
  onClick?: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({ onClick, disabled, label, children, className = '' }) => (
  <div className="relative has-tooltip">
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`p-2 rounded-full bg-light-bg dark:bg-dark-bg hover:bg-light-border dark:hover:bg-dark-border disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-110 active:scale-95 ${className}`}
    >
      {children}
    </button>
    <div className="tooltip absolute bottom-full mb-2 w-max bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 visibility-hidden transition-all duration-300">
      {label}
    </div>
  </div>
);

const AttachmentPill: React.FC<{ attachment: Attachment; onRemove: () => void; }> = ({ attachment, onRemove }) => (
    <div className="flex items-center gap-2 bg-light-border dark:bg-dark-border rounded-full px-3 py-1 text-sm animate-fade-in-up">
        {attachment.type === 'image' ? <ImageIcon className="w-4 h-4" /> : <DocumentIcon className="w-4 h-4" />}
        <span className="truncate max-w-xs">{attachment.name}</span>
        <button onClick={onRemove} className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
            <CloseIcon className="w-3 h-3" />
        </button>
    </div>
);


const ControlPanel: React.FC<ControlPanelProps> = ({
  sessionState,
  settings,
  onSend,
  onNewSession,
  onContinueAgentTurn,
  onAutoContinueToggle,
  onGenerateQuiz,
  onGenerateConceptMap,
  isGeneratingConceptMap,
  turns,
  onExport,
  onError
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const { sessionMode, interactionMode, autoContinueAgent } = settings;
  const canUserInput = sessionState === 'paused_user_input';
  const isRunning = sessionState === 'running_auto';
  const isFinished = sessionState === 'finished';

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);
  
  useEffect(() => {
    if(canUserInput) {
      textareaRef.current?.focus();
    }
  }, [canUserInput]);

  const handleSend = () => {
    if ((input.trim() || attachments.length > 0) && canUserInput) {
      onSend(input, attachments);
      setInput('');
      setAttachments([]);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  const handleNewSessionClick = () => {
    if(window.confirm("Are you sure you want to start a new chat? Your current session will be saved.")) {
      onNewSession();
    }
  }

  const processFiles = async (files: FileList | null, type: 'image' | 'text') => {
      if (!files) return;
      
      try {
          const newAttachments = await Promise.all(
              Array.from(files).map(async (file): Promise<Attachment> => {
                  const data = type === 'image' ? await fileUtils.fileToBase64(file) : await fileUtils.readFileAsText(file);
                  return {
                      name: file.name,
                      type: type,
                      mimeType: file.type,
                      data: data
                  };
              })
          );
          setAttachments(prev => [...prev, ...newAttachments]);
      } catch (error) {
          console.error("Error processing files:", error);
          onError(`Failed to upload file. Please try again. Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => processFiles(e.target.files, 'image');
  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => processFiles(e.target.files, 'text');
  const removeAttachment = (index: number) => setAttachments(prev => prev.filter((_, i) => i !== index));

  const getPlaceholder = () => {
    if (isRunning) return "AI is responding, please wait...";
    if (isFinished) return "Session finished.";
    if (canUserInput) {
        if (interactionMode === 'direct') return "Send a message or upload a file...";
        return sessionMode === 'challenge' ? "Provide your explanation..." : "Ask a follow-up question or press Continue...";
    }
    return "";
  };

  const isTutorModeAgent = interactionMode === 'agent' && sessionMode === 'tutor';

  return (
    <div className="bg-light-surface dark:bg-dark-surface rounded-xl p-3 md:p-4 shadow-custom-lg-light dark:shadow-custom-lg-dark border border-light-border dark:border-dark-border">
      <div className="flex items-start gap-2">
        <div className="flex-grow">
             {attachments.length > 0 && (
                <div className="mb-2 p-2 bg-light-bg dark:bg-dark-bg rounded-lg flex flex-wrap gap-2">
                    {attachments.map((att, i) => (
                        <AttachmentPill key={`${att.name}-${i}`} attachment={att} onRemove={() => removeAttachment(i)} />
                    ))}
                </div>
            )}
            <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={getPlaceholder()}
                  disabled={!canUserInput}
                  className="w-full pl-4 pr-12 py-3 border-none rounded-lg resize-none max-h-48 bg-light-bg dark:bg-dark-bg focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:outline-none transition disabled:opacity-60 min-h-[52px]"
                  rows={1}
                />
                <button
                  onClick={handleSend}
                  disabled={!canUserInput || (!input.trim() && attachments.length === 0)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-light-primary text-white hover:bg-opacity-90 disabled:bg-opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 hover:scale-105"
                  aria-label="Send message"
                >
                  <SendIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>
      
      <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden" />
      <input type="file" ref={docInputRef} onChange={handleDocUpload} accept=".txt,.md" multiple className="hidden" />

      <div className="mt-2 flex flex-wrap gap-3 justify-center items-center">
        { sessionState !== 'idle' && (
          <IconButton onClick={handleNewSessionClick} label="New Chat">
            <NewSessionIcon className="w-5 h-5" />
          </IconButton>
        )}
        <IconButton onClick={() => imageInputRef.current?.click()} disabled={!canUserInput} label="Upload Image">
            <ImageIcon className="w-5 h-5" />
        </IconButton>
        <IconButton onClick={() => docInputRef.current?.click()} disabled={!canUserInput} label="Upload Document">
            <DocumentIcon className="w-5 h-5" />
        </IconButton>

        { isTutorModeAgent && sessionState === 'paused_user_input' && !autoContinueAgent && (
            <IconButton
              onClick={onContinueAgentTurn}
              label="Continue Agent (One Turn)"
            >
              <ResumeIcon className="w-5 h-5" />
            </IconButton>
        )}
        
        { isTutorModeAgent && !isFinished && sessionState !== 'idle' && (
            <IconButton 
              onClick={onAutoContinueToggle} 
              label={autoContinueAgent ? 'Stop Auto-Generation' : 'Start Auto-Generation'}
            >
              {autoContinueAgent ? <PauseIcon className="w-5 h-5 text-red-500" /> : <AgentIcon className="w-5 h-5 text-green-500" />}
            </IconButton>
        )}
        
        <IconButton onClick={onExport} disabled={turns.length === 0} label="Export Conversation">
            <ExportIcon className="w-5 h-5" />
        </IconButton>
        
        { interactionMode === 'agent' && !isFinished && sessionState !== 'idle' && (
            <IconButton onClick={onGenerateQuiz} label="Finish & Generate Quiz">
                <QuizIcon className="w-5 h-5" />
            </IconButton>
        )}
        { !isFinished && sessionState !== 'idle' && (
            <IconButton 
              onClick={onGenerateConceptMap} 
              disabled={turns.length < 2 || isGeneratingConceptMap}
              label={isGeneratingConceptMap ? "Generating..." : "Visualize Concepts"}
              className={isGeneratingConceptMap ? "animate-pulse" : ""}
            >
                <MindMapIcon className="w-5 h-5" />
            </IconButton>
        )}
        {isFinished && (
            <span className="px-3 py-1 text-sm bg-light-accent text-white rounded-full font-semibold animate-fade-in-up">Session Finished</span>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
