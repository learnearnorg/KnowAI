
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, X, Pencil, Check, FolderPlus, Eraser, Clipboard, Download, Upload, Terminal, FileText, Globe, MoreVertical } from 'lucide-react';
import { URLGroup, LanguageCode, Document, DocumentType } from '../types';

interface KnowledgeBaseManagerProps {
  documents: Document[];
  onAddDocument: (doc: Document) => void;
  onRemoveDocument: (id: string) => void;
  onRenameDocument: (id: string, newName: string) => void;
  onClearDocuments: () => void;
  maxUrls?: number;
  urlGroups: URLGroup[];
  activeUrlGroupId: string;
  onSetGroupId: (id: string) => void;
  onCreateGroup: (name: string) => void;
  onRenameGroup: (id: string, newName: string) => void;
  onDeleteGroup: (id: string) => void;
  onImportGroups: (newGroups: URLGroup[]) => void;
  onCloseSidebar?: () => void;
  currentLanguage: LanguageCode;
  translations: any;
}

const KnowledgeBaseManager: React.FC<KnowledgeBaseManagerProps> = ({ 
  documents, 
  onAddDocument, 
  onRemoveDocument, 
  onRenameDocument,
  onClearDocuments,
  maxUrls = 20,
  urlGroups,
  activeUrlGroupId,
  onSetGroupId,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
  onImportGroups,
  onCloseSidebar,
  currentLanguage,
  translations: t
}) => {
  const STORAGE_KEY_PREFIX = `kb_transient_${activeUrlGroupId}`;

  const [currentUrlInput, setCurrentUrlInput] = useState(() => {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}_url_input`) || '';
  });
  const [error, setError] = useState<string | null>(null);
  const [isEditingGroupName, setIsEditingGroupName] = useState(() => {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}_editing`) === 'true';
  });
  const [editNameInput, setEditNameInput] = useState(() => {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}_edit_name`) || '';
  });
  
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDocNameInput, setEditDocNameInput] = useState('');

  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docUploadRef = useRef<HTMLInputElement>(null);

  const activeGroup = urlGroups.find(g => g.id === activeUrlGroupId);
  const activeGroupName = activeGroup?.name || t.unknownGroup;

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}_url_input`, currentUrlInput);
  }, [currentUrlInput, STORAGE_KEY_PREFIX]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}_editing`, isEditingGroupName.toString());
    localStorage.setItem(`${STORAGE_KEY_PREFIX}_edit_name`, editNameInput);
  }, [isEditingGroupName, editNameInput, STORAGE_KEY_PREFIX]);

  useEffect(() => {
    if (documents.length > 0 || urlGroups.length > 0) {
      setShowSavedIndicator(true);
      const timer = setTimeout(() => setShowSavedIndicator(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [documents, urlGroups]);

  useEffect(() => {
    if (isEditingGroupName && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [isEditingGroupName]);

  const isValidUrl = (urlString: string): boolean => {
    try {
      new URL(urlString);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleAddUrl = () => {
    if (!currentUrlInput.trim()) {
      setError(t.urlEmptyError);
      return;
    }
    if (!isValidUrl(currentUrlInput)) {
      setError(t.urlInvalidError);
      return;
    }
    if (documents.length >= maxUrls) {
      setError(t.maxUrlsError(maxUrls));
      return;
    }
    if (documents.some(d => d.type === DocumentType.URL && d.source === currentUrlInput)) {
      setError(t.urlExistsError);
      return;
    }
    
    onAddDocument({
      id: `url-${Math.random().toString(36).substr(2, 9)}`,
      name: currentUrlInput,
      type: DocumentType.URL,
      source: currentUrlInput
    });
    
    setCurrentUrlInput('');
    setError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (documents.length >= maxUrls) {
      setError(t.maxUrlsError(maxUrls));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      onAddDocument({
        id: `file-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: DocumentType.FILE,
        source: base64,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setCurrentUrlInput(text.trim());
        setError(null);
      }
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
    }
  };

  const handleStartRename = () => {
    setEditNameInput(activeGroupName);
    setIsEditingGroupName(true);
  };

  const handleSaveRename = () => {
    if (editNameInput.trim()) {
      onRenameGroup(activeUrlGroupId, editNameInput.trim());
    }
    setIsEditingGroupName(false);
  };

  const handleStartDocRename = (doc: Document) => {
    setEditingDocId(doc.id);
    setEditDocNameInput(doc.name);
  };

  const handleSaveDocRename = () => {
    if (editingDocId && editDocNameInput.trim()) {
      onRenameDocument(editingDocId, editDocNameInput.trim());
    }
    setEditingDocId(null);
  };

  const handleAddGroup = () => {
    onCreateGroup('');
  };

  const handleDeleteActiveGroup = () => {
    onDeleteGroup(activeUrlGroupId);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}_url_input`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}_editing`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}_edit_name`);
  };

  const handleClearAll = () => {
    if (documents.length > 0) {
      onClearDocuments();
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(urlGroups, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'knowledge-base.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          const isValid = json.every(g => typeof g.id === 'string' && typeof g.name === 'string' && (Array.isArray(g.urls) || Array.isArray(g.documents)));
          if (isValid) {
            // Migration for import
            const migrated = json.map(group => {
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
            onImportGroups(migrated);
            setError(null);
          } else {
            throw new Error('Invalid format');
          }
        } else {
          throw new Error('Not an array');
        }
      } catch (err) {
        setError(t.importError);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <aside className="relative overflow-hidden h-full rounded-3xl shadow-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500 to-fuchsia-600 dark:from-violet-600 dark:to-fuchsia-700 transition-colors duration-200">
      
      {/* Pattern Overlay (Blueprint Cross Grid) */}
      <div className="absolute inset-0 pattern-cross opacity-40 pointer-events-none"></div>
      
      {/* Watermark Icon */}
      <div className="absolute -bottom-12 -right-12 w-64 h-64 text-white opacity-10 transform -rotate-12 pointer-events-none">
          <Terminal size={256} strokeWidth={0.5} />
      </div>

      {/* Content Container */}
      <div className="relative z-10 p-4 h-full flex flex-col">
        
        {/* Header Actions */}
        <div className="flex items-center justify-end mb-4 gap-1">
          <button
            onClick={handleAddGroup}
            className="p-1.5 text-white/80 hover:text-white rounded-md hover:bg-white/10 transition-colors"
            title={t.addGroup}
          >
            <FolderPlus size={18} />
          </button>
          <button
            onClick={handleExport}
            className="p-1.5 text-white/80 hover:text-white rounded-md hover:bg-white/10 transition-colors"
            title={t.exportGroups}
          >
            <Download size={18} />
          </button>
          <button
            onClick={handleImportClick}
            className="p-1.5 text-white/80 hover:text-white rounded-md hover:bg-white/10 transition-colors"
            title={t.importGroups}
          >
            <Upload size={18} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            className="hidden" 
          />
          {onCloseSidebar && (
            <button
              onClick={onCloseSidebar}
              className="p-1 text-white/80 hover:text-white rounded-md hover:bg-white/10 transition-colors md:hidden"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Group Selection */}
        <div className="mb-4">
          <label htmlFor="url-group-select-kb" className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5 ml-1">
            {t.activeGroupLabel}
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-grow">
              <select
                id="url-group-select-kb"
                value={activeUrlGroupId}
                onChange={(e) => onSetGroupId(e.target.value)}
                className="w-full py-2 pl-3 pr-8 appearance-none border border-white/20 bg-white/10 backdrop-blur-md text-white rounded-xl focus:ring-2 focus:ring-white/20 focus:border-white/30 text-sm transition-all"
              >
                {urlGroups.map(group => (
                  <option key={group.id} value={group.id} className="text-gray-900">
                    {group.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none"
                aria-hidden="true"
              />
            </div>
            <button
              onClick={handleDeleteActiveGroup}
              disabled={urlGroups.length <= 1}
              className="p-2 text-white/60 hover:text-white disabled:opacity-30 transition-colors"
              title={t.deleteGroup}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Document Management Area */}
        <div className="mb-4 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3 px-1">
            {isEditingGroupName ? (
              <div className="flex items-center gap-2 w-full">
                <input
                  ref={renameInputRef}
                  type="text"
                  value={editNameInput}
                  onChange={(e) => setEditNameInput(e.target.value)}
                  onBlur={handleSaveRename}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveRename()}
                  className="flex-grow py-1 px-2 border border-white/30 bg-white/20 text-white rounded-lg text-sm focus:outline-none placeholder-white/50"
                />
                <button onClick={handleSaveRename} className="text-white">
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-white uppercase tracking-wider truncate max-w-[150px]">
                  {activeGroupName}
                </span>
                <button 
                  onClick={handleStartRename} 
                  className="text-white/60 hover:text-white transition-colors"
                  title={t.renameGroup}
                >
                  <Pencil size={12} />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={currentUrlInput}
                onChange={(e) => setCurrentUrlInput(e.target.value)}
                placeholder={t.addUrlPlaceholder}
                className="flex-grow h-9 py-1 px-3 border border-white/20 bg-white/10 backdrop-blur-md text-white placeholder-white/40 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-white/30 text-xs transition-all outline-none"
                onKeyPress={(e) => e.key === 'Enter' && handleAddUrl()}
              />
              <button
                onClick={handlePaste}
                className="h-9 w-9 p-2 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center flex-shrink-0"
                title={t.pasteFromClipboard}
              >
                <Clipboard size={16} />
              </button>
              <button
                onClick={handleAddUrl}
                disabled={documents.length >= maxUrls}
                className="h-9 w-9 p-2 bg-white text-violet-600 rounded-xl transition-all disabled:bg-white/20 disabled:text-white/40 flex items-center justify-center shadow-lg active:scale-90 flex-shrink-0 font-bold"
                title={t.addUrl}
              >
                <Plus size={18} />
              </button>
            </div>
            
            <button
              onClick={() => docUploadRef.current?.click()}
              disabled={documents.length >= maxUrls}
              className="w-full h-9 flex items-center justify-center gap-2 border border-dashed border-white/30 bg-white/5 hover:bg-white/10 text-white text-xs rounded-xl transition-all"
            >
              <FileText size={14} />
              {t.uploadDocument}
            </button>
            <input 
              type="file" 
              ref={docUploadRef} 
              onChange={handleFileUpload} 
              accept=".pdf,.txt,.doc,.docx" 
              className="hidden" 
            />
          </div>
          {error && <p className="text-[10px] text-white/90 bg-red-500/40 px-2 py-1 rounded mt-2 border border-red-500/20">{error}</p>}
        </div>
        
        {/* Document List */}
        <div className="flex-grow overflow-y-auto space-y-2 chat-container pb-2">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
              {documents.length} {documents.length !== 1 ? t.documents : t.document}
            </span>
            {documents.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 text-[10px] font-bold text-white/60 hover:text-white transition-colors uppercase tracking-widest"
                title={t.clearAll}
              >
                <Eraser size={12} />
                {t.clearAll}
              </button>
            )}
          </div>

          {documents.length === 0 && (
            <div className="text-white/50 text-center py-12 flex flex-col items-center gap-3">
              <Terminal size={32} className="opacity-20" />
              <p className="text-xs italic px-4">{t.noUrlsHelp(activeGroupName)}</p>
            </div>
          )}
          {documents.map((doc) => (
            <div key={doc.id} className="flex flex-col p-2.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all group/item">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden flex-grow">
                  {doc.type === DocumentType.URL ? (
                    <Globe size={14} className="text-blue-300 shrink-0" />
                  ) : (
                    <FileText size={14} className="text-orange-300 shrink-0" />
                  )}
                  
                  {editingDocId === doc.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={editDocNameInput}
                      onChange={(e) => setEditDocNameInput(e.target.value)}
                      onBlur={handleSaveDocRename}
                      onKeyPress={(e) => e.key === 'Enter' && handleSaveDocRename()}
                      className="flex-grow py-0.5 px-1 bg-white/20 text-white rounded text-[11px] focus:outline-none"
                    />
                  ) : (
                    <span 
                      className="text-[11px] text-white/90 truncate font-medium cursor-pointer hover:text-white" 
                      title={doc.name}
                      onClick={() => handleStartDocRename(doc)}
                    >
                      {doc.name}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleStartDocRename(doc)}
                    className="p-1 text-white/40 hover:text-white rounded-md transition-colors"
                    title={t.rename}
                  >
                    <Pencil size={12} />
                  </button>
                  <button 
                    onClick={() => onRemoveDocument(doc.id)}
                    className="p-1 text-white/40 hover:text-red-400 rounded-md transition-colors"
                    title={t.removeUrl}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {doc.type === DocumentType.URL && (
                <span className="text-[9px] text-white/40 truncate mt-0.5 ml-5">
                  {doc.source}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Footer Saved Status */}
        <div className={`mt-auto pt-3 border-t border-white/10 flex items-center justify-center gap-1.5 transition-opacity duration-500 ${showSavedIndicator ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
          <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
            {t.allChangesSaved}
          </span>
        </div>
      </div>
    </aside>
  );
};

export default KnowledgeBaseManager;
