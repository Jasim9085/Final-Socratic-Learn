

import React, { useState } from 'react';
import type { Turn } from '../types';
import { CloseIcon, VisualizeIcon } from './Icons';
import Loader from './Loader';

interface ImageGenerationModalProps {
    contextTurn: Turn;
    onClose: () => void;
    onGenerate: (prompt: string) => Promise<void>;
}

const PRESET_PROMPTS = [
    "Generate a conceptual map about the main topics.",
    "Create a visual analogy for the most complex concept discussed.",
    "Draw a simple diagram explaining the key process.",
    "Illustrate the main components and their interactions.",
    "Create a timeline of the key events mentioned.",
    "Draw a before-and-after comparison.",
    "Visualize the core idea as a single, memorable icon.",
];

const ImageGenerationModal: React.FC<ImageGenerationModalProps> = ({ contextTurn, onClose, onGenerate }) => {
    const [prompt, setPrompt] = useState(PRESET_PROMPTS[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateClick = async () => {
        if (!prompt.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            await onGenerate(prompt);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred during image generation.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-custom-lg-light dark:shadow-custom-lg-dark w-full max-w-2xl h-[90vh] flex flex-col border border-light-border dark:border-dark-border animate-scale-in">
                <header className="flex justify-between items-center p-4 border-b border-light-border dark:border-dark-border flex-shrink-0">
                    <h2 className="text-xl font-bold font-display flex items-center gap-2">
                        <VisualizeIcon className="w-6 h-6" />
                        Generate Image
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </header>

                <main className="flex-grow p-4 overflow-y-auto space-y-4">
                    <div>
                        <label className="text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-2 block">Generation Prompt</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe the image you want to generate..."
                            className="w-full p-2 border rounded bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border focus:ring-1 focus:ring-light-primary dark:focus:ring-dark-primary focus:outline-none"
                            rows={3}
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                            {PRESET_PROMPTS.map(p => (
                                <button key={p} onClick={() => setPrompt(p)} className="px-2 py-1 text-xs bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-full hover:bg-light-border dark:hover:bg-dark-border">
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-center">
                         <button
                            onClick={handleGenerateClick}
                            disabled={isLoading || !prompt.trim()}
                            className="px-6 py-2 bg-light-primary text-white font-semibold rounded-md hover:bg-opacity-90 transition-colors disabled:bg-opacity-50 disabled:cursor-wait"
                        >
                            {isLoading ? 'Generating...' : 'Generate New Image'}
                        </button>
                    </div>
                    
                    <div className="mt-4 p-2 border-t border-light-border dark:border-dark-border flex-grow flex items-center justify-center bg-light-bg dark:bg-dark-bg rounded-lg min-h-[300px]">
                        {isLoading && <Loader size="lg" text="The model is creating your image..." />}
                        {error && <p className="text-red-500 text-center">Error: {error}</p>}

                        {!isLoading && !error && contextTurn.generatedImages && contextTurn.generatedImages.length > 0 ? (
                            <div className="w-full h-full overflow-x-auto overflow-y-hidden flex items-center space-x-4 p-4">
                                {contextTurn.generatedImages.map(image => (
                                    <div key={image.id} className="flex-shrink-0 w-80 h-full relative group animate-fade-in-up">
                                        <img
                                            src={`data:image/png;base64,${image.base64}`}
                                            alt={image.prompt}
                                            className="w-full h-full object-contain rounded-md"
                                        />
                                        <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                                            {image.prompt}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            !isLoading && !error && <p className="text-light-text-secondary dark:text-dark-text-secondary">Generated images will appear here</p>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ImageGenerationModal;