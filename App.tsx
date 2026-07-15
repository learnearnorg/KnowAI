
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChatMessage, MessageSender, URLGroup, LanguageCode, Theme, TranslationOverrides, Document, DocumentType } from './types';
import { generateContentWithUrlContext, getInitialSuggestions } from './services/geminiService';
import KnowledgeBaseManager from './components/KnowledgeBaseManager';
import ChatInterface from './components/ChatInterface';
import { getActiveTranslations, LANGUAGES } from './utils/translations';
import { Assistant } from './components/Assistant';
import { Menu, Video, Users, Search, Edit3, HelpCircle, X, Info, MessageSquare, AlertCircle } from 'lucide-react';
import LanguageSelector from './components/LanguageSelector';
import ThemeSwitcher from './components/ThemeSwitcher';
import TranslationEditorModal from './components/TranslationEditorModal';
import VideoGeneratorModal from './components/VideoGeneratorModal';
import CollaborationModal from './components/CollaborationModal';
import { UIEditor } from './components/UIEditor';

const GEMINI_DOCS_URLS = [
  "https://ai.google.dev/gemini-api/docs",
  "https://ai.google.dev/gemini-api/docs/quickstart",
  "https://ai.google.dev/gemini-api/docs/api-key",
  "https://ai.google.dev/gemini-api/docs/libraries",
  "https://ai.google.dev/gemini-api/docs/models",
  "https://ai.google.dev/gemini-api/docs/pricing",
  "https://ai.google.dev/gemini-api/docs/rate-limits",
  "https://ai.google.dev/gemini-api/docs/billing",
  "https://ai.google.dev/gemini-api/docs/changelog",
];

const MODEL_CAPABILITIES_URLS = [
  "https://ai.google.dev/gemini-api/docs/text-generation",
  "https://ai.google.dev/gemini-api/docs/image-generation",
  "https://ai.google.dev/gemini-api/docs/video",
  "https://ai.google.dev/gemini-api/docs/speech-generation",
  "https://ai.google.dev/gemini-api/docs/music-generation",
  "https://ai.google.dev/gemini-api/docs/long-context",
  "https://ai.google.dev/gemini-api/docs/structured-output",
  "https://ai.google.dev/gemini-api/docs/thinking",
  "https://ai.google.dev/gemini-api/docs/function-calling",
  "https://ai.google.dev/gemini-api/docs/document-processing",
  "https://ai.google.dev/gemini-api/docs/image-understanding",
  "https://ai.google.dev/gemini-api/docs/video-understanding",
  "https://ai.google.dev/gemini-api/docs/audio",
  "https://ai.google.dev/gemini-api/docs/code-execution",
  "https://ai.google.dev/gemini-api/docs/grounding",
];

const INITIAL_URL_GROUPS: URLGroup[] = [
  { 
    id: 'gemini-overview', 
    name: 'Gemini Docs Overview', 
    documents: GEMINI_DOCS_URLS.map(url => ({
      id: `url-${Math.random().toString(36).substr(2, 9)}`,
      name: url,
      type: DocumentType.URL,
      source: url
    }))
  },
  { 
    id: 'model-capabilities', 
    name: 'Model Capabilities', 
    documents: MODEL_CAPABILITIES_URLS.map(url => ({
      id: `url-${Math.random().toString(36).substr(2, 9)}`,
      name: url,
      type: DocumentType.URL,
      source: url
    }))
  },
];

const App: React.FC = () => {
  const [urlGroups, setUrlGroups] = useState<URLGroup[]>(() => {
    const saved = localStorage.getItem('urlGroups');
    if (!saved) return INITIAL_URL_GROUPS;
    
    try {
      const parsed = JSON.parse(saved);
      // Migration: Convert old urls: string[] to documents: Document[]
      return parsed.map((group: any) => {
        if (group.urls && !group.documents) {
          return {
            ...group,
            documents: group.urls.map((url: string) => ({
              id: `url-${Math.random().toString(36).substr(2, 9)}`,
              name: url,
              type: DocumentType.URL,
              source: url
            }))
          };
        }
        return group;
      });
    } catch (e) {
      return INITIAL_URL_GROUPS;
    }
  });
  const [activeUrlGroupId, setActiveUrlGroupId] = useState<string>(() => {
    const saved = localStorage.getItem('activeUrlGroupId');
    return saved && urlGroups.some(g => g.id === saved) ? saved : urlGroups[0]?.id;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sharedWorkspaceData, setSharedWorkspaceData] = useState<URLGroup[] | null>(null);
  
  // Header UI States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isTranslationEditorOpen, setIsTranslationEditorOpen] = useState(false);
  const [isVideoGeneratorOpen, setIsVideoGeneratorOpen] = useState(false);
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('chatMessages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [initialQuerySuggestions, setInitialQuerySuggestions] = useState<string[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(() => {
    return (localStorage.getItem('language') as LanguageCode) || 'en';
  });
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'dark';
    }
    return 'dark';
  });

  const suggestionsTimeoutRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Translation Overrides Logic
  const [translationOverrides, setTranslationOverrides] = useState<TranslationOverrides>(() => {
    const saved = localStorage.getItem('translationOverrides');
    return saved ? JSON.parse(saved) : {};
  });

  const t = useMemo(() => {
    return getActiveTranslations(currentLanguage, translationOverrides[currentLanguage]);
  }, [currentLanguage, translationOverrides]);

  const handleUpdateOverrides = (newOverrides: Record<string, string>) => {
    setTranslationOverrides(prev => {
      const updated = {
        ...prev,
        [currentLanguage]: newOverrides
      };
      localStorage.setItem('translationOverrides', JSON.stringify(updated));
      return updated;
    });
  };
  
  const MAX_URLS = 20;

  // Detect shared workspace in URL
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#workspace=')) {
      try {
        const payload = hash.split('#workspace=')[1];
        const decoded = JSON.parse(decodeURIComponent(atob(payload)));
        if (Array.isArray(decoded)) {
          setSharedWorkspaceData(decoded);
        }
      } catch (e) {
        console.error("Failed to decode shared workspace", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('urlGroups', JSON.stringify(urlGroups));
    localStorage.setItem('activeUrlGroupId', activeUrlGroupId);
    localStorage.setItem('language', currentLanguage);
    localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
  }, [urlGroups, activeUrlGroupId, currentLanguage, chatMessages]);

  const activeGroup = urlGroups.find(group => group.id === activeUrlGroupId);
  const currentDocsForChat = activeGroup ? activeGroup.documents : [];

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);

    const hljsTheme = document.getElementById('hljs-theme') as HTMLLinkElement;
    if (hljsTheme) {
      hljsTheme.href = theme === 'dark' 
        ? "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css"
        : "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css";
    }
  }, [theme]);

   useEffect(() => {
    if (chatMessages.length === 0) {
      const apiKey = process.env.API_KEY;
      const currentActiveGroup = urlGroups.find(group => group.id === activeUrlGroupId);
      const welcomeMessageText = !apiKey 
          ? t.apiKeyMissing
          : t.welcomeMessage(currentActiveGroup?.name || t.unknownGroup);
      
      setChatMessages([{
        id: `system-welcome-${activeUrlGroupId}-${currentLanguage}-${Date.now()}`,
        text: welcomeMessageText,
        sender: MessageSender.SYSTEM,
        timestamp: new Date(),
      }]);
    }
  }, [activeUrlGroupId, currentLanguage, t, urlGroups]); 

  const fetchAndSetInitialSuggestions = useCallback(async (currentDocs: Document[], langCode: LanguageCode) => {
    const urls = currentDocs.filter(d => d.type === DocumentType.URL).map(d => d.source);
    if (urls.length === 0) {
      setInitialQuerySuggestions([]);
      return;
    }
    setIsFetchingSuggestions(true);
    setInitialQuerySuggestions([]); 
    const langName = LANGUAGES.find(l => l.code === langCode)?.name || 'English';
    try {
      const response = await getInitialSuggestions(urls, langName); 
      let suggestionsArray: string[] = [];
      if (response.text) {
        try {
          let jsonStr = response.text.trim();
          const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s; 
          const match = jsonStr.match(fenceRegex);
          if (match && match[2]) {
            jsonStr = match[2].trim();
          }
          const parsed = JSON.parse(jsonStr);
          if (parsed && Array.isArray(parsed.suggestions)) {
            suggestionsArray = parsed.suggestions.filter((s: unknown) => typeof s === 'string');
          }
        } catch (parseError) {
          console.warn("Failed to parse suggestions JSON", parseError);
        }
      }
      setInitialQuerySuggestions(suggestionsArray.slice(0, 4)); 
    } catch (e: any) {
      console.warn("Suggestions fetch throttled or failed", e.message);
    } finally {
      setIsFetchingSuggestions(false);
    }
  }, []); 

  useEffect(() => {
    if (suggestionsTimeoutRef.current) {
      window.clearTimeout(suggestionsTimeoutRef.current);
    }
    if (currentDocsForChat.length > 0 && process.env.API_KEY) {
        suggestionsTimeoutRef.current = window.setTimeout(() => {
          fetchAndSetInitialSuggestions(currentDocsForChat, currentLanguage);
        }, 800);
    } else {
        setInitialQuerySuggestions([]); 
    }
    return () => {
      if (suggestionsTimeoutRef.current) window.clearTimeout(suggestionsTimeoutRef.current);
    };
  }, [currentDocsForChat, fetchAndSetInitialSuggestions, currentLanguage]); 

  const handleAddDocument = (doc: Document) => {
    setUrlGroups(prevGroups => 
      prevGroups.map(group => {
        if (group.id === activeUrlGroupId) {
          if (group.documents.length < MAX_URLS) {
            return { ...group, documents: [...group.documents, doc] };
          }
        }
        return group;
      })
    );
  };

  const handleRemoveDocument = (docId: string) => {
    setUrlGroups(prevGroups =>
      prevGroups.map(group => {
        if (group.id === activeUrlGroupId) {
          return { ...group, documents: group.documents.filter(doc => doc.id !== docId) };
        }
        return group;
      })
    );
  };

  const handleRenameDocument = (docId: string, newName: string) => {
    setUrlGroups(prevGroups =>
      prevGroups.map(group => {
        if (group.id === activeUrlGroupId) {
          return { ...group, documents: group.documents.map(doc => doc.id === docId ? { ...doc, name: newName } : doc) };
        }
        return group;
      })
    );
  };

  const handleClearDocuments = () => {
    setUrlGroups(prevGroups =>
      prevGroups.map(group => {
        if (group.id === activeUrlGroupId) {
          return { ...group, documents: [] };
        }
        return group;
      })
    );
  };

  const handleCreateGroup = (name: string) => {
    const newId = `group-${Date.now()}`;
    const newGroup: URLGroup = {
      id: newId,
      name: name || t.newGroupDefaultName,
      documents: []
    };
    setUrlGroups(prev => [...prev, newGroup]);
    setActiveUrlGroupId(newId);
  };

  const handleRenameGroup = (id: string, newName: string) => {
    setUrlGroups(prev => prev.map(g => g.id === id ? { ...g, name: newName } : g));
  };

  const handleDeleteGroup = (id: string) => {
    if (urlGroups.length <= 1) return;
    setUrlGroups(prev => {
      const filtered = prev.filter(g => g.id !== id);
      if (activeUrlGroupId === id) {
        setActiveUrlGroupId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleImportGroups = (newGroups: URLGroup[]) => {
    setUrlGroups(newGroups);
    if (newGroups.length > 0) {
      setActiveUrlGroupId(newGroups[0].id);
    }
  };

  const handleLoadSharedWorkspace = () => {
    if (sharedWorkspaceData) {
      setUrlGroups(sharedWorkspaceData);
      if (sharedWorkspaceData.length > 0) {
        setActiveUrlGroupId(sharedWorkspaceData[0].id);
      }
      setSharedWorkspaceData(null);
      window.location.hash = "";
    }
  };

  const handleSendMessage = async (query: string) => {
    if (!query.trim() || isLoading || isFetchingSuggestions) return;
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
       setChatMessages(prev => [...prev, {
        id: `error-apikey-${Date.now()}`,
        text: t.apiKeyMissing,
        sender: MessageSender.SYSTEM,
        timestamp: new Date(),
      }]);
      return;
    }
    setIsLoading(true);
    setInitialQuerySuggestions([]); 
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: query,
      sender: MessageSender.USER,
      timestamp: new Date()
    };
    const modelPlaceholderMessage: ChatMessage = {
      id: `model-response-${Date.now()}`,
      text: t.thinking, 
      sender: MessageSender.MODEL,
      timestamp: new Date(),
      isLoading: true,
    };
    setChatMessages(prevMessages => [...prevMessages, userMessage, modelPlaceholderMessage]);
    const langName = LANGUAGES.find(l => l.code === currentLanguage)?.name || 'English';
    try {
      const response = await generateContentWithUrlContext(query, currentDocsForChat, langName);
      setChatMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === modelPlaceholderMessage.id
            ? { ...modelPlaceholderMessage, text: response.text || t.emptyResponse, isLoading: false, urlContext: response.urlContextMetadata }
            : msg
        )
      );
    } catch (e: any) {
      const errCode = e.code;
      const localizedError = t[errCode] || e.message || 'Failed to get response from AI.';
      setChatMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === modelPlaceholderMessage.id
            ? { ...modelPlaceholderMessage, text: `${t.errorPrefix}${localizedError}`, sender: MessageSender.SYSTEM, isLoading: false } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostVideoToChat = (videoUrl: string, prompt: string) => {
    const videoMessage: ChatMessage = {
      id: `video-${Date.now()}`,
      text: `**Generated Video Studio Content**\n\nPrompt: _${prompt}_`,
      sender: MessageSender.MODEL,
      timestamp: new Date(),
      videoUrl: videoUrl
    };
    setChatMessages(prev => [...prev, videoMessage]);
  };

  const handleSuggestedQueryClick = (query: string) => {
    handleSendMessage(query);
  };
  
  const chatPlaceholder = currentDocsForChat.length > 0 
    ? t.suggestionPrompt
    : t.noUrlsHelp(activeGroup?.name || t.unknownGroup);

  const headerBtnClass = "p-1.5 text-white/90 hover:text-white rounded-lg hover:bg-white/20 transition-all active:scale-95";

  return (
    <div className="h-screen max-h-screen antialiased relative flex flex-col overflow-hidden bg-[#F8F9FA] text-[#1A1A1A] dark:bg-[#121212] dark:text-[#E2E2E2] transition-colors duration-200">
      
      {/* --- GLOBAL VIBRANT FLOATING HEADER --- */}
      <header className="sticky top-[20px] z-50 w-full px-2 md:px-4 mt-[20px] shrink-0">
        <div 
          className="rounded-2xl px-4 md:px-6 flex justify-between items-center transition-all backdrop-blur-2xl h-11 shadow-[0_20px_50px_-10px_rgba(180,40,243,0.4)] border border-white/30 relative"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
              linear-gradient(to right, rgba(180, 40, 243, 0.9), rgba(0, 162, 232, 0.9))`,
            backgroundSize: '20px 20px, 20px 20px, 100% 100%'
          }}
        >
          {/* Logo & Toggle */}
          <div className="z-10 flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 text-white/90 hover:text-white rounded-md hover:bg-white/15 transition-colors"
              aria-label={t.openSidebar}
            >
              <Menu size={20} />
            </button>
            <div 
              className="text-white font-bold tracking-widest uppercase text-xs"
              style={{ fontFamily: "'Merriweather', serif" }}
            >
              Knowledge base
            </div>
          </div>

          {/* Action Icons */}
          <div className="z-10 flex items-center gap-1">
            <button onClick={() => setIsVideoGeneratorOpen(true)} className={headerBtnClass} title={t.videoStudioTitle}>
              <Video size={18} />
            </button>
            <button onClick={() => setIsCollaborationOpen(true)} className={headerBtnClass} title={t.collaborationTitle}>
              <Users size={18} />
            </button>
            <button onClick={() => setIsSearchOpen(!isSearchOpen)} className={`p-1.5 rounded-lg transition-colors ${isSearchOpen ? 'bg-white/30 text-white' : headerBtnClass}`} title={t.searchMessages}>
              <Search size={18} />
            </button>
            <button onClick={() => setIsTranslationEditorOpen(true)} className={headerBtnClass} title={t.editText}>
              <Edit3 size={18} />
            </button>
            <button onClick={() => setIsInstructionsOpen(true)} className={headerBtnClass} title={t.instructionsTitle}>
              <HelpCircle size={18} />
            </button>
            
            <div className="hidden sm:block h-5 w-px bg-white/20 mx-2"></div>
            
            <div className="flex items-center gap-2 scale-90 origin-right">
              <LanguageSelector currentLanguage={currentLanguage} onLanguageChange={setCurrentLanguage} />
              <ThemeSwitcher theme={theme} onToggle={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')} />
            </div>
          </div>
        </div>

        {/* Global Search Bar Overlay */}
        {isSearchOpen && (
          <div className="mt-2 px-2 animate-in slide-in-from-top-4 duration-300">
            <div className="relative group max-w-4xl mx-auto">
              <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden flex items-center">
                <Search className="ml-4 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchMessages}
                  className="w-full pl-3 pr-10 py-3 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none text-sm"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white">
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* --- CONTENT AREA --- */}
      <div className="flex flex-1 w-full p-2 md:p-4 md:gap-4 overflow-hidden">
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} aria-hidden="true" />
        )}
        
        <div className={`
          fixed top-0 left-0 h-full w-11/12 max-w-sm z-30 transform transition-transform ease-in-out duration-300 p-3
          md:static md:p-0 md:w-[calc(25%+20px)] lg:w-[calc(20%+20px)] md:h-full md:translate-x-0 md:z-auto
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <KnowledgeBaseManager
            documents={currentDocsForChat}
            onAddDocument={handleAddDocument}
            onRemoveDocument={handleRemoveDocument}
            onRenameDocument={handleRenameDocument}
            onClearDocuments={handleClearDocuments}
            maxUrls={MAX_URLS}
            urlGroups={urlGroups}
            activeUrlGroupId={activeUrlGroupId}
            onSetGroupId={setActiveUrlGroupId}
            onCreateGroup={handleCreateGroup}
            onRenameGroup={handleRenameGroup}
            onDeleteGroup={handleDeleteGroup}
            onImportGroups={handleImportGroups}
            onCloseSidebar={() => setIsSidebarOpen(false)}
            currentLanguage={currentLanguage}
            translations={t}
          />
        </div>

        <div className="flex-1 h-full flex flex-col gap-4 overflow-hidden">
          {sharedWorkspaceData && (
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500"><span className="font-bold text-lg">!</span></div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{t.sharedWorkspaceDetected}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setSharedWorkspaceData(null); window.location.hash = ""; }} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">{t.cancel}</button>
                <button onClick={handleLoadSharedWorkspace} className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm">{t.loadSharedWorkspace}</button>
              </div>
            </div>
          )}
          <ChatInterface
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholderText={chatPlaceholder}
            initialQuerySuggestions={initialQuerySuggestions}
            onSuggestedQueryClick={handleSuggestedQueryClick}
            isFetchingSuggestions={isFetchingSuggestions}
            currentLanguage={currentLanguage}
            translations={t}
            searchQuery={searchQuery}
          />
        </div>
      </div>
      
      {/* Modals & Tools */}
      <TranslationEditorModal isOpen={isTranslationEditorOpen} onClose={() => setIsTranslationEditorOpen(false)} currentLanguage={currentLanguage} overrides={translationOverrides[currentLanguage] || {}} onSave={handleUpdateOverrides} translations={t} />
      <VideoGeneratorModal isOpen={isVideoGeneratorOpen} onClose={() => setIsVideoGeneratorOpen(false)} translations={t} onPostToChat={handlePostVideoToChat} />
      <CollaborationModal isOpen={isCollaborationOpen} onClose={() => setIsCollaborationOpen(false)} translations={t} urlGroups={urlGroups} />
      
      {isInstructionsOpen && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90%] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300" role="dialog" aria-modal="true">
            <div className="p-5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><HelpCircle size={20} className="text-blue-500" />{t.instructionsTitle}</h3>
              <button onClick={() => setIsInstructionsOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-8 chat-container">
              <section className="flex gap-4"><div className="flex-shrink-0 w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500"><Info size={22} /></div><div><h4 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">{t.howToAddTitle}</h4><p className="text-sm text-gray-600 dark:text-[#A8ABB4] leading-relaxed">{t.howToAddDesc}</p></div></section>
              <section className="flex gap-4"><div className="flex-shrink-0 w-10 h-10 bg-purple-50 dark:bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500"><MessageSquare size={22} /></div><div><h4 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">{t.howToAskTitle}</h4><p className="text-sm text-gray-600 dark:text-[#A8ABB4] leading-relaxed">{t.howToAskDesc}</p></div></section>
              <section className="flex gap-4"><div className="flex-shrink-0 w-10 h-10 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500"><AlertCircle size={22} /></div><div><h4 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">{t.howToTroubleshootTitle}</h4><p className="text-sm text-gray-600 dark:text-[#A8ABB4] leading-relaxed whitespace-pre-line">{t.howToTroubleshootDesc}</p></div></section>
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-white/5 flex justify-end bg-gray-50/50 dark:bg-white/5"><button onClick={() => setIsInstructionsOpen(false)} className="px-6 py-2.5 bg-gray-900 text-white dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95">{t.close}</button></div>
          </div>
        </div>
      )}

      {/* GLOBAL AI ASSISTANT */}
      <Assistant apiKey={process.env.API_KEY || ''} translations={t} />

      <UIEditor translations={t} />
    </div>
  );
};

export default App;
