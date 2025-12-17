export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
}

export interface GameState {
  inventory: string[];
  currentQuest: string;
  health: number;
  location: string;
}

export interface StorySegment {
  id: string;
  text: string;
  imagePrompt?: string;
  imageUrl?: string;
  choices: string[];
  isUser?: boolean; // if true, it's a user action display
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export type ImageSize = '1K' | '2K' | '4K';

export interface GameConfig {
  imageResolution: ImageSize;
}