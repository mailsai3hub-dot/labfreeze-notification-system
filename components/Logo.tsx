import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => {
  return (
    <img 
      src="/assets/logo.png" 
      alt="Generations Genetics Labs" 
      className={`${className} object-contain`} 
      style={{ filter: 'drop-shadow(0 0 5px #00E5FF) brightness(1.2)' }}
      referrerPolicy="no-referrer"
    />
  );
};
