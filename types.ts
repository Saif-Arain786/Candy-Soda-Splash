
export enum AppView {
  HOME = 'HOME',
  MAP = 'MAP',
  GAME = 'GAME',
  SETTINGS = 'SETTINGS',
}

export enum CandyColor {
  RED = 'RED',       // Heart
  BLUE = 'BLUE',     // Diamond
  GREEN = 'GREEN',   // Triangle/Square
  YELLOW = 'YELLOW', // Star/Drop
  PURPLE = 'PURPLE', // Hexagon/Cluster
  ORANGE = 'ORANGE', // Square/Circle
  EMPTY = 'EMPTY',
  MULTI = 'MULTI'    // Color Bomb
}

export enum CandyType {
  NORMAL = 'NORMAL',
  STRIPED_H = 'STRIPED_H', // Clears Row
  STRIPED_V = 'STRIPED_V', // Clears Column
  WRAPPED = 'WRAPPED',     // Explodes 3x3
  COLOR_BOMB = 'COLOR_BOMB' // Clears all of one color
}

export interface Candy {
  id: string;
  color: CandyColor;
  type: CandyType;
  isMatched?: boolean;
  isNew?: boolean;
}

export interface LevelConfig {
  id: number;
  moves: number;
  targetScore: number;
  description?: string; 
}

export interface GameStats {
  score: number;
  movesLeft: number;
  level: number;
  stars: 0 | 1 | 2 | 3;
}

export interface VisualEffect {
  id: number;
  type: 'sparkle' | 'explosion';
  r: number;
  c: number;
}
