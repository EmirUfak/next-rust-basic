'use client';
import { useRef } from 'react';

export const RenderCounter = () => {
  const renderCount = useRef(0);
  renderCount.current += 1;
  return (
    <div className="p-4 border border-gray-200 rounded mt-4 bg-white text-gray-900 shadow-sm">
      <h3 className="font-bold">React Compiler Check</h3>
      <p suppressHydrationWarning>Render Count: {renderCount.current}</p>
      <p className="text-xs text-gray-500">If this number doesn't increase when you interact with other parts of the page (and props didn't change), the compiler is working!</p>
    </div>
  );
};
