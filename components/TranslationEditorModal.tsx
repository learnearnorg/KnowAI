
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, RotateCcw, Save, Languages, Filter, CheckCircle2 } from 'lucide-react';
import { LanguageCode } from '../types';
import { TRANSLATIONS_RAW, LANGUAGES } from '../utils/translations';

interface TranslationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: LanguageCode;
  overrides: Record<string, string>;
  onSave: (overrides: Record<string, string>) => void;
  translations: any;
}

const TranslationEditorModal: React.FC<TranslationEditorModalProps> = ({
  isOpen,
  onClose,
  currentLanguage,
  overrides,
  onSave,
  translations: t
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [localOverrides, setLocalOverrides] = useState<Record<string, string>>({});
  const [showModifiedOnly, setShowModifiedOnly] = useState(false);
  
  const langName = LANGUAGES.find(l => l.code === currentLanguage)?.name || currentLanguage;

  useEffect(() => {
    if (isOpen) {
      setLocalOverrides({ ...overrides });
    }
  }, [isOpen, overrides]);

  const allKeys = useMemo(() => {
    return Object.keys(TRANSLATIONS_RAW.en);
  }, []);

  const filteredKeys = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    
    return allKeys.filter(key => {
      const defaultValue = TRANSLATIONS_RAW[currentLanguage]?.[key] || TRANSLATIONS_RAW.en[key] || '';
      const currentValue = localOverrides[key] || defaultValue;
      const isModified = !!localOverrides[key];

      const matchesSearch = !term || (
        key.toLowerCase().includes(term) ||
        defaultValue.toLowerCase().includes(term) ||
        currentValue.toLowerCase().includes(term)
      );

      const matchesModifiedFilter = !showModifiedOnly || isModified;

      return matchesSearch && matchesModifiedFilter;
    });
  }, [allKeys, searchTerm, currentLanguage, localOverrides, showModifiedOnly]);

  const handleUpdate = (key: string, value: string) => {
    const defaultValue = TRANSLATIONS_RAW[currentLanguage]?.[key] || TRANSLATIONS_RAW.en[key] || '';
    if (value === defaultValue) {
      const newOverrides = { ...localOverrides };
      delete newOverrides[key];
      setLocalOverrides(newOverrides);
    } else {
      setLocalOverrides(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleReset = () => {
    if (confirm(t.confirmResetAll || "Are you sure you want to revert all translations to their default values for this language?")) {
      setLocalOverrides({});
    }
  };

  const handleSave = () => {
    onSave(localOverrides);
    onClose();
  };

  if (!isOpen) return null;

  const modifiedCount = Object.keys(localOverrides).length;

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col h-[85vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
              <Languages size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                {t.translationEditorTitle}
              </h3>
              <p className="text-xs text-gray-500 dark:text-[#A8ABB4] font-medium">{langName} Edition</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all"
            aria-label={t.close}
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-4 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t.searchTranslations}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-white/10 bg-white dark:bg-[#2C2C2C] text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowModifiedOnly(!showModifiedOnly)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                showModifiedOnly 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                  : 'bg-white dark:bg-white/10 border-gray-300 dark:border-white/10 text-gray-600 dark:text-[#E2E2E2] hover:bg-gray-100 dark:hover:bg-white/15'
              }`}
            >
              <Filter size={14} />
              <span className="hidden sm:inline">Modified</span>
              {modifiedCount > 0 && (
                <span className={`flex items-center justify-center w-4 h-4 rounded-full text-[9px] ${showModifiedOnly ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>
                  {modifiedCount}
                </span>
              )}
            </button>
          </div>
          
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] font-bold text-gray-400 dark:text-[#777777] uppercase tracking-widest">
              {filteredKeys.length} {t.resultsLabel || 'Translations Found'}
            </span>
            {modifiedCount > 0 && (
              <span className="text-[11px] font-bold text-blue-500 dark:text-[#79B8FF] uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                {modifiedCount} {t.customizedLabel || 'Customized'}
              </span>
            )}
          </div>
        </div>
        
        {/* List */}
        <div className="flex-grow overflow-y-auto p-5 space-y-4 chat-container bg-gray-50/30 dark:bg-black/10">
          {filteredKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-[#777777]">
              <Search size={48} className="mb-4 opacity-10" />
              <p className="text-sm font-medium">{t.noResults}</p>
            </div>
          ) : (
            filteredKeys.map(key => {
              const defaultValue = TRANSLATIONS_RAW[currentLanguage]?.[key] || TRANSLATIONS_RAW.en[key] || '';
              const currentValue = localOverrides[key] || defaultValue;
              const isModified = !!localOverrides[key];
              
              return (
                <div 
                  key={key} 
                  className={`group p-4 rounded-2xl border transition-all duration-200 ${
                    isModified 
                      ? 'bg-white dark:bg-blue-500/5 border-blue-500/30 shadow-md ring-1 ring-blue-500/10' 
                      : 'bg-white/50 dark:bg-white/5 border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-[#777777] uppercase tracking-wider mb-0.5">
                        {key}
                      </span>
                      {isModified && (
                        <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">
                          • Modified
                        </span>
                      )}
                    </div>
                    {isModified && (
                      <button 
                        onClick={() => handleUpdate(key, defaultValue)}
                        className="p-1 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all active:scale-95"
                        title={t.resetToDefault}
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="relative">
                      <textarea
                        value={currentValue}
                        onChange={(e) => handleUpdate(key, e.target.value)}
                        className="w-full p-3.5 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-[#E2E2E2] rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm resize-none shadow-inner"
                        rows={2}
                      />
                    </div>
                    {isModified && (
                      <div className="px-2 pt-1">
                        <p className="text-[10px] text-gray-400 dark:text-[#777777] italic line-clamp-1">
                          Default: <span className="opacity-80">{defaultValue}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row justify-between gap-4 bg-gray-50/50 dark:bg-white/5">
          <button
            onClick={handleReset}
            disabled={modifiedCount === 0}
            className="px-6 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-[#E2E2E2] rounded-xl text-sm font-semibold transition-all hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            {t.resetToDefault}
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-gray-500 dark:text-[#A8ABB4] rounded-xl text-sm font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-gray-900 text-white dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl text-sm font-semibold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {t.saveTranslations}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationEditorModal;
