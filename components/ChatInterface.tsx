
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChatMessage, MessageSender, LanguageCode } from '../types'; 
import MessageItem from './MessageItem';
import { Send, Mic, MicOff } from 'lucide-react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (query: string) => void;
  isLoading: boolean;
  placeholderText?: string;
  initialQuerySuggestions?: string[];
  onSuggestedQueryClick?: (query: string) => void;
  isFetchingSuggestions?: boolean;
  currentLanguage: LanguageCode;
  translations: any;
  searchQuery?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  onSendMessage, 
  isLoading, 
  placeholderText,
  initialQuerySuggestions,
  onSuggestedQueryClick,
  isFetchingSuggestions,
  currentLanguage,
  translations: t,
  searchQuery = ''
}) => {
  const [userQuery, setUserQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    if (!searchQuery) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = currentLanguage;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setUserQuery(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };
    }
  }, [currentLanguage]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Failed to start speech recognition", e);
      }
    }
  };

  const handleSend = () => {
    if (userQuery.trim() && !isLoading) {
      onSendMessage(userQuery.trim());
      setUserQuery('');
      if (isRecording) {
        recognitionRef.current?.stop();
      }
    }
  };

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const term = searchQuery.toLowerCase();
    return messages.filter(msg => msg.text.toLowerCase().includes(term));
  }, [messages, searchQuery]);

  const showSuggestions = !searchQuery && initialQuerySuggestions && initialQuerySuggestions.length > 0 && messages.filter(m => m.sender !== MessageSender.SYSTEM).length <= 1;

  return (
    <div className="flex flex-col h-full bg-white/50 dark:bg-black/20 rounded-3xl shadow-2xl border border-gray-200 dark:border-white/5 transition-all duration-500 relative overflow-hidden glass-panel">
      
      {/* Messages with Atmosphere & Star Parallax */}
      <div className="flex-grow overflow-y-auto chat-container living-atmosphere precision-grid star-parallax transition-colors duration-500">
        <div className="max-w-4xl mx-auto w-full pt-8 px-4 relative z-10">
          {filteredMessages.length === 0 && searchQuery.trim() ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-[#777777]">
              <p>{t.noMessagesFound}</p>
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <MessageItem 
                key={msg.id} 
                message={msg} 
                currentLanguage={currentLanguage} 
                highlightTerm={searchQuery}
              />
            ))
          )}
          
          {isFetchingSuggestions && !searchQuery && (
              <div className="flex justify-center items-center p-3">
                  <div className="flex items-center space-x-1.5 text-blue-500/60 dark:text-blue-400/60">
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
                      <span className="text-sm font-medium">{t.fetchingSuggestions}</span>
                  </div>
              </div>
          )}

          {showSuggestions && onSuggestedQueryClick && (
            <div className="my-6 px-1 animate-in slide-in-from-bottom-2 duration-500">
              <p className="text-[10px] text-gray-500 dark:text-[#A8ABB4] mb-3 font-bold uppercase tracking-widest">{t.tryThese}</p>
              <div className="flex flex-wrap gap-2">
                {initialQuerySuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => onSuggestedQueryClick(suggestion)}
                    className="bg-white/80 dark:bg-white/10 text-blue-600 dark:text-blue-300 px-4 py-2 rounded-2xl text-xs hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white transition-all shadow-sm border border-blue-200/50 dark:border-white/5 active:scale-95"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - Glassmorphism style */}
      <div className="p-6 border-t border-gray-200 dark:border-white/5 bg-white/40 dark:bg-black/20 backdrop-blur-3xl rounded-b-3xl transition-all duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto flex items-end gap-3">
          <div className="relative flex-grow">
            <textarea
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder={isRecording ? t.stopVoiceInput : placeholderText}
              className={`w-full h-12 max-h-48 min-h-[48px] py-3.5 px-5 border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-gray-900 dark:text-[#E2E2E2] placeholder-gray-400 dark:placeholder-[#777777] rounded-2xl focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/5 focus:border-blue-500 dark:focus:border-blue-400 transition-all shadow-inner resize-none text-sm overflow-y-auto chat-container outline-none ${isRecording ? 'border-red-500/50 ring-2 ring-red-500/10' : ''}`}
              rows={1}
              disabled={isLoading || isFetchingSuggestions}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            {isRecording && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest animate-pulse">Recording</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleRecording}
              disabled={isLoading || isFetchingSuggestions}
              className={`h-12 w-12 p-3 rounded-2xl transition-all flex items-center justify-center flex-shrink-0 shadow-lg active:scale-90 ${
                isRecording 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-[#A8ABB4] hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
              title={isRecording ? t.stopVoiceInput : t.voiceInput}
              aria-label={isRecording ? t.stopVoiceInput : t.voiceInput}
            >
              {isRecording ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            <button
              onClick={handleSend}
              disabled={isLoading || isFetchingSuggestions || !userQuery.trim()}
              className="h-12 w-12 p-3 bg-gray-900 hover:bg-black text-white dark:bg-blue-600 dark:hover:bg-blue-500 rounded-2xl transition-all disabled:bg-gray-200 dark:disabled:bg-white/5 disabled:text-gray-400 dark:disabled:text-[#777777] flex items-center justify-center flex-shrink-0 shadow-lg active:scale-90"
              aria-label={t.send}
            >
              {(isLoading && messages[messages.length-1]?.isLoading && messages[messages.length-1]?.sender === MessageSender.MODEL) ? 
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> 
                : <Send size={22} />
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
