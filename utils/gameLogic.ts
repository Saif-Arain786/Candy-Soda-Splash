
import { Candy, CandyColor, CandyType, LevelConfig } from '../types';
import { GRID_SIZE, CANDY_COLORS, LEVELS } from '../constants';

export const getLevelConfig = (levelId: number): LevelConfig => {
  const existing = LEVELS.find(l => l.id === levelId);
  if (existing) return existing;

  // Procedural generation for infinite levels
  return {
    id: levelId,
    // Moves increase slightly every 5 levels, capped at 45
    moves: Math.min(45, 20 + Math.floor((levelId - 5) / 5) * 2), 
    // Target score increases linearly
    targetScore: 5000 + ((levelId - 5) * 2500),
    description: `Level ${levelId}`
  };
};

export const generateBoard = (size: number = GRID_SIZE): Candy[][] => {
  let board: Candy[][] = [];
  let attempts = 0;
  
  // Generate until we have a board with possible moves
  do {
    board = [];
    for (let r = 0; r < size; r++) {
        const row: Candy[] = [];
        for (let c = 0; c < size; c++) {
            // Filter out colors that would create an initial match
            const forbiddenColors = new Set<CandyColor>();
            if (r >= 2 && board[r-1][c].color === board[r-2][c].color) forbiddenColors.add(board[r-1][c].color);
            if (c >= 2 && row[c-1].color === row[c-2].color) forbiddenColors.add(row[c-1].color);
            
            const validColors = CANDY_COLORS.filter(color => !forbiddenColors.has(color));
            // Fallback if somehow all colors are forbidden (rare/impossible with 6 colors) -> pick random
            const color = validColors.length > 0 
                ? validColors[Math.floor(Math.random() * validColors.length)]
                : CANDY_COLORS[Math.floor(Math.random() * CANDY_COLORS.length)];

            row.push({
                id: Math.random().toString(36).substring(7),
                color,
                type: CandyType.NORMAL,
                isNew: true,
            });
        }
        board.push(row);
    }
    attempts++;
  } while (!hasPossibleMoves(board) && attempts < 10);

  return board;
};

export const randomCandy = (): Candy => {
  const color = CANDY_COLORS[Math.floor(Math.random() * CANDY_COLORS.length)];
  return {
    id: Math.random().toString(36).substring(7),
    color,
    type: CandyType.NORMAL,
    isNew: true,
  };
};

export interface MatchGroup {
  cells: { row: number; col: number }[];
  type: 'horizontal' | 'vertical';
  length: number;
}

export const findMatchGroups = (board: Candy[][]): MatchGroup[] => {
  const groups: MatchGroup[] = [];
  const size = board.length;

  // Horizontal matches
  for (let r = 0; r < size; r++) {
    let matchLen = 1;
    for (let c = 0; c < size; c++) {
      const isLast = c === size - 1;
      const current = board[r][c];
      const next = !isLast ? board[r][c + 1] : null;
      
      if (!isLast && current.color !== CandyColor.EMPTY && current.color !== CandyColor.MULTI && next?.color === current.color) {
        matchLen++;
      } else {
        if (matchLen >= 3) {
           const cells = [];
           for(let k=0; k<matchLen; k++) {
             cells.push({ row: r, col: c - k });
           }
           groups.push({ cells, type: 'horizontal', length: matchLen });
        }
        matchLen = 1;
      }
    }
  }

  // Vertical matches
  for (let c = 0; c < size; c++) {
    let matchLen = 1;
    for (let r = 0; r < size; r++) {
      const isLast = r === size - 1;
      const current = board[r][c];
      const next = !isLast ? board[r + 1][c] : null;

      if (!isLast && current.color !== CandyColor.EMPTY && current.color !== CandyColor.MULTI && next?.color === current.color) {
        matchLen++;
      } else {
        if (matchLen >= 3) {
           const cells = [];
           for(let k=0; k<matchLen; k++) {
             cells.push({ row: r - k, col: c });
           }
           groups.push({ cells, type: 'vertical', length: matchLen });
        }
        matchLen = 1;
      }
    }
  }
  return groups;
};

export const findMatches = (board: Candy[][]): { row: number; col: number }[] => {
  const groups = findMatchGroups(board);
  const uniqueCells = new Set<string>();
  const result: { row: number; col: number }[] = [];

  groups.forEach(group => {
    group.cells.forEach(cell => {
      const key = `${cell.row},${cell.col}`;
      if (!uniqueCells.has(key)) {
        uniqueCells.add(key);
        result.push(cell);
      }
    });
  });
  return result;
};

// Common helpers for checking moves
const copy = (b: Candy[][]) => b.map(row => row.map(c => ({...c})));

const isSpecialCombo = (c1: Candy, c2: Candy) => {
  if (c1.color === CandyColor.EMPTY || c2.color === CandyColor.EMPTY) return false;
  // Color Bomb + Anything is a valid move
  if (c1.type === CandyType.COLOR_BOMB || c2.type === CandyType.COLOR_BOMB) return true;
  // Special + Special is a valid move
  if (c1.type !== CandyType.NORMAL && c2.type !== CandyType.NORMAL) return true;
  return false;
};

const trySwap = (board: Candy[][], r: number, c: number, dr: number, dc: number): boolean => {
    const size = board.length;
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= size || nc >= size) return false;
    
    // Check immediate special combos first (cheaper than full board copy)
    if (isSpecialCombo(board[r][c], board[nr][nc])) return true;

    const tempBoard = copy(board);
    const temp = tempBoard[r][c];
    tempBoard[r][c] = tempBoard[nr][nc];
    tempBoard[nr][nc] = temp;
    
    // Check for matches
    const matches = findMatchGroups(tempBoard);
    return matches.length > 0;
};

export const hasPossibleMoves = (board: Candy[][]): boolean => {
  const size = board.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
       if (trySwap(board, r, c, 0, 1)) return true; // Right
       if (trySwap(board, r, c, 1, 0)) return true; // Down
    }
  }
  return false;
};

export const getHintMove = (board: Candy[][]): { r: number, c: number } | null => {
  const size = board.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
       if (trySwap(board, r, c, 0, 1)) return { r, c }; // Found a move (swap right)
       if (trySwap(board, r, c, 1, 0)) return { r, c }; // Found a move (swap down)
    }
  }
  return null;
}
