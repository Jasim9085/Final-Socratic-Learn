import React from 'react';
import { WarningIcon } from './Icons';

interface ErrorModalProps {
  message: string;
  onClose: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start pt-20 p-4">
      <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-custom-lg-light dark:shadow-custom-lg-dark p-6 w-full max-w-md border border-red-500/50 animate-scale-in">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 flex items-center justify-center bg-red-500/10 rounded-full mr-4">
            <WarningIcon className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-red-700 dark:text-red-400 font-display">An Error Occurred</h2>
        </div>
        <p className="text-light-text-secondary dark:text-dark-text-secondary mb-6">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;