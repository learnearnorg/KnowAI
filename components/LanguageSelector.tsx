
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { LanguageCode } from '../types';
import { LANGUAGES } from '../utils/translations';

interface LanguageSelectorProps {
  currentLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
}

// SVG Flag Components for high-fidelity rendering
const FlagIcon: React.FC<{ code: LanguageCode; size?: number }> = ({ code, size = 18 }) => {
  const width = size * 1.5;
  const height = size;

  switch (code) {
    case 'en': // USA
      return (
        <svg width={width} height={height} viewBox="0 0 7410 3900" className="rounded-sm shadow-sm">
          <rect width="7410" height="3900" fill="#b22234"/>
          <path d="M0,450H7410M0,1050H7410M0,1650H7410M0,2250H7410M0,2850H7410M0,3450H7410" stroke="#fff" strokeWidth="300"/>
          <rect width="2964" height="2100" fill="#3c3b6e"/>
          <g fill="#fff">
            <g id="s18">
              <g id="s9">
                <g id="s5">
                  <g id="s4">
                    <path id="s" d="M247,90 317.53423,307.08204 132.87322,172.91796H361.12678L176.46577,307.08204z" transform="scale(0.6) translate(-247,-150)"/>
                    <use href="#s" x="494"/>
                    <use href="#s" x="988"/>
                    <use href="#s" x="1482"/>
                  </g>
                  <use href="#s" x="1976"/>
                </g>
                <use href="#s4" x="247" y="150"/>
              </g>
              <use href="#s9" y="300"/>
            </g>
            <use href="#s18" y="600"/>
            <use href="#s9" y="1200"/>
            <use href="#s5" y="1500"/>
          </g>
        </svg>
      );
    case 'es': // Spain
      return (
        <svg width={width} height={height} viewBox="0 0 750 500" className="rounded-sm shadow-sm">
          <rect width="750" height="500" fill="#c60b1e"/>
          <rect width="750" height="250" y="125" fill="#ffc400"/>
          <circle cx="150" cy="250" r="40" fill="#c60b1e" opacity="0.1" />
        </svg>
      );
    case 'fr': // France
      return (
        <svg width={width} height={height} viewBox="0 0 3 2" className="rounded-sm shadow-sm">
          <rect width="1" height="2" fill="#002395"/>
          <rect width="1" height="2" x="1" fill="#fff"/>
          <rect width="1" height="2" x="2" fill="#ed2939"/>
        </svg>
      );
    case 'ja': // Japan
      return (
        <svg width={width} height={height} viewBox="0 0 900 600" className="rounded-sm shadow-sm">
          <rect width="900" height="600" fill="#fff"/>
          <circle cx="450" cy="300" r="180" fill="#bc002d"/>
        </svg>
      );
    case 'de': // Germany
      return (
        <svg width={width} height={height} viewBox="0 0 5 3" className="rounded-sm shadow-sm">
          <rect width="5" height="1" fill="#000"/>
          <rect width="5" height="1" y="1" fill="#d00"/>
          <rect width="5" height="1" y="2" fill="#ffce00"/>
        </svg>
      );
    case 'ko': // South Korea
      return (
        <svg width={width} height={height} viewBox="0 0 36 24" className="rounded-sm shadow-sm">
          <rect width="36" height="24" fill="#fff"/>
          <circle cx="18" cy="12" r="6" fill="#cd2e3a"/>
          <path d="M18,12a6,6 0 0,1 0,-12a3,3 0 0,1 0,6a3,3 0 0,0 0,6" fill="#0047a0"/>
        </svg>
      );
    case 'zh': // China
      return (
        <svg width={width} height={height} viewBox="0 0 30 20" className="rounded-sm shadow-sm">
          <rect width="30" height="20" fill="#ee1c25"/>
          <path d="M6,6l-.9,2.8 2.4-1.7h-3l2.4,1.7z" fill="#ffff00" transform="scale(1.5) translate(-1.5,-1.5)"/>
        </svg>
      );
    case 'ru': // Russia
      return (
        <svg width={width} height={height} viewBox="0 0 3 2" className="rounded-sm shadow-sm">
          <rect width="3" height="2" fill="#fff"/>
          <rect width="3" height="1.333" y="0.666" fill="#0039a6"/>
          <rect width="3" height="0.666" y="1.333" fill="#d52b1e"/>
        </svg>
      );
    case 'mn': // Mongolia
      return (
        <svg width={width} height={height} viewBox="0 0 3 2" className="rounded-sm shadow-sm">
          <rect width="1" height="2" fill="#e01a22"/>
          <rect width="1" height="2" x="1" fill="#0066b3"/>
          <rect width="1" height="2" x="2" fill="#e01a22"/>
          <path d="M0.5,0.5v1" stroke="#f9d616" strokeWidth="0.1" fill="none" />
        </svg>
      );
    default:
      return null;
  }
};

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ currentLanguage, onLanguageChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find(l => l.code === currentLanguage) || LANGUAGES[0];
  const otherLanguages = LANGUAGES.filter(l => l.code !== currentLanguage);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 w-48 px-3 py-1.5 bg-gray-100 dark:bg-[#2C2C2C] border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-200 dark:hover:bg-[#383838] transition-all focus:outline-none shadow-sm"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <FlagIcon code={currentLanguage} size={14} />
          <span className="text-[10px] font-bold text-gray-700 dark:text-[#E2E2E2] uppercase tracking-widest truncate">
            {currentLang.name}
          </span>
        </div>
        <ChevronDown size={14} className={`text-gray-400 dark:text-[#A8ABB4] flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          role="listbox"
        >
          <div className="py-1 max-h-80 overflow-y-auto chat-container">
            {otherLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  onLanguageChange(lang.code);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-left text-gray-700 dark:text-[#E2E2E2] hover:bg-gray-100 dark:hover:bg-white/5 transition-colors uppercase tracking-widest font-medium"
                role="option"
                aria-selected={false}
              >
                <FlagIcon code={lang.code} size={12} />
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
