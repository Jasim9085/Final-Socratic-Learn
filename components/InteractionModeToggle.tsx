import React from 'react';
import { AgentIcon, ChatIcon } from './Icons';

type Mode = 'agent' | 'direct';

interface InteractionModeToggleProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  disabled?: boolean;
}

const ToggleButton: React.FC<{
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}> = ({ isActive, onClick, children, label }) => (
  <button
    onClick={onClick}
    aria-pressed={isActive}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors duration-200 ${
      isActive
        ? 'bg-light-primary text-white shadow-sm'
        : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-border dark:hover:bg-dark-border'
    }`}
  >
    {children}
    {label}
  </button>
);

const InteractionModeToggle: React.FC<InteractionModeToggleProps> = ({ mode, onModeChange, disabled }) => {
  return (
    <div
      className={`flex items-center gap-1 p-1 rounded-lg bg-light-bg dark:bg-dark-surface border border-light-border dark:border-dark-border transition-opacity ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <ToggleButton
        isActive={mode === 'agent'}
        onClick={() => !disabled && onModeChange('agent')}
        label="Tutor"
      >
        <AgentIcon className="w-5 h-5" />
      </ToggleButton>
      <ToggleButton
        isActive={mode === 'direct'}
        onClick={() => !disabled && onModeChange('direct')}
        label="Chat"
      >
        <ChatIcon className="w-5 h-5" />
      </ToggleButton>
    </div>
  );
};

export default InteractionModeToggle;
