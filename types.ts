// Fix: Define and export all shared types to resolve circular dependency and export errors.
export type TurnRole = 'student' | 'teacher' | 'validator' | 'system' | 'user' | 'starter';

export interface Attachment {
  name: string;
  type: 'image' | 'text';
  mimeType: string;
  data: string; // base64 for image, text content for doc
}

export interface GeneratedImage {
  id: string;
  base64: string; // The base64 string of the image
  prompt: string; // The prompt used to generate it
}

export interface Turn {
    id: string;
    role: TurnRole;
    content: string;
    modelName?: string;
    isStreaming?: boolean;
    feedback?: ValidatorFeedback;
    groundingMetadata?: any;
    functionCall?: { name: string; args: any } | null;
    isRephrased?: boolean;
    discussionTurns?: Turn[]; // Each turn can now have its own persistent side discussion
    attachments?: Attachment[];
    generatedImages?: GeneratedImage[];
}

export type SessionState = 'idle' | 'starting' | 'running_auto' | 'paused_user_input' | 'finished' | 'working';

export interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
}

export type ApiKeyStatus = 'valid' | 'exhausted';

export interface ModelDefinition {
    label: string;
    value: string;
    isCustom?: boolean;
}

export interface AppSettings {
    // General
    learningLevel: string;
    language: string;
    apiKeys: string[];
    apiKeyStatuses: ApiKeyStatus[];
    fontSize: number;
    sessionMode: 'tutor' | 'challenge';
    interactionMode: 'agent' | 'direct';
    availableModels: ModelDefinition[];
    theme: 'light' | 'dark';
    useGradientBorders: boolean;
    activeSessionId: string | null; // Persist active session ID

    // Agent Personality
    modelProfile: string;
    teacherTone: 'formal' | 'encouraging' | 'humorous' | 'patient';
    socraticIntensity: number;
    systemInstructions: {
        starter: string;
        student: string;
        teacher: string;
        validator: string;
        challengeStudent: string;
        challengeValidator: string;
        directChat: string;
    };

    // Features
    useGoogleSearch: boolean;
    enableInteractiveWidgets: boolean;
    contextWindow: 'short' | 'medium' | 'long';
    conceptMapType: 'mind_map' | 'hierarchical_tree' | 'flow_chart' | 'table_matrix';

    // Conversation Flow
    maxTurns: number;
    autoModeDelay: number;
    autoContinueAgent: boolean;

    // Validator
    validatorFrequency: 'disabled' | 'every_turn' | 'every_3_turns' | 'every_5_turns';
    validatorStrictness: 'lenient' | 'standard' | 'strict';

    // Assessment
    quizNumQuestions: number;
    quizFocus: string;

    // Model Selection
    modelSettings: {
        starter: string;
        student: string;
        teacher: string;
        validator: string;
        directChat: string;
        rephrase: string;
        summaryQuiz: string;
        conceptMap: string;
        dynamicTopics: string;
    };
}

export interface ValidatorFeedback {
    rating: 'GOOD' | 'COMPLEX' | 'OFF_TOPIC';
    feedback: string;
}

// Concept Map Types
export interface ConceptMapNode {
    id: string;
    label: string;
    position?: { x: number; y: number };
}

export interface ConceptMapEdge {
    source: string;
    target: string;
    label: string;
}

export interface GraphConceptMap {
    type: 'graph' | 'hierarchical_tree' | 'flow_chart' | 'mind_map';
    nodes: ConceptMapNode[];
    edges: ConceptMapEdge[];
}

export interface MatrixConceptMap {
    type: 'matrix';
    title: string;
    headers: string[];
    rows: string[][];
}

export type ConceptMapData = GraphConceptMap | MatrixConceptMap;

// New multi-session structures
export interface SessionData {
    id: string;
    topic: string;
    turns: Record<string, Turn>;
    turnOrder: string[];
    createdAt: number;
    updatedAt: number;
}

export interface AllSessions {
    sessions: Record<string, SessionData>;
    activeSessionId: string | null;
}

export interface ImageViewerImage {
  src: string; // base64 data URI
  alt: string; // prompt or filename
}


// Fix: Update the AndroidBridge interface for the new native methods.
declare global {
  interface Window {
    AndroidBridge?: {
      // Session Management
      saveSession: (sessionData: string) => void;
      loadAllSessions: () => string; // Returns a JSON string of an array of session JSON strings
      deleteSession: (sessionId: string) => void;
      clearAllSessions: () => void;
      // Settings Management
      saveSettings: (data: string) => void;
      loadSettings: () => string;
      // App Control
      reloadApp: () => void;
      // File Management
      saveFile: (fileName: string, mimeType: string, content: string) => void;
    };
  }
}