import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import type { Turn, ValidatorFeedback, ImageViewerImage } from '../types';
import { markdownComponents } from '../utils/markdownComponents';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { StudentIcon, TeacherIcon, ValidatorIcon, SystemIcon, UserIcon, CopyIcon, CheckIcon, RephraseIcon, RegenerateIcon, DiscussionIcon, DocumentIcon, ImageIcon, TrashIcon, VisualizeIcon } from './Icons';
import QuickMcq from './QuickMcq';

interface MessageBubbleProps {
  turn: Turn;
  useGradientBorders: boolean;
  onRephrase: (turnId: string, style: 'ELI5' | 'Analogy' | 'Detailed') => void;
  onRegenerate: (turnId: string) => void;
  onResend: (turnId: string) => void;
  onStartDiscussion: (turnId: string) => void;
  onDelete: (turnId: string) => void;
  onVisualize: (turnId: string) => void;
  onOpenImageViewer: (images: ImageViewerImage[], startIndex: number) => void;
}

const RoleDisplay: React.FC<{ role: Turn['role'] }> = ({ role }) => {
  const roleInfo = {
    student: { name: "Student", Icon: StudentIcon, text: "text-blue-600 dark:text-blue-400" },
    teacher: { name: "Teacher", Icon: TeacherIcon, text: "text-green-600 dark:text-green-400" },
    validator: { name: "Validator", Icon: ValidatorIcon, text: "text-yellow-600 dark:text-yellow-400" },
    system: { name: "System", Icon: SystemIcon, text: "text-gray-600 dark:text-gray-400" },
    user: { name: "You", Icon: UserIcon, text: "text-purple-600 dark:text-purple-400" },
  };
  const { name, Icon } = roleInfo[role] || roleInfo.system;

  return (
    <div className={`flex items-center space-x-2 font-bold font-display text-sm`}>
       <Icon className="h-5 w-5" />
       <span>{name}</span>
    </div>
  );
};

const RephraseMenu: React.FC<{ turnId: string; onRephrase: MessageBubbleProps['onRephrase'] }> = ({ turnId, onRephrase }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (style: 'ELI5' | 'Analogy' | 'Detailed') => {
        onRephrase(turnId, style);
        setIsOpen(false);
    };
    
    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(p => !p)}
                className="p-2 rounded-full bg-light-bg dark:bg-dark-bg hover:bg-light-border dark:hover:bg-dark-border transition-all text-light-text-secondary dark:text-dark-text-secondary"
                aria-label="Rephrase options"
            >
                <RephraseIcon className="h-5 w-5" />
            </button>
            {isOpen && (
                <div 
                    className="absolute z-10 top-full right-0 mt-1 w-48 bg-light-surface dark:bg-dark-surface rounded-md shadow-lg border border-light-border dark:border-dark-border animate-scale-in"
                    style={{ animationDuration: '150ms' }}
                >
                    <div className="py-1">
                        <button onClick={() => handleSelect('ELI5')} className="block w-full text-left px-4 py-2 text-sm hover:bg-light-bg dark:hover:bg-dark-bg">Explain Simply (ELI5)</button>
                        <button onClick={() => handleSelect('Analogy')} className="block w-full text-left px-4 py-2 text-sm hover:bg-light-bg dark:hover:bg-dark-bg">Use an Analogy</button>
                        <button onClick={() => handleSelect('Detailed')} className="block w-full text-left px-4 py-2 text-sm hover:bg-light-bg dark:hover:bg-dark-bg">Make it More Detailed</button>
                    </div>
                </div>
            )}
        </div>
    );
};


const GroundingMetadataDisplay: React.FC<{ metadata: any }> = ({ metadata }) => {
    if (!metadata?.groundingChunks?.length) return null;
    
    return (
        <div className="mt-4 border-t pt-2 border-light-border dark:border-dark-border">
            <h4 className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-1">Sources:</h4>
            <ul className="list-disc list-inside text-xs space-y-1">
                {metadata.groundingChunks.map((chunk: any, index: number) => (
                    chunk.web?.uri && (
                        <li key={index}>
                            <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-light-primary dark:text-dark-primary hover:underline break-all">
                                {chunk.web.title || chunk.web.uri}
                            </a>
                        </li>
                    )
                ))}
            </ul>
        </div>
    );
};

const ValidatorFeedbackDisplay: React.FC<{ feedback: ValidatorFeedback; modelName?: string; }> = ({ feedback, modelName }) => {
    const feedbackStyles = {
        GOOD: { icon: '✅', borderColor: 'border-green-500', bgColor: 'bg-green-500/10', textColor: 'text-green-800 dark:text-green-300' },
        COMPLEX: { icon: '🤔', borderColor: 'border-yellow-500', bgColor: 'bg-yellow-500/10', textColor: 'text-yellow-800 dark:text-yellow-300' },
        OFF_TOPIC: { icon: '❌', borderColor: 'border-red-500', bgColor: 'bg-red-500/10', textColor: 'text-red-800 dark:text-red-300' }
    };
    const style = feedbackStyles[feedback.rating] || feedbackStyles.COMPLEX;

    return (
        <div className={`mt-2 p-3 rounded-lg border-l-4 ${style.borderColor} ${style.bgColor}`}>
            <p className={`font-semibold text-sm flex items-center gap-2 ${style.textColor}`}>
                <span>{style.icon}</span> Rating: {feedback.rating}
            </p>
            <p className={`text-sm mt-1 ${style.textColor}`}>{feedback.feedback}</p>
            {modelName && (
                <div className="text-right text-[10px] text-light-text-subtle dark:text-dark-text-subtle mt-2 font-mono pt-1 border-t border-black/10 dark:border-white/10">
                    {modelName}
                </div>
            )}
        </div>
    );
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ turn, useGradientBorders, onRephrase, onRegenerate, onResend, onStartDiscussion, onDelete, onVisualize, onOpenImageViewer }) => {
  const { role, content, attachments, feedback, isStreaming, groundingMetadata, functionCall, isRephrased, modelName, discussionTurns, generatedImages } = turn;
  const [copied, copy] = useCopyToClipboard();
  
  // Special handling for Validator feedback, which has a unique full-width layout.
  if (role === 'validator' && feedback) {
     return (
       <div className="text-left text-xs text-light-text-secondary dark:text-dark-text-secondary p-2 bg-transparent w-full max-w-2xl">
          <ValidatorFeedbackDisplay feedback={feedback} modelName={modelName} />
       </div>
     )
  }

  // Handle simple, non-bubble system messages (e.g., "Generating...").
  const isSimpleSystemMessage = ['system', 'starter'].includes(role) && !modelName;
  if (isSimpleSystemMessage) {
    return (
      <div className="text-center text-xs text-light-text-secondary dark:text-dark-text-secondary p-2 flex items-center justify-center space-x-2">
        <SystemIcon className="h-4 w-4" />
        <span>{content}</span>
      </div>
    );
  }

  // All other turns (user, AI, and system-with-model) render as a bubble.
  const canBeDeleted = ['user', 'student', 'teacher'].includes(role);

  const renderFunctionCall = () => {
    if (!functionCall) return null;
    switch (functionCall.name) {
        case 'create_multiple_choice_question':
            return <QuickMcq {...functionCall.args} />;
        default:
            return null;
    }
  };

  const imageAttachments = attachments?.filter(a => a.type === 'image') || [];
  const attachmentViewerImages = imageAttachments.map(att => ({
      src: `data:${att.mimeType};base64,${att.data}`,
      alt: att.name
  }));

  const generatedViewerImages = (generatedImages || []).map(img => ({
      src: `data:image/png;base64,${img.base64}`,
      alt: img.prompt
  }));

  const bubbleContent = (
    <>
        <div className="flex justify-between items-center">
            <RoleDisplay role={role} />
            <div className="flex items-center gap-2">
                {canBeDeleted && (
                    <button
                        onClick={() => onDelete(turn.id)}
                        className="p-2 rounded-full bg-light-bg dark:bg-dark-bg hover:bg-red-500/10 transition-all text-light-text-secondary dark:text-dark-text-secondary hover:text-red-500"
                        aria-label="Delete message"
                    >
                        <TrashIcon className="h-5 w-5" />
                    </button>
                )}
                {!isStreaming && role === 'user' && (
                    <button
                        onClick={() => onResend(turn.id)}
                        className="p-2 rounded-full bg-light-bg dark:bg-dark-bg hover:bg-light-border dark:hover:bg-dark-border transition-all text-light-text-secondary dark:text-dark-text-secondary"
                        aria-label="Resend query"
                    >
                        <RegenerateIcon className="h-5 w-5" />
                    </button>
                )}
                {!isStreaming && (role === 'teacher' || role === 'student') && (
                    <button
                        onClick={() => onRegenerate(turn.id)}
                        className="p-2 rounded-full bg-light-bg dark:bg-dark-bg hover:bg-light-border dark:hover:bg-dark-border transition-all text-light-text-secondary dark:text-dark-text-secondary"
                        aria-label="Regenerate response"
                    >
                        <RegenerateIcon className="h-5 w-5" />
                    </button>
                )}
                {!isStreaming && role === 'teacher' && (
                <>
                    <button
                        onClick={() => onVisualize(turn.id)}
                        className="p-2 rounded-full bg-light-bg dark:bg-dark-bg hover:bg-light-border dark:hover:bg-dark-border transition-all text-light-text-secondary dark:text-dark-text-secondary"
                        aria-label="Generate a visual from this text"
                    >
                        <VisualizeIcon className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => onStartDiscussion(turn.id)}
                        className="p-2 rounded-full relative bg-light-bg dark:bg-dark-bg hover:bg-light-border dark:hover:bg-dark-border transition-all text-light-text-secondary dark:text-dark-text-secondary"
                        aria-label="Start side discussion"
                    >
                        <DiscussionIcon className="h-5 w-5" />
                        {discussionTurns && discussionTurns.length > 0 && (
                            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-light-primary dark:bg-dark-primary ring-2 ring-light-surface dark:ring-dark-surface"></span>
                        )}
                    </button>
                    <RephraseMenu turnId={turn.id} onRephrase={onRephrase} />
                </>
                )}
                <button
                    onClick={() => copy(content)}
                    className="p-2 rounded-full bg-light-bg dark:bg-dark-bg hover:bg-light-border dark:hover:bg-dark-border transition-all text-light-text-secondary dark:text-dark-text-secondary"
                    aria-label="Copy to clipboard"
                >
                    {copied ? <CheckIcon className="h-5 w-5 text-green-500" /> : <CopyIcon className="h-5 w-5" />}
                </button>
            </div>
        </div>

        <div className="border-t border-light-border/70 dark:border-dark-border/70 -mx-3 my-2"></div>
        
        {attachments && attachments.length > 0 && (
            <div className="mb-2 space-y-2">
                {attachments.map((att, index) => {
                    if (att.type === 'image') {
                        const imageIndex = attachmentViewerImages.findIndex(img => img.alt === att.name);
                        return (
                            <div key={index} className="p-2 border rounded-lg bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border">
                                <img 
                                    src={`data:${att.mimeType};base64,${att.data}`} 
                                    alt={att.name} 
                                    className="max-w-full max-h-80 rounded-md object-contain mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => onOpenImageViewer(attachmentViewerImages, imageIndex)}
                                />
                            </div>
                        )
                    } else if (att.type === 'text') {
                         return (
                            <div key={index} className="p-2 border rounded-lg bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border">
                                <div className="flex items-center gap-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                    <DocumentIcon className="w-5 h-5 flex-shrink-0" />
                                    <span className="font-mono truncate">{att.name}</span>
                                </div>
                            </div>
                        );
                    }
                    return null;
                })}
            </div>
        )}

        {isRephrased && <p className="text-xs font-semibold text-light-primary dark:text-dark-primary mb-2">✨ Rephrased Explanation</p>}
        {(content || isStreaming) && (
            <div className={`prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-li:my-1 text-base ${isStreaming ? 'is-streaming' : ''}`}>
                <ReactMarkdown 
                    components={markdownComponents}
                    remarkPlugins={[remarkMath, remarkGfm]}
                    rehypePlugins={[[rehypeKatex, { output: 'mathml', throwOnError: false }]]}
                >
                    {content}
                </ReactMarkdown>
            </div>
        )}
        {functionCall && <div className="mt-3">{renderFunctionCall()}</div>}
        {feedback && <ValidatorFeedbackDisplay feedback={feedback} modelName={modelName} />}
        <GroundingMetadataDisplay metadata={groundingMetadata} />

        {generatedImages && generatedImages.length > 0 && (
            <div className="mt-4 pt-3 border-t border-light-border dark:border-dark-border">
                <h4 className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-2">Generated Images</h4>
                <div className="flex overflow-x-auto space-x-3 pb-2 -mx-3 px-3">
                    {generatedImages.map((image, index) => (
                        <button 
                            key={image.id} 
                            onClick={() => onOpenImageViewer(generatedViewerImages, index)}
                            className="flex-shrink-0 w-40 h-40 rounded-lg overflow-hidden border border-light-border dark:border-dark-border group relative shadow-md hover:scale-105 transition-transform duration-200 block"
                        >
                            <img 
                                src={`data:image/png;base64,${image.base64}`} 
                                alt={image.prompt}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                <p className="text-white text-xs leading-tight">{image.prompt}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {modelName && (
            <div className="text-right text-[10px] text-light-text-subtle dark:text-dark-text-subtle mt-2 font-mono pt-1 border-t border-light-border/50 dark:border-dark-border/50">
                {modelName}
            </div>
        )}
    </>
  );

  if (useGradientBorders) {
    return (
        <div className="w-full max-w-2xl md:max-w-4xl rounded-xl p-px shadow-sm bg-gradient-to-br from-[#8b5cf6] to-[#4f46e5] dark:from-[#a78bfa] dark:to-[#6366f1]">
            <div className="bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text rounded-[11px] p-3 w-full h-full">
                {bubbleContent}
            </div>
        </div>
    );
  }

  return (
    <div className="w-full max-w-2xl md:max-w-4xl rounded-xl shadow-sm bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text p-3 border border-light-border dark:border-dark-border">
        {bubbleContent}
    </div>
  );
};

export default memo(MessageBubble);