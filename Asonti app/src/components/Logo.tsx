interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  textColor?: string;
}

export function Logo({ size = 32, showText = true, className = "", textColor = "text-foreground" }: LogoProps) {
  // Create 12 dots arranged in a circle with gradient colors
  const dots = [];
  const radius = size * 0.35; // Circle radius for dot placement
  const dotSize = size * 0.08; // Individual dot size
  
  // Color progression from dark blue to light blue - matching the brand image
  const colors = [
    '#1E3A8A', // dark navy blue
    '#1E40AF', // blue-800
    '#1D4ED8', // blue-700
    '#2563EB', // blue-600 (primary hover)
    '#3B82F6', // blue-500 (primary)
    '#60A5FA', // blue-400 (secondary)
    '#93C5FD', // blue-300
    '#BFDBFE', // blue-200
    '#DBEAFE', // blue-100
    '#EFF6FF', // blue-50
    '#F8FAFC', // slate-50
    '#E2E8F0', // slate-200
  ];
  
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30) * (Math.PI / 180); // 30 degrees between each dot
    const x = size / 2 + radius * Math.cos(angle);
    const y = size / 2 + radius * Math.sin(angle);
    
    dots.push(
      <circle
        key={i}
        cx={x}
        cy={y}
        r={dotSize}
        fill={colors[i]}
        className="transition-all duration-300"
      />
    );
  }
  
  const textSizeClass = size <= 32 ? "text-sm" : size <= 48 ? "text-base" : "text-lg";
  const aiTextSize = size <= 32 ? "text-xs" : size <= 48 ? "text-sm" : "text-base";
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transition-transform duration-300 hover:scale-110 flex-shrink-0"
      >
        {dots}
      </svg>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-medium ${textColor} ${textSizeClass} leading-tight`}>ASONTI</span>
          <span className={`font-medium ${textColor} ${aiTextSize} leading-tight`}>AI</span>
        </div>
      )}
    </div>
  );
}