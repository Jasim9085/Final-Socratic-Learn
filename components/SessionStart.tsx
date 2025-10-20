



import React, { useState, useEffect } from 'react';
import { BrainIcon, SparkleIcon, WarningIcon } from './Icons';
import type { AppSettings } from '../types';
import * as gemini from '../services/geminiService';
import Loader from './Loader';

interface SessionStartProps {
  onStart: (topic: string) => void;
  settings: AppSettings;
  areSettingsLoaded: boolean;
}

const SessionStart: React.FC<SessionStartProps> = ({ onStart, settings, areSettingsLoaded }) => {
  const [topic, setTopic] = useState('');
  const [exampleTopics, setExampleTopics] = useState<Record<string, string[]>>({});
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [topicError, setTopicError] = useState<string | null>(null);
  
  const hasApiKey = settings.apiKeys.some(key => key && key.trim());

  useEffect(() => {
    const fetchTopics = async () => {
      setIsLoadingTopics(true);
      setTopicError(null);
      
      const isNeet = settings.learningLevel.toLowerCase().includes('neet');
      const fallbackTopics = isNeet 
          ? {
              "Physics": ["Mechanics [8, 14, 22, 23]", "Electrostatics [8, 12, 13, 20, 23]", "Optics [8, 11, 20, 23]", "Modern Physics [8, 20, 22]"],
              "Chemistry": ["Chemical Bonding [2, 3, 9, 10, 15, 16, 23]", "Thermodynamics [2, 3, 9, 10, 11, 15, 16, 17, 23]", "Coordination Compounds [2, 3, 10, 15, 16, 17, 18, 23]", "Organic Chemistry (Hydrocarbons, Alcohols, Aldehydes, Ketones & Carboxylic Acids) [2, 3, 15, 17, 18]"],
              "Biology": ["Human Physiology [1, 4, 6]", "Genetics and Evolution [1, 4, 5, 6, 21]", "Ecology and Environment [1, 4, 6]", "Reproduction [1, 4, 5, 21]"]
          }
          : { "Recommended Topics": ["The Krebs Cycle", "Quantum Entanglement", "Photosynthesis", "The French Revolution"] };

      try {
        const topics = await gemini.getDynamicTopics(settings);
        setExampleTopics(topics);
      } catch (e) {
        if (e instanceof gemini.ApiKeyError) {
          setTopicError(e.message);
        } else {
          setTopicError("Could not load dynamic topic suggestions.");
          console.error("Error fetching dynamic topics in SessionStart:", e);
        }
        setExampleTopics(fallbackTopics);
      } finally {
        setIsLoadingTopics(false);
      }
    };

    if (areSettingsLoaded) {
        fetchTopics();
    }
  }, [areSettingsLoaded, settings]);

  const handleStart = () => {
    if (topic.trim()) {
      onStart(topic.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleStart();
    }
  };
  
  const handleExampleClick = (example: string) => {
    const cleanedTopic = example.replace(/\s*\[[^\]]*\]$/, '').trim();
    setTopic(cleanedTopic);
    onStart(cleanedTopic);
  }

  return (
    <div className="flex-grow flex flex-col justify-center items-center text-center p-4">
      <div className="w-full max-w-xl">
        <div className="animate-fade-in-up">
            <BrainIcon className="h-16 w-16 text-light-primary dark:text-dark-primary mx-auto mb-4" />
            <h1 className="text-4xl lg:text-5xl font-bold font-display mb-2 text-gradient from-light-primary to-light-accent dark:from-dark-primary dark:to-dark-accent">
                Welcome to Socratic Tutor AI
            </h1>
            <p className="text-lg text-light-text-secondary dark:text-dark-text-secondary mb-8 max-w-xl mx-auto">
              Choose a mode in the header, enter a topic, and begin your learning journey.
            </p>
        </div>

        <div className="glass-card p-6 md:p-8 rounded-2xl shadow-custom-lg-light dark:shadow-custom-lg-dark animate-fade-in-up" style={{animationDelay: '100ms'}}>
          <div className="relative flex items-center shadow-sm rounded-lg">
             <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <SparkleIcon className="h-5 w-5 text-light-text-subtle dark:text-dark-text-subtle" />
             </div>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What do you want to learn today?"
              className="w-full pl-12 pr-28 p-4 border-none rounded-lg bg-light-bg/80 dark:bg-dark-bg/80 focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary transition placeholder:text-light-text-subtle dark:placeholder:text-dark-text-subtle text-lg"
            />
             <button
              onClick={handleStart}
              disabled={!topic.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 text-white font-semibold rounded-lg bg-light-primary hover:bg-opacity-90 disabled:bg-opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Start
            </button>
          </div>
          
          {topicError && (
             <div className="mt-4 flex items-center justify-center gap-2 p-2 bg-red-500/10 text-red-600 dark:text-red-400 text-xs rounded-md border border-red-500/20 animate-fade-in-up">
                <WarningIcon className="w-4 h-4 flex-shrink-0" />
                <span>{topicError}</span>
            </div>
          )}
          {!topicError && !hasApiKey && areSettingsLoaded && (
            <div className="mt-4 flex items-center justify-center gap-2 p-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs rounded-md border border-yellow-500/20 animate-fade-in-up">
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                <span>API Key Not Configured. Please add one in Settings.</span>
            </div>
          )}

          <div className="mt-8 text-left">
            {isLoadingTopics ? (
                <div className="h-24 flex items-center justify-center">
                    <Loader text="Fetching topic suggestions..." />
                </div>
            ) : (
                <div className="animate-fade-in-up" style={{animationDelay: `200ms`}}>
                    <p className="text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-3">Suggestions:</p>
                     <div className="space-y-3">
                        {Object.keys(exampleTopics).map((category, categoryIndex) => (
                            <div key={categoryIndex} className="horizontal-scroll-container horizontal-scroll-fade">
                                <div className="horizontal-scroll-content flex items-center gap-3">
                                    {exampleTopics[category].map((ex: string, index: number) => {
                                        const cleanedTopic = ex.replace(/\s*\[[^\]]*\]$/, '').trim();
                                        return (
                                            <button
                                                key={`${ex}-${index}`}
                                                onClick={() => handleExampleClick(cleanedTopic)}
                                                className="flex-shrink-0 px-4 py-2 text-sm bg-light-bg/70 dark:bg-dark-bg/70 border border-light-border dark:border-dark-border rounded-lg hover:bg-light-primary/10 dark:hover:bg-dark-primary/20 hover:border-light-primary/50 dark:hover:border-dark-primary/50 hover:text-light-primary dark:hover:text-dark-primary transform hover:scale-105 transition-all duration-200"
                                            >
                                                {cleanedTopic}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionStart;