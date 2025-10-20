import React, { useState } from 'react';
import './Flashcard.css'; // We'll create this file for styles

interface FlashcardProps {
  front: string;
  back: string;
}

const Flashcard: React.FC<FlashcardProps> = ({ front, back }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="flashcard-container" onClick={() => setIsFlipped(!isFlipped)}>
      <div className={`flashcard ${isFlipped ? 'is-flipped' : ''}`}>
        <div className="flashcard-face flashcard-front">
          <p className="text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-1">Term</p>
          <p>{front}</p>
        </div>
        <div className="flashcard-face flashcard-back">
          <p className="text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-1">Definition</p>
          <p>{back}</p>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;
