import { useEffect, useState } from 'react';

interface TextAnimateProps {
  text?: string;
  children?: string;
  animation?: 'slideUp' | 'fadeIn';
  by?: 'word' | 'char';
  className?: string;
  style?: React.CSSProperties;
}

export function TextAnimate({ 
  text,
  children, 
  animation = 'fadeIn', 
  by = 'word',
  className = '',
  style
}: TextAnimateProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  const content = text || children || '';

  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, [content]);

  const elements = by === 'word' ? content.split(' ') : content.split('');

  return (
    <span className={className} style={style}>
      {elements.map((element, index) => (
        <span
          key={`${element}-${index}`}
          className={`inline-block ${
            animation === 'slideUp' 
              ? `transition-all duration-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`
              : `transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`
          }`}
          style={{ 
            transitionDelay: `${index * 50}ms`,
            marginRight: by === 'word' ? '0.25em' : '0'
          }}
        >
          {element}
        </span>
      ))}
    </span>
  );
}
