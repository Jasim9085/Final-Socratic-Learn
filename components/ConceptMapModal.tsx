import React from 'react';
import type { ConceptMapData } from '../types';
import ConceptMapDisplay from './ConceptMapDisplay';
import { CloseIcon } from './Icons';
import './ConceptMap.css';

interface ConceptMapModalProps {
    data: ConceptMapData;
    onClose: () => void;
}

const ConceptMapModal: React.FC<ConceptMapModalProps> = ({ data, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start pt-8 p-4">
            <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-custom-lg-light dark:shadow-custom-lg-dark w-full max-w-4xl h-[85vh] flex flex-col border border-light-border dark:border-dark-border animate-scale-in">
                <div className="flex justify-between items-center p-4 border-b border-light-border dark:border-dark-border flex-shrink-0">
                    <h2 className="text-xl font-bold font-display">Concept Map</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="p-4 flex-grow overflow-hidden">
                   <ConceptMapDisplay data={data} />
                </div>
            </div>
        </div>
    );
};

export default ConceptMapModal;