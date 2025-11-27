
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GRID_SIZE } from '../constants';
import { Candy, CandyColor, CandyType, VisualEffect } from '../types';
import { generateBoard, findMatchGroups, randomCandy, hasPossibleMoves, getHintMove } from '../utils/gameLogic';
import { CandyIcon } from './Icons';
import { Sparkles, Zap } from 'lucide-react';
import { SoundType } from '../utils/audio';

interface GameBoardProps {
  onScore: (points: number) => void;
  onMove: () => void;
  movesLeft: number;
  isGameOver: boolean;
  onPlaySound: (type: SoundType) => void;
}

interface SwapState {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

const GameBoard: React.FC<GameBoardProps> = ({ onScore, onMove, movesLeft, isGameOver, onPlaySound }) => {
  const [board, setBoard] = useState<Candy[][]>([]);
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [swapping, setSwapping] = useState<SwapState | null>(null);
  const [effects, setEffects] = useState<VisualEffect[]>([]);
  const [shakingCells, setShakingCells] = useState<Set<string>>(new Set());
  const [hint, setHint] = useState<{ r: number; c: number } | null>(null);
  
  // Safety counter to prevent infinite loops
  const comboCounter = useRef(0);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize
  useEffect(() => {
    setBoard(generateBoard());
  }, []);

  // --- HINT LOGIC ---
  useEffect(() => {
    // Clear existing timer and hint whenever board state changes or processing starts
    if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
        hintTimerRef.current = null;
    }
    setHint(null);

    // Only start timer if game is playable (not processing, not over, etc)
    if (!isProcessing && !isGameOver && movesLeft > 0 && !swapping && board.length > 0) {
        hintTimerRef.current = setTimeout(() => {
            const hintMove = getHintMove(board);
            if (hintMove) {
                setHint(hintMove);
            }
        }, 5000);
    }

    return () => {
        if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, [board, isProcessing, isGameOver, movesLeft, swapping]);

  // Recursive function to get all cells affected by a clear (including special candy chains)
  const getAffectedCells = useCallback((
    startCells: { r: number, c: number }[], 
    currentBoard: Candy[][],
    visited: Set<string> = new Set()
  ): { r: number, c: number }[] => {
    const affected: { r: number, c: number }[] = [];
    const queue = [...startCells];

    while (queue.length > 0) {
        const current = queue.shift()!;
        const key = `${current.r},${current.c}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        affected.push(current);

        // Bounds check
        if (current.r < 0 || current.r >= GRID_SIZE || current.c < 0 || current.c >= GRID_SIZE) continue;

        const candy = currentBoard[current.r]?.[current.c];
        if (!candy || candy.color === CandyColor.EMPTY) continue;

        if (candy.type === CandyType.STRIPED_H) {
            // Clear Row
            for (let c = 0; c < GRID_SIZE; c++) {
                if (!visited.has(`${current.r},${c}`)) queue.push({ r: current.r, c });
            }
        } else if (candy.type === CandyType.STRIPED_V) {
            // Clear Column
            for (let r = 0; r < GRID_SIZE; r++) {
                if (!visited.has(`${r},${current.c}`)) queue.push({ r, c: current.c });
            }
        } else if (candy.type === CandyType.WRAPPED) {
            // Clear 3x3
            for (let r = current.r - 1; r <= current.r + 1; r++) {
                for (let c = current.c - 1; c <= current.c + 1; c++) {
                     if (!visited.has(`${r},${c}`)) queue.push({ r, c });
                }
            }
        } else if (candy.type === CandyType.COLOR_BOMB) {
             // If a color bomb is destroyed indirectly, big boom
             for (let r = current.r - 2; r <= current.r + 2; r++) {
                for (let c = current.c - 2; c <= current.c + 2; c++) {
                     if (!visited.has(`${r},${c}`)) queue.push({ r, c });
                }
             }
        }
    }
    return affected;
  }, []);

  // --- GRAVITY LOGIC ---
  const applyGravity = (currentBoard: Candy[][]): Candy[][] => {
    const newBoard = currentBoard.map(row => [...row]);
    
    for (let c = 0; c < GRID_SIZE; c++) {
      let emptySlots = 0;
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        if (newBoard[r][c].color === CandyColor.EMPTY) {
          emptySlots++;
        } else if (emptySlots > 0) {
          newBoard[r + emptySlots][c] = newBoard[r][c];
          newBoard[r][c] = { ...newBoard[r][c], color: CandyColor.EMPTY };
        }
      }
      for (let r = 0; r < emptySlots; r++) {
        newBoard[r][c] = randomCandy();
      }
    }
    return newBoard;
  };

  // --- PROCESSING LOGIC (One Step) ---
  const processBoardStep = useCallback(async () => {
    const groups = findMatchGroups(board);
    
    if (groups.length > 0) {
      // Increment safety counter
      comboCounter.current += 1;
      if (comboCounter.current > 15) {
          // Emergency break for infinite loops
          console.warn("Max combo limit reached, stopping cascade.");
          comboCounter.current = 0;
          setIsProcessing(false);
          return;
      }

      // --- Wiggle Animation for matches ---
      const shakeSet = new Set<string>();
      groups.forEach(g => g.cells.forEach(c => shakeSet.add(`${c.row},${c.col}`)));
      setShakingCells(shakeSet);
      await new Promise(r => setTimeout(r, 300));
      setShakingCells(new Set());
      // ------------------------------------

      // Identify special candy creations
      const newBoard = [...board.map(row => [...row])];
      const matchedCells = new Set<string>();
      const specialCreations: {r: number, c: number, type: CandyType, color: CandyColor}[] = [];

      // Map cells to groups to detect intersections (Wrapped Candy)
      const cellToGroups: Record<string, any[]> = {};
      groups.forEach(g => {
          g.cells.forEach(cell => {
              const key = `${cell.row},${cell.col}`;
              if (!cellToGroups[key]) cellToGroups[key] = [];
              cellToGroups[key].push(g);
              matchedCells.add(key);
          });
      });

      // Detect creations
      const processedGroups = new Set();

      // 1. Check for 5-matches (Color Bomb)
      groups.forEach(group => {
          if (group.length >= 5) {
              processedGroups.add(group);
              const center = group.cells[Math.floor(group.length / 2)];
              specialCreations.push({ 
                  r: center.row, 
                  c: center.col, 
                  type: CandyType.COLOR_BOMB, 
                  color: CandyColor.MULTI 
              });
              matchedCells.delete(`${center.row},${center.col}`);
          }
      });

      // 2. Check for intersections (Wrapped)
      Object.keys(cellToGroups).forEach(key => {
          const [r, c] = key.split(',').map(Number);
          const overlappingGroups = cellToGroups[key];
          if (overlappingGroups.length >= 2) {
              const isAlreadySpecial = specialCreations.some(s => s.r === r && s.c === c);
              if (!isAlreadySpecial) {
                  specialCreations.push({
                      r, c, type: CandyType.WRAPPED, color: board[r][c].color
                  });
                  matchedCells.delete(key);
                  overlappingGroups.forEach(g => processedGroups.add(g));
              }
          }
      });

      // 3. Check for 4-matches (Striped)
      groups.forEach(group => {
          if (!processedGroups.has(group) && group.length === 4) {
              const center = group.cells[1]; 
              const isAlreadySpecial = specialCreations.some(s => s.r === center.row && s.c === center.col);
              // Horizontal Match -> Vertical Stripe
              const type = group.type === 'horizontal' ? CandyType.STRIPED_V : CandyType.STRIPED_H;
              
              if (!isAlreadySpecial) {
                   specialCreations.push({
                      r: center.row, c: center.col, type, color: board[center.row][center.col].color
                   });
                   matchedCells.delete(`${center.row},${center.col}`);
                   processedGroups.add(group);
              }
          }
      });
      
      // Calculate standard matches removal
      const standardClearList: {r: number, c: number}[] = [];
      matchedCells.forEach(key => {
          const [r, c] = key.split(',').map(Number);
          standardClearList.push({r, c});
      });

      // Apply Recursive Clearing (Chain Reactions)
      const finalClearList = getAffectedCells(standardClearList, newBoard);

      // Apply changes to board
      let points = 0;
      points += specialCreations.length * 500;
      
      if (specialCreations.length > 0) {
          onPlaySound('special');
      }

      // Create Specials
      specialCreations.forEach(sc => {
          newBoard[sc.r][sc.c] = {
              ...newBoard[sc.r][sc.c],
              color: sc.color,
              type: sc.type,
              isNew: true,
              id: Date.now() + Math.random().toString()
          };
          setEffects(prev => [...prev, {
              id: Date.now() + Math.random(),
              type: sc.type === CandyType.COLOR_BOMB ? 'explosion' : 'sparkle',
              r: sc.r, c: sc.c
          }]);
      });

      // Clear Cells
      if (finalClearList.length > 0) {
          if (specialCreations.length === 0) {
              onPlaySound('match');
          }
      }

      finalClearList.forEach(({r, c}) => {
          const isJustCreated = specialCreations.some(sc => sc.r === r && sc.c === c);
          if (!isJustCreated) {
             points += 60;
             if (newBoard[r][c].type !== CandyType.NORMAL) {
                 points += 200;
                 onPlaySound('explode');
                 setEffects(prev => [...prev, {
                    id: Date.now() + Math.random(),
                    type: 'explosion',
                    r, c
                }]);
             }
             newBoard[r][c] = { ...newBoard[r][c], color: CandyColor.EMPTY };
          }
      });

      onScore(points);
      setBoard(newBoard);

      // Cleanup effects
      setTimeout(() => setEffects([]), 600);

      // Apply Gravity after delay
      setTimeout(() => {
        const boardAfterGravity = applyGravity(newBoard);
        setBoard(boardAfterGravity);
        
        // CRITICAL FIX: Do NOT recursively call processBoard here.
        // Instead, set isProcessing to false.
        // The useEffect will detect the new board state, find matches, and trigger the next step.
        // This prevents the double-trigger race condition.
        setTimeout(() => {
            setIsProcessing(false); 
        }, 100);
      }, 300);

    } else {
      // No matches found
      comboCounter.current = 0; // Reset combo
      setIsProcessing(false);
    }
  }, [board, onScore, getAffectedCells, onPlaySound]);


  // --- MAIN GAME LOOP EFFECT ---
  // This is the engine. It runs whenever 'board' changes or 'isProcessing' changes.
  // It ensures we only process one step at a time.
  useEffect(() => {
      if (isProcessing) return; // Don't interrupt active processing
      if (board.length === 0) return;
      if (isGameOver || movesLeft <= 0) return;

      const groups = findMatchGroups(board);
      if (groups.length > 0) {
          setIsProcessing(true);
          processBoardStep();
      } else {
          // Check for Deadlock only when board is stable
          const hasMoves = hasPossibleMoves(board);
          if (!hasMoves && !swapping) {
               // Shuffle visual
               setEffects([{id: Date.now(), type: 'sparkle', r: GRID_SIZE/2, c: GRID_SIZE/2}]);
               onPlaySound('special');
               
               // Shuffle Logic
               setTimeout(() => {
                   setBoard(generateBoard());
               }, 800);
          }
      }
  }, [board, isProcessing, isGameOver, movesLeft, swapping, processBoardStep, onPlaySound]);


  // --- INTERACTION LOGIC ---

  const handleSpecialCombo = async (pos1: {r:number, c:number}, pos2: {r:number, c:number}, c1: Candy, c2: Candy) => {
      onMove();
      setIsProcessing(true);
      onPlaySound('special');
      comboCounter.current = 0;
      
      const types = [c1.type, c2.type];
      const has = (t: CandyType) => types.includes(t);
      
      let points = 0;
      const newBoard = board.map(row => [...row]);
      
      newBoard[pos1.r][pos1.c] = { ...newBoard[pos1.r][pos1.c], color: CandyColor.EMPTY };
      newBoard[pos2.r][pos2.c] = { ...newBoard[pos2.r][pos2.c], color: CandyColor.EMPTY };

      const clearList: {r: number, c: number}[] = [];
      const effectCenter = pos2;

      // 1. COLOR BOMB + COLOR BOMB
      if (c1.type === CandyType.COLOR_BOMB && c2.type === CandyType.COLOR_BOMB) {
          for(let r=0; r<GRID_SIZE; r++) {
              for(let c=0; c<GRID_SIZE; c++) clearList.push({r,c});
          }
          points = 5000;
          setEffects(prev => [...prev, { id: Date.now(), type: 'explosion', r: 3.5, c: 3.5 }]);
      }
      // 2. STRIPED + STRIPED
      else if ((c1.type === CandyType.STRIPED_H || c1.type === CandyType.STRIPED_V) && 
               (c2.type === CandyType.STRIPED_H || c2.type === CandyType.STRIPED_V)) {
          const { r, c } = effectCenter;
          for(let i=0; i<GRID_SIZE; i++) {
              clearList.push({r: r, c: i}); 
              clearList.push({r: i, c: c}); 
          }
          points = 2000;
          setEffects(prev => [...prev, { id: Date.now(), type: 'explosion', r, c }]);
      }
      // 3. WRAPPED + WRAPPED
      else if (c1.type === CandyType.WRAPPED && c2.type === CandyType.WRAPPED) {
          const { r, c } = effectCenter;
          for (let i = r - 2; i <= r + 2; i++) {
            for (let j = c - 2; j <= c + 2; j++) {
                clearList.push({r: i, c: j});
            }
          }
          points = 3000;
           setEffects(prev => [...prev, { id: Date.now(), type: 'explosion', r, c }]);
      }
      // 4. STRIPED + WRAPPED
      else if (has(CandyType.WRAPPED) && (has(CandyType.STRIPED_H) || has(CandyType.STRIPED_V))) {
          const { r, c } = effectCenter;
          for (let i = -1; i <= 1; i++) {
              for (let k = 0; k < GRID_SIZE; k++) clearList.push({r: r+i, c: k});
              for (let k = 0; k < GRID_SIZE; k++) clearList.push({r: k, c: c+i});
          }
          points = 2500;
          setEffects(prev => [...prev, { id: Date.now(), type: 'explosion', r, c }]);
      }
      // 5. COLOR BOMB + STRIPED/WRAPPED/NORMAL
      else if (has(CandyType.COLOR_BOMB)) {
          const other = c1.type === CandyType.COLOR_BOMB ? c2 : c1;
          const targetColor = other.color;
          
          if (other.type !== CandyType.NORMAL) {
              // === SPECIAL ASYNC COMBO ===
              const transformBoard = board.map(row => row.map(c => ({...c})));
              transformBoard[pos1.r][pos1.c] = { ...transformBoard[pos1.r][pos1.c], color: CandyColor.EMPTY };
              transformBoard[pos2.r][pos2.c] = { ...transformBoard[pos2.r][pos2.c], color: CandyColor.EMPTY };
              
              const affectedList: {r: number, c: number}[] = [];
              
              for(let r=0; r<GRID_SIZE; r++){
                  for(let c=0; c<GRID_SIZE; c++){
                      if(transformBoard[r][c].color === targetColor) {
                          if (other.type === CandyType.WRAPPED) {
                               transformBoard[r][c].type = CandyType.WRAPPED;
                          } else {
                               transformBoard[r][c].type = Math.random() > 0.5 ? CandyType.STRIPED_H : CandyType.STRIPED_V;
                          }
                          transformBoard[r][c].isNew = true;
                          affectedList.push({r, c});
                          setEffects(prev => [...prev, { id: Date.now() + Math.random(), type: 'sparkle', r, c }]);
                      }
                  }
              }
              
              setBoard(transformBoard);
              onPlaySound('special');
              
              // Wait for visual
              await new Promise(resolve => setTimeout(resolve, 800));
              
              onPlaySound('explode');
              const clearBoard = transformBoard.map(row => row.map(c => ({...c})));
              const finalClears = getAffectedCells(affectedList, clearBoard);
              
              finalClears.forEach(({r,c}) => {
                  if(r>=0 && r<GRID_SIZE && c>=0 && c<GRID_SIZE) {
                       clearBoard[r][c] = { ...clearBoard[r][c], color: CandyColor.EMPTY };
                       setEffects(prev => [...prev, { id: Date.now() + Math.random(), type: 'explosion', r, c }]);
                  }
              });
      
              onScore(3000 + finalClears.length * 100);
              setBoard(clearBoard);
              setSelected(null);
              
              // Gravity - Hand off to Loop
              setTimeout(() => {
                  const gravityBoard = applyGravity(clearBoard);
                  setBoard(gravityBoard);
                  setTimeout(() => { 
                      setIsProcessing(false); // This triggers the main loop useEffect!
                  }, 400);
              }, 600);
              
              return; 
          } else {
              // === NORMAL COLOR BOMB ===
              for(let r=0; r<GRID_SIZE; r++){
                  for(let c=0; c<GRID_SIZE; c++){
                      if(newBoard[r][c].color === targetColor) {
                          clearList.push({r,c});
                          setEffects(prev => [...prev, { id: Date.now() + Math.random(), type: 'sparkle', r, c }]);
                      }
                  }
              }
              points = 1500;
          }
      }

      const uniqueClear = Array.from(new Set(clearList.map(p => `${p.r},${p.c}`)))
        .map(s => { const [r,c] = s.split(',').map(Number); return {r,c}; });

      const finalClears = getAffectedCells(uniqueClear, newBoard);
      
      finalClears.forEach(({r,c}) => {
         if(r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
             newBoard[r][c] = { ...newBoard[r][c], color: CandyColor.EMPTY };
         }
      });
      
      onScore(points + finalClears.length * 60);
      setBoard(newBoard);
      setSelected(null);

      // Gravity - Hand off to Loop
      setTimeout(() => {
          const gravityBoard = applyGravity(newBoard);
          setBoard(gravityBoard);
          setTimeout(() => { 
              setIsProcessing(false); // This triggers the main loop useEffect!
          }, 400);
      }, 600);
  };

  const animateSwap = (r1: number, c1: number, r2: number, c2: number): Promise<void> => {
      return new Promise((resolve) => {
          setSwapping({ r1, c1, r2, c2 });
          onPlaySound('swap');
          setTimeout(() => {
              setSwapping(null);
              resolve();
          }, 300);
      });
  };

  const handleCandyClick = async (r: number, c: number) => {
    // Interaction immediately clears hint
    setHint(null);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);

    if (isProcessing || isGameOver || movesLeft <= 0 || swapping) return;

    onPlaySound('ui'); 

    if (!selected) {
      setSelected({ r, c });
      return;
    } 

    if (selected.r === r && selected.c === c) {
      setSelected(null);
      return;
    }

    const isAdjacent = Math.abs(selected.r - r) + Math.abs(selected.c - c) === 1;
    if (!isAdjacent) {
      setSelected({ r, c });
      return;
    }

    const prevSelected = { ...selected };
    setSelected(null);

    const candy1 = board[prevSelected.r][prevSelected.c];
    const candy2 = board[r][c];

    // 1. Lock Interaction
    setIsProcessing(true);
    
    // 2. Animate Swap
    await animateSwap(prevSelected.r, prevSelected.c, r, c);

    // 3. Check for Special Combos (Handles own Logic -> Then Loop)
    if ((candy1.type !== CandyType.NORMAL && candy2.type !== CandyType.NORMAL) || 
        (candy1.type === CandyType.COLOR_BOMB || candy2.type === CandyType.COLOR_BOMB)) {
        handleSpecialCombo(prevSelected, {r, c}, candy1, candy2);
        return;
    }

    // 4. Normal Swap Logic
    const newBoard = board.map(row => [...row]);
    const temp = newBoard[prevSelected.r][prevSelected.c];
    newBoard[prevSelected.r][prevSelected.c] = newBoard[r][c];
    newBoard[r][c] = temp;

    const groups = findMatchGroups(newBoard);
    
    if (groups.length > 0) {
        // Valid Move: Set Board -> Hand off to Loop
        setBoard(newBoard);
        onMove();
        setIsProcessing(false); // Triggers useEffect immediately
    } else {
       // Invalid: Revert
       onPlaySound('swap');
       setBoard(newBoard); // Set swapped temporarily so visual matches
       
       setTimeout(async () => {
           await animateSwap(prevSelected.r, prevSelected.c, r, c);
           setBoard(board); // Revert to original
           setIsProcessing(false); // Unlock
       }, 50);
    }
  };

  if (board.length === 0) return <div className="flex items-center justify-center h-64"><span className="text-white animate-pulse text-2xl candy-font">Mixing Soda...</span></div>;

  return (
    <div className="relative p-1 md:p-4 select-none w-full max-w-[600px] mx-auto">
        <div className="absolute inset-0 bg-white/5 rounded-3xl backdrop-blur-sm shadow-[0_0_50px_rgba(0,0,0,0.2)] transform scale-[1.02] border border-white/10"></div>
        
        <div 
            className="grid gap-1 md:gap-2 relative z-10 p-2 [--gap:0.25rem] md:[--gap:0.5rem]"
            style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
        >
        {board.map((row, r) => (
            row.map((candy, c) => {
            const isSelected = selected?.r === r && selected?.c === c;
            const isShaking = shakingCells.has(`${r},${c}`);
            const isDark = (r + c) % 2 === 0;
            const isHint = hint?.r === r && hint?.c === c;
            
            let animStyle: React.CSSProperties = {};
            let isSwappingCell = false;
            
            if (swapping && ((r === swapping.r1 && c === swapping.c1) || (r === swapping.r2 && c === swapping.c2))) {
                isSwappingCell = true;
                const isFrom = r === swapping.r1 && c === swapping.c1;
                const targetR = isFrom ? swapping.r2 : swapping.r1;
                const targetC = isFrom ? swapping.c2 : swapping.c1;
                
                const dR = targetR - r;
                const dC = targetC - c;
                
                animStyle = {
                    transform: `translate(calc(${dC} * (100% + var(--gap))), calc(${dR} * (100% + var(--gap)))) scale(1.15) rotate(${isFrom ? 5 : -5}deg)`,
                    zIndex: 50,
                    transition: 'all 0.3s ease-in-out'
                };
            }

            return (
                <div
                key={`${r}-${c}-${candy.id}`}
                onClick={() => handleCandyClick(r, c)}
                style={animStyle}
                className={`
                    relative aspect-square flex items-center justify-center cursor-pointer
                    rounded-2xl
                    ${isSelected ? 'z-20' : isSwappingCell ? 'z-50' : isShaking ? 'animate-wiggle z-30' : 'hover:brightness-110'}
                    ${isHint ? 'ring-4 ring-yellow-400 animate-pulse z-40 brightness-125' : ''}
                    ${!isSwappingCell ? 'transition-all duration-200' : ''}
                `}
                >
                <div className={`absolute inset-0 rounded-2xl ${isDark ? 'bg-black/20' : 'bg-black/10'} shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]`}></div>
                
                {isSelected && (
                     <div className="absolute inset-[-4px] rounded-2xl border-4 border-white/60 animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.5)] z-0"></div>
                )}

                {candy.color !== CandyColor.EMPTY && (
                    <div className={`relative w-full h-full p-0.5 md:p-1 ${isProcessing && !isSwappingCell && !isShaking ? 'scale-95' : 'scale-100'} ${candy.isNew ? 'animate-in-pop' : ''}`}>
                        <CandyIcon color={candy.color} type={candy.type} className="w-full h-full" />
                    </div>
                )}
                </div>
            );
            })
        ))}
        
        {effects.map((effect) => (
            <div 
                key={effect.id}
                className="absolute pointer-events-none flex items-center justify-center z-50"
                style={{
                    top: `${(effect.r / GRID_SIZE) * 100}%`,
                    left: `${(effect.c / GRID_SIZE) * 100}%`,
                    width: `${100 / GRID_SIZE}%`,
                    height: `${100 / GRID_SIZE}%`,
                }}
            >
                {effect.type === 'sparkle' && (
                    <div className="animate-sparkle relative w-[200%] h-[200%] flex items-center justify-center">
                         <Sparkles size={60} className="text-white fill-white drop-shadow-[0_0_10px_rgba(255,255,255,1)]" />
                         <div className="absolute inset-0 bg-white/50 blur-xl rounded-full animate-pulse"></div>
                    </div>
                )}
                {effect.type === 'explosion' && (
                    <div className="animate-explosion relative w-[300%] h-[300%] flex items-center justify-center">
                        <div className="absolute inset-0 border-4 border-white rounded-full opacity-50 animate-ping"></div>
                        <Zap size={80} strokeWidth={2} className="relative z-10 text-white fill-white drop-shadow-[0_0_20px_rgba(255,255,255,1)] rotate-12" />
                        <div className="absolute inset-0 bg-radial-gradient from-white via-blue-200 to-transparent opacity-70 blur-xl"></div>
                    </div>
                )}
            </div>
        ))}
        </div>
    </div>
  );
};

export default GameBoard;
