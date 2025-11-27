import { CandyColor } from './types';

export const GRID_SIZE = 8;
export const ANIMATION_DURATION = 300;

export const CANDY_COLORS = [
  CandyColor.RED,
  CandyColor.BLUE,
  CandyColor.GREEN,
  CandyColor.YELLOW,
  CandyColor.PURPLE,
  CandyColor.ORANGE
];

export const LEVELS = [
  { id: 1, moves: 15, targetScore: 1000 },
  { id: 2, moves: 20, targetScore: 2500 },
  { id: 3, moves: 25, targetScore: 4000 },
  { id: 4, moves: 20, targetScore: 5000 },
  { id: 5, moves: 30, targetScore: 8000 },
];