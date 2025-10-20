

import React, { useState, useRef, useEffect } from 'react';
import type { Turn } from '../types';
import { CloseIcon, SendIcon } from './Icons';
import MessageBubble from './MessageBubble';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { markdownComponents } from '../utils/markdownComponents';

interface DiscussionModalProps {
  discussion: { contextTurn: Turn; turns: Turn[] };
  onClose: () => void;
  onSendMessage: (prompt: string) => void;
  onDeleteMessage: (turnId: string) => void;
}

const DiscussionModal: React.FC<DiscussionModalProps> = ({ discussion, onClose, onSendMessage, onDeleteMessage }) => {
  const { contextTurn, turns } = discussion;
  const [input, setInput] = useState('');
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const isResponding = turns[turns.length - 1]?.isStreaming === true;

  const handleSend = () => {
    if (input.trim() && !isResponding) {
      onSendMessage(input);
      setInput('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);
  
  const emptyFunc = () => {};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-custom-lg-light dark:shadow-custom-lg-dark w-full max-w-2xl h-[90vh] flex flex-col border border-light-border dark:border-dark-border animate-scale-in">
        <header className="flex justify-between items-center p-4 border-b border-light-border dark:border-dark-border flex-shrink-0">
          <h2 className="text-xl font-bold font-display">Side Discussion</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>

        <main className="flex-grow flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-dashed border-light-border dark:border-dark-border flex-shrink-0">
            <p className="text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-2">Original Context:</p>
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 text-light-text-secondary dark:text-dark-text-secondary">
               <ReactMarkdown 
                    components={markdownComponents}
                    remarkPlugins={[remarkMath, remarkGfm]}
                    rehypePlugins={[[rehypeKatex, { output: 'mathml', throwOnError: false }]]}
                >
                    {contextTurn.content}
                </ReactMarkdown>
            </div>
          </div>
          
          <div className="p-4 space-y-4 flex-grow">
            {turns.map(turn => (
                <div key={turn.id} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <MessageBubble
                        turn={turn}
                        onRephrase={emptyFunc}
                        onRegenerate={emptyFunc}
                        onResend={emptyFunc}
                        onStartDiscussion={emptyFunc}
                        onDelete={onDeleteMessage}
                    />
                </div>
            ))}
            <div ref={endOfMessagesRef} />
          </div>
        </main>

        <footer className="p-4 border-t border-light-border dark:border-dark-border flex-shrink-0">
            <div className="relative mb-3">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isResponding ? "AI is responding..." : "Ask a follow-up question..."}
                    disabled={isResponding}
                    className="w-full pl-4 pr-12 py-3 border rounded-lg resize-none max-h-32 bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:outline-none transition disabled:opacity-60"
                    rows={1}
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || isResponding}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-light-primary text-white hover:bg-opacity-90 disabled:bg-opacity-50 disabled:cursor-not-allowed transition-all"
                    aria-label="Send message"
                >
                    <SendIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg hover:bg-light-border dark:hover:bg-dark-border transition-colors">
                    Close & Save Discussion
                </button>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default DiscussionModal;