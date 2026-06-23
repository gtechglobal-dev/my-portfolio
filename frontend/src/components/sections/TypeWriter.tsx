import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

const words = [
  'Websites',
  'Mobile Apps',
  'UI/UX Design',
  'E-Commerce',
  'Brand Identity',
];

export default function TypeWriter() {
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [phase, setPhase] = useState<'typing' | 'pause' | 'deleting' | 'idle'>('typing');

  const currentWord = words[wordIdx];

  const tick = useCallback(() => {
    if (phase === 'typing') {
      if (charIdx < currentWord.length) {
        setCharIdx(c => c + 1);
      } else {
        setPhase('pause');
      }
    } else if (phase === 'pause') {
      setPhase('deleting');
    } else if (phase === 'deleting') {
      if (charIdx > 0) {
        setCharIdx(c => c - 1);
      } else {
        setPhase('idle');
      }
    } else {
      setWordIdx((w) => (w + 1) % words.length);
      setPhase('typing');
    }
  }, [phase, charIdx, currentWord.length, wordIdx]);

  useEffect(() => {
    const delays: Record<string, number> = { typing: 80, pause: 1800, deleting: 40, idle: 300 };
    const t = setTimeout(tick, delays[phase]);
    return () => clearTimeout(t);
  }, [tick, phase]);

  return (
    <span className="gradient-text">
      {currentWord.slice(0, charIdx)}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
        className="inline-block w-[2px] h-[1em] bg-indigo ml-0.5 align-middle"
      />
    </span>
  );
}
