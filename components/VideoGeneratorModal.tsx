
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import { X, Video, Play, Pause, Download, ExternalLink, Sparkles, Layout, Smartphone, Zap, Flame, Settings2, Volume2, VolumeX, MessageSquareShare } from 'lucide-react';
import { generateVeoVideo } from '../services/geminiService';

interface VideoGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  translations: any;
  onPostToChat?: (videoUrl: string, prompt: string) => void;
}

const VideoGeneratorModal: React.FC<VideoGeneratorModalProps> = ({ isOpen, onClose, translations: t, onPostToChat }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [resolution, setResolution] = useState<"720p" | "1080p">("720p");
  const [quality, setQuality] = useState<"fast" | "high">("fast");
  const [cameraAngle, setCameraAngle] = useState<string>("");
  const [characterAction, setCharacterAction] = useState<string>("");
  const [mood, setMood] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  // Video Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const loadingMessages = [
    t.veoLoadingMsg1,
    t.veoLoadingMsg2,
    t.veoLoadingMsg3,
    t.veoLoadingMsg4
  ];

  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % loadingMessages.length);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isGenerating, loadingMessages]);

  const handleOpenKeySelector = async () => {
    if (typeof (window as any).aistudio !== 'undefined') {
      await (window as any).aistudio.openSelectKey();
      setNeedsKey(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setError(null);
    setIsGenerating(true);
    setVideoUrl(null);

    let enhancedPrompt = prompt;
    if (cameraAngle) enhancedPrompt += `, ${cameraAngle} angle`;
    if (characterAction) enhancedPrompt += `, character is ${characterAction}`;
    if (mood) enhancedPrompt += `, ${mood} mood`;

    const model = quality === 'fast' ? 'veo-3.1-fast-generate-preview' : 'veo-3.1-generate-preview';

    try {
      const url = await generateVeoVideo(enhancedPrompt, { aspectRatio, resolution, model });
      setVideoUrl(url);
    } catch (err: any) {
      if (err.code === 'KEY_SELECTION_REQUIRED') {
        setNeedsKey(true);
      } else {
        setError(err.message || "Failed to generate video.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePostToChat = () => {
    if (videoUrl && onPostToChat) {
      onPostToChat(videoUrl, prompt);
      onClose();
    }
  };

  // Video Controls Logic
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
              <Video size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {t.videoStudioTitle}
              </h3>
              <p className="text-xs text-gray-500 dark:text-[#A8ABB4]">Powered by Veo 3.1</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 flex-grow space-y-8 overflow-y-auto chat-container">
          {needsKey ? (
            <div className="text-center py-10 space-y-6 animate-in fade-in">
              <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 mx-auto">
                <Sparkles size={40} />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-bold dark:text-white">{t.selectKeyTitle}</h4>
                <p className="text-sm text-gray-500 dark:text-[#A8ABB4] max-w-sm mx-auto">{t.selectKeyDesc}</p>
              </div>
              <div className="flex flex-col gap-3 items-center">
                <button 
                  onClick={handleOpenKeySelector}
                  className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all active:scale-95"
                >
                  {t.openKeySelector}
                </button>
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 flex items-center gap-1 hover:underline"
                >
                  <ExternalLink size={12} />
                  {t.billingLink}
                </a>
              </div>
            </div>
          ) : isGenerating ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-8 text-center">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-purple-500">
                  <Video size={32} className="animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-bold dark:text-white animate-pulse">{loadingMessages[loadingMsgIdx]}</h4>
                <p className="text-sm text-gray-500 dark:text-[#A8ABB4]">This usually takes 2-3 minutes. Sit back and enjoy.</p>
              </div>
            </div>
          ) : videoUrl ? (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Premium Custom Video Player */}
              <div className={`mx-auto bg-black rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative group/player ${aspectRatio === "9:16" ? "max-w-[300px] aspect-[9/16]" : "w-full aspect-video"}`}>
                <video 
                  ref={videoRef}
                  src={videoUrl} 
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                  onClick={togglePlay}
                  autoPlay 
                  className="w-full h-full object-contain cursor-pointer" 
                />
                
                {/* Custom Control Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/player:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    step="0.01"
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-purple-500 hover:h-1.5 transition-all mb-4"
                  />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button onClick={togglePlay} className="text-white hover:text-purple-400 transition-colors">
                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                      </button>
                      
                      <div className="text-white text-xs font-medium tabular-nums">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </div>

                      <div className="flex items-center gap-2 group/volume">
                        <button onClick={toggleMute} className="text-white hover:text-purple-400 transition-colors">
                          {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          className="w-0 group-hover/volume:w-20 overflow-hidden h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-white transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white scale-110">
                      <Play size={32} fill="currentColor" className="ml-1" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => { setVideoUrl(null); setPrompt(''); }}
                  className="flex-grow py-4 bg-gray-100 dark:bg-white/5 dark:text-white rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                >
                  Create Another
                </button>
                <button 
                  onClick={handlePostToChat}
                  className="flex-grow py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/20 hover:bg-purple-500 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquareShare size={20} />
                  Post to Chat
                </button>
                <a 
                  href={videoUrl} 
                  download="veo-video.mp4"
                  className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={20} />
                  {t.downloadVideo}
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 dark:text-[#A8ABB4] uppercase tracking-wider">{t.videoPromptPlaceholder}</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. A futuristic robot reading a book in a glowing forest..."
                  className="w-full h-32 p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none outline-none"
                />
              </div>

              <div className="bg-gray-50 dark:bg-white/[0.03] p-6 rounded-2xl border border-gray-100 dark:border-white/5 space-y-6">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-[#E2E2E2] uppercase tracking-wide">
                  <Settings2 size={18} className="text-purple-500" />
                  {t.videoSettings}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-gray-400 dark:text-[#777777] uppercase tracking-widest">{t.videoQuality}</label>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => setQuality("fast")}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${quality === "fast" ? "bg-purple-500/10 border-purple-500 text-purple-500" : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500"}`}
                      >
                        <Zap size={16} />
                        <span className="text-xs font-semibold">{t.qualityFast}</span>
                      </button>
                      <button 
                        onClick={() => setQuality("high")}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${quality === "high" ? "bg-purple-500/10 border-purple-500 text-purple-500" : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500"}`}
                      >
                        <Flame size={16} />
                        <span className="text-xs font-semibold">{t.qualityHigh}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-gray-400 dark:text-[#777777] uppercase tracking-widest">{t.aspectRatio}</label>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => setAspectRatio("16:9")}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${aspectRatio === "16:9" ? "bg-purple-500/10 border-purple-500 text-purple-500" : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500"}`}
                      >
                        <Layout size={16} />
                        <span className="text-xs font-semibold">16:9 Landscape</span>
                      </button>
                      <button 
                        onClick={() => setAspectRatio("9:16")}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${aspectRatio === "9:16" ? "bg-purple-500/10 border-purple-500 text-purple-500" : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500"}`}
                      >
                        <Smartphone size={16} />
                        <span className="text-xs font-semibold">9:16 Portrait</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-gray-400 dark:text-[#777777] uppercase tracking-widest">{t.resolution}</label>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => setResolution("720p")}
                        className={`px-3 py-2.5 rounded-xl border text-center transition-all ${resolution === "720p" ? "bg-purple-500/10 border-purple-500 text-purple-500" : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500"}`}
                      >
                        <span className="text-xs font-bold">720p Standard</span>
                      </button>
                      <button 
                        onClick={() => setResolution("1080p")}
                        className={`px-3 py-2.5 rounded-xl border text-center transition-all ${resolution === "1080p" ? "bg-purple-500/10 border-purple-500 text-purple-500" : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500"}`}
                      >
                        <span className="text-xs font-bold">1080p Full HD</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100 dark:border-white/5">
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-gray-400 dark:text-[#777777] uppercase tracking-widest">{t.cameraAngle}</label>
                    <select 
                      value={cameraAngle}
                      onChange={(e) => setCameraAngle(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                      <option value="">Default</option>
                      <option value={t.angleWide}>{t.angleWide}</option>
                      <option value={t.angleCloseUp}>{t.angleCloseUp}</option>
                      <option value={t.angleDrone}>{t.angleDrone}</option>
                      <option value={t.angleCinematic}>{t.angleCinematic}</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-gray-400 dark:text-[#777777] uppercase tracking-widest">{t.characterAction}</label>
                    <select 
                      value={characterAction}
                      onChange={(e) => setCharacterAction(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                      <option value="">Default</option>
                      <option value={t.actionWalking}>{t.actionWalking}</option>
                      <option value={t.actionRunning}>{t.actionRunning}</option>
                      <option value={t.actionDancing}>{t.actionDancing}</option>
                      <option value={t.actionSitting}>{t.actionSitting}</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-gray-400 dark:text-[#777777] uppercase tracking-widest">{t.mood}</label>
                    <select 
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                      <option value="">Default</option>
                      <option value={t.moodHappy}>{t.moodHappy}</option>
                      <option value={t.moodDark}>{t.moodDark}</option>
                      <option value={t.moodEpic}>{t.moodEpic}</option>
                      <option value={t.moodCalm}>{t.moodCalm}</option>
                    </select>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm animate-in shake duration-300">
                  <X size={20} className="flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button 
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="w-full py-5 bg-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-500/20 hover:bg-purple-500 disabled:bg-gray-200 dark:disabled:bg-white/5 disabled:text-gray-400 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Sparkles size={20} />
                {t.generateVideo}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoGeneratorModal;
