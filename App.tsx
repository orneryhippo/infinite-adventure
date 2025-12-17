import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWidget } from './components/ChatWidget';
import { Typewriter } from './components/Typewriter';
import { generateStorySegment, generateSceneImage, checkAndRequestApiKey } from './services/gemini';
import { GameState, StorySegment, ImageSize } from './types';

const App: React.FC = () => {
  // --- State ---
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  
  const [gameState, setGameState] = useState<GameState>({
    inventory: [],
    currentQuest: "Awaken and find your purpose.",
    health: 100,
    location: "Unknown",
  });

  const [storyLog, setStoryLog] = useState<StorySegment[]>([]);
  const [currentChoices, setCurrentChoices] = useState<string[]>(["Look around"]);
  const [customInput, setCustomInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [imageResolution, setImageResolution] = useState<ImageSize>('1K');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Initialization ---
  useEffect(() => {
    // Initial story segment
    const init = async () => {
      setInitializing(true);
      const keySelected = await checkAndRequestApiKey();
      setHasApiKey(keySelected);
      
      if (keySelected) {
        // Start the game
        const initialSegment: StorySegment = {
          id: 'init',
          text: "You awaken in a dimly lit chamber. The air is cold and smells of ancient stone. Dust motes dance in a stray beam of light cutting through the darkness. You have no memory of how you arrived here.",
          choices: ["Search the room", "Call out for help", "Examine yourself"],
          timestamp: Date.now(),
        };
        setStoryLog([initialSegment]);
        setCurrentChoices(initialSegment.choices);
        
        // Generate initial image in background
        generateImageForSegment(initialSegment.id, "A dimly lit ancient stone chamber, cold atmosphere, dust motes in light beam.");
      }
      setInitializing(false);
    };
    init();
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [storyLog, loading]);

  // --- Game Logic ---

  const handleAction = async (action: string) => {
    if (loading) return;
    setLoading(true);

    // 1. Add User Action to Log
    const userSegment: StorySegment = {
      id: Date.now().toString() + '-user',
      text: action,
      choices: [],
      isUser: true,
      timestamp: Date.now(),
    };
    setStoryLog(prev => [...prev, userSegment]);

    // 2. Call AI Engine
    // Construct history for AI context (last 5-6 items text)
    const historyText = storyLog
        .filter(s => !s.isUser) // only narrative history
        .slice(-5)
        .map(s => s.text);

    const result = await generateStorySegment(
      historyText, 
      action, 
      gameState.inventory, 
      gameState.currentQuest
    );

    // 3. Update Game State
    setGameState(prev => {
      const newInv = new Set(prev.inventory);
      result.inventory_add.forEach((item: string) => newInv.add(item));
      result.inventory_remove.forEach((item: string) => newInv.delete(item));
      
      return {
        ...prev,
        inventory: Array.from(newInv),
        currentQuest: result.new_quest || prev.currentQuest,
      };
    });

    // 4. Add New Narrative Segment
    const newSegmentId = Date.now().toString();
    const newSegment: StorySegment = {
      id: newSegmentId,
      text: result.narrative,
      choices: result.suggested_choices,
      imagePrompt: result.image_prompt,
      timestamp: Date.now(),
    };
    setStoryLog(prev => [...prev, newSegment]);
    setCurrentChoices(result.suggested_choices);
    setLoading(false);
    setCustomInput("");

    // 5. Trigger Image Generation (Async)
    if (result.image_prompt) {
      generateImageForSegment(newSegmentId, result.image_prompt);
    }
  };

  const generateImageForSegment = async (segmentId: string, prompt: string) => {
    const imageUrl = await generateSceneImage(prompt, imageResolution);
    if (imageUrl) {
      setStoryLog(prev => prev.map(seg => 
        seg.id === segmentId ? { ...seg, imageUrl } : seg
      ));
    }
  };

  // --- Render ---

  if (!hasApiKey && !initializing) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
           <div className="text-center">
              <h1 className="text-3xl cinzel mb-4">Adventure Awaits</h1>
              <p className="mb-6">You must select an API Key to generate the world.</p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 rounded text-lg font-bold transition"
              >
                Reload to Select Key
              </button>
           </div>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        gameState={gameState} 
        isOpen={sidebarOpen} 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col h-screen transition-all duration-300 ${sidebarOpen ? 'md:ml-72' : 'md:ml-72' /* Keep margin on desktop for persistent sidebar */}`}>
        
        {/* Top Bar (Mobile mostly) */}
        <div className="h-16 border-b border-gray-800 flex items-center justify-end px-6 bg-gray-900/95 backdrop-blur z-30">
           <div className="flex items-center space-x-4">
              <label className="text-xs text-gray-500 mr-2">Image Quality:</label>
              <select 
                value={imageResolution}
                onChange={(e) => setImageResolution(e.target.value as ImageSize)}
                className="bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1 focus:outline-none focus:border-yellow-500"
              >
                <option value="1K">1K (Fast)</option>
                <option value="2K">2K (HD)</option>
                <option value="4K">4K (Ultra)</option>
              </select>
           </div>
        </div>

        {/* Story Feed */}
        <div 
          className="flex-1 overflow-y-auto p-4 md:p-10 space-y-8 scroll-smooth"
          ref={scrollRef}
        >
          {storyLog.map((segment) => (
            <div key={segment.id} className={`max-w-4xl mx-auto animate-fade-in ${segment.isUser ? 'flex justify-end' : ''}`}>
              {segment.isUser ? (
                // User Action Bubble
                <div className="bg-gray-800 border border-gray-700 rounded-lg px-6 py-4 text-yellow-500 font-serif italic inline-block shadow-md">
                   {segment.text}
                </div>
              ) : (
                // Story Narrative Block
                <div className="space-y-4 w-full">
                  {/* Image */}
                  {segment.imageUrl ? (
                     <div className="w-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-gray-800 relative group">
                        <img 
                          src={segment.imageUrl} 
                          alt="Scene" 
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        />
                     </div>
                  ) : segment.imagePrompt && (
                    // Loading placeholder for image
                    <div className="w-full aspect-video rounded-xl bg-gray-800/50 flex items-center justify-center border border-gray-800 animate-pulse">
                        <span className="text-gray-600 text-sm">Visualizing...</span>
                    </div>
                  )}

                  {/* Text */}
                  <div className="prose prose-invert max-w-none">
                     <p className="text-lg md:text-xl leading-relaxed font-light tracking-wide text-gray-200">
                        <Typewriter text={segment.text} speed={15} />
                     </p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="max-w-4xl mx-auto flex items-center space-x-3 text-yellow-600/70">
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          )}
          
          {/* Spacer for bottom controls */}
          <div className="h-32"></div>
        </div>

        {/* Controls Area */}
        <div className="border-t border-gray-800 bg-gray-900/95 backdrop-blur p-4 md:p-6 sticky bottom-0 z-40">
           <div className="max-w-4xl mx-auto space-y-4">
              {/* Choice Buttons */}
              <div className="flex flex-wrap gap-3 justify-center">
                 {currentChoices.map((choice, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAction(choice)}
                      disabled={loading}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-yellow-500 text-gray-200 text-sm rounded-full transition-all active:scale-95 disabled:opacity-50"
                    >
                      {choice}
                    </button>
                 ))}
              </div>

              {/* Custom Input */}
              <div className="relative">
                 <input 
                    type="text" 
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && customInput && handleAction(customInput)}
                    disabled={loading}
                    placeholder="Or type your own action..."
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-yellow-600 transition-colors shadow-inner"
                 />
                 <button 
                    onClick={() => customInput && handleAction(customInput)}
                    disabled={loading || !customInput}
                    className="absolute right-2 top-2 p-1.5 bg-yellow-700 hover:bg-yellow-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Chat Widget */}
      <ChatWidget gameState={gameState} />
    </div>
  );
};

export default App;