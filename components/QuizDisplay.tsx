import React, { useState } from 'react';
import type { QuizQuestion } from '../types';
import { NewSessionIcon } from './Icons';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';


interface QuizDisplayProps {
  summary: string;
  quiz: QuizQuestion[];
  onReset: () => void;
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

const QuizDisplay: React.FC<QuizDisplayProps> = ({ summary, quiz, onReset }) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  const handleOptionChange = (questionIndex: number, option: string) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: option }));
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

  const getScore = () => {
    return quiz.reduce((score, question, index) => {
      return score + (answers[index] === question.correctAnswer ? 1 : 0);
    }, 0);
  };
  
  const handleNewSession = () => {
    if(window.confirm("Start a new session? Your current conversation and quiz results will be cleared.")) {
      onReset();
    }
  }

  const score = getScore();
  const scorePercentage = (score / quiz.length) * 100;

  return (
    <div className="mt-4 p-4 md:p-6 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border animate-fade-in-up">
      <h2 className="text-2xl font-bold font-display mb-2 text-light-primary dark:text-dark-primary">Session Report</h2>
      
      <div className="bg-light-surface dark:bg-dark-surface p-4 rounded-md mb-6">
        <h3 className="font-bold mb-2">Summary</h3>
        <p className="text-light-text-secondary dark:text-dark-text-secondary prose prose-sm max-w-none">{summary}</p>
      </div>
      
      <h3 className="text-xl font-bold font-display mb-4">Final Quiz</h3>
      <div className="space-y-6">
        {quiz.map((q, qIndex) => (
          <div key={qIndex} className={`p-4 rounded-lg border-l-4 ${showResults ? (answers[qIndex] === q.correctAnswer ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10') : 'border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface'}`}>
            <div className="font-semibold mb-3 flex flex-row">
                <span className="mr-2">{qIndex + 1}.</span>
                <InlineMarkdownRenderer content={q.question} />
            </div>
            <div className="space-y-2">
              {q.options.map((option, oIndex) => {
                const isChecked = answers[qIndex] === option;
                const isCorrect = q.correctAnswer === option;
                let ringColor = 'ring-light-primary dark:ring-dark-primary';
                if(showResults) {
                    if(isCorrect) ringColor = 'ring-green-500';
                    else if(isChecked && !isCorrect) ringColor = 'ring-red-500';
                }

                return (
                    <label key={oIndex} className={`flex items-center space-x-3 cursor-pointer p-2 rounded-md transition-colors ${isChecked ? 'bg-light-primary/10 dark:bg-dark-primary/10' : ''} ${showResults ? 'cursor-default' : 'hover:bg-light-border dark:hover:bg-dark-border'}`}>
                    <input
                        type="radio"
                        name={`question-${qIndex}`}
                        value={option}
                        checked={isChecked}
                        onChange={() => handleOptionChange(qIndex, option)}
                        disabled={showResults}
                        className={`form-radio h-4 w-4 text-light-primary dark:text-dark-primary focus:ring-2 ${ringColor} bg-transparent border-light-text-secondary dark:border-dark-text-secondary`}
                    />
                    <span className={`${showResults && isCorrect ? 'font-bold text-green-700 dark:text-green-400' : ''}`}><InlineMarkdownRenderer content={option} /></span>
                    </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      
      {!showResults ? (
        <button
          onClick={handleSubmit}
          className="mt-6 w-full px-6 py-3 bg-light-primary text-white font-semibold rounded-md hover:bg-opacity-90 transition-colors disabled:bg-opacity-50"
          disabled={Object.keys(answers).length !== quiz.length}
        >
          Submit & See Results
        </button>
      ) : (
        <div className="mt-8 p-4 bg-light-surface dark:bg-dark-surface rounded-lg text-center border border-light-border dark:border-dark-border">
          <h3 className="text-2xl font-bold font-display">Your Score: {score} / {quiz.length}</h3>
          <div className="w-full bg-light-border dark:bg-dark-border rounded-full h-4 my-3 overflow-hidden">
            <div 
                className="bg-light-primary h-4 rounded-full animate-progress-bar" 
                style={{ width: `${scorePercentage}%`, transition: 'width 1.5s ease-out' }}
            ></div>
          </div>
          <button 
            onClick={handleNewSession}
            className="mt-4 px-5 py-2 bg-light-primary text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center gap-2 mx-auto"
          >
            <NewSessionIcon className="w-5 h-5" />
            Start New Session
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizDisplay;