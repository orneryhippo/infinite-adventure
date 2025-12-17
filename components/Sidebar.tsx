import React from 'react';
import { GameState } from '../types';

interface SidebarProps {
  gameState: GameState;
  isOpen: boolean;
  toggleSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ gameState, isOpen, toggleSidebar }) => {
  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-md text-yellow-500 md:hidden shadow-lg border border-yellow-900"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Sidebar Container */}
      <div className={`
        fixed top-0 left-0 h-full w-72 bg-gray-900 border-r border-gray-800 text-gray-200 transform transition-transform duration-300 ease-in-out z-40 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold cinzel text-yellow-500">Adventure Log</h1>
          <p className="text-xs text-gray-500 mt-1">Infinite AI Engine</p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-8">
          {/* Current Quest */}
          <section>
            <h2 className="text-sm uppercase tracking-wider text-yellow-600 font-bold mb-3 flex items-center">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></span>
              Current Quest
            </h2>
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <p className="text-sm italic text-gray-300 leading-relaxed">
                {gameState.currentQuest || "Explore the world..."}
              </p>
            </div>
          </section>

          {/* Inventory */}
          <section>
            <h2 className="text-sm uppercase tracking-wider text-blue-500 font-bold mb-3 flex items-center">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              Inventory
            </h2>
            {gameState.inventory.length === 0 ? (
              <p className="text-sm text-gray-600">Empty...</p>
            ) : (
              <ul className="space-y-2">
                {gameState.inventory.map((item, idx) => (
                  <li key={idx} className="flex items-center text-sm p-2 bg-gray-800 rounded hover:bg-gray-750 transition-colors border border-gray-700">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-3"></span>
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>

           {/* Stats */}
           <section>
             <h2 className="text-sm uppercase tracking-wider text-red-500 font-bold mb-3">Status</h2>
             <div className="flex items-center justify-between text-sm bg-gray-800 p-3 rounded border border-gray-700">
                <span>Health</span>
                <span className="text-red-400 font-mono">100/100</span>
             </div>
           </section>
        </div>
        
        <div className="p-4 border-t border-gray-800 text-xs text-gray-600 text-center">
          Powered by Gemini 2.5 & 3 Pro
        </div>
      </div>
    </>
  );
};