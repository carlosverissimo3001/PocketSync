import React, { useEffect, useRef, useState, forwardRef } from 'react';

interface CenterInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    className: string;
    onBlur: () => void;
    type?: string;
    onEnter?: () => void;
}

export const CenterInput = forwardRef<HTMLInputElement, CenterInputProps>(
  ({ value, onChange, placeholder, className, onBlur, type = "text", onEnter }, ref) => {
    const [width, setWidth] = useState(0);
    const measureRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
      if (measureRef.current) {
        const textWidth = measureRef.current.offsetWidth;
        setWidth(textWidth);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onEnter?.();
      }
    };

    return (
      <div className="relative w-full h-full">
        <div 
          ref={measureRef}
          className="absolute invisible whitespace-pre px-1"
          style={{
            font: 'inherit',
            position: 'absolute',
            top: 0,
            left: '-9999px'
          }}
        >
          {value || placeholder}
        </div>

        <div 
          ref={containerRef}
          className="w-full h-full overflow-hidden"
        >
          <input
            ref={ref}
            type={type}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full h-full text-center bg-transparent outline-none ${className}`}
            style={{
              width: `${Math.max(100, width + 40)}%`,
              transform: 'translateX(-50%)',
              marginLeft: '50%'
            }}
            onBlur={onBlur}
          />
        </div>
      </div>
    );
  }
);

export default CenterInput;