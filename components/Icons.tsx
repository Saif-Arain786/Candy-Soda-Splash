
import React from 'react';
import { CandyColor, CandyType } from '../types';
import { Heart, Hexagon, Triangle, Square, Star, Circle, Droplets, Zap, Bomb } from 'lucide-react';

export const CandyIcon = ({ color, type, className }: { color: CandyColor; type: CandyType; className?: string }) => {
  const baseClass = "filter drop-shadow-md transition-all duration-200";
  
  // Helper to render stripes/wrappers
  const renderOverlays = () => {
    if (type === CandyType.STRIPED_H) {
      return (
        <div className="absolute inset-0 flex flex-col justify-center items-center opacity-60">
           <div className="w-full h-1 bg-white/80 blur-[1px] mb-1"></div>
           <div className="w-full h-1 bg-white/80 blur-[1px] mt-1"></div>
        </div>
      );
    }
    if (type === CandyType.STRIPED_V) {
      return (
         <div className="absolute inset-0 flex flex-row justify-center items-center opacity-60">
           <div className="h-full w-1 bg-white/80 blur-[1px] mr-1"></div>
           <div className="h-full w-1 bg-white/80 blur-[1px] ml-1"></div>
        </div>
      );
    }
    if (type === CandyType.WRAPPED) {
      return (
        <div className="absolute inset-[-4px] border-4 border-white/50 rounded-xl opacity-80 animate-pulse"></div>
      );
    }
    return null;
  };

  // Special Color Bomb Render
  if (color === CandyColor.MULTI || type === CandyType.COLOR_BOMB) {
      return (
        <div className={`${className} ${baseClass} p-1`}>
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-gray-800 to-black border-2 border-gray-600 shadow-lg flex items-center justify-center overflow-hidden">
                {/* Sprinkles */}
                <div className="absolute w-1 h-1 bg-red-500 top-2 left-3 rounded-full"></div>
                <div className="absolute w-1 h-1 bg-blue-500 top-5 left-5 rounded-full"></div>
                <div className="absolute w-1 h-1 bg-yellow-500 bottom-3 right-3 rounded-full"></div>
                <div className="absolute w-1 h-1 bg-green-500 bottom-5 left-2 rounded-full"></div>
                <div className="absolute w-1 h-1 bg-purple-500 top-2 right-4 rounded-full"></div>
                <div className="absolute w-1 h-1 bg-orange-500 center rounded-full"></div>
                
                <Bomb className="text-white w-1/2 h-1/2 animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 rounded-full"></div>
            </div>
        </div>
      );
  }

  const renderCandy = (
    inner: React.ReactNode, 
    bgGradient: string, 
    borderColor: string, 
    shadowColor: string,
    shapeClass: string = "rounded-2xl"
  ) => (
    <div className={`${className} ${baseClass} p-0.5`}>
      <div className={`relative w-full h-full ${shapeClass} ${bgGradient} border-2 ${borderColor} shadow-[inset_0_-4px_6px_rgba(0,0,0,0.3)] overflow-hidden flex items-center justify-center`}>
        {/* Top Gloss */}
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent opacity-80 rounded-t-lg"></div>
        
        {/* Bottom Highlight */}
        <div className="absolute bottom-1 right-1 w-2 h-2 bg-white/40 rounded-full blur-[1px]"></div>

        {/* Inner Icon/Shape */}
        <div className="relative z-10 opacity-90 mix-blend-overlay brightness-125 flex items-center justify-center">
           {inner}
        </div>

        {/* Special Type Overlays */}
        {renderOverlays()}

        {/* Center Shine */}
        <div className="absolute top-1/4 left-1/4 w-1/3 h-1/3 bg-gradient-to-br from-white/80 to-transparent rounded-full blur-sm rotate-[-20deg]"></div>
      </div>
    </div>
  );

  switch (color) {
    case CandyColor.RED: // Heart / Jelly
      return renderCandy(
        <Heart className="fill-red-800 text-red-900 w-3/4 h-3/4" strokeWidth={3} />,
        "bg-gradient-to-br from-red-400 to-red-600",
        "border-red-700",
        "shadow-red-900",
        "rounded-full"
      );
    case CandyColor.BLUE: // Lozenge / Hard Candy
      return renderCandy(
        <div className="w-2/3 h-2/3 border-2 border-cyan-200/50 rounded-full"></div>,
        "bg-gradient-to-br from-cyan-400 to-blue-600",
        "border-blue-700",
        "shadow-blue-900",
        "rounded-full"
      );
    case CandyColor.GREEN: // Square / Gummy
      return renderCandy(
        <div className="w-3/4 h-3/4 bg-green-800/20 rounded-md"></div>,
        "bg-gradient-to-br from-green-400 to-emerald-600",
        "border-emerald-700",
        "shadow-green-900",
        "rounded-xl"
      );
    case CandyColor.YELLOW: // Drop
      return renderCandy(
        <Droplets className="fill-yellow-600 text-yellow-800 w-3/4 h-3/4 rotate-180" strokeWidth={0} />,
        "bg-gradient-to-br from-yellow-300 to-orange-400",
        "border-yellow-600",
        "shadow-yellow-900",
        "rounded-[1.5rem] rounded-t-full"
      );
    case CandyColor.PURPLE: // Cluster
      return renderCandy(
        <Hexagon className="fill-purple-900/30 text-purple-900 w-3/4 h-3/4" strokeWidth={2} />,
        "bg-gradient-to-br from-purple-400 to-fuchsia-600",
        "border-purple-700",
        "shadow-purple-900",
        "rounded-3xl"
      );
    case CandyColor.ORANGE: // Circle
      return renderCandy(
        <Circle className="fill-orange-800/20 text-orange-900 w-2/3 h-2/3" strokeWidth={2} />,
        "bg-gradient-to-br from-orange-300 to-red-500",
        "border-orange-700",
        "shadow-orange-900",
        "rounded-full"
      );
    default:
      return <div className="w-full h-full" />;
  }
};
