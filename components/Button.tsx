import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'play' | 'gold';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "relative font-black uppercase tracking-wide rounded-full shadow-xl transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-b-[4px] active:border-b-0 active:translate-y-[4px] overflow-hidden candy-font z-10";
  
  const variants = {
    primary: "bg-gradient-to-b from-[#6ae46a] to-[#2ecc71] border-[#27ae60] text-white ring-2 ring-[#a9f1a9]",
    secondary: "bg-gradient-to-b from-[#6dd5ed] to-[#2193b0] border-[#1c748c] text-white ring-2 ring-[#a0e4f5]",
    danger: "bg-gradient-to-b from-[#ff758c] to-[#ff7eb3] border-[#c2185b] text-white ring-2 ring-[#ffabc4]",
    play: "bg-gradient-to-b from-[#ff6bce] to-[#c51a96] border-[#8e0e6b] text-white ring-4 ring-white/50 shadow-[0_0_20px_rgba(255,105,180,0.6)]",
    gold: "bg-gradient-to-b from-[#f6d365] to-[#fda085] border-[#d35400] text-white ring-2 ring-[#ffe29f]"
  };

  const sizes = {
    sm: "px-3 py-1 text-xs min-w-[60px]",
    md: "px-6 py-2 text-lg min-w-[120px]",
    lg: "px-10 py-3 text-2xl min-w-[160px]",
    xl: "px-12 py-5 text-4xl min-w-[220px]",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {/* Gloss Shine */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-white/30 rounded-t-full pointer-events-none"></div>
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-2 drop-shadow-[0_2px_0_rgba(0,0,0,0.2)]">
        {children}
      </div>
    </button>
  );
};