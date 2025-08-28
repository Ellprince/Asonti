import { motion } from 'framer-motion';

export function TypingIndicator() {
  return (
    <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted text-muted-foreground max-w-[80%] md:max-w-[70%] lg:max-w-[60%]">
      <div className="flex space-x-1">
        <motion.div
          className="w-2 h-2 bg-muted-foreground rounded-full"
          animate={{ y: [0, -8, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            repeatDelay: 0.1,
            delay: 0
          }}
        />
        <motion.div
          className="w-2 h-2 bg-muted-foreground rounded-full"
          animate={{ y: [0, -8, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            repeatDelay: 0.1,
            delay: 0.2
          }}
        />
        <motion.div
          className="w-2 h-2 bg-muted-foreground rounded-full"
          animate={{ y: [0, -8, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            repeatDelay: 0.1,
            delay: 0.4
          }}
        />
      </div>
      <span className="text-xs opacity-70">Your future self is thinking...</span>
    </div>
  );
}