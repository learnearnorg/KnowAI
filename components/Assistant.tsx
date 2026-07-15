
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { X, Mic, Send, Sparkles, MessageSquare, MicOff, ArrowUp } from 'lucide-react';
import { getAssistantResponse } from '../services/geminiService';

// --- UTILITIES (Manual Base64 & Audio Processing) ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface AssistantProps {
  apiKey: string;
  translations: any;
}

/**
 * A world-class custom tooltip component with hover delay and smooth transitions.
 */
const Tooltip: React.FC<{ text: string; children: React.ReactNode; position?: 'top' | 'left' }> = ({ text, children, position = 'top' }) => {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  
  const handleMouseEnter = () => {
    timeoutRef.current = window.setTimeout(() => {
      setShow(true);
    }, 300); // 300ms delay to prevent accidental flickering
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setShow(false);
  };

  const positionClasses = position === 'top' 
    ? 'bottom-full mb-3 left-1/2 -translate-x-1/2' 
    : 'right-full mr-3 top-1/2 -translate-y-1/2';
  
  const arrowClasses = position === 'top'
    ? 'top-full left-1/2 -translate-x-1/2 border-t-gray-900/90 dark:border-t-black/90'
    : 'left-full top-1/2 -translate-y-1/2 border-l-gray-900/90 dark:border-l-black/90';

  return (
    <div className="relative flex items-center h-full" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {show && (
        <div className={`absolute ${positionClasses} px-3 py-1.5 bg-gray-900/90 dark:bg-black/90 backdrop-blur-md text-white text-[10px] font-bold rounded-xl shadow-2xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 pointer-events-none z-[110] border border-white/10 ring-1 ring-black/5`}>
          {text}
          <div className={`absolute border-4 border-transparent ${arrowClasses}`} />
        </div>
      )}
    </div>
  );
};

export const Assistant: React.FC<AssistantProps> = ({ apiKey, translations: t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; content: string; isLive?: boolean }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const liveSessionRef = useRef<any>(null);
  const audioCtxRef = useRef<{ input: AudioContext | null; output: AudioContext | null }>({ input: null, output: null });
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Transcription Buffers
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // Voice Session Logic
  const startVoiceSession = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioCtxRef.current = { input: inputCtx, output: outputCtx };

      currentInputTranscription.current = '';
      currentOutputTranscription.current = '';

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(s => s.sendRealtimeInput({ 
                media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } 
              }));
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // 1. Playback Audio
            const audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            // 2. Handle Transcription
            if (msg.serverContent?.inputTranscription) {
              currentInputTranscription.current += msg.serverContent.inputTranscription.text;
            }
            if (msg.serverContent?.outputTranscription) {
              currentOutputTranscription.current += msg.serverContent.outputTranscription.text;
            }

            // 3. Turn Complete - Finalize messages in UI
            if (msg.serverContent?.turnComplete) {
              const userText = currentInputTranscription.current;
              const modelText = currentOutputTranscription.current;
              
              setMessages(prev => {
                const next = [...prev];
                if (userText) next.push({ role: 'user', content: userText, isLive: true });
                if (modelText) next.push({ role: 'model', content: modelText, isLive: true });
                return next;
              });

              currentInputTranscription.current = '';
              currentOutputTranscription.current = '';
            }

            // 4. Handle Interruptions
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }
        }
      });

      liveSessionRef.current = await sessionPromise;
      setIsVoiceActive(true);
    } catch (err: any) {
      console.error("Failed to start voice session:", err);
      let errorMsg = t.micGeneralError;
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = t.micPermissionDenied;
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = t.micNotFound;
      }

      setMessages(prev => [...prev, { role: 'model', content: errorMsg }]);
      setIsVoiceActive(false);
    }
  };

  const stopVoiceSession = () => {
    liveSessionRef.current?.close();
    audioCtxRef.current.input?.close();
    audioCtxRef.current.output?.close();
    setIsVoiceActive(false);
  };

  const handleTextSubmit = async () => {
    if (!inputValue.trim()) return;
    
    const userMsg = inputValue;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInputValue('');
    setIsThinking(true);

    try {
      const response = await getAssistantResponse(userMsg);
      if (response.functionCalls && response.functionCalls.length > 0) {
        console.log("Assistant Tool Calls:", response.functionCalls);
      }
      const text = response.text || t.emptyResponse;
      setMessages(prev => [...prev, { role: 'model', content: text }]);
    } catch (err: any) {
      console.error("Assistant Error:", err);
      const errCode = err.code;
      const localizedError = t[errCode] || err.message || t.GENERIC_AI_ERROR;
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: `${t.errorPrefix}${localizedError}` 
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans">
      {isOpen && (
        <div className="mb-4 w-96 h-[500px] bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-white/10 animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-4 bg-[#b428f3] text-white flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="animate-pulse" />
              <span className="font-bold">AI Assistant</span>
            </div>
            <Tooltip text={t.closeAssistant}>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors active:scale-95"
                aria-label={t.closeAssistant}
              >
                <X size={20} />
              </button>
            </Tooltip>
          </div>
          
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-[#282828] chat-container"
          >
            {messages.length === 0 && !isVoiceActive && (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-6">
                <MessageSquare size={48} className="mb-4 opacity-20" />
                <p className="text-sm">Hello! How can I help you today?</p>
              </div>
            )}
            
            {messages.map((m, i) => (
              <div 
                key={i} 
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}
              >
                <div 
                  className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm relative ${
                    m.role === 'user' 
                      ? 'bg-[#b428f3] text-white rounded-br-none' 
                      : 'bg-white dark:bg-white/10 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-white/5 rounded-bl-none'
                  }`}
                >
                  {m.isLive && (
                    <div className="absolute -top-4 right-0 text-[10px] font-bold text-[#b428f3] dark:text-[#d878ff] flex items-center gap-1">
                      <Mic size={10} />
                      Live
                    </div>
                  )}
                  {m.content}
                </div>
              </div>
            ))}
            
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-white/10 p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {isVoiceActive && (
              <div className="flex flex-col items-center py-8 gap-4 text-[#b428f3]">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#b428f3]/25 rounded-full animate-ping opacity-25" />
                  <div className="relative w-16 h-16 bg-[#b428f3] rounded-full flex items-center justify-center text-white shadow-xl">
                    <Mic size={32} className="animate-pulse" />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">Streaming Audio</span>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 italic max-w-[200px] text-center">Speak now, Gemini is listening...</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-[#1E1E1E] flex gap-2 items-center shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            <Tooltip text={isVoiceActive ? t.stopVoiceMode : t.startVoiceMode}>
              <button
                onClick={() => isVoiceActive ? stopVoiceSession() : startVoiceSession()}
                className={`p-2.5 rounded-full transition-all shadow-md active:scale-90 hover:scale-110 ${
                  isVoiceActive 
                    ? 'bg-red-500 text-white animate-pulse shadow-red-500/20' 
                    : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20'
                }`}
                aria-label={isVoiceActive ? t.stopVoiceMode : t.startVoiceMode}
              >
                {isVoiceActive ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            </Tooltip>
            <div className="flex-1 relative">
              <input
                className="w-full bg-gray-100 dark:bg-[#2C2C2C] border-none rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#b428f3]/20 dark:text-white transition-all disabled:opacity-50"
                placeholder={isVoiceActive ? "Voice mode active..." : t.suggestionPrompt}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleTextSubmit()}
                disabled={isVoiceActive}
              />
            </div>
            <Tooltip text={t.send}>
              <button
                onClick={handleTextSubmit}
                disabled={!inputValue.trim() || isVoiceActive}
                className="p-2.5 bg-[#b428f3] text-white rounded-full shadow-md hover:opacity-90 disabled:bg-gray-200 dark:disabled:bg-white/5 disabled:text-gray-400 transition-all active:scale-95 hover:scale-110"
                aria-label={t.send}
              >
                <Send size={18} />
              </button>
            </Tooltip>
          </div>
        </div>
      )}
      <Tooltip text={isOpen ? t.closeAssistant : t.openAssistant} position="left">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-16 h-16 bg-[#b428f3] rounded-full text-white shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 group ${isOpen ? 'rotate-90' : 'hover:shadow-[#b428f3]/40'}`}
          aria-label={isOpen ? t.closeAssistant : t.openAssistant}
        >
          {isOpen ? <X size={32} /> : <Sparkles size={32} className="group-hover:rotate-12 transition-transform" />}
        </button>
      </Tooltip>
    </div>
  );
};
