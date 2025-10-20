
import React, { useState } from 'react';
import type { AppSettings, ApiKeyStatus, ModelDefinition } from '../types';
import {
  CloseIcon, ActiveIcon, ExhaustedIcon, ReadyIcon, TrashIcon, WarningIcon, PasteIcon,
  SettingsIcon, HistoryIcon, ScrollIcon, ScrollLockIcon, SunIcon, MoonIcon, AgentIcon,
  ChatIcon, NewSessionIcon, ImageIcon, DocumentIcon, ResumeIcon, PauseIcon, ExportIcon,
  QuizIcon, MindMapIcon, RegenerateIcon, VisualizeIcon, DiscussionIcon, RephraseIcon,
  CopyIcon, ImportIcon
} from './Icons';
import { DEFAULT_AVAILABLE_MODELS } from '../constants';
import * as gemini from '../services/geminiService';

// --- Icon Legend Data and Component ---

const legendItems: { icon: React.ReactNode; name: string; description: string }[] = [
  { icon: <HistoryIcon className="w-6 h-6" />, name: 'Session History', description: 'Open the sidebar to view, manage, and switch between your past conversations.' },
  { icon: <SettingsIcon className="w-6 h-6" />, name: 'Settings', description: 'Open the settings panel to configure API keys, AI behavior, and appearance.' },
  { icon: <AgentIcon className="w-6 h-6" />, name: 'Tutor Mode', description: 'An automated Socratic dialogue between an AI student and teacher.' },
  { icon: <ChatIcon className="w-6 h-6" />, name: 'Direct Chat Mode', description: 'A standard chatbot interface for direct questions and answers.' },
  { icon: <div className="flex items-center"><ScrollIcon className="w-6 h-6" /><span className="mx-1">/</span><ScrollLockIcon className="w-6 h-6" /></div>, name: 'Auto-Scroll', description: 'Toggle whether the conversation view automatically scrolls to the newest message.' },
  { icon: <div className="flex items-center"><SunIcon className="w-6 h-6" /><span className="mx-1">/</span><MoonIcon className="w-6 h-6" /></div>, name: 'Theme', description: 'Switch between light and dark visual themes.' },
  { icon: <NewSessionIcon className="w-5 h-5" />, name: 'New Chat', description: 'Starts a new, fresh conversation session.' },
  { icon: <ImageIcon className="w-5 h-5" />, name: 'Upload Image', description: 'Attach an image file to your message (in supported models).' },
  { icon: <DocumentIcon className="w-5 h-5" />, name: 'Upload Document', description: 'Attach a text file (.txt, .md) to your message.' },
  { icon: <ResumeIcon className="w-5 h-5" />, name: 'Continue (One Turn)', description: 'In manual Tutor mode, advances the conversation by one student-teacher exchange.' },
  { icon: <div className="flex items-center"><AgentIcon className="w-5 h-5 text-green-500" /><span className="mx-1">/</span><PauseIcon className="w-5 h-5 text-red-500" /></div>, name: 'Auto-Gen', description: 'Toggle continuous, multi-turn conversation generation in Tutor mode.' },
  { icon: <ExportIcon className="w-5 h-5" />, name: 'Export Conversation', description: 'Save the current conversation to a text or JSON file.' },
  { icon: <QuizIcon className="w-5 h-5" />, name: 'Finish & Generate Quiz', description: 'Ends the current Tutor session and generates a summary and a multiple-choice quiz.' },
  { icon: <MindMapIcon className="w-5 h-5" />, name: 'Visualize Concepts', description: 'Generates an interactive concept map based on the conversation.' },
  { icon: <ImportIcon className="w-5 h-5" />, name: 'Import Session', description: 'Load a previously exported session from a JSON file.' },
  { icon: <CopyIcon className="w-5 h-5" />, name: 'Copy Message', description: 'Copies the text content of a message to your clipboard.' },
  { icon: <RephraseIcon className="w-5 h-5" />, name: 'Rephrase', description: 'Opens a menu to have the AI re-explain its message in a different style (e.g., simpler, more detailed).' },
  { icon: <RegenerateIcon className="w-5 h-5" />, name: 'Regenerate / Resend', description: 'For AI messages, generates a new response. For your messages, sends the same query again.' },
  { icon: <DiscussionIcon className="w-5 h-5" />, name: 'Side Discussion', description: 'Start a separate chat thread to ask clarifying questions about a specific message.' },
  { icon: <VisualizeIcon className="w-5 h-5" />, name: 'Generate Image', description: 'Opens a tool to generate a conceptual image based on the content of the message.' },
  { icon: <TrashIcon className="w-5 h-5" />, name: 'Delete', description: 'Permanently deletes a message or a saved session.' },
];

const IconLegendModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start pt-12 p-4 animate-fade-in-up" style={{animationDuration: '200ms'}}>
            <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-custom-lg-light dark:shadow-custom-lg-dark w-full max-w-lg border border-light-border dark:border-dark-border">
                <div className="flex justify-between items-center p-4 border-b border-light-border dark:border-dark-border">
                    <h2 className="text-xl font-bold font-display">Icon Legend</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <ul className="space-y-4">
                        {legendItems.map(item => (
                            <li key={item.name} className="flex items-start gap-4">
                                <div className="p-2 bg-light-bg dark:bg-dark-bg rounded-md border border-light-border dark:border-dark-border flex-shrink-0">{item.icon}</div>
                                <div>
                                    <h3 className="font-semibold">{item.name}</h3>
                                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{item.description}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

// --- Main Settings Page Component ---

interface SettingsPageProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
  activeApiKeyIndex: number | null;
}

const SettingsCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-light-bg dark:bg-dark-bg p-4 rounded-lg border border-light-border dark:border-dark-border shadow-custom-light dark:shadow-custom-dark">
        <h2 className="text-lg font-semibold mb-3 font-display">{title}</h2>
        <div className="space-y-4">{children}</div>
    </div>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${active ? 'bg-light-primary text-white shadow-md' : 'hover:bg-light-border dark:hover:bg-dark-border'}`}
    >
        {children}
    </button>
);

const ApiKeyStatusIndicator: React.FC<{ status: ApiKeyStatus; isActive: boolean }> = ({ status, isActive }) => {
    if (isActive) {
        return (
            <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-semibold px-2 py-1 bg-green-500/10 rounded-md">
                <ActiveIcon className="w-4 h-4" />
                <span>Active</span>
            </div>
        );
    }
    if (status === 'exhausted') {
        return (
            <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-semibold px-2 py-1 bg-red-500/10 rounded-md">
                <ExhaustedIcon className="w-4 h-4" />
                <span>Exhausted</span>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-black/5 dark:bg-white/5 rounded-md">
            <ReadyIcon className="w-4 h-4" />
            <span>Ready</span>
        </div>
    );
};

// Fix: Implemented the full SettingsPage component.
const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSave, onClose, activeApiKeyIndex }) => {
    const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
    const [activeTab, setActiveTab] = useState('general');
    const [isLegendOpen, setIsLegendOpen] = useState(false);

    // State for custom model UI
    const [customModelId, setCustomModelId] = useState('');
    const [isCustomModelValidating, setIsCustomModelValidating] = useState(false);
    const [customModelValidation, setCustomModelValidation] = useState<{ status: 'valid' | 'invalid' | 'unchecked'; message: string | null }>({ status: 'unchecked', message: null });

    const handleNestedChange = (section: keyof AppSettings, key: string, value: any) => {
        setLocalSettings(prev => ({
            ...prev,
            [section]: {
                ...(prev[section] as any),
                [key]: value
            }
        }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        let finalValue: any = value;
        if (type === 'checkbox') {
            finalValue = (e.target as HTMLInputElement).checked;
        } else if (type === 'number' || e.target.dataset.type === 'number') {
            finalValue = parseFloat(value);
        }

        const [section, key] = name.split('.');
        if (section && key) {
            handleNestedChange(section as keyof AppSettings, key, finalValue);
        } else {
            setLocalSettings(prev => ({...prev, [name]: finalValue }));
        }
    };
    
    const handleApiKeyChange = (index: number, value: string) => {
        const newKeys = [...localSettings.apiKeys];
        newKeys[index] = value;
        setLocalSettings(s => ({ ...s, apiKeys: newKeys }));
    };

    const handleAddApiKey = () => {
        setLocalSettings(s => ({ ...s, apiKeys: [...s.apiKeys, ''] }));
    };

    const handleRemoveApiKey = (index: number) => {
        const newKeys = localSettings.apiKeys.filter((_, i) => i !== index);
        const newStatuses = localSettings.apiKeyStatuses.filter((_, i) => i !== index);
        setLocalSettings(s => ({ ...s, apiKeys: newKeys, apiKeyStatuses: newStatuses }));
    };
    
    const handlePasteApiKey = async (index: number) => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) handleApiKeyChange(index, text);
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
        }
    };

    const handleValidateCustomModel = async () => {
        if (!customModelId.trim()) return;
        setIsCustomModelValidating(true);
        setCustomModelValidation({ status: 'unchecked', message: 'Validating...' });
        const result = await gemini.validateModel(customModelId, localSettings.apiKeys);
        setCustomModelValidation(result.isValid ? { status: 'valid', message: 'Model is valid.' } : { status: 'invalid', message: result.error || 'Validation failed.' });
        setIsCustomModelValidating(false);
    };

    const handleAddCustomModel = () => {
        if (customModelValidation.status !== 'valid' || !customModelId) return;
        const newModel: ModelDefinition = { label: `Custom: ${customModelId}`, value: customModelId, isCustom: true };
        if (!localSettings.availableModels.some(m => m.value === newModel.value)) {
            setLocalSettings(s => ({...s, availableModels: [...s.availableModels, newModel]}));
        }
        setCustomModelId('');
        setCustomModelValidation({ status: 'unchecked', message: null });
    };

    const handleRemoveCustomModel = (modelValue: string) => {
        setLocalSettings(s => ({...s, availableModels: s.availableModels.filter(m => m.value !== modelValue) }));
    };

    const handleApplyChanges = () => onSave(localSettings);

    const modelOptions = [...localSettings.availableModels, ...DEFAULT_AVAILABLE_MODELS.filter(dm => !localSettings.availableModels.some(lm => lm.value === dm.value))];

    const renderGeneralTab = () => (
        <>
            <SettingsCard title="API Keys">
                {localSettings.apiKeys.map((key, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <input type="password" value={key} onChange={(e) => handleApiKeyChange(index, e.target.value)} className="w-full p-2 border rounded bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border" placeholder={`API Key ${index + 1}`} />
                        <ApiKeyStatusIndicator status={localSettings.apiKeyStatuses[index] || 'valid'} isActive={activeApiKeyIndex === index} />
                        <button onClick={() => handlePasteApiKey(index)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-md"><PasteIcon className="w-5 h-5" /></button>
                        <button onClick={() => handleRemoveApiKey(index)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-md"><TrashIcon className="w-5 h-5" /></button>
                    </div>
                ))}
                <button onClick={handleAddApiKey} className="text-sm px-3 py-1 bg-light-primary text-white rounded-md">Add Key</button>
            </SettingsCard>
            <SettingsCard title="Session Defaults">
                <div>
                    <label htmlFor="learningLevel" className="text-sm font-medium">Learning Level</label>
                    <input type="text" id="learningLevel" name="learningLevel" value={localSettings.learningLevel} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border" placeholder="e.g., University Student" />
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">Defines the student's knowledge level for the AI.</p>
                </div>
                <div>
                    <label htmlFor="language" className="text-sm font-medium">Response Language</label>
                    <input type="text" id="language" name="language" value={localSettings.language} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border" placeholder="e.g., English" />
                </div>
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Session Mode</label>
                    <div className="flex gap-1 rounded-lg p-1 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border">
                        <button
                            onClick={() => setLocalSettings(s => ({ ...s, sessionMode: 'tutor' }))}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${localSettings.sessionMode === 'tutor' ? 'bg-light-primary text-white' : 'hover:bg-light-bg dark:hover:bg-dark-bg'}`}
                        >
                            Tutor
                        </button>
                        <button
                            onClick={() => setLocalSettings(s => ({ ...s, sessionMode: 'challenge' }))}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${localSettings.sessionMode === 'challenge' ? 'bg-light-primary text-white' : 'hover:bg-light-bg dark:hover:bg-dark-bg'}`}
                        >
                            Challenge
                        </button>
                    </div>
                </div>
            </SettingsCard>
            <SettingsCard title="Model Management">
                 <div className="space-y-2">
                    <h3 className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Assign Models to Tasks</h3>
                    {Object.keys(localSettings.modelSettings).map(key => (
                        <div key={key} className="flex items-center justify-between">
                            <label htmlFor={`modelSettings.${key}`} className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                            <select id={`modelSettings.${key}`} name={`modelSettings.${key}`} value={(localSettings.modelSettings as any)[key]} onChange={handleInputChange} className="p-2 border rounded bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border text-sm">
                                {modelOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </div>
                    ))}
                </div>
                <div className="space-y-2 pt-4 border-t border-light-border dark:border-dark-border">
                    <h3 className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Add & Validate Custom Model</h3>
                    <div className="flex items-center gap-2">
                        <input value={customModelId} onChange={e => setCustomModelId(e.target.value)} placeholder="e.g., gemini-2.5-pro" className="w-full p-2 border rounded bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border" />
                        <button onClick={handleValidateCustomModel} disabled={isCustomModelValidating} className="text-sm px-3 py-1.5 border rounded-md disabled:opacity-50">{isCustomModelValidating ? 'Validating...' : 'Validate'}</button>
                        <button onClick={handleAddCustomModel} disabled={customModelValidation.status !== 'valid'} className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-md disabled:opacity-50">Add</button>
                    </div>
                    {customModelValidation.message && <p className={`text-xs ${customModelValidation.status === 'valid' ? 'text-green-600' : 'text-red-600'}`}>{customModelValidation.message}</p>}
                </div>
                 <div className="space-y-2 pt-4 border-t border-light-border dark:border-dark-border">
                    <h3 className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Available Custom Models</h3>
                    <ul className="list-disc list-inside text-sm">
                        {localSettings.availableModels.filter(m => m.isCustom).map(m => (
                            <li key={m.value} className="flex justify-between items-center">
                                <span>{m.value}</span>
                                <button onClick={() => handleRemoveCustomModel(m.value)} className="p-1 text-red-500 hover:bg-red-500/10 rounded-md"><TrashIcon className="w-4 h-4" /></button>
                            </li>
                        ))}
                         {localSettings.availableModels.filter(m => m.isCustom).length === 0 && <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">No custom models added.</p>}
                    </ul>
                </div>
            </SettingsCard>
            <SettingsCard title="Appearance">
                <div className="flex items-center justify-between">
                    <label htmlFor="fontSize" className="text-sm">Font Size: {localSettings.fontSize}px</label>
                    <input type="range" id="fontSize" name="fontSize" min="12" max="18" step="1" data-type="number" value={localSettings.fontSize} onChange={handleInputChange} className="w-40" />
                </div>
                <div className="flex items-center justify-between">
                    <label htmlFor="useGradientBorders" className="text-sm">Use Gradient Borders on Messages</label>
                    <input type="checkbox" id="useGradientBorders" name="useGradientBorders" checked={localSettings.useGradientBorders} onChange={handleInputChange} className="form-checkbox h-5 w-5 rounded text-light-primary dark:text-dark-primary bg-light-bg dark:bg-dark-bg" />
                </div>
            </SettingsCard>
        </>
    );

    const renderPersonalityTab = () => (
         <>
            <SettingsCard title="Agent Personality">
                 <div>
                    <label htmlFor="modelProfile" className="text-sm font-medium">Model Profile</label>
                    <input type="text" id="modelProfile" name="modelProfile" value={localSettings.modelProfile} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border" placeholder="e.g., balanced" />
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">A general instruction for the AI's persona (exact effect may vary).</p>
                </div>
                <div className="flex items-center justify-between">
                    <label htmlFor="teacherTone" className="text-sm">Teacher Tone</label>
                    <select id="teacherTone" name="teacherTone" value={localSettings.teacherTone} onChange={handleInputChange} className="p-2 border rounded bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border text-sm">
                        <option value="formal">Formal</option>
                        <option value="encouraging">Encouraging</option>
                        <option value="humorous">Humorous</option>
                        <option value="patient">Patient</option>
                    </select>
                </div>
                <div className="flex items-center justify-between">
                    <label htmlFor="socraticIntensity" className="text-sm">Socratic Intensity: {localSettings.socraticIntensity}%</label>
                    <input type="range" id="socraticIntensity" name="socraticIntensity" min="0" max="100" step="5" data-type="number" value={localSettings.socraticIntensity} onChange={handleInputChange} className="w-40" />
                </div>
            </SettingsCard>
            <SettingsCard title="System Instructions">
                {Object.keys(localSettings.systemInstructions).map(key => (
                    <div key={key}>
                        <label htmlFor={`systemInstructions.${key}`} className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                        <textarea id={`systemInstructions.${key}`} name={`systemInstructions.${key}`} value={(localSettings.systemInstructions as any)[key]} onChange={handleInputChange} rows={4} className="mt-1 w-full p-2 border rounded bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border text-xs font-mono"></textarea>
                    </div>
                ))}
            </SettingsCard>
         </>
    );

    const renderFlowTab = () => (
         <>
            <SettingsCard title="Conversation Flow">
                <div className="flex items-center justify-between">
                    <label htmlFor="maxTurns" className="text-sm">Max Turns (Agent Mode)</label>
                    <input type="number" id="maxTurns" name="maxTurns" data-type="number" value={localSettings.maxTurns} onChange={handleInputChange} className="w-20 p-1 border rounded bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border" />
                </div>
                <div className="flex items-center justify-between">
                    <label htmlFor="autoModeDelay" className="text-sm">Auto-Continue Delay (seconds)</label>
                    <input type="number" id="autoModeDelay" name="autoModeDelay" data-type="number" value={localSettings.autoModeDelay} onChange={handleInputChange} className="w-20 p-1 border rounded bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border" />
                </div>
            </SettingsCard>
            <SettingsCard title="Features">
                <div className="flex items-center justify-between">
                    <label htmlFor="useGoogleSearch" className="text-sm">Ground Teacher Responses with Google Search</label>
                    <input type="checkbox" id="useGoogleSearch" name="useGoogleSearch" checked={localSettings.useGoogleSearch} onChange={handleInputChange} className="form-checkbox h-5 w-5 rounded text-light-primary dark:text-dark-primary" />
                </div>
                <div className="flex items-center justify-between">
                    <label htmlFor="enableInteractiveWidgets" className="text-sm">Enable Interactive Widgets (MCQs)</label>
                    <input type="checkbox" id="enableInteractiveWidgets" name="enableInteractiveWidgets" checked={localSettings.enableInteractiveWidgets} onChange={handleInputChange} className="form-checkbox h-5 w-5 rounded text-light-primary dark:text-dark-primary" />
                </div>
                 <div className="flex items-center justify-between">
                    <label htmlFor="contextWindow" className="text-sm">Context Window Size</label>
                    <select id="contextWindow" name="contextWindow" value={localSettings.contextWindow} onChange={handleInputChange} className="p-2 border rounded bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border text-sm">
                        <option value="short">Short (4 turns)</option>
                        <option value="medium">Medium (8 turns)</option>
                        <option value="long">Long (12 turns)</option>
                    </select>
                </div>
                <div className="flex items-center justify-between">
                    <label htmlFor="conceptMapType" className="text-sm">Concept Map Type</label>
                    <select id="conceptMapType" name="conceptMapType" value={localSettings.conceptMapType} onChange={handleInputChange} className="p-2 border rounded bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border text-sm">
                        <option value="mind_map">Mind Map</option>
                        <option value="hierarchical_tree">Hierarchical Tree</option>
                        <option value="flow_chart">Flow Chart</option>
                        <option value="table_matrix">Table/Matrix</option>
                    </select>
                </div>
            </SettingsCard>
            <SettingsCard title="Validator Settings">
                 <div className="flex items-center justify-between">
                    <label htmlFor="validatorFrequency" className="text-sm">Validator Frequency</label>
                    <select id="validatorFrequency" name="validatorFrequency" value={localSettings.validatorFrequency} onChange={handleInputChange} className="p-2 border rounded bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border text-sm">
                        <option value="disabled">Disabled</option>
                        <option value="every_turn">Every Turn</option>
                        <option value="every_3_turns">Every 3 Turns</option>
                        <option value="every_5_turns">Every 5 Turns</option>
                    </select>
                </div>
                <div className="flex items-center justify-between">
                    <label htmlFor="validatorStrictness" className="text-sm">Validator Strictness</label>
                    <select id="validatorStrictness" name="validatorStrictness" value={localSettings.validatorStrictness} onChange={handleInputChange} className="p-2 border rounded bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border text-sm">
                        <option value="lenient">Lenient</option>
                        <option value="standard">Standard</option>
                        <option value="strict">Strict</option>
                    </select>
                </div>
            </SettingsCard>
            <SettingsCard title="Assessment">
                <div>
                    <label htmlFor="quizNumQuestions" className="text-sm font-medium">Number of Quiz Questions</label>
                    <input type="number" id="quizNumQuestions" name="quizNumQuestions" data-type="number" min="1" max="20" value={localSettings.quizNumQuestions} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border" />
                </div>
                <div>
                    <label htmlFor="quizFocus" className="text-sm font-medium">Quiz Focus</label>
                    <input type="text" id="quizFocus" name="quizFocus" value={localSettings.quizFocus} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border" placeholder="e.g., key concepts and definitions" />
                </div>
            </SettingsCard>
        </>
    );
    
    const renderHelpTab = () => (
        <SettingsCard title="Help & Information">
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Confused by an icon? Click the button below for a full legend explaining what each button in the application does.
            </p>
            <button onClick={() => setIsLegendOpen(true)} className="w-full text-sm px-3 py-2 bg-light-primary text-white rounded-md">Show Icon Legend</button>
        </SettingsCard>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-start pt-12 p-4">
            {isLegendOpen && <IconLegendModal onClose={() => setIsLegendOpen(false)} />}
            <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-custom-lg-light dark:shadow-custom-lg-dark w-full max-w-4xl h-[85vh] flex flex-col border border-light-border dark:border-dark-border animate-scale-in">
                <header className="flex justify-between items-center p-4 border-b border-light-border dark:border-dark-border flex-shrink-0">
                    <h1 className="text-xl font-bold font-display">Settings</h1>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><CloseIcon className="h-6 w-6" /></button>
                </header>

                <main className="flex-grow flex overflow-hidden">
                    <nav className="w-48 p-4 border-r border-light-border dark:border-dark-border flex-shrink-0">
                        <div className="flex flex-col gap-2">
                            <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')}>General</TabButton>
                            <TabButton active={activeTab === 'personality'} onClick={() => setActiveTab('personality')}>Personality</TabButton>
                            <TabButton active={activeTab === 'flow'} onClick={() => setActiveTab('flow')}>Flow & Features</TabButton>
                            <TabButton active={activeTab === 'help'} onClick={() => setActiveTab('help')}>Help</TabButton>
                        </div>
                    </nav>
                    <div className="flex-grow p-6 overflow-y-auto space-y-6">
                        {activeTab === 'general' && renderGeneralTab()}
                        {activeTab === 'personality' && renderPersonalityTab()}
                        {activeTab === 'flow' && renderFlowTab()}
                        {activeTab === 'help' && renderHelpTab()}
                    </div>
                </main>

                <footer className="p-4 flex justify-end gap-3 bg-light-bg/80 dark:bg-dark-bg/80 border-t border-light-border dark:border-dark-border flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-light-border dark:hover:bg-dark-border transition-colors">Cancel</button>
                    <button onClick={handleApplyChanges} className="px-4 py-2 bg-light-primary text-white rounded-lg hover:bg-opacity-90 transition-opacity">Apply & Save</button>
                </footer>
            </div>
        </div>
    );
};

export default SettingsPage;