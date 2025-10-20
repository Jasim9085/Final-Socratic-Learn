import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface QuickMcqProps {
  question: string;
  options: string[];
  correct_answer: string;
}

const InlineMarkdownRenderer: React.FC<{ content: string }> = ({ content }) => (
    <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { output: 'mathml', throwOnError: false }]]}
        components={{ p: React.Fragment }} // Avoid wrapping in a <p> tag which adds margins
    >
        {content}
    </ReactMarkdown>
);

const QuickMcq: React.FC<QuickMcqProps> = ({ question, options, correct_answer }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = () => {
    if (selectedOption) {
      setIsSubmitted(true);
    }
  };
  
  return (
    <div className="p-4 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface my-2">
      <p className="font-semibold mb-3 text-sm"><InlineMarkdownRenderer content={question} /></p>
      <div className="space-y-2">
        {options.map((option, index) => {
          const isSelected = selectedOption === option;
          const isCorrect = correct_answer === option;
          
          let stateStyles = '';
          if (isSubmitted) {
              if (isCorrect) {
                  stateStyles = 'ring-2 ring-green-500 bg-green-500/10';
              } else if (isSelected && !isCorrect) {
                  stateStyles = 'ring-2 ring-red-500 bg-red-500/10';
              }
          }

          return (
            <label key={index} className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${isSelected ? 'bg-light-primary/10' : ''} ${!isSubmitted ? 'cursor-pointer hover:bg-light-bg dark:hover:bg-dark-bg' : 'cursor-default'} ${stateStyles}`}>
              <input
                type="radio"
                name={`quick-mcq-${question}`}
                value={option}
                checked={isSelected}
                onChange={() => setSelectedOption(option)}
                disabled={isSubmitted}
                className="form-radio h-4 w-4 text-light-primary dark:text-dark-primary focus:ring-light-primary dark:focus:ring-dark-primary bg-transparent"
              />
              <span className={`${isSubmitted && isCorrect ? 'font-bold text-green-700 dark:text-green-400' : ''}`}>
                <InlineMarkdownRenderer content={option} />
              </span>
            </label>
          );
        })}
      </div>
      {!isSubmitted && (
        <button
          onClick={handleSubmit}
          disabled={!selectedOption}
          className="mt-4 w-full px-4 py-2 text-sm bg-light-primary text-white font-semibold rounded-md hover:bg-opacity-90 transition-colors disabled:bg-opacity-50"
        >
          Check Answer
        </button>
      )}
    </div>
  );
};

export default QuickMcq;