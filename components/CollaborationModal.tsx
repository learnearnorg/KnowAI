
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { X, Users, Clipboard, Check, Share2, Info } from 'lucide-react';
import { URLGroup } from '../types';

interface CollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  translations: any;
  urlGroups: URLGroup[];
}

const CollaborationModal: React.FC<CollaborationModalProps> = ({ isOpen, onClose, translations: t, urlGroups }) => {
  const [copied, setCopied] = useState(false);

  const generateShareLink = () => {
    try {
      // Encode workspace data to base64 for URL sharing
      // Using encodeURIComponent before btoa handles non-ASCII characters safely
      const payload = btoa(encodeURIComponent(JSON.stringify(urlGroups)));
      const baseUrl = window.location.origin + window.location.pathname;
      return `${baseUrl}#workspace=${payload}`;
    } catch (e) {
      console.error("Link generation error", e);
      return window.location.href;
    }
  };

  const handleCopy = () => {
    const link = generateShareLink();
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="w-full max-w-md bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <Users size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {t.collaborationTitle}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex gap-4 p-4 bg-blue-50/50 dark:bg-blue-500/5 rounded-xl border border-blue-100 dark:border-blue-500/20">
            <div className="flex-shrink-0 text-blue-500">
              <Info size={20} />
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
              {t.collaborationDesc}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 dark:text-[#777777] uppercase tracking-wider">
              {t.shareWorkspace}
            </label>
            <div className="relative group">
              <input
                type="text"
                readOnly
                value={generateShareLink()}
                className="w-full pl-3 pr-10 py-3 bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-500 truncate outline-none"
              />
              <button
                onClick={handleCopy}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white shadow-sm transition-all"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Clipboard size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50/50 dark:bg-white/5">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-500 dark:text-[#A8ABB4] rounded-xl text-sm font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/5"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleCopy}
            className="px-6 py-2.5 bg-gray-900 text-white dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl text-sm font-semibold transition-all shadow-md flex items-center gap-2 active:scale-95"
          >
            {copied ? <Check size={18} /> : <Share2 size={18} />}
            {copied ? t.linkCopied : t.copyWorkspaceLink}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CollaborationModal;
