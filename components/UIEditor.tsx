import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, Type, PaintBucket, Maximize, X, MousePointer2 } from 'lucide-react';

interface UIEditorProps {
  translations: any;
}

export const UIEditor: React.FC<UIEditorProps> = ({ translations: t }) => {
  const [isActive, setIsActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  
  // Local state for the selected element's styles to populate the inputs
  const [styles, setStyles] = useState({
    backgroundColor: '',
    color: '',
    padding: '',
    fontSize: '',
    borderRadius: '',
    text: '',
  });

  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousOutlineRef = useRef<string>('');

  useEffect(() => {
    if (!isActive) {
      if (selectedElement) {
        selectedElement.style.outline = previousOutlineRef.current;
        setSelectedElement(null);
      }
      return;
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (panelRef.current?.contains(target)) return;
      if (target === selectedElement) return;

      previousOutlineRef.current = target.style.outline;
      target.style.outline = '2px dashed #a855f7';
      target.style.outlineOffset = '-2px';
      target.style.cursor = 'cell';
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (panelRef.current?.contains(target)) return;
      if (target === selectedElement) return;

      target.style.outline = previousOutlineRef.current;
      target.style.cursor = '';
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (panelRef.current?.contains(target)) return;

      e.preventDefault();
      e.stopPropagation();

      if (selectedElement) {
        selectedElement.style.outline = previousOutlineRef.current;
      }

      previousOutlineRef.current = '';
      target.style.outline = '2px solid #a855f7';
      target.style.outlineOffset = '-2px';
      setSelectedElement(target);

      const computedStyle = window.getComputedStyle(target);
      
      // Extract direct text content if it's a leaf node or has text
      let directText = '';
      if (target.childNodes.length > 0) {
        for (let i = 0; i < target.childNodes.length; i++) {
          const child = target.childNodes[i];
          if (child.nodeType === Node.TEXT_NODE) {
            directText += child.textContent;
          }
        }
      }
      directText = directText.trim();

      setStyles({
        backgroundColor: computedStyle.backgroundColor,
        color: computedStyle.color,
        padding: computedStyle.padding,
        fontSize: computedStyle.fontSize,
        borderRadius: computedStyle.borderRadius,
        text: directText,
      });
    };

    document.addEventListener('mouseover', handleMouseOver, { capture: true });
    document.addEventListener('mouseout', handleMouseOut, { capture: true });
    document.addEventListener('click', handleClick, { capture: true });

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, { capture: true });
      document.removeEventListener('mouseout', handleMouseOut, { capture: true });
      document.removeEventListener('click', handleClick, { capture: true });
      if (selectedElement) {
        selectedElement.style.outline = previousOutlineRef.current;
        selectedElement.style.cursor = '';
      }
    };
  }, [isActive, selectedElement]);

  const applyStyle = (prop: string, value: string) => {
    if (!selectedElement) return;
    (selectedElement.style as any)[prop] = value;
    setStyles(prev => ({ ...prev, [prop]: value }));
  };

  const applyText = (value: string) => {
    if (!selectedElement) return;
    
    // Replace text nodes, keep elements
    let textNodeFound = false;
    for (let i = 0; i < selectedElement.childNodes.length; i++) {
        const child = selectedElement.childNodes[i];
      if (child.nodeType === Node.TEXT_NODE) {
        child.textContent = value;
        textNodeFound = true;
        break; // Assume replacing the first text node is what they want
      }
    }
    if (!textNodeFound) {
      selectedElement.prepend(document.createTextNode(value));
    }
    setStyles(prev => ({ ...prev, text: value }));
  };

  return (
    <>
      <button
        onClick={() => setIsActive(!isActive)}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl z-[100] transition-all duration-300 flex items-center justify-center
          ${isActive 
            ? 'bg-purple-600 text-white shadow-purple-500/50 scale-110' 
            : 'bg-white dark:bg-[#2A2A2A] text-gray-700 dark:text-gray-300 hover:bg-gray-50 border border-gray-200 dark:border-white/10'
          }`}
        title="Toggle UI Editor"
      >
        <MousePointer2 size={24} className={isActive ? "animate-pulse" : ""} />
        {isActive && (
          <span className="absolute -top-10 right-0 bg-purple-600 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap font-medium animate-in slide-in-from-bottom-2">
            UI Editor Active
          </span>
        )}
      </button>

      {isActive && selectedElement && (
        <div 
          ref={panelRef}
          className="fixed top-24 right-6 w-80 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in slide-in-from-right-8 duration-300"
        >
          <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-white/5">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
              <Settings size={16} className="text-purple-500" />
              Edit Element
            </h3>
            <button 
              onClick={() => {
                if (selectedElement) {
                  selectedElement.style.outline = previousOutlineRef.current;
                  setSelectedElement(null);
                }
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Type size={12} /> Text Content
              </label>
              <input 
                type="text" 
                value={styles.text}
                onChange={(e) => applyText(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#2A2A2A] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <PaintBucket size={12} /> Background
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={styles.backgroundColor.startsWith('rgb') ? '#ffffff' : styles.backgroundColor} // Color picker needs hex, basic fallback
                  onChange={(e) => applyStyle('backgroundColor', e.target.value)}
                  className="w-8 h-8 rounded shrink-0 cursor-pointer border-0 p-0"
                />
                <input 
                  type="text" 
                  value={styles.backgroundColor}
                  onChange={(e) => applyStyle('backgroundColor', e.target.value)}
                  placeholder="rgb(), #hex, etc."
                  className="w-full bg-gray-50 dark:bg-[#2A2A2A] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Type size={12} /> Text Color
              </label>
              <input 
                type="text" 
                value={styles.color}
                onChange={(e) => applyStyle('color', e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#2A2A2A] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Maximize size={12} /> Padding
              </label>
              <input 
                type="text" 
                value={styles.padding}
                onChange={(e) => applyStyle('padding', e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#2A2A2A] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Border Radius
              </label>
              <input 
                type="text" 
                value={styles.borderRadius}
                onChange={(e) => applyStyle('borderRadius', e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#2A2A2A] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Font Size
              </label>
              <input 
                type="text" 
                value={styles.fontSize}
                onChange={(e) => applyStyle('fontSize', e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#2A2A2A] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>
            
            <div className="pt-2 text-xs text-center text-gray-400">
              Changes bypass React state.
            </div>
          </div>
        </div>
      )}
    </>
  );
};
