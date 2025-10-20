import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import okaidia from 'react-syntax-highlighter/dist/esm/styles/prism/okaidia';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { CopyIcon, CheckIcon } from '../components/Icons';

const headingBaseClass = "font-display font-bold mt-6 mb-3";

export const markdownComponents = {
  h1: ({ node, ...props }: any) => <h1 className={`${headingBaseClass} text-3xl p-3 bg-light-border dark:bg-dark-border rounded-lg`} {...props} />,
  h2: ({ node, ...props }: any) => <h2 className={`${headingBaseClass} text-2xl p-2 bg-light-border/70 dark:bg-dark-border/70 rounded-md`} {...props} />,
  h3: ({ node, ...props }: any) => <h3 className={`${headingBaseClass} text-xl`} {...props} />,
  h4: ({ node, ...props }: any) => <h4 className={`${headingBaseClass} text-lg`} {...props} />,
  h5: ({ node, ...props }: any) => <h5 className={`${headingBaseClass} text-base`} {...props} />,
  h6: ({ node, ...props }: any) => <h6 className={`${headingBaseClass} text-base text-light-text-secondary dark:text-dark-text-secondary`} {...props} />,
  hr: ({ node, ...props }: any) => <hr className="my-6 border-0 h-px bg-gradient-to-r from-transparent via-light-text-subtle dark:via-dark-text-subtle to-transparent" {...props} />,
  
  table: ({ node, ...props }: any) => (
    <div className="w-full overflow-x-auto my-4 border border-light-border dark:border-dark-border rounded-lg shadow-sm bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur-sm">
        <table className="w-full text-left border-collapse" {...props} />
    </div>
  ),
  thead: ({ node, ...props }: any) => (
    <thead className="bg-gradient-to-r from-violet-500 to-indigo-600 dark:from-violet-400 dark:to-indigo-500" {...props} />
  ),
  tr: ({ node, ...props }: any) => {
    // Check if the row is a header row by inspecting its children's tag names from the AST node.
    const isHeaderRow = node?.children?.some((child: any) => child.tagName === 'th');
    
    // Header rows should be transparent to let the thead's gradient show through.
    const rowClass = isHeaderRow 
        ? 'border-b border-light-border/30 dark:border-dark-border/30 last:border-b-0' 
        : 'border-b border-light-border dark:border-dark-border last:border-b-0 bg-light-surface dark:bg-dark-surface even:bg-light-bg dark:even:bg-dark-bg';

    return <tr className={rowClass} {...props} />;
  },
  th: ({ node, ...props }: any) => (
    <th className="p-3 font-semibold text-white bg-transparent" {...props} />
  ),
  td: ({ node, ...props }: any) => (
    <td className="p-3 align-top text-light-text-secondary dark:text-dark-text-secondary" {...props} />
  ),

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');
    const [copied, copy] = useCopyToClipboard();

    return !inline && match ? (
      <div className="relative my-2 group">
        <div className="flex justify-between items-center bg-gray-800 text-white text-xs px-3 py-1 rounded-t-md">
          <span className="font-sans">{match[1]}</span>
          <button onClick={() => copy(codeString)} className="font-sans text-xs hover:text-gray-300 flex items-center gap-1">
            {copied ? <CheckIcon className="h-3 w-3 text-green-400" /> : <CopyIcon className="h-3 w-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <SyntaxHighlighter
          style={okaidia}
          language={match[1]}
          PreTag="div"
          className="!rounded-b-md !mt-0"
          {...props}
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code className={`${className} bg-light-border dark:bg-dark-border px-1.5 py-0.5 rounded-md font-mono text-sm text-light-accent dark:text-dark-accent/80`} {...props}>
        {children}
      </code>
    );
  },
};