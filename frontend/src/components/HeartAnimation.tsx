import { useEffect } from 'react';

interface HeartAnimationProps {
  onDone: () => void;
}

export default function HeartAnimation({ onDone }: HeartAnimationProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, 800);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
      <div className="animate-heart-float">
        <svg width="100" height="100" viewBox="0 0 24 24" fill="#8A2BE2" filter="drop-shadow(0 0 20px rgba(138,43,226,0.8))">
          <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
        </svg>
      </div>
    </div>
  );
}
