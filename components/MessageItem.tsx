
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { 
  ChevronDown, 
  ExternalLink, 
  ArrowUp, 
  Clock, 
  Hash, 
  Code, 
  Lightbulb, 
  Sparkles, 
  AlertTriangle, 
  LayoutList,
  Quote
} from 'lucide-react';
import { ChatMessage, MessageSender, LanguageCode } from '../types';
import { TRANSLATIONS } from '../utils/translations';

// --- MARKED CONFIGURATION ---
const renderer = new marked.Renderer();

renderer.heading = (token: any) => {
  const text = token.text;
  const level = token.depth;
  const id = text.toLowerCase().replace(/[^\w]+/g, '-');
  return `<h${level} id="${id}" class="group relative">
    <a href="#${id}" class="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-blue-500/50 hover:text-blue-500">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
    </a>
    ${text}
  </h${level}>`;
};

renderer.code = (token: any) => {
  const code = token.text;
  const lang = token.lang || '';
  const language = hljs.getLanguage(lang) ? lang : 'plaintext';
  const highlighted = hljs.highlight(code, { language }).value;
  
  return `
    <div class="code-block-container group my-6 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#1E1E1E]">
      <div class="code-block-header flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-400/50"></div>
          </div>
          <span className="text-[10px] font-mono font-bold text-gray-500 dark:text-[#A8ABB4] uppercase tracking-widest">${language}</span>
        </div>
        <button class="copy-code-btn flex items-center gap-1.5 text-gray-400 hover:text-gray-900 dark:text-[#A8ABB4] dark:hover:text-white transition-all active:scale-95" title="Copy code" type="button">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="copy-icon"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="check-icon hidden text-green-500"><path d="M20 6 9 17l-5-5"/></svg>
          <span class="text-[10px] font-bold uppercase tracking-wider copy-status-text">Copy</span>
        </button>
      </div>
      <div class="relative">
        <pre class="m-0 p-4 overflow-x-auto chat-container"><code class="hljs language-${language} !bg-transparent !p-0">${highlighted}</code></pre>
      </div>
    </div>
  `;
};

marked.use({ renderer, gfm: true, breaks: true });

// --- INTERFACES ---
interface Heading {
  text: string;
  level: number;
  id: string;
}

type InsightType = 'all' | 'code' | 'tips' | 'important' | 'idioms';

interface InsightItem {
  type: InsightType;
  content: string;
  raw: string;
}

interface MessageItemProps {
  message: ChatMessage;
  currentLanguage: LanguageCode;
  highlightTerm?: string;
}

// --- COMPONENTS ---

const InsightFilterBar: React.FC<{ 
  active: InsightType; 
  onSelect: (type: InsightType) => void;
  counts: Record<InsightType, number>;
}> = ({ active, onSelect, counts }) => {
  const filters: { type: InsightType; icon: any; label: string }[] = [
    { type: 'all', icon: LayoutList, label: 'All' },
    { type: 'code', icon: Code, label: 'Code' },
    { type: 'tips', icon: Lightbulb, label: 'Tips & Ideas' },
    { type: 'important', icon: AlertTriangle, label: 'Important' },
    { type: 'idioms', icon: Quote, label: 'Idioms' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100/50 dark:bg-white/5 rounded-xl border border-gray-200/50 dark:border-white/10 self-start mb-2 backdrop-blur-sm">
      {filters.map((f) => {
        const hasResults = f.type === 'all' || counts[f.type] > 0;
        if (!hasResults && active !== f.type) return null;

        return (
          <button
            key={f.type}
            onClick={() => onSelect(f.type)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
              active === f.type
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-500 dark:text-[#A8ABB4] hover:bg-gray-200/50 dark:hover:bg-white/10'
            }`}
          >
            <f.icon size={12} strokeWidth={active === f.type ? 3 : 2} />
            <span className="hidden sm:inline">{f.label}</span>
            {f.type !== 'all' && (
              <span className={`flex items-center justify-center w-4 h-4 rounded-full text-[8px] ${
                active === f.type ? 'bg-white text-blue-600' : 'bg-gray-200 dark:bg-white/10'
              }`}>
                {counts[f.type]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

const TableOfContents: React.FC<{ headings: Heading[]; text: string }> = ({ headings, text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const readingTime = useMemo(() => {
    const wordCount = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [text]);

  if (headings.length < 3) return null;

  return (
    <div className="mb-6 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-[#A8ABB4] uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500 transition-transform group-hover:scale-110">
            <Hash size={16} />
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span>Table of Contents</span>
            <div className="flex items-center gap-2 mt-0.5 opacity-60 normal-case font-medium">
              <Clock size={10} />
              <span>{readingTime} min read</span>
            </div>
          </div>
        </div>
        <div className={`transition-all ${isExpanded ? 'rotate-180' : ''}`}>
          <ChevronDown size={16} />
        </div>
      </button>
      {isExpanded && (
        <nav className="px-5 pb-5 pt-2 animate-in slide-in-from-top-2 duration-300">
          <ul className="space-y-1 ml-1 border-l border-gray-100 dark:border-white/5">
            {headings.map((h, idx) => (
              <li key={idx} style={{ marginLeft: `${(h.level - 1) * 16}px` }}>
                <a 
                  href={`#${h.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center gap-2 py-1.5 pl-4 -ml-px border-l-2 border-transparent hover:border-blue-500 hover:text-blue-600 dark:hover:text-[#79B8FF] text-xs text-gray-500 dark:text-[#A8ABB4]"
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
};

const MessageItem: React.FC<MessageItemProps> = ({ message, currentLanguage, highlightTerm }) => {
  const [activeFilter, setActiveFilter] = useState<InsightType>('all');
  
  const isUser = message.sender === MessageSender.USER;
  const isModel = message.sender === MessageSender.MODEL;
  const isSystem = message.sender === MessageSender.SYSTEM;
  const t = TRANSLATIONS[currentLanguage];

  // Logic to parse insights from model response
  const insights = useMemo(() => {
    if (!isModel || !message.text) return { items: [], counts: { all: 0, code: 0, tips: 0, important: 0, idioms: 0 } };
    
    const tokens = marked.lexer(message.text);
    const items: InsightItem[] = [];
    const counts = { all: 0, code: 0, tips: 0, important: 0, idioms: 0 };

    tokens.forEach((token: any) => {
      // Extract Codes
      if (token.type === 'code') {
        items.push({ type: 'code', content: marked.parse(token.raw) as string, raw: token.raw });
        counts.code++;
      }
      
      // Extract Tips & Ideas (Detect keywords or specific emojis)
      const tipKeywords = ['tip:', 'pro-tip:', 'idea:', 'concept:', '💡', '🌟'];
      const importantKeywords = ['important:', 'warning:', 'note:', '⚠️', '🚨'];
      const idiomKeywords = ['idiom:', 'expression:', 'phrase:'];

      if (token.type === 'paragraph' || token.type === 'list' || token.type === 'blockquote') {
        const text = token.raw.toLowerCase();
        
        if (tipKeywords.some(k => text.includes(k))) {
          items.push({ type: 'tips', content: marked.parse(token.raw) as string, raw: token.raw });
          counts.tips++;
        } else if (importantKeywords.some(k => text.includes(k))) {
          items.push({ type: 'important', content: marked.parse(token.raw) as string, raw: token.raw });
          counts.important++;
        } else if (idiomKeywords.some(k => text.includes(k))) {
          items.push({ type: 'idioms', content: marked.parse(token.raw) as string, raw: token.raw });
          counts.idioms++;
        }
      }
    });

    return { items, counts };
  }, [message.text, isModel]);

  const headings = useMemo(() => {
    if (!isModel || !message.text) return [];
    const tokens = marked.lexer(message.text);
    return tokens
      .filter((t: any): t is any => t.type === 'heading')
      .map((t: any) => ({
        text: t.text,
        level: t.depth,
        id: t.text.toLowerCase().replace(/[^\w]+/g, '-')
      }));
  }, [message.text, isModel]);

  const handleCopyCode = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const btn = target.closest('.copy-code-btn');
    if (!btn) return;
    const container = btn.closest('.code-block-container');
    const codeEl = container?.querySelector('code');
    if (codeEl) {
      navigator.clipboard.writeText(codeEl.innerText).then(() => {
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 2000);
      });
    }
  };

  const renderContent = () => {
    if (isModel && !message.isLoading) {
      if (activeFilter !== 'all') {
        const filteredItems = insights.items.filter(item => item.type === activeFilter);
        return (
          <div className="space-y-4 px-4 py-2 animate-in fade-in slide-in-from-top-2 duration-300">
            {filteredItems.map((item, idx) => (
              <div key={idx} className="relative group">
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: item.content }}
                />
                <div className="absolute top-0 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded text-[8px] font-bold uppercase">
                     {item.type}
                   </div>
                </div>
              </div>
            ))}
          </div>
        );
      }

      return (
        <>
          <div className="px-4 pt-2">
            <TableOfContents headings={headings} text={message.text} />
          </div>
          <div 
            className="prose prose-sm dark:prose-invert w-full max-w-none px-4 pt-2 relative" 
            dangerouslySetInnerHTML={{ __html: marked.parse(message.text) as string }} 
            onClick={handleCopyCode}
          />
        </>
      );
    }
    
    return (
      <div className={`whitespace-pre-wrap text-sm px-3 py-1 ${isUser ? 'text-white' : 'text-gray-900 dark:text-[#E2E2E2]'}`}>
        {message.text}
      </div>
    );
  };

  const bubbleClasses = `rounded-2xl shadow-sm w-full transition-all duration-300 overflow-hidden ${
    isUser 
      ? "bg-gray-900 text-white dark:bg-white/[.12] rounded-br-none p-3" 
      : isModel 
        ? "bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 backdrop-blur-lg rounded-bl-none pb-4" 
        : "bg-gray-100 text-gray-500 dark:bg-[#2C2C2C] dark:text-[#A8ABB4] rounded-bl-none p-3"
  }`;

  return (
    <div className={`flex mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex flex-col gap-2 max-w-[85%] w-full`}>
        {!isUser && isModel && (
          <div className="px-1 flex justify-between items-center">
            <InsightFilterBar 
              active={activeFilter} 
              onSelect={setActiveFilter} 
              counts={insights.counts} 
            />
          </div>
        )}
        
        <div className="flex items-start gap-3">
          {!isUser && (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${
              isModel ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-500'
            }`}>
              {isModel ? 'AI' : 'S'}
            </div>
          )}
          
          <div className={bubbleClasses}>
            {message.isLoading ? (
              <div className="flex items-center space-x-1.5 py-4 px-3">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
              </div>
            ) : (
              renderContent()
            )}

            {isModel && message.urlContext && message.urlContext.length > 0 && activeFilter === 'all' && (
              <div className="mt-4 pt-4 px-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/[0.01]">
                <h4 className="text-[10px] font-bold text-gray-400 dark:text-[#777777] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <ExternalLink size={10} />
                  {t.contextUrlsRetrieved}
                </h4>
                <ul className="space-y-1">
                  {message.urlContext.map((meta, index) => (
                    <li key={index} className="text-[10px] text-blue-600 dark:text-[#79B8FF] hover:underline truncate">
                      <a href={meta.retrievedUrl} target="_blank" rel="noopener noreferrer">
                        {meta.retrievedUrl}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {isUser && (
            <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white/20 text-white flex items-center justify-center text-xs font-bold shrink-0">
              U
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
