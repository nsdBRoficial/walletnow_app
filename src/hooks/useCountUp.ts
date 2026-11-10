/**
 * @module src\hooks\useCountUp.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { useState, useEffect } from 'react';

export function useCountUp(endValue: number, duration: number = 1000, delay: number = 0) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;
    let delayTimeout: NodeJS.Timeout;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percent = Math.min(progress / duration, 1);
      
      // Easing out quint
      const easeOut = 1 - Math.pow(1 - percent, 5);
      
      setCount(endValue * easeOut);

      if (percent < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    delayTimeout = setTimeout(() => {
      animationFrame = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(delayTimeout);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [endValue, duration, delay]);

  return count;
}
