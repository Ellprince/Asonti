import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface StreamingTextProps {
  text: string;
  onComplete?: () => void;
  speed?: number; // characters per second
}

export function StreamingText({ text, onComplete, speed = 60 }: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        // Add 1-3 characters at a time for more natural streaming
        const charsToAdd = Math.min(
          Math.floor(Math.random() * 4) + 2,
          text.length - currentIndex
        );
        setDisplayedText(text.substring(0, currentIndex + charsToAdd));
        setCurrentIndex(currentIndex + charsToAdd);
      }, 1000 / speed);

      return () => clearTimeout(timeout);
    } else if (!isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [currentIndex, text, speed, onComplete, isComplete]);

  // Reset when text changes
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
    setIsComplete(false);
  }, [text]);

  return (
    <div className="relative">
      <div className="whitespace-pre-wrap break-words">{displayedText}</div>
      {!isComplete && (
        <motion.span
          className="inline-block w-0.5 h-4 bg-current ml-0.5"
          animate={{ opacity: [1, 0] }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatType: 'reverse'
          }}
        />
      )}
    </div>
  );
}