// Fix: Import GenerateContentResponse for proper typing of API responses.
import { GoogleGenAI, Type, GenerateContentResponse, FunctionDeclaration, Modality } from "@google/genai";
// Fix: Import ConceptMapData to resolve 'Cannot find name' errors.
import type { ValidatorFeedback, QuizQuestion, AppSettings, ApiKeyStatus, ModelDefinition, ConceptMapData, Attachment } from "../types";

let onKeyUpdate: ((index: number, status: ApiKeyStatus) => void) | null = null;
let onActiveKeyUpdate: ((index: number | null) => void) | null = null;

export class ApiKeyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ApiKeyError';
    }
}

export function setApiKeyCallbacks(
    onUpdate: (index: number, status: ApiKeyStatus) => void,
    onActiveUpdate: (index: number | null) => void
) {
    onKeyUpdate = onUpdate;
    onActiveKeyUpdate = onActiveUpdate;
}

async function withApiKeyRotation<T>(
    apiKeys: string[],
    apiKeyStatuses: ApiKeyStatus[] | undefined, // Kept for signature compatibility, but not used for classification
    apiCall: (client: GoogleGenAI) => Promise<T>
): Promise<T> {
    const keysToTry = apiKeys
        .map((key, index) => ({ key, index }))
        .filter(k => k.key && k.key.trim());

    if (keysToTry.length === 0) {
        throw new ApiKeyError("No API Key has been configured. Please go to Settings, add a valid Gemini API key, and apply your changes.");
    }
    
    let lastError: unknown = null;
    let lastErrorKeyInfo = { index: -1, key: '' };
    const validationErrors: string[] = [];

    for (const { key, index } of keysToTry) {
        // New: Client-side validation to check for obviously malformed keys
        if (key.length < 30 || !key.startsWith('AIza')) {
            const validationError = `Skipping key at index ${index} because it appears to be invalid.`;
            console.warn(validationError);
            validationErrors.push(validationError);
            continue; // Skip to the next key
        }

        try {
            onActiveKeyUpdate?.(index);
            const client = new GoogleGenAI({ apiKey: key });
            const result = await apiCall(client);
            onActiveKeyUpdate?.(null);
            return result; // Success!
        } catch (e) {
            lastError = e;
            lastErrorKeyInfo = { index, key };
            const errorMessage = e instanceof Error ? e.message : String(e);
            console.error(`API call with key at index ${index} failed:`, errorMessage);
        }
    }
    
    onActiveKeyUpdate?.(null);
    
    if (lastError) {
        const finalErrorMessage = lastError instanceof Error ? lastError.message : String(lastError);
        const keySnippet = lastErrorKeyInfo.key.length > 8
            ? `${lastErrorKeyInfo.key.slice(0, 4)}...${lastErrorKeyInfo.key.slice(-4)}`
            : lastErrorKeyInfo.key;
            
        throw new Error(`API call failed using key at index ${lastErrorKeyInfo.index} (key: ${keySnippet}). Raw Error: ${finalErrorMessage}`);
    }

    if (validationErrors.length > 0 && validationErrors.length === keysToTry.length) {
         throw new ApiKeyError(`All configured API keys failed client-side validation and were skipped. Please check your keys in Settings.`);
    }

    throw new Error("All available API keys failed. Please check your keys in Settings and your network connection.");
}

// Fix: Add a helper to check for Gemma models which do not support systemInstruction.
function isGemmaModel(modelName: string): boolean {
    return modelName.toLowerCase().startsWith('gemma-');
}


// Helper to inject level and other params into instructions
const buildInstruction = (baseInstruction: string, settings: AppSettings, overrides: Record<string, string> = {}) => {
    let instruction = baseInstruction.replace(/{LEVEL}/g, settings.learningLevel);
    Object.entries(overrides).forEach(([key, value]) => {
        instruction = instruction.replace(`{${key.toUpperCase()}}`, value);
    });
    return instruction;
};

// Helper to construct multimodal content for the Gemini API
const buildMultimodalContent = (prompt: string, attachments?: Attachment[]): any => {
    if (!attachments || attachments.length === 0) {
        return prompt; // Return simple string if no files
    }

    // Start with the main text prompt
    const parts: any[] = [{ text: prompt }];

    // Add parts for each attachment
    attachments.forEach(att => {
        if (att.type === 'image') {
            parts.push({
                inlineData: {
                    mimeType: att.mimeType,
                    data: att.data
                }
            });
        } else if (att.type === 'text') {
            // Append text file content to the main prompt as a delineated block
            const currentText = parts[0].text;
            const newText = `${currentText}\n\n--- Attached File: ${att.name} ---\n${att.data}`;
            parts[0] = { text: newText };
        }
    });

    // The final structure for multimodal input is an object with a `parts` array.
    return { parts };
};


const mcqTool: FunctionDeclaration = {
    name: 'create_multiple_choice_question',
    parameters: {
        type: Type.OBJECT,
        description: 'Creates a multiple-choice question to check for understanding.',
        properties: {
            question: { type: Type.STRING, description: 'The question to ask.' },
            options: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'An array of 3 to 4 potential answers.' },
            correct_answer: { type: Type.STRING, description: 'The exact string of the correct answer from the options array.' },
        },
        required: ['question', 'options', 'correct_answer'],
    }
};

const getTeacherSystemInstruction = (settings: AppSettings): string => {
    let instruction = buildInstruction(settings.systemInstructions.teacher, settings);
    
    instruction += `\nYour response should be in ${settings.language}.`;
    instruction += `\nAdopt a ${settings.teacherTone} tone.`;
    
    if (settings.socraticIntensity > 0) {
        if (settings.socraticIntensity > 80) {
            instruction += `\nCRITICAL: Instead of providing a direct answer, you MUST primarily respond with a guiding question that forces the student to think critically and arrive at the answer themselves. Be a pure Socratic guide.`;
        } else if (settings.socraticIntensity > 50) {
            instruction += `\nYour primary teaching method should be Socratic. Ask insightful questions to guide the student, but you may provide some direct explanation.`;
        } else if (settings.socraticIntensity > 10) {
            instruction += `\nMix in some Socratic-style guiding questions to challenge the student, but your main goal is still to provide a clear explanation.`;
        }
    }
    return instruction;
};

async function generateWithRetry(prompt: string, systemInstruction: string, model: string, settings: AppSettings): Promise<string> {
    const useGemmaFormatting = isGemmaModel(model);
    const contents = useGemmaFormatting ? `${systemInstruction}\n\n---\n\n${prompt}` : prompt;
    const config: any = useGemmaFormatting ? {} : { systemInstruction };

    const response = await withApiKeyRotation<GenerateContentResponse>(settings.apiKeys, settings.apiKeyStatuses, ai => ai.models.generateContent({
        model,
        contents,
        config,
    }));
    return response.text;
}

async function* generateStream(prompt: string | { parts: any[] }, systemInstruction: string, model: string, settings: AppSettings): AsyncGenerator<string> {
    const useGemmaFormatting = isGemmaModel(model);

    let finalContents: any;
    if (typeof prompt === 'string') {
        finalContents = useGemmaFormatting ? `${systemInstruction}\n\n---\n\n${prompt}` : prompt;
    } else {
        // It's a multimodal prompt ({ parts: [...] })
        if (useGemmaFormatting) {
            // Prepend system instruction as a text part for Gemma
            prompt.parts.unshift({ text: `${systemInstruction}\n\n---\n\n` });
        }
        finalContents = prompt;
    }
    
    const config: any = useGemmaFormatting ? {} : { systemInstruction };

    const response = await withApiKeyRotation<AsyncGenerator<GenerateContentResponse>>(settings.apiKeys, settings.apiKeyStatuses, ai => ai.models.generateContentStream({
        model,
        contents: finalContents,
        config,
    }));

    for await (const chunk of response) {
        yield chunk.text;
    }
}


export const getStarterQuestion = (topic: string, settings: AppSettings) => {
    const instruction = buildInstruction(settings.systemInstructions.starter, settings);
    return generateWithRetry(`User topic: "${topic}"`, instruction, settings.modelSettings.starter, settings);
};

export async function getTeacherResponse(context: string, question: string, attachments: Attachment[] | undefined, settings: AppSettings) {
    const instruction = getTeacherSystemInstruction(settings);
    
    const isInitialTurn = !context.trim();
    let prompt: string;
    if (isInitialTurn) {
        prompt = `The lesson begins with this guiding question: "${question}". Your task is to provide a comprehensive and direct answer to this question to start the lesson. Frame your response as a direct answer.`;
    } else {
        prompt = `${context}\n\nStudent asks: '${question}'. Explain clearly.`;
    }
    
    const model = settings.modelSettings.teacher;
    const useGemmaFormatting = isGemmaModel(model);
    
    const contentsWithAttachments = buildMultimodalContent(prompt, attachments);
    const finalContents = useGemmaFormatting && typeof contentsWithAttachments === 'string' 
        ? `${instruction}\n\n---\n\n${contentsWithAttachments}` 
        : contentsWithAttachments;
        
    const config: any = useGemmaFormatting ? {} : { systemInstruction: instruction };

    if (settings.useGoogleSearch) {
        config.tools = [{ googleSearch: {} }];
    } else if (settings.enableInteractiveWidgets) {
        config.tools = [{ functionDeclarations: [mcqTool] }];
    }
    
    const response = await withApiKeyRotation<GenerateContentResponse>(settings.apiKeys, settings.apiKeyStatuses, ai => ai.models.generateContent({
        model,
        contents: finalContents,
        config,
    }));
    
    const functionCall = response.functionCalls && response.functionCalls[0] 
        ? { name: response.functionCalls[0].name, args: response.functionCalls[0].args } 
        : null;

    return {
        text: response.text,
        groundingMetadata: response.candidates?.[0]?.groundingMetadata,
        functionCall: functionCall,
    };
}


export const getStudentResponseStream = (context: string, settings: AppSettings) => {
    const instruction = buildInstruction(
        settings.sessionMode === 'challenge' 
            ? settings.systemInstructions.challengeStudent 
            : settings.systemInstructions.student, 
        settings
    );
    const prompt = `${context}\nBased on the prior conversation, what is your next question?`;
    return generateStream(prompt, instruction, settings.modelSettings.student, settings);
};

export const getDirectChatResponseStream = (context: string, userPrompt: string, attachments: Attachment[] | undefined, settings: AppSettings) => {
    const instruction = buildInstruction(settings.systemInstructions.directChat, settings);
    const fullPrompt = context ? `${context}\n\nuser: ${userPrompt}` : `user: ${userPrompt}`;
    const contents = buildMultimodalContent(fullPrompt, attachments);
    return generateStream(contents, instruction, settings.modelSettings.directChat, settings);
};

export async function getValidatorFeedback(topic: string, question: string, answer: string, settings: AppSettings): Promise<ValidatorFeedback> {
    let baseInstruction = settings.sessionMode === 'challenge' 
        ? settings.systemInstructions.challengeValidator
        : settings.systemInstructions.validator;

    let instruction = baseInstruction;
    switch (settings.validatorStrictness) {
        case 'lenient': instruction += ' Be lenient in your assessment.'; break;
        case 'strict': instruction += ' Be very strict and critical in your assessment, focusing on precision and depth.'; break;
        default: break; // Standard
    }

    const prompt = `Topic: '${topic}'\n\nStudent's Question: '${question}'\nTeacher's Answer: '${answer}'`;
    
    const model = settings.modelSettings.validator;
    const useGemmaFormatting = isGemmaModel(model);
    const contents = useGemmaFormatting ? `${instruction}\n\n---\n\n${prompt}` : prompt;
    const config: any = {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                rating: { type: Type.STRING, enum: ['GOOD', 'COMPLEX', 'OFF_TOPIC'] },
                feedback: { type: Type.STRING }
            },
            required: ['rating', 'feedback']
        }
    };
    if (!useGemmaFormatting) {
        config.systemInstruction = instruction;
    }
    
    const response = await withApiKeyRotation<GenerateContentResponse>(settings.apiKeys, settings.apiKeyStatuses, ai => ai.models.generateContent({
        model,
        contents,
        config
    }));
    
    try {
        return JSON.parse(response.text.trim()) as ValidatorFeedback;
    } catch (e) {
        console.error("Failed to parse validator JSON:", response.text, e);
        throw new Error(`The AI validator returned a malformed response that could not be parsed. Raw response: ${response.text}`);
    }
}

export async function* getRephrasedResponseStream(originalQuestion: string, originalAnswer: string, style: 'ELI5' | 'Analogy' | 'Detailed', settings: AppSettings): AsyncGenerator<string> {
    let rephraseInstruction = '';
    switch(style) {
        case 'ELI5': 
            rephraseInstruction = `Explain the following answer as if you were talking to a 5-year-old. Be very simple and use basic concepts.`;
            break;
        case 'Analogy':
            rephraseInstruction = `Explain the following answer again, but this time, use a powerful and easy-to-understand real-world analogy.`;
            break;
        case 'Detailed':
            rephraseInstruction = `Expand on the following answer. Provide more detail, context, and cover any related sub-topics that are important for a deeper understanding.`;
            break;
    }
    const systemInstruction = `You are an expert educator. Your task is to rephrase an existing explanation. ${rephraseInstruction}`;
    const prompt = `Original Question: "${originalQuestion}"\n\nOriginal Answer: "${originalAnswer}"\n\nYour Rephrased explanation:`;

    yield* generateStream(prompt, systemInstruction, settings.modelSettings.rephrase, settings);
}


export async function generateSummaryAndQuiz(fullContext: string, settings: AppSettings): Promise<{ summary: string, quiz: QuizQuestion[] }> {
    const instruction = `You are an expert educator. Based on the provided conversation, generate a final summary and a multiple-choice quiz with exactly ${settings.quizNumQuestions} questions to test understanding. The quiz should focus on ${settings.quizFocus}. Respond ONLY with a JSON object.`;
    const prompt = `Conversation history:\n${fullContext}`;
    
    const model = settings.modelSettings.summaryQuiz;
    const useGemmaFormatting = isGemmaModel(model);
    const contents = useGemmaFormatting ? `${instruction}\n\n---\n\n${prompt}` : prompt;
    const config: any = {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING, description: "A concise summary of the entire conversation." },
                quiz: {
                    type: Type.ARRAY,
                    description: `An array of ${settings.quizNumQuestions} multiple choice questions.`,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            question: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            correctAnswer: { type: Type.STRING, description: "The exact string of the correct option." }
                        },
                        required: ['question', 'options', 'correctAnswer']
                    }
                }
            },
            required: ['summary', 'quiz']
        }
    };
     if (!useGemmaFormatting) {
        config.systemInstruction = instruction;
    }

    const response = await withApiKeyRotation<GenerateContentResponse>(settings.apiKeys, settings.apiKeyStatuses, ai => ai.models.generateContent({
        model,
        contents,
        config
    }));

    try {
        return JSON.parse(response.text.trim()) as { summary: string, quiz: QuizQuestion[] };
    } catch (e) {
        console.error("Failed to parse summary/quiz JSON:", response.text, e);
        throw new Error(`The AI returned a malformed response for the summary and quiz. Raw response: ${response.text}`);
    }
}

export async function generateConceptMap(fullContext: string, settings: AppSettings): Promise<ConceptMapData> {
    const prompt = `Conversation history:\n${fullContext}`;
    let instruction: string;
    let schema: any;

    const graphWithPositionSchema = {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, enum: ['graph'] },
            nodes: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        label: { type: Type.STRING },
                        position: {
                            type: Type.OBJECT,
                            description: "Coordinates for the node on an 800x600 canvas.",
                            properties: {
                                x: { type: Type.NUMBER },
                                y: { type: Type.NUMBER }
                            },
                            required: ['x', 'y']
                        }
                    },
                    required: ['id', 'label', 'position']
                }
            },
            edges: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: { source: { type: Type.STRING }, target: { type: Type.STRING }, label: { type: Type.STRING } },
                    required: ['source', 'target', 'label']
                }
            }
        },
        required: ['type', 'nodes', 'edges']
    };

    const baseGraphWithPositionInstruction = `You are a data visualization expert. Analyze the conversation to identify core concepts and their relationships. Format your response ONLY as a valid JSON object. The JSON must contain 'type':'graph', 'nodes', and 'edges'. For each node, you MUST provide an 'id', 'label', and a 'position' object with 'x' and 'y' coordinates. The coordinates should create a clear and readable layout on an 800x600 canvas.`;

    switch (settings.conceptMapType) {
        case 'table_matrix':
            instruction = `You are a data analyst. Analyze the conversation and organize the key concepts into a comparative table or matrix. Respond ONLY with a valid JSON object with 'type':'matrix', a 'title' for the table, 'headers' (an array of column titles), and 'rows' (a nested array of strings, where each inner array is a row).`;
            schema = {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, enum: ['matrix'] },
                    title: { type: Type.STRING, description: "A descriptive title for the table." },
                    headers: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Column headers." },
                    rows: {
                        type: Type.ARRAY,
                        items: { type: Type.ARRAY, items: { type: Type.STRING } },
                        description: "The rows of the table."
                    }
                },
                required: ['type', 'title', 'headers', 'rows']
            };
            break;
        case 'hierarchical_tree':
            instruction = `${baseGraphWithPositionInstruction} The node positions should form a clear top-down hierarchical tree structure. The main topic should be at the top.`;
            schema = graphWithPositionSchema;
            break;
        case 'flow_chart':
            instruction = `${baseGraphWithPositionInstruction} The node positions should represent a sequential process or flow, typically arranged from left-to-right or top-to-bottom.`;
            schema = graphWithPositionSchema;
            break;
        case 'mind_map':
        default:
            instruction = `${baseGraphWithPositionInstruction} The node positions should form an organic mind map, with a central concept branching out radially to related ideas.`;
            schema = graphWithPositionSchema;
            break;
    }

    const model = settings.modelSettings.conceptMap;
    const useGemmaFormatting = isGemmaModel(model);
    const contents = useGemmaFormatting ? `${instruction}\n\n---\n\n${prompt}` : prompt;
    const config: any = {
        responseMimeType: "application/json",
        responseSchema: schema,
    };
    if (!useGemmaFormatting) {
        config.systemInstruction = instruction;
    }

    const response = await withApiKeyRotation<GenerateContentResponse>(settings.apiKeys, settings.apiKeyStatuses, ai => ai.models.generateContent({
        model,
        contents,
        config
    }));
    
    try {
        const parsed = JSON.parse(response.text.trim());
        // Basic validation
        if ((parsed.type === 'graph' && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) ||
            (parsed.type === 'matrix' && Array.isArray(parsed.headers) && Array.isArray(parsed.rows))) {
            return parsed as ConceptMapData;
        }
        throw new Error("Parsed JSON does not match expected ConceptMapData structure.");
    } catch (e) {
        console.error("Failed to parse concept map JSON:", response.text, e);
        throw new Error(`The AI returned a malformed response for the concept map. Raw response: ${response.text}`);
    }
}

export async function getDynamicTopics(settings: AppSettings): Promise<Record<string, string[]>> {
    const { learningLevel, apiKeys, modelSettings, apiKeyStatuses } = settings;
    const isNeet = learningLevel.toLowerCase().includes('neet');
    const fallbackTopics = isNeet 
        ? {
            "Physics": ["Electrostatics", "Optics", "Modern Physics", "Thermodynamics"],
            "Chemistry": ["Organic Chemistry", "Chemical Bonding", "p-Block Elements", "Equilibrium"],
            "Biology": ["Human Physiology", "Genetics", "Ecology", "Biotechnology"]
        }
        : { "Recommended Topics": ["The Krebs Cycle", "Quantum Entanglement", "Photosynthesis", "The French Revolution"] };

    const hasValidKey = apiKeys.some((key, index) => key && key.trim() && (apiKeyStatuses[index] || 'valid') !== 'exhausted');
    if (!hasValidKey) {
        console.log("No valid API key provided for dynamic topics, returning fallback.");
        return Promise.resolve(fallbackTopics);
    }

    let prompt = '';
    if (isNeet) {
        prompt = `Based on the latest information from Google Search, identify 4 trending and important topics for the NEET entrance exam in each of the following subjects: Physics, Chemistry, and Biology. Please respond ONLY with a single, raw JSON object in the format: {"Physics": ["topic1", "topic2", "topic3", "topic4"], "Chemistry": ["topic1", "topic2", "topic3", "topic4"], "Biology": ["topic1", "topic2", "topic3", "topic4"]}`;
    } else {
        prompt = `Based on the latest information from Google Search, identify 5 trending and important topics or concepts for someone who is a '${learningLevel}'. Please respond ONLY with a single, raw JSON object in the format: {"Recommended Topics": ["topic1", "topic2", "topic3", "topic4", "topic5"]}`;
    }

    const instruction = "You are an assistant that finds relevant learning topics. You MUST use the provided Google Search tool. You MUST respond only with the raw JSON object requested, nothing else.";
    
    const model = modelSettings.dynamicTopics;
    const useGemmaFormatting = isGemmaModel(model);
    const contents = useGemmaFormatting ? `${instruction}\n\n---\n\n${prompt}` : prompt;
    const config: any = {
        tools: [{ googleSearch: {} }],
    };
    if (!useGemmaFormatting) {
        config.systemInstruction = instruction;
    }
    
    try {
        const response = await withApiKeyRotation<GenerateContentResponse>(settings.apiKeys, apiKeyStatuses, ai => ai.models.generateContent({
            model,
            contents,
            config,
        }));

        const responseText = response.text;
        if (!responseText) {
            console.error("Dynamic topics response text is empty, returning fallback.");
            return fallbackTopics;
        }

        const cleanedText = responseText.trim().replace(/^```json\n?/, '').replace(/```$/, '');
        return JSON.parse(cleanedText);
    } catch (e) {
        if (e instanceof ApiKeyError) {
            // Re-throw key errors so the UI can display a specific message
            throw e;
        }
        console.error("Failed to fetch or parse dynamic topics, returning fallback:", e);
        return fallbackTopics;
    }
}


export async function validateModel(modelName: string, apiKeys: string[]): Promise<{ isValid: boolean; error?: string }> {
    if (!modelName.trim()) {
        return { isValid: false, error: "Model ID cannot be empty." };
    }

    try {
        const prompt = "test";
        const systemInstruction = "test";
        const model = modelName;
        const useGemmaFormatting = isGemmaModel(model);
        const contents = useGemmaFormatting ? `${systemInstruction}\n\n---\n\n${prompt}` : prompt;
        const config: any = useGemmaFormatting ? {} : { systemInstruction };
        
        await withApiKeyRotation<GenerateContentResponse>(apiKeys, undefined, ai => ai.models.generateContent({
            model,
            contents,
            config,
        }));
        
        return { isValid: true };
    } catch (e) {
        if (e instanceof Error) {
            const errorMessage = e.message.toLowerCase();
            if (errorMessage.includes('model not found') || errorMessage.includes('permission denied') || errorMessage.includes('not valid')) {
                return { isValid: false, error: `Validation failed: ${e.message}` };
            }
        }
        return { isValid: false, error: `An unexpected error occurred during validation: ${e instanceof Error ? e.message : String(e)}` };
    }
}

export async function generateConceptualImage(contextText: string, userPrompt: string, settings: AppSettings): Promise<string> {
    const instruction = `An AI teacher explained the following concept: "${contextText}". The user wants an image based on this. Their request is: "${userPrompt}". Generate a clear, high-quality, visually appealing image that accurately represents this request. The image should be helpful for learning.`;

    const model = 'gemini-2.5-flash-image';

    const response = await withApiKeyRotation<GenerateContentResponse>(settings.apiKeys, settings.apiKeyStatuses, ai => ai.models.generateContent({
        model,
        contents: {
            parts: [{ text: instruction }],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    }));

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return part.inlineData.data; // This is the base64 string
        }
    }
    
    throw new Error("Image generation failed: No image data received from the API.");
}