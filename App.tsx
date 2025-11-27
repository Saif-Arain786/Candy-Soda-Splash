
import React, { useState, useEffect, useRef } from 'react';
import { AppView, GameStats, LevelConfig } from './types';
import { LEVELS } from './constants';
import { generateLevelLore, getLevelTips } from './services/aiService';
import { getLevelConfig } from './utils/gameLogic';
import GameBoard from './components/GameBoard';
import { Button } from './components/Button';
import { Settings, Map as MapIcon, Play, Star, Heart, RefreshCcw, ArrowLeft, HelpCircle, X, Volume2, Music, LogOut, Zap, Info, Gift, Coins, VolumeX } from 'lucide-react';
import { playSFX, SoundType } from './utils/audio';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState<number>(1);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    movesLeft: 0,
    level: 1,
    stars: 0,
  });
  const [coins, setCoins] = useState<number>(0);
  const [levelLore, setLevelLore] = useState<string>("");
  const [aiTip, setAiTip] = useState<string>("");
  const [showLevelStartModal, setShowLevelStartModal] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showLoseModal, setShowLoseModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);

  // Map Transition State
  const [mapTransition, setMapTransition] = useState<{from: number, to: number} | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(1);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const levelRefs = useRef<{[key: number]: HTMLDivElement | null}>({});

  // Initialization & Daily Reward Check
  useEffect(() => {
    try {
      // Load Coins
      const savedCoins = localStorage.getItem('candy_soda_coins');
      if (savedCoins) {
        setCoins(parseInt(savedCoins, 10));
      } else {
        setCoins(0); // Starter coins
      }

      // Load Progression
      const savedMaxLevel = localStorage.getItem('candy_soda_max_level');
      if (savedMaxLevel) {
          setMaxUnlockedLevel(parseInt(savedMaxLevel, 10));
      }

      // Check Daily Reward
      const lastClaimDate = localStorage.getItem('candy_soda_last_claim');
      const today = new Date().toDateString();

      if (lastClaimDate !== today) {
        // Delay slightly for better UX on load
        setTimeout(() => {
          setShowDailyReward(true);
        }, 1000);
      }
    } catch (e) {
      console.error("Failed to access local storage", e);
    }
  }, []);

  const handlePlaySound = (type: SoundType) => {
      if (isSoundOn) {
          playSFX(type);
      }
  };

  const handleClaimReward = () => {
    handlePlaySound('win');
    const rewardAmount = 100;
    const newCoins = coins + rewardAmount;
    setCoins(newCoins);
    setShowDailyReward(false);

    try {
      localStorage.setItem('candy_soda_coins', newCoins.toString());
      localStorage.setItem('candy_soda_last_claim', new Date().toDateString());
    } catch (e) {
      console.error("Failed to save reward", e);
    }
  };

  const startLevel = async (levelId: number) => {
    handlePlaySound('ui');
    setIsLoading(true);
    
    // Get Dynamic Level Config
    const levelConfig = getLevelConfig(levelId);
    
    // Parallel AI fetch
    const [lore, tip] = await Promise.all([
         generateLevelLore(levelId),
         getLevelTips(levelId, levelConfig.moves)
    ]);
    
    setLevelLore(lore);
    setAiTip(tip);
    
    setCurrentLevel(levelId);
    setStats({
      score: 0,
      movesLeft: levelConfig.moves,
      level: levelId,
      stars: 0
    });
    
    setIsLoading(false);
    setShowLevelStartModal(true);
  };

  const handleStartGame = () => {
    handlePlaySound('ui');
    setShowLevelStartModal(false);
    setView(AppView.GAME);
  };

  const handleScore = (points: number) => {
    setStats(prev => {
       const newScore = prev.score + points;
       const levelConfig = getLevelConfig(currentLevel);
       const progress = newScore / levelConfig.targetScore;
       let stars: 0|1|2|3 = 0;
       if (progress >= 0.3) stars = 1;
       if (progress >= 0.6) stars = 2;
       if (progress >= 1.0) stars = 3;

       return { ...prev, score: newScore, stars };
    });
  };

  const handleMove = () => {
    setStats(prev => {
      const newMoves = prev.movesLeft - 1;
      return { ...prev, movesLeft: newMoves };
    });
  };

  // Win/Loss Logic
  useEffect(() => {
    if (view !== AppView.GAME) return;
    
    const levelConfig = getLevelConfig(currentLevel);

    if (stats.movesLeft === 0) {
      if (stats.score >= levelConfig.targetScore * 0.3) { 
        // WIN
        setTimeout(() => {
            handlePlaySound('win');
            setShowWinModal(true);
            
            // Unlock next level logic
            if (currentLevel >= maxUnlockedLevel) {
                const nextLvl = currentLevel + 1;
                setMaxUnlockedLevel(nextLvl);
                localStorage.setItem('candy_soda_max_level', nextLvl.toString());
            }
        }, 1000);
      } else {
        // LOSE
        setTimeout(() => {
            handlePlaySound('lose');
            setShowLoseModal(true);
        }, 1000);
      }
    }
  }, [stats, currentLevel, view, maxUnlockedLevel]);

  // Map Animation Effect
  useEffect(() => {
    if (view === AppView.MAP && mapTransition) {
        // Sequence:
        // 1. Snap to old level
        // 2. Zoom Out (Scale 0.7)
        // 3. Scroll to new level
        // 4. Zoom In (Scale 1)
        // 5. Open Level
        
        const fromNode = levelRefs.current[mapTransition.from];
        const toNode = levelRefs.current[mapTransition.to];

        // 1. Initial Snap
        if (fromNode) {
            fromNode.scrollIntoView({ behavior: 'auto', block: 'center' });
        }

        setTimeout(() => {
            // 2. Zoom Out
            setMapZoom(0.7);
            
            setTimeout(() => {
                // 3. Scroll
                if (toNode) {
                    toNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                
                setTimeout(() => {
                    // 4. Zoom In
                    setMapZoom(1);
                    
                    setTimeout(() => {
                        // 5. Launch
                        startLevel(mapTransition.to);
                        setMapTransition(null);
                    }, 800); // Wait for zoom in to finish
                }, 800); // Duration of scroll
            }, 500); // Wait for zoom out
        }, 100); // Initial render delay
    }
  }, [view, mapTransition]);

  const nextLevel = () => {
    handlePlaySound('ui');
    setShowWinModal(false);
    // Proceed to Map for transition animation
    setView(AppView.MAP);
    setMapTransition({ from: currentLevel, to: currentLevel + 1 });
  };

  const retryLevel = () => {
    handlePlaySound('ui');
    setShowLoseModal(false);
    setShowWinModal(false);
    startLevel(currentLevel);
  };

  const quitToMap = () => {
    handlePlaySound('ui');
    setShowWinModal(false);
    setShowLoseModal(false);
    setShowQuitConfirm(false);
    setShowSettings(false);
    setView(AppView.MAP);
  };

  const toggleSound = () => {
      handlePlaySound('ui');
      setIsSoundOn(!isSoundOn);
  };

  // Calculate progress for bottle fill
  const levelConfig = getLevelConfig(currentLevel);
  const progressPercent = Math.min(100, (stats.score / levelConfig.targetScore) * 100);
  
  // Generate Map Levels Array
  // Show all unlocked levels plus 3 ahead to indicate path
  const visibleLevelIds = Array.from({ length: maxUnlockedLevel + 3 }, (_, i) => i + 1);

  // --- RENDER ---

  return (
    <div className="w-full h-screen overflow-hidden relative text-white font-nunito bg-[#2a0e68]">
      
      {/* HOME VIEW */}
      {view === AppView.HOME && (
        <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900">
           {/* Dynamic Background Elements */}
           <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
               <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-pink-500 rounded-full mix-blend-screen blur-[80px] opacity-60 animate-float"></div>
               <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500 rounded-full mix-blend-screen blur-[80px] opacity-60 animate-float" style={{animationDelay: '1s'}}></div>
           </div>

           <div className="z-10 flex flex-col items-center scale-90 md:scale-100">
              <h1 className="text-6xl md:text-8xl candy-font text-center leading-none drop-shadow-2xl text-stroke-white text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-orange-500 mb-8 relative">
                <span className="block transform -rotate-6">Candy</span>
                <span className="block text-8xl md:text-9xl text-pink-400 from-pink-300 to-purple-600 transform rotate-3 relative z-10 drop-shadow-[0_10px_0_rgba(0,0,0,0.3)]">Soda</span>
                <span className="block transform -rotate-2 text-blue-400 from-cyan-300 to-blue-600">Splash</span>
              </h1>
              
              <div className="flex flex-col gap-6 mt-8 items-center">
                 <Button variant="play" size="xl" onClick={() => { handlePlaySound('ui'); setView(AppView.MAP); }} className="animate-pulse-glow">
                    Play!
                 </Button>
                 
                 <div className="bg-black/30 px-6 py-2 rounded-full border border-white/20 backdrop-blur-sm">
                    <span className="text-pink-200 font-bold text-sm uppercase tracking-widest">The Sweetest Puzzle Game</span>
                 </div>
              </div>
           </div>

           <div className="absolute bottom-6 left-6">
               <Button variant="secondary" size="sm" className="w-12 h-12 !p-0 rounded-full" onClick={() => { handlePlaySound('ui'); setShowSettings(true); }}>
                   <Settings size={24} />
               </Button>
           </div>
        </div>
      )}

      {/* MAP VIEW */}
      {view === AppView.MAP && (
        <div className="relative w-full h-full bg-[#4fc3f7] overflow-y-auto hide-scrollbar" ref={mapContainerRef}>
           {/* Clouds BG */}
           <div className="fixed inset-0 pointer-events-none opacity-30 bg-[url('https://www.transparenttextures.com/patterns/clouds.png')]"></div>

           {/* Header */}
           <div className="sticky top-0 z-30 p-4 flex justify-between items-center bg-gradient-to-b from-cyan-400/90 to-transparent pb-12">
              <Button variant="secondary" size="sm" onClick={() => { handlePlaySound('ui'); setView(AppView.HOME); }} className="rounded-full w-10 h-10 !p-0 shadow-lg">
                  <ArrowLeft size={20} strokeWidth={3}/>
              </Button>
              
              <div className="flex gap-3 scale-90 md:scale-100">
                  <div className="bg-black/40 backdrop-blur-md rounded-full pl-2 pr-4 py-1 flex items-center gap-2 border-2 border-white/30 shadow-lg">
                     <div className="bg-red-500 p-1 rounded-full border border-red-300"><Heart size={14} className="fill-white text-white" /></div>
                     <span className="font-black text-lg text-white candy-shadow">5</span>
                  </div>
                  <div className="bg-black/40 backdrop-blur-md rounded-full pl-2 pr-4 py-1 flex items-center gap-2 border-2 border-white/30 shadow-lg">
                     <div className="bg-yellow-400 p-1 rounded-full border border-yellow-200"><Coins size={14} className="fill-white text-white" /></div>
                     <span className="font-black text-lg text-white candy-shadow">{coins}</span>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => { handlePlaySound('ui'); setShowSettings(true); }} className="rounded-full w-10 h-10 !p-0 shadow-lg">
                      <Settings size={18} />
                  </Button>
              </div>
           </div>

           {/* Level Path Container with Zoom Transform */}
           <div 
              className="relative flex flex-col items-center pb-32 gap-24 mt-10 min-h-[120vh] transition-transform duration-700 ease-in-out origin-center"
              style={{ transform: `scale(${mapZoom})` }}
           >
              {visibleLevelIds.map((lvlId, idx) => (
                 <div 
                    key={lvlId} 
                    ref={el => levelRefs.current[lvlId] = el}
                    className={`relative z-10 transform transition-all duration-1000 ease-in-out ${idx % 2 === 0 ? 'translate-x-16' : '-translate-x-16'} ${mapTransition?.to === lvlId ? 'scale-125 z-20' : 'hover:scale-110'}`}
                 >
                    <Button 
                      onClick={() => startLevel(lvlId)}
                      variant={maxUnlockedLevel >= lvlId ? 'play' : 'secondary'}
                      className={`
                         w-20 h-20 md:w-24 md:h-24 rounded-[2rem] text-3xl shadow-[0_10px_20px_rgba(0,0,0,0.3)] border-4
                         ${maxUnlockedLevel >= lvlId ? 'ring-4 ring-pink-300' : 'opacity-70 grayscale cursor-not-allowed'}
                         ${mapTransition?.to === lvlId ? 'ring-8 ring-white animate-pulse shadow-[0_0_40px_rgba(255,255,255,0.8)]' : ''}
                      `}
                      disabled={maxUnlockedLevel < lvlId}
                    >
                      {lvlId}
                    </Button>
                    {/* Connecting Dots */}
                    {idx < visibleLevelIds.length - 1 && (
                        <div className={`absolute -bottom-24 left-1/2 w-2 h-20 border-l-4 border-dashed border-white/50 ${idx%2===0 ? 'rotate-[-30deg] origin-top' : 'rotate-[30deg] origin-top'}`}></div>
                    )}
                 </div>
              ))}
              
              {/* Future Path Hint */}
              <div className="opacity-50 flex flex-col gap-4 mt-8">
                  <div className="w-2 h-4 bg-white/30 mx-auto rounded-full"></div>
                  <div className="w-2 h-4 bg-white/20 mx-auto rounded-full"></div>
                  <div className="w-2 h-4 bg-white/10 mx-auto rounded-full"></div>
              </div>
           </div>
        </div>
      )}

      {/* GAME VIEW - REVAMPED UI */}
      {view === AppView.GAME && (
        <div className="h-full flex flex-col relative overflow-hidden bg-[#2b97e6]">
           {/* Vibrant Background with Stripes */}
           <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600">
              <div className="absolute inset-0 bg-stripes opacity-30"></div>
              <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/30"></div>
           </div>
           
           {/* Floating Bubbles */}
           <div className="absolute inset-0 overflow-hidden pointer-events-none">
               {[...Array(12)].map((_, i) => (
                   <div key={i} className="absolute bg-white/10 rounded-full animate-float-up"
                       style={{
                           width: `${Math.random() * 60 + 20}px`,
                           height: `${Math.random() * 60 + 20}px`,
                           left: `${Math.random() * 100}%`,
                           animationDelay: `${Math.random() * 10}s`
                       }}
                   ></div>
               ))}
           </div>

           {/* Main Game Area: Sidebar + Board */}
           <div className="relative z-10 w-full h-full flex flex-col md:flex-row items-center justify-center gap-4 md:gap-16 p-4 max-w-7xl mx-auto">
              
              {/* LEFT SIDEBAR - "SODA BOTTLE" HUD */}
              {/* On mobile, it rotates to a horizontal bar or smaller pill. We'll keep it pill shaped but smaller on mobile */}
              <div className="flex-shrink-0 relative order-1 md:order-none">
                  <div className="w-fit md:w-40 h-[120px] md:h-[500px] bg-teal-800/80 rounded-[2rem] md:rounded-full border-4 border-teal-300/50 shadow-2xl relative overflow-hidden flex flex-row md:flex-col items-center justify-between md:justify-start py-2 md:py-6 px-4 md:px-0 backdrop-blur-sm ring-4 ring-black/10 ">
                      
                      {/* Shine effect */}
                      <div className="absolute top-0 left-2 md:left-8 w-full h-full md:w-6 bg-gradient-to-b from-white/20 to-transparent rounded-full pointer-events-none z-20"></div>

                      {/* Top: Moves */}
                      <div className="relative z-30 flex flex-col items-center md:mb-4">
                          <span className="text-[10px] md:text-xs font-black uppercase text-teal-100 tracking-widest mb-1">Moves</span>
                          <div className="text-4xl md:text-6xl font-black text-white drop-shadow-lg candy-font leading-none">{stats.movesLeft}</div>
                      </div>

                      {/* Middle: Target/Score & Liquid */}
                      {/* Desktop: Vertical Fill */}
                      <div className="hidden md:block relative w-16 flex-1 bg-black/30 rounded-full my-4 overflow-hidden border border-white/10 shadow-inner">
                          <div className="absolute bottom-0 w-full bg-gradient-to-t from-green-500 to-teal-400 transition-all duration-1000 ease-out flex items-start justify-center pt-1" style={{ height: `${progressPercent}%` }}>
                              <div className="w-full h-1 bg-white/50 absolute top-0"></div>
                              {/* Bubbles */}
                              <div className="w-1 h-1 bg-white/60 rounded-full absolute top-4 left-2 animate-float"></div>
                              <div className="w-2 h-2 bg-white/40 rounded-full absolute top-8 right-4 animate-float" style={{animationDelay: '0.5s'}}></div>
                          </div>
                          {/* Star Markers */}
                          <div className="absolute bottom-[30%] left-0 right-0 h-0.5 bg-white/30"></div>
                          <div className="absolute bottom-[60%] left-0 right-0 h-0.5 bg-white/30"></div>
                          <div className="absolute bottom-[100%] left-0 right-0 h-0.5 bg-white/30"></div>
                      </div>

                      {/* Mobile: Horizontal Pill inside */}
                      <div className="md:hidden flex-1 mx-4 h-4 bg-black/30 rounded-full relative overflow-hidden border border-white/10">
                          <div className="absolute left-0 h-full bg-gradient-to-r from-green-500 to-teal-400 transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                      </div>

                      {/* Bottom: Target Score Text */}
                      <div className="relative z-30 flex flex-col items-center md:mt-auto text-center">
                          <div className="text-xs text-teal-200 font-bold mb-0.5">Target</div>
                          <div className="text-lg md:text-2xl font-black text-white drop-shadow-md">{stats.score}</div>
                          <div className="text-[10px] text-white/60">/ {levelConfig.targetScore}</div>
                      </div>

                  </div>

                  {/* Settings Cog (Absolute to sidebar) */}
                  <div className="absolute -bottom-4 -left-4 md:bottom-4 md:-left-6 z-40">
                      <Button variant="secondary" size="sm" onClick={() => { handlePlaySound('ui'); setShowSettings(true); }} className="rounded-full w-10 h-10 !p-0 shadow-lg border-2 border-white/50">
                          <Settings size={18} />
                      </Button>
                  </div>
              </div>

              {/* CENTER - BOARD */}
              <div className="order-2 md:order-none flex-1 flex items-center justify-center">
                  <GameBoard 
                    movesLeft={stats.movesLeft}
                    onScore={handleScore}
                    onMove={handleMove}
                    isGameOver={showWinModal || showLoseModal}
                    onPlaySound={handlePlaySound}
                  />
              </div>

              {/* RIGHT - Characters / Decor (Optional placeholder for balance) */}
              <div className="hidden xl:block w-40 opacity-0"></div>

           </div>
           
           {/* Footer Tip */}
           <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20 pointer-events-none">
               <div className="bg-black/20 backdrop-blur-md px-4 py-1 rounded-full text-sm text-white/80 font-semibold animate-pulse">
                   {aiTip || "Match 4 candies for a special surprise!"}
               </div>
           </div>

        </div>
      )}

      {/* MODALS */}
      {(showLevelStartModal || showWinModal || showLoseModal || showQuitConfirm || showDailyReward || showSettings) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           
           {/* Daily Reward Modal */}
           {showDailyReward && (
              <div className="bg-gradient-to-b from-blue-400 to-purple-600 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden relative animate-in zoom-in duration-500 border-4 border-white/50">
                 {/* Burst BG */}
                 <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-[500px] h-[500px] bg-white/20 rounded-full animate-spin-slow" style={{background: 'conic-gradient(from 0deg, transparent 0deg 30deg, white 30deg 60deg, transparent 60deg 90deg, white 90deg 120deg, transparent 120deg 150deg, white 150deg 180deg, transparent 180deg 210deg, white 210deg 240deg, transparent 240deg 270deg, white 270deg 300deg, transparent 300deg 330deg, white 330deg 360deg)', opacity: 0.1}}></div>
                 </div>

                 <div className="relative z-10 flex flex-col items-center p-8 text-center">
                     <h2 className="text-4xl candy-font text-white drop-shadow-lg mb-2">Daily Sweet!</h2>
                     <p className="text-blue-100 font-bold mb-8">Come back every day for rewards!</p>
                     
                     <div className="relative mb-8 animate-float">
                         <Gift size={120} className="text-white fill-pink-500 drop-shadow-2xl" strokeWidth={1.5} />
                         <div className="absolute -right-2 -bottom-2 bg-yellow-400 text-yellow-900 font-black rounded-full w-12 h-12 flex items-center justify-center border-2 border-white shadow-lg rotate-12">
                            +100
                         </div>
                     </div>

                     <Button variant="play" size="lg" onClick={handleClaimReward} className="w-full text-xl shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                        Claim Reward!
                     </Button>
                 </div>
              </div>
           )}

           {/* Level Start */}
           {showLevelStartModal && (
              <div className="bg-[#fff0f5] w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white animate-in zoom-in duration-300">
                 <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-6 text-center relative">
                     <h2 className="text-4xl candy-font text-white drop-shadow-md">Level {currentLevel}</h2>
                     <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-white text-pink-600 px-4 py-1 rounded-full text-sm font-black shadow-md border-2 border-pink-100 whitespace-nowrap">
                         Target Score: {levelConfig.targetScore}
                     </div>
                     <button onClick={() => { handlePlaySound('ui'); setShowLevelStartModal(false); }} className="absolute top-4 right-4 text-white/80 hover:text-white"><X size={24}/></button>
                 </div>
                 <div className="pt-10 pb-8 px-8 text-center">
                    <p className="text-purple-800 font-medium italic mb-8 text-lg">"{levelLore}"</p>
                    <Button variant="play" size="lg" onClick={handleStartGame} className="w-full text-2xl shadow-pink-500/40">
                        Play!
                    </Button>
                 </div>
              </div>
           )}

           {/* Win Modal */}
           {showWinModal && (
              <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-visible relative animate-in zoom-in duration-500">
                  <div className="absolute -top-16 left-0 right-0 flex justify-center">
                      <div className="relative">
                          <div className="text-6xl candy-font text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-orange-500 text-stroke-white drop-shadow-xl transform -rotate-6">
                              Soda!
                          </div>
                      </div>
                  </div>
                  <div className="pt-12 pb-8 px-6 flex flex-col items-center bg-gradient-to-b from-purple-50 to-white rounded-[2.5rem] border-4 border-purple-100">
                      <div className="flex gap-2 mb-6">
                          {[1,2,3].map(s => (
                              <Star 
                                key={s} 
                                size={s === 2 ? 56 : 40} 
                                className={`${stats.stars >= s ? 'fill-yellow-400 text-yellow-600' : 'fill-gray-200 text-gray-300'} filter drop-shadow-sm transition-all duration-500 ${s===2 ? '-mt-4' : ''}`} 
                                strokeWidth={2.5}
                              />
                          ))}
                      </div>
                      <div className="text-center mb-8">
                          <div className="uppercase text-gray-400 text-xs font-black tracking-widest mb-1">Total Score</div>
                          <div className="text-5xl candy-font text-pink-500">{stats.score}</div>
                      </div>
                      <Button variant="play" size="lg" onClick={nextLevel} className="w-full">Next Level</Button>
                  </div>
              </div>
           )}

           {/* Lose Modal */}
           {showLoseModal && (
              <div className="bg-white w-full max-w-xs rounded-3xl p-6 text-center shadow-2xl border-4 border-gray-200">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">💔</div>
                  <h2 className="text-2xl font-black text-gray-700 mb-2">Out of Moves</h2>
                  <p className="text-gray-500 mb-6">Don't give up! Try again?</p>
                  <div className="flex gap-2">
                      <Button variant="secondary" className="flex-1" onClick={quitToMap}>Exit</Button>
                      <Button variant="play" className="flex-1" onClick={retryLevel}>Retry</Button>
                  </div>
              </div>
           )}
           
           {/* Quit Confirm */}
           {showQuitConfirm && (
               <div className="bg-[#2d1b4e] p-1 rounded-3xl w-80 border-4 border-purple-500 shadow-2xl">
                   <div className="bg-purple-50 rounded-[1.2rem] p-6 text-center">
                       <h3 className="text-xl font-black text-purple-900 mb-4">Quit Game?</h3>
                       <p className="text-gray-600 mb-6 text-sm">Current progress will be lost!</p>
                       <div className="flex flex-col gap-3">
                           <Button variant="play" onClick={() => { handlePlaySound('ui'); setShowQuitConfirm(false); }}>Keep Playing</Button>
                           <Button variant="danger" onClick={quitToMap}>End Game</Button>
                       </div>
                   </div>
               </div>
           )}

           {/* Settings Modal */}
           {showSettings && (
               <div className="bg-[#fff0f5] w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white animate-in zoom-in duration-300">
                   <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-4 flex justify-between items-center">
                       <h3 className="text-2xl candy-font text-white drop-shadow-md pl-2">Settings</h3>
                       <button onClick={() => { handlePlaySound('ui'); setShowSettings(false); }} className="text-white/80 hover:text-white bg-black/20 p-2 rounded-full"><X size={20}/></button>
                   </div>
                   <div className="p-8 flex flex-col gap-6">
                       <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                           <div className="flex items-center gap-3">
                               <div className={`p-2 rounded-full ${isSoundOn ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                   {isSoundOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
                               </div>
                               <div>
                                   <div className="font-bold text-gray-800">Sound Effects</div>
                                   <div className="text-xs text-gray-400">{isSoundOn ? 'On' : 'Off'}</div>
                               </div>
                           </div>
                           <div 
                                onClick={toggleSound}
                                className={`w-14 h-8 rounded-full flex items-center px-1 cursor-pointer transition-colors ${isSoundOn ? 'bg-green-500' : 'bg-gray-300'}`}
                           >
                               <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${isSoundOn ? 'translate-x-6' : 'translate-x-0'}`}></div>
                           </div>
                       </div>
                       
                       {view === AppView.GAME && (
                           <Button variant="danger" onClick={quitToMap} className="w-full">
                               <LogOut size={20} /> Quit Level
                           </Button>
                       )}
                   </div>
               </div>
           )}
        </div>
      )}

      {/* Loading Screen - Marvellous Update */}
      {isLoading && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-[#ff6b6b] via-[#ff8e53] to-[#ffc3a0] overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            
            {/* Floating Bubbles */}
            {[...Array(10)].map((_, i) => (
                <div 
                    key={i}
                    className="absolute bg-white/40 rounded-full animate-float-up"
                    style={{
                        width: `${Math.random() * 30 + 10}px`,
                        height: `${Math.random() * 30 + 10}px`,
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 2}s`,
                        animationDuration: `${Math.random() * 5 + 4}s`
                    }}
                ></div>
            ))}

            <div className="relative z-10 flex flex-col items-center scale-125">
                <div className="w-24 h-24 mb-8 relative">
                    {/* Custom Spinner: Rotating Candies */}
                    <div className="absolute inset-0 animate-spin" style={{animationDuration: '3s'}}>
                         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-5 bg-red-500 rounded-full shadow-lg"></div>
                         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-5 bg-blue-500 rounded-full shadow-lg"></div>
                         <div className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 bg-green-500 rounded-full shadow-lg"></div>
                         <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 bg-yellow-500 rounded-full shadow-lg"></div>
                    </div>
                    <div className="absolute inset-2 bg-white/20 rounded-full backdrop-blur-md border border-white/40"></div>
                    <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                        <span className="text-4xl drop-shadow-sm">🍬</span>
                    </div>
                </div>
                <h2 className="text-5xl candy-font text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.2)] animate-bounce">Loading...</h2>
                <p className="text-white/80 font-bold mt-4 tracking-widest uppercase text-sm">Mixing Sodas...</p>
            </div>
        </div>
      )}

    </div>
  );
};

export default App;
