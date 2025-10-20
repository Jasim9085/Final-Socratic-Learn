// Fix: Implemented the full App component to replace placeholder content and resolve module/type errors.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Components
const SessionStart = React.lazy(() => import('./components/SessionStart'));
const ConversationDisplay = React.lazy(() => import('./components/ConversationDisplay'));
const ControlPanel = React.lazy(() => import('./components/ControlPanel'));
const SettingsPage = React.lazy(() => import('./components/SettingsPage'));
const ErrorModal = React.lazy(() => import('./components/ErrorModal'));
const QuizDisplay = React.lazy(() => import('./components/QuizDisplay'));
const ExportModal = React.lazy(() => import('./components/ExportModal'));
const SessionSidebar = React.lazy(() => import('./components/SessionSidebar'));
const ConceptMapModal = React.lazy(() => import('./components/ConceptMapModal'));
const DiscussionModal = React.lazy(() => import('./components/DiscussionModal'));
const ImageGenerationModal = React.lazy(() => import('./components/ImageGenerationModal'));
const GenerativeBackground = React.lazy(() => import('./components/GenerativeBackground'));
const ImageViewerModal = React.lazy(() => import('./components/ImageViewerModal'));
import ThemeToggle from './components/ThemeToggle';
import InteractionModeToggle from './components/InteractionModeToggle';
import Loader from './components/Loader';


// Icons
import { SettingsIcon, HistoryIcon, ScrollIcon, ScrollLockIcon } from './components/Icons';

// Services
import * as gemini from './services/geminiService';
import * as storage from './services/storageService';
import { CONTEXT_WINDOW_SIZES } from './constants';

// Types
import type { 
    Turn, 
    SessionState, 
    AppSettings, 
    QuizQuestion, 
    AllSessions, 
    SessionData, 
    Attachment,
    ConceptMapData,
    GeneratedImage,
    ImageViewerImage,
} from './types';


const App: React.FC = () => {
    // Main App State
    const [settings, setSettings] = useState<AppSettings>(storage.loadSettings());
    const [areSettingsLoaded, setAreSettingsLoaded] = useState(false);
    const [allSessions, setAllSessions] = useState<AllSessions>({ sessions: {}, activeSessionId: null });
    const [sessionState, setSessionState] = useState<SessionState>('idle');
    const [error, setError] = useState<string | null>(null);

    // Current Session State
    const [activeSession, setActiveSession] = useState<SessionData | null>(null);
    const [turns, setTurns] = useState<Record<string, Turn>>({});
    const [turnOrder, setTurnOrder] = useState<string[]>([]);
    const [topic, setTopic] = useState<string>('');
    const [quizData, setQuizData] = useState<{ summary: string; quiz: QuizQuestion[] } | null>(null);
    const [resendPayload, setResendPayload] = useState<{content: string, attachments: Attachment[]} | null>(null);

    // UI State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isConceptMapOpen, setIsConceptMapOpen] = useState(false);
    const [isGeneratingConceptMap, setIsGeneratingConceptMap] = useState(false);
    const [isDiscussionOpen, setIsDiscussionOpen] = useState(false);
    const [isImageGenOpen, setIsImageGenOpen] = useState(false);
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    
    const [autoScroll, setAutoScroll] = useState(true);
    const [activeApiKeyIndex, setActiveApiKeyIndex] = useState<number | null>(null);
    const [conceptMapData, setConceptMapData] = useState<ConceptMapData | null>(null);
    const [discussionContext, setDiscussionContext] = useState<{ contextTurn: Turn; turns: Turn[] } | null>(null);
    const [imageGenContextTurn, setImageGenContextTurn] = useState<Turn | null>(null);
    const [imageViewerData, setImageViewerData] = useState<{ images: ImageViewerImage[], startIndex: number } | null>(null);
    
    // Refs
    const sessionStateRef = useRef(sessionState);
    useEffect(() => { sessionStateRef.current = sessionState; }, [sessionState]);

    const settingsRef = useRef(settings);
    useEffect(() => { settingsRef.current = settings; }, [settings]);
    
    // Web Worker for importing
    const importWorkerRef = useRef<Worker | null>(null);
    
    // --- Effects ---

    // Load settings and sessions on initial mount
    useEffect(() => {
        try {
            const loadedSettings = storage.loadSettings();
            setSettings(loadedSettings);
            setAreSettingsLoaded(true);

            const loadedSessions = storage.loadAllSessions();
            if (loadedSessions) {
                setAllSessions(loadedSessions);
                const activeId = loadedSessions.activeSessionId;
                if (activeId && loadedSessions.sessions[activeId]) {
                    // Use a temporary variable for the session to load
                    const sessionToLoad = loadedSessions.sessions[activeId];
                    // Defer loading to the next tick to prevent stale state issues
                    setTimeout(() => loadSession(sessionToLoad), 0);
                }
            }

            gemini.setApiKeyCallbacks(
                (index, status) => {
                    const newStatuses = [...settings.apiKeyStatuses];
                    newStatuses[index] = status;
                    setSettings(s => ({...s, apiKeyStatuses: newStatuses}));
                },
                setActiveApiKeyIndex
            );
        } catch (e) {
            setError(e instanceof Error ? `Error during startup: ${e.message}` : 'An unknown error occurred on startup.');
        }
    }, []);

    
    // Apply theme and font size from settings
    useEffect(() => {
        document.documentElement.className = settings.theme;
        document.documentElement.style.fontSize = `${settings.fontSize}px`;
    }, [settings.theme, settings.fontSize]);

    // Update active session data and persist it when turns change
    useEffect(() => {
        if (activeSession) {
            const updatedSession = { 
                ...activeSession, 
                turns: turns,
                turnOrder: turnOrder,
                updatedAt: Date.now()
            };
            
            // Update the session in the main state object
            setAllSessions(prev => ({
                ...prev,
                sessions: {
                    ...prev.sessions,
                    [activeSession.id]: updatedSession,
                }
            }));
            
            try {
                // Persist only the changed session
                storage.saveSession(updatedSession);
            } catch (e) {
                setError(e instanceof Error ? `Failed to save session progress: ${e.message}`: 'Failed to save session progress.');
            }
        }
    }, [turns, turnOrder, activeSession]);
    
    // --- State & Turn Management ---
    
    const addTurn = useCallback((turn: Omit<Turn, 'id'>) => {
        const newTurn: Turn = { ...turn, id: uuidv4() };
        setTurns(prev => ({ ...prev, [newTurn.id]: newTurn }));
        setTurnOrder(prev => [...prev, newTurn.id]);
        return newTurn;
    }, []);

    const updateTurn = useCallback((id: string, updates: Partial<Turn>) => {
        setTurns(prev => ({
            ...prev,
            [id]: { ...prev[id], ...updates }
        }));
    }, []);
    
    const removeTurn = useCallback((id: string) => {
        setTurns(prev => {
            const newTurns = { ...prev };
            delete newTurns[id];
            return newTurns;
        });
        setTurnOrder(prev => prev.filter(turnId => turnId !== id));
    }, []);

    // Fix: This function now waits for the first chunk from a stream before creating a turn,
    // preventing an empty message bubble from appearing on the screen.
    const createTurnFromStream = useCallback(async (
        turnData: Omit<Turn, 'id' | 'content' | 'isStreaming'>,
        generator: AsyncGenerator<string>
    ): Promise<{ turn: Turn | null; fullContent: string }> => {
        let newTurn: Turn | null = null;
        let fullContent = '';

        const iterator = generator[Symbol.asyncIterator]();
        const firstResult = await iterator.next();

        if (firstResult.done) {
            return { turn: null, fullContent: '' }; // Generator was empty.
        }

        // First chunk arrived. Create the turn now with the initial content.
        fullContent = firstResult.value;
        newTurn = addTurn({
            ...turnData,
            content: fullContent,
            isStreaming: true,
        });

        // Process the rest of the stream.
        for await (const chunk of { [Symbol.asyncIterator]: () => iterator }) {
            fullContent += chunk;
            updateTurn(newTurn.id, { content: fullContent });
        }
        
        // Finalize the turn after the stream is complete.
        updateTurn(newTurn.id, { isStreaming: false });

        return { turn: newTurn, fullContent };
    }, [addTurn, updateTurn]);
    
    const getContextString = useCallback(() => {
        const windowSize = CONTEXT_WINDOW_SIZES[settings.contextWindow];
        return turnOrder
            .slice(-windowSize)
            .map(id => turns[id])
            .filter(Boolean) // Filter out any potential undefined turns
            .map(t => `[${t.role}]\n${t.content}`)
            .join('\n\n');
    }, [turnOrder, turns, settings.contextWindow]);

    // --- Session Lifecycle ---

    const createNewSession = (newTopic: string): SessionData => {
        const newSessionId = uuidv4();
        const newSessionData: SessionData = {
            id: newSessionId,
            topic: newTopic,
            turns: {},
            turnOrder: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        storage.saveSession(newSessionData); // Persist the new session immediately
        
        const newSettings = { ...settings, activeSessionId: newSessionId };
        setSettings(newSettings);
        storage.saveSettings(newSettings); // Persist the new active ID

        setAllSessions(prev => ({
            sessions: { ...prev.sessions, [newSessionId]: newSessionData },
            activeSessionId: newSessionId,
        }));
        return newSessionData;
    };
    
    const loadSession = useCallback((sessionData: SessionData) => {
        let dataToLoad = { ...sessionData };
        // Migration for old format where `turns` was an array
        if (Array.isArray(dataToLoad.turns)) {
            const oldTurns = dataToLoad.turns as unknown as Turn[];
            dataToLoad = {
                ...dataToLoad,
                turns: oldTurns.reduce((acc, turn) => {
                    if (turn && turn.id) acc[turn.id] = turn;
                    return acc;
                }, {} as Record<string, Turn>),
                turnOrder: oldTurns.map(turn => turn.id).filter(Boolean),
            };
        }

        setActiveSession(dataToLoad);
        setTopic(dataToLoad.topic);
        setTurns(dataToLoad.turns || {});
        setTurnOrder(dataToLoad.turnOrder || []);
        setSessionState(dataToLoad.turnOrder && dataToLoad.turnOrder.length > 0 ? 'paused_user_input' : 'idle');
        setQuizData(null);
    }, []);

    // Effect for initializing and managing the import web worker.
    useEffect(() => {
        importWorkerRef.current = new Worker(URL.createObjectURL(new Blob([`
            self.onmessage = (event) => {
                try {
                    let importedData = JSON.parse(event.data);
                    
                    // Migration logic for old format
                    if (Array.isArray(importedData.turns)) {
                         const oldTurns = importedData.turns;
                         importedData = {
                            ...importedData,
                            turns: oldTurns.reduce((acc, turn) => {
                                if(turn && turn.id) acc[turn.id] = turn;
                                return acc;
                            }, {}),
                            turnOrder: oldTurns.map(turn => turn.id).filter(Boolean),
                        };
                    }

                    // Validation
                     if (!importedData || typeof importedData.id !== 'string' || typeof importedData.topic !== 'string' || typeof importedData.turns !== 'object' || !Array.isArray(importedData.turnOrder)) {
                        throw new Error("Invalid session file format.");
                    }

                    self.postMessage({ success: true, data: importedData });
                } catch (e) {
                    self.postMessage({ success: false, error: e.message });
                }
            };
        `], { type: 'application/javascript' })));

        importWorkerRef.current.onmessage = (event) => {
            if (event.data.success) {
                const importedData = event.data.data as SessionData;
                const newSessionId = uuidv4();
                const newSession = { ...importedData, id: newSessionId, createdAt: Date.now(), updatedAt: Date.now() };
                
                storage.saveSession(newSession); // Persist the imported session

                setAllSessions(prev => ({
                    sessions: { ...prev.sessions, [newSessionId]: newSession },
                    activeSessionId: newSessionId,
                }));
                // `loadSession` will set the active session and crucially, the correct sessionState
                // to move away from the 'idle' (welcome) screen.
                loadSession(newSession);
                setIsSidebarOpen(false);
            } else {
                setError(`Failed to import session: ${event.data.error}`);
                // Revert state. If there was a session before, go back to 'paused_user_input'.
                // If not (we were on the welcome screen), go back to 'idle'.
                setSessionState(activeSession ? 'paused_user_input' : 'idle');
            }
        };

        return () => {
            importWorkerRef.current?.terminate();
        };
    }, [loadSession, activeSession]); // Rerun if these change to avoid stale closures.


    const handleNewSession = useCallback(() => {
        try {
            setActiveSession(null);
            setTurns({});
            setTurnOrder([]);
            setTopic('');
            setSessionState('idle');
            setQuizData(null);

            const newSettings = { ...settings, activeSessionId: null };
            setSettings(newSettings);
            storage.saveSettings(newSettings);

            setAllSessions(prev => ({...prev, activeSessionId: null}));
        } catch (e) {
            setError(e instanceof Error ? `Failed to start new session: ${e.message}` : 'Failed to start new session.');
        }
    }, [settings]);
    
    const handleStartSession = async (startTopic: string) => {
        if (!settings.apiKeys.some(k => k.trim())) {
            setError("Cannot start session. Please configure a Gemini API key in Settings.");
            return;
        }
        setSessionState('starting');
        setQuizData(null);
        
        try {
            const newSession = createNewSession(startTopic);
            
            if (settings.interactionMode === 'direct') {
                // For direct chat, the start topic is the first message.
                const firstTurn: Turn = { role: 'user', content: startTopic, attachments: [], id: uuidv4() };
                
                // Set all initial state at once.
                setActiveSession(newSession);
                setTopic(startTopic);
                setTurns({ [firstTurn.id]: firstTurn });
                setTurnOrder([firstTurn.id]);
                setSessionState('running_auto'); // State for waiting for AI response.

                let responseTurnId: string | null = null;
                try {
                    // Context for the first message is always empty.
                    const generator = gemini.getDirectChatResponseStream('', startTopic, [], settings);
                    const { turn } = await createTurnFromStream(
                        { role: 'teacher', modelName: settings.modelSettings.directChat },
                        generator
                    );
                    if (turn) {
                        responseTurnId = turn.id;
                    }
                } finally {
                    // Always transition to paused state, even if stream fails, to unblock UI.
                    setSessionState('paused_user_input');
                }

            } else {
                // Agent mode logic
                setActiveSession(newSession);
                setTopic(startTopic);
                setTurns({});
                setTurnOrder([]);
                const starterTurn = addTurn({ role: 'starter', content: `Refining topic: "${startTopic}"...` });
                const question = await gemini.getStarterQuestion(startTopic, settings);
                updateTurn(starterTurn.id, { content: question, modelName: settings.modelSettings.starter });
                setSessionState('running_auto');
            }

        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setSessionState('idle');
        }
    };

    // --- Agent Logic ---
    
    const isAgentRunning = useRef(false);

    // Fix: This function now only runs a single agent turn. The looping logic is handled by the useEffect hook.
    const runAgentTurn = useCallback(async () => {
        if (isAgentRunning.current) return;
        isAgentRunning.current = true;
    
        const teacherTurnsCount = turnOrder.map(id => turns[id]).filter(t => t?.role === 'teacher').length;
        if (teacherTurnsCount >= settings.maxTurns) {
            setSessionState('finished');
            isAgentRunning.current = false;
            return;
        }
    
        try {
            const lastTurnInState = turnOrder.length > 0 ? turns[turnOrder[turnOrder.length - 1]] : null;
    
            let questionTurn: Turn;
            let contextForTeacher: string;
    
            if (!lastTurnInState || ['teacher', 'validator', 'starter'].includes(lastTurnInState.role)) {
                contextForTeacher = getContextString();
                const studentGenerator = gemini.getStudentResponseStream(contextForTeacher, settings);
                const { turn } = await createTurnFromStream(
                    { role: 'student', modelName: settings.modelSettings.student },
                    studentGenerator
                );
                if (!turn) {
                    throw new Error("Student model failed to generate a response.");
                }
                questionTurn = turn;
            } else {
                questionTurn = lastTurnInState;
                const windowSize = CONTEXT_WINDOW_SIZES[settings.contextWindow];
                 contextForTeacher = turnOrder
                    .slice(0, -1)
                    .slice(-windowSize)
                    .map(id => turns[id])
                    .filter(Boolean)
                    .map(t => `[${t.role}]\n${t.content}`)
                    .join('\n\n');
            }
    
            const teacherTurn = addTurn({ role: 'teacher', content: '...', isStreaming: true, modelName: settings.modelSettings.teacher });
            const { text, groundingMetadata, functionCall } = await gemini.getTeacherResponse(
                contextForTeacher,
                questionTurn.content,
                questionTurn.attachments,
                settings
            );
            updateTurn(teacherTurn.id, { content: text, groundingMetadata, functionCall, isStreaming: false });
    
            if (functionCall) {
                setSessionState('paused_user_input');
                isAgentRunning.current = false;
                return;
            }
    
            const currentTeacherTurns = turnOrder.map(id => turns[id]).filter(t => t?.role === 'teacher').length;
            const validatorFrequencyNum = parseInt(settings.validatorFrequency.split('_')[1] || '1', 10);
            const isValidationTurn = settings.validatorFrequency !== 'disabled' && (currentTeacherTurns % validatorFrequencyNum === 0);
    
            if (isValidationTurn) {
                const validatorTurn = addTurn({ role: 'validator', content: 'Validating...' });
                const feedback = await gemini.getValidatorFeedback(topic, questionTurn.content, text, settings);
                updateTurn(validatorTurn.id, { content: '', feedback, modelName: settings.modelSettings.validator });
            }
    
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setSessionState('paused_user_input');
        } finally {
            isAgentRunning.current = false;
        }
    }, [turnOrder, turns, settings, topic, addTurn, updateTurn, getContextString, createTurnFromStream]);
    
    const runAgentTurnRef = useRef(runAgentTurn);
    useEffect(() => {
        runAgentTurnRef.current = runAgentTurn;
    });

    // Fix: This central effect now correctly manages the agent loop, preventing the race condition that stopped auto-generation.
    useEffect(() => {
        const isAgentMode = settings.interactionMode === 'agent';
        if (!isAgentMode) return;
    
        let isCancelled = false;
    
        const agentLoop = async () => {
            // Use the ref to always call the latest version of runAgentTurn with the latest state.
            await runAgentTurnRef.current();
    
            if (isCancelled) return;
            
            // After one turn, check if we should loop again.
            if (sessionStateRef.current === 'running_auto' && settingsRef.current.autoContinueAgent) {
                // A small delay allows UI to update and prevents overwhelming the API.
                setTimeout(agentLoop, settingsRef.current.autoModeDelay * 1000);
            } else {
                // The loop is over, but the state might still be 'running_auto'.
                // If so, we must transition it to paused.
                if (sessionStateRef.current === 'running_auto') {
                    setSessionState('paused_user_input');
                }
            }
        };
    
        if (sessionState === 'running_auto') {
            agentLoop();
        }
    
        return () => {
            isCancelled = true;
        };
    }, [sessionState, settings.interactionMode]);
    
    // --- User Actions ---
    
    const handleSend = useCallback(async (message: string, attachments: Attachment[]) => {
        addTurn({ role: 'user', content: message, attachments });
        setSessionState('running_auto'); // This will trigger the agent effect.

        // Direct chat mode logic is handled separately.
        if (settings.interactionMode === 'direct') {
            let responseTurnId: string | null = null;
            try {
                const generator = gemini.getDirectChatResponseStream(getContextString(), message, attachments, settings);
                const { turn } = await createTurnFromStream(
                    { role: 'teacher', modelName: settings.modelSettings.directChat },
                    generator
                );
                if (turn) { responseTurnId = turn.id; }
            } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
                if (responseTurnId) { removeTurn(responseTurnId); }
            } finally {
                setSessionState('paused_user_input');
            }
        }
    }, [settings.interactionMode, settings, addTurn, getContextString, createTurnFromStream, removeTurn]);

    const handleResend = useCallback((turnId: string) => {
        const turnToResend = turns[turnId];
        if (!turnToResend || turnToResend.role !== 'user') return;

        const turnIndex = turnOrder.findIndex(id => id === turnId);
        if (turnIndex === -1) return;

        // Truncate history
        const newTurnOrder = turnOrder.slice(0, turnIndex);
        const newTurns = newTurnOrder.reduce((acc, id) => {
            if (turns[id]) {
                acc[id] = turns[id];
            }
            return acc;
        }, {} as Record<string, Turn>);
        
        setTurnOrder(newTurnOrder);
        setTurns(newTurns);
        setResendPayload({ content: turnToResend.content, attachments: turnToResend.attachments || [] });
    }, [turns, turnOrder]);

    // Effect to handle the actual sending after state has been updated by handleResend
    useEffect(() => {
        if (resendPayload) {
            handleSend(resendPayload.content, resendPayload.attachments);
            setResendPayload(null); // Reset the payload
        }
    }, [resendPayload, handleSend]);
    
    const handleAutoContinueToggle = useCallback(() => {
        const willBeRunning = !settings.autoContinueAgent;
        setSettings(s => ({ ...s, autoContinueAgent: willBeRunning }));

        if (willBeRunning && sessionState === 'paused_user_input') {
            setSessionState('running_auto');
        } else if (!willBeRunning && sessionState === 'running_auto') {
            setSessionState('paused_user_input');
        }
    }, [settings.autoContinueAgent, sessionState]);

    const handleRegenerate = useCallback(async (turnId: string) => {
        const turnIndex = turnOrder.findIndex(t => t === turnId);
        if (turnIndex === -1) return;
        
        const originalTurn = turns[turnId];
        const prevTurnId = turnOrder[turnIndex - 1];
        const prevTurn = prevTurnId ? turns[prevTurnId] : undefined;
        
        if (originalTurn.role !== 'teacher' || !prevTurn || !['student', 'user'].includes(prevTurn.role)) return;

        setSessionState('running_auto');
        updateTurn(turnId, { content: '', isStreaming: true, isRephrased: false, generatedImages: [], groundingMetadata: null, functionCall: null });
        try {
            const context = turnOrder.slice(0, turnIndex - 1).map(id => turns[id]).map(t => `[${t.role}]\n${t.content}`).join('\n\n');
            
            const modelForTeacher = settings.interactionMode === 'direct' ? settings.modelSettings.directChat : settings.modelSettings.teacher;
            const settingsForRegen = { ...settings, modelSettings: { ...settings.modelSettings, teacher: modelForTeacher } };

            const { text, groundingMetadata, functionCall } = await gemini.getTeacherResponse(context, prevTurn.content, originalTurn.attachments, settingsForRegen);
            updateTurn(turnId, { content: text, groundingMetadata, functionCall, isStreaming: false, modelName: modelForTeacher });
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            updateTurn(turnId, { content: 'Error regenerating response.', isStreaming: false });
        } finally {
            setSessionState('paused_user_input');
        }
    }, [turnOrder, turns, settings, updateTurn]);

    const handleRephrase = useCallback(async (turnId: string, style: 'ELI5' | 'Analogy' | 'Detailed') => {
        const turnIndex = turnOrder.findIndex(t => t === turnId);
        if (turnIndex < 1) return;
        
        const originalTurn = turns[turnId];
        const questionTurnId = turnOrder[turnIndex - 1];
        const questionTurn = turns[questionTurnId];


        setSessionState('running_auto');
        let rephraseTurnId: string | null = null;
        try {
            const generator = gemini.getRephrasedResponseStream(questionTurn.content, originalTurn.content, style, settings);
            const { turn } = await createTurnFromStream(
                { role: 'teacher', isRephrased: true, modelName: settings.modelSettings.rephrase },
                generator
            );
            if (turn) {
                rephraseTurnId = turn.id;
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            if (rephraseTurnId) {
                removeTurn(rephraseTurnId);
            }
        } finally {
            setSessionState('paused_user_input');
        }
    }, [turnOrder, turns, settings, createTurnFromStream, removeTurn]);
    
    // --- Feature Generation ---

    const handleGenerateQuiz = useCallback(async () => {
        setSessionState('working'); // "Working" state
        try {
            const data = await gemini.generateSummaryAndQuiz(getContextString(), settings);
            setQuizData(data);
            setSessionState('finished');
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setSessionState('paused_user_input');
        }
    }, [getContextString, settings]);
    
    const handleGenerateConceptMap = useCallback(async () => {
        setIsGeneratingConceptMap(true);
        try {
            const data = await gemini.generateConceptMap(getContextString(), settings);
            setConceptMapData(data);
            setIsConceptMapOpen(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsGeneratingConceptMap(false);
        }
    }, [getContextString, settings]);

    // --- Session & Data Management ---

    const handleSaveSettings = (newSettings: AppSettings) => {
        try {
            setSettings(newSettings);
            storage.saveSettings(newSettings);
            setIsSettingsOpen(false);
        } catch(e) {
            setError(e instanceof Error ? `Failed to save settings: ${e.message}` : 'Failed to save settings.');
        }
    };

    const handleSwitchSession = useCallback((sessionId: string) => {
        try {
            const session = allSessions.sessions[sessionId];
            if (session) {
                setAllSessions(prev => ({ ...prev, activeSessionId: sessionId }));
                loadSession(session);
                
                const newSettings = { ...settings, activeSessionId: sessionId };
                setSettings(newSettings);
                storage.saveSettings(newSettings);
            }
        } catch (e) {
            setError(e instanceof Error ? `Failed to switch session: ${e.message}` : 'Failed to switch session.');
        }
        setIsSidebarOpen(false);
    }, [allSessions.sessions, loadSession, settings]);

    const handleDeleteSession = useCallback((sessionId: string) => {
        try {
            storage.deleteSession(sessionId); // Persist deletion first

            const newSessions = { ...allSessions.sessions };
            delete newSessions[sessionId];
            
            if (allSessions.activeSessionId === sessionId) {
                // If deleting the active session, go to a blank state
                handleNewSession();
                setAllSessions({ sessions: newSessions, activeSessionId: null });
            } else {
                setAllSessions(prev => ({ ...prev, sessions: newSessions }));
            }
        } catch (e) {
            setError(e instanceof Error ? `Failed to delete session: ${e.message}` : 'Failed to delete session.');
        }
    }, [allSessions, handleNewSession]);

    const handleClearAllSessions = useCallback(() => {
        if (window.confirm("Are you sure you want to delete ALL sessions? This cannot be undone.")) {
            try {
                storage.clearAllSessions();
                setAllSessions({ sessions: {}, activeSessionId: null });
                handleNewSession(); // Resets the UI to the start page
                setIsSidebarOpen(false);
            } catch(e) {
                setError(e instanceof Error ? `Failed to clear all sessions: ${e.message}` : 'Failed to clear all sessions.');
            }
        }
    }, [handleNewSession]);

    const handleImportSession = useCallback((fileContent: string) => {
        setSessionState('working');
        importWorkerRef.current?.postMessage(fileContent);
    }, []);

    // --- Modal Handlers ---
    
    const handleStartDiscussion = useCallback((turnId: string) => {
        const contextTurn = turns[turnId];
        if (contextTurn) {
            setDiscussionContext({
                contextTurn,
                turns: contextTurn.discussionTurns || []
            });
            setIsDiscussionOpen(true);
        }
    }, [turns]);

    const handleSendDiscussionMessage = async (prompt: string) => {
        if (!discussionContext) return;
    
        const userTurn = { id: uuidv4(), role: 'user' as const, content: prompt };
        // Immediately update the context with the user's message
        const turnsWithUserMessage = [...discussionContext.turns, userTurn];
        setDiscussionContext(prev => ({ ...prev!, turns: turnsWithUserMessage }));
    
        try {
            const context = `Original message: "${discussionContext.contextTurn.content}"\n\n${turnsWithUserMessage.map(t => `[${t.role}]\n${t.content}`).join('\n\n')}`;
            const generator = gemini.getDirectChatResponseStream(context, prompt, undefined, settings);
            
            let aiTurnId: string | null = null;
            let fullContent = '';
    
            for await (const chunk of generator) {
                fullContent += chunk;
                if (!aiTurnId) {
                    // First chunk: Create and add the AI turn
                    const newAiTurn = { 
                        id: uuidv4(), 
                        role: 'teacher' as const, 
                        content: fullContent, 
                        isStreaming: true, 
                        modelName: settings.modelSettings.directChat 
                    };
                    aiTurnId = newAiTurn.id;
                    setDiscussionContext(prev => ({ ...prev!, turns: [...prev!.turns, newAiTurn] }));
                } else {
                    // Subsequent chunks: Update the existing AI turn
                    setDiscussionContext(prev => ({
                        ...prev!,
                        turns: prev!.turns.map(t => t.id === aiTurnId ? { ...t, content: fullContent } : t)
                    }));
                }
            }
    
            if (aiTurnId) {
                // Finalize the AI turn state after streaming
                setDiscussionContext(prev => ({
                    ...prev!,
                    turns: prev!.turns.map(t => t.id === aiTurnId ? { ...t, isStreaming: false } : t)
                }));
            }
        } catch(e) {
            setError(e instanceof Error ? e.message : String(e));
             // On error, remove any turn that was still streaming
            setDiscussionContext(prev => {
                if (!prev) return null;
                return { ...prev, turns: prev.turns.filter(t => !t.isStreaming) };
            });
        }
    };
    
    const handleDeleteDiscussionMessage = (turnId: string) => {
        if (!discussionContext) return;
        setDiscussionContext(prev => ({
            ...prev!,
            turns: prev!.turns.filter(t => t.id !== turnId)
        }));
    };

    const handleCloseDiscussion = () => {
        if (discussionContext) {
            updateTurn(discussionContext.contextTurn.id, { discussionTurns: discussionContext.turns });
        }
        setIsDiscussionOpen(false);
        setDiscussionContext(null);
    };

    const handleVisualize = useCallback((turnId: string) => {
        const turn = turns[turnId];
        if (turn) {
            setImageGenContextTurn(turn);
            setIsImageGenOpen(true);
        }
    }, [turns]);

    const handleGenerateImage = async (prompt: string) => {
        if (!imageGenContextTurn) return;

        try {
            const base64Image = await gemini.generateConceptualImage(imageGenContextTurn.content, prompt, settings);
            const newImage: GeneratedImage = {
                id: uuidv4(),
                base64: base64Image,
                prompt: prompt
            };
            
            setTurns(prevTurns => {
                const currentTurn = prevTurns[imageGenContextTurn.id];
                const existingImages = currentTurn.generatedImages || [];
                const updatedImages = [...existingImages, newImage];
                const updatedTurn = { ...currentTurn, generatedImages: updatedImages };
                
                setImageGenContextTurn(updatedTurn); // Update context for modal
                
                return { ...prevTurns, [imageGenContextTurn.id]: updatedTurn };
            });

        } catch(e) {
            console.error("Image generation failed in App.tsx", e);
            throw e; // Rethrow to be caught in the modal
        }
    };
    
    const handleOpenImageViewer = useCallback((images: ImageViewerImage[], startIndex: number) => {
        setImageViewerData({ images, startIndex });
        setIsImageViewerOpen(true);
    }, []);


    return (
        <div className="flex h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text font-sans">
            <React.Suspense fallback={null}>
                {sessionState === 'idle' && areSettingsLoaded && <GenerativeBackground theme={settings.theme} isVisible={sessionState === 'idle'} />}
            </React.Suspense>
            <React.Suspense fallback={null}>
                <SessionSidebar 
                    isVisible={isSidebarOpen}
                    sessions={(Object.values(allSessions.sessions) as SessionData[]).sort((a, b) => b.updatedAt - a.updatedAt)}
                    activeSessionId={allSessions.activeSessionId}
                    onClose={() => setIsSidebarOpen(false)}
                    onSwitchSession={handleSwitchSession}
                    onNewSession={() => { handleNewSession(); setIsSidebarOpen(false); }}
                    onDeleteSession={handleDeleteSession}
                    onExportSession={(id) => {
                        const sessionToExp = allSessions.sessions[id];
                        if (sessionToExp) {
                            setActiveSession(sessionToExp); // temporarily set for export
                            setIsExportOpen(true);
                        }
                    }}
                    onImportSession={handleImportSession}
                    onClearAllSessions={handleClearAllSessions}
                />
            </React.Suspense>
            
            <main className="flex-1 flex flex-col relative overflow-hidden z-10">
                <header className="flex-shrink-0 flex justify-between items-center p-3 border-b border-light-border dark:border-dark-border bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-md hover:bg-black/10 dark:hover:bg-white/10">
                            <HistoryIcon className="h-6 w-6" />
                        </button>
                        <InteractionModeToggle
                            mode={settings.interactionMode}
                            onModeChange={(mode) => {
                                setSettings(s => ({ ...s, interactionMode: mode }));
                            }}
                        />
                    </div>
                     <h2 className="font-semibold text-center truncate hidden md:block">{activeSession?.topic || "New Session"}</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setAutoScroll(p => !p)} className="p-2 rounded-md hover:bg-black/10 dark:hover:bg-white/10" aria-label={autoScroll ? "Disable auto-scroll" : "Enable auto-scroll"}>
                            {autoScroll ? <ScrollLockIcon className="h-6 w-6" /> : <ScrollIcon className="h-6 w-6" />}
                        </button>
                        <ThemeToggle theme={settings.theme} onToggle={() => setSettings(s => ({ ...s, theme: s.theme === 'light' ? 'dark' : 'light' }))} />
                        <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-md hover:bg-black/10 dark:hover:bg-white/10">
                            <SettingsIcon className="h-6 w-6" />
                        </button>
                    </div>
                </header>
                
                <div className={`flex-grow flex flex-col items-center overflow-y-auto pb-4 relative ${sessionState !== 'idle' ? 'bg-light-surface dark:bg-dark-surface' : 'bg-transparent'}`}>
                   {(sessionState === 'working' || sessionState === 'starting') && (
                        <div className="absolute inset-0 bg-light-surface/80 dark:bg-dark-surface/80 flex items-center justify-center z-20 backdrop-blur-sm">
                            <Loader size="lg" text={sessionState === 'starting' ? 'Starting session...' : 'Processing...'} />
                        </div>
                    )}
                    <React.Suspense fallback={<div className="flex-grow flex items-center justify-center"><Loader size="lg" /></div>}>
                        {sessionState === 'idle' ? (
                            <SessionStart onStart={handleStartSession} settings={settings} areSettingsLoaded={areSettingsLoaded} />
                        ) : (
                            <>
                               <ConversationDisplay
                                    turns={turnOrder.map(id => turns[id]).filter(Boolean)}
                                    sessionState={sessionState}
                                    autoScroll={autoScroll}
                                    useGradientBorders={settings.useGradientBorders}
                                    onRephrase={handleRephrase}
                                    onRegenerate={handleRegenerate}
                                    onResend={handleResend}
                                    onDelete={removeTurn}
                                    onStartDiscussion={handleStartDiscussion}
                                    onVisualize={handleVisualize}
                                    onOpenImageViewer={handleOpenImageViewer}
                               />
                               {quizData && <QuizDisplay {...quizData} onReset={handleNewSession} />}
                            </>
                        )}
                    </React.Suspense>
                </div>

                {sessionState !== 'idle' && !quizData && (
                   <div className="flex-shrink-0 w-full max-w-4xl mx-auto p-2">
                     <React.Suspense fallback={<div className="h-32 flex items-center justify-center"><Loader /></div>}>
                        <ControlPanel
                            sessionState={sessionState}
                            settings={settings}
                            onSend={handleSend}
                            onNewSession={handleNewSession}
                            onContinueAgentTurn={() => setSessionState('running_auto')}
                            onAutoContinueToggle={handleAutoContinueToggle}
                            onGenerateQuiz={handleGenerateQuiz}
                            onGenerateConceptMap={handleGenerateConceptMap}
                            isGeneratingConceptMap={isGeneratingConceptMap}
                            turns={turnOrder.map(id => turns[id])}
                            onExport={() => setIsExportOpen(true)}
                            onError={(msg) => setError(msg)}
                        />
                     </React.Suspense>
                   </div>
                )}
            </main>

            {/* Modals */}
             <React.Suspense fallback={null}>
                {isSettingsOpen && <SettingsPage settings={settings} onSave={handleSaveSettings} onClose={() => setIsSettingsOpen(false)} activeApiKeyIndex={activeApiKeyIndex} />}
                {error && <ErrorModal message={error} onClose={() => setError(null)} />}
                {isExportOpen && activeSession && <ExportModal session={activeSession} onClose={() => setIsExportOpen(false)} />}
                {isConceptMapOpen && conceptMapData && <ConceptMapModal data={conceptMapData} onClose={() => setIsConceptMapOpen(false)} />}
                {isDiscussionOpen && discussionContext && <DiscussionModal discussion={discussionContext} onClose={handleCloseDiscussion} onSendMessage={handleSendDiscussionMessage} onDeleteMessage={handleDeleteDiscussionMessage} />}
                {isImageGenOpen && imageGenContextTurn && <ImageGenerationModal contextTurn={imageGenContextTurn} onClose={() => setIsImageGenOpen(false)} onGenerate={handleGenerateImage} />}
                {isImageViewerOpen && imageViewerData && <ImageViewerModal images={imageViewerData.images} startIndex={imageViewerData.startIndex} onClose={() => setIsImageViewerOpen(false)} />}
             </React.Suspense>
        </div>
    );
};

export default App;