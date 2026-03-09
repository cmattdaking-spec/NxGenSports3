// Inline SVG logos for each sport — used in the sidebar

export const SportLogoSVG = ({ sport, className = "w-9 h-9" }) => {
  const logos = {
    football: (
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className}>
        <image href="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a9060b8860c90c81d2e1c7/661cb3b76_image_aaa46895.png" width="200" height="200"/>
      </svg>
    ),
    basketball: (
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="200" height="200" fill="none"/>
        <text x="40" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#1A1A1A">N</text>
        <text x="100" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#FF3B30">x</text>
        <path d="M110 125 L160 125 L150 160 L120 160 Z" fill="none" stroke="#FF3B30" strokeWidth="4"/>
        <path d="M115 125 L125 160 M135 125 L135 160 M155 125 L145 160" stroke="#FF3B30" strokeWidth="2"/>
      </svg>
    ),
    baseball: (
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className}>
        <text x="40" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#1A1A1A">N</text>
        <text x="100" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#FF3B30">x</text>
        <path d="M30 60 Q 50 100 30 140" fill="none" stroke="#FF3B30" strokeWidth="5" strokeDasharray="8,4"/>
        <path d="M170 60 Q 150 100 170 140" fill="none" stroke="#FF3B30" strokeWidth="5" strokeDasharray="8,4"/>
      </svg>
    ),
    softball: (
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className}>
        <text x="40" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#1A1A1A">N</text>
        <text x="100" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#FF3B30">x</text>
        <path d="M30 60 Q 50 100 30 140" fill="none" stroke="#FF3B30" strokeWidth="5" strokeDasharray="8,4"/>
        <path d="M170 60 Q 150 100 170 140" fill="none" stroke="#FF3B30" strokeWidth="5" strokeDasharray="8,4"/>
      </svg>
    ),
    volleyball: (
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className}>
        <text x="40" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#1A1A1A">N</text>
        <text x="100" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#FF3B30">x</text>
        <path d="M110 50 C 130 60, 130 90, 110 100" fill="none" stroke="#FF3B30" strokeWidth="4"/>
        <path d="M120 45 C 150 65, 150 95, 120 115" fill="none" stroke="#FF3B30" strokeWidth="4"/>
      </svg>
    ),
    soccer: (
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className}>
        <text x="40" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#1A1A1A">N</text>
        <text x="100" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#FF3B30">x</text>
        <path d="M45 60 L55 60 L60 70 L55 80 L45 80 L40 70 Z" fill="#1A1A1A" opacity="0.3"/>
        <path d="M60 85 L70 85 L75 95 L70 105 L60 105 L55 95 Z" fill="#1A1A1A" opacity="0.3"/>
      </svg>
    ),
    track: (
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className}>
        <text x="40" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#1A1A1A">N</text>
        <text x="100" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#FF3B30">x</text>
        <line x1="140" y1="80" x2="180" y2="80" stroke="#FF3B30" strokeWidth="4"/>
        <line x1="145" y1="95" x2="185" y2="95" stroke="#FF3B30" strokeWidth="4"/>
        <line x1="140" y1="110" x2="180" y2="110" stroke="#FF3B30" strokeWidth="4"/>
      </svg>
    ),
    cross_country: (
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className}>
        <text x="40" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#1A1A1A">N</text>
        <text x="100" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#FF3B30">x</text>
        <line x1="140" y1="80" x2="180" y2="80" stroke="#FF3B30" strokeWidth="4"/>
        <line x1="145" y1="95" x2="185" y2="95" stroke="#FF3B30" strokeWidth="4"/>
        <line x1="140" y1="110" x2="180" y2="110" stroke="#FF3B30" strokeWidth="4"/>
      </svg>
    ),
    boxing: (
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="25" y="40" width="150" height="100" fill="none" stroke="#1A1A1A" strokeWidth="6"/>
        <text x="45" y="115" fontFamily="Arial Black, sans-serif" fontSize="70" fill="#1A1A1A">N</text>
        <text x="100" y="115" fontFamily="Arial Black, sans-serif" fontSize="70" fill="#FF3B30">x</text>
      </svg>
    ),
    golf: (
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className}>
        <text x="40" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#1A1A1A">N</text>
        <text x="100" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#FF3B30">x</text>
        <path d="M40 50 L40 120" stroke="#FF3B30" strokeWidth="6"/>
        <path d="M40 50 L70 65 L40 80 Z" fill="#FF3B30"/>
      </svg>
    ),
    tennis: (
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className}>
        <text x="40" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#1A1A1A">N</text>
        <text x="100" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#FF3B30">x</text>
        <path d="M120 60 A 40 40 0 0 1 160 100" fill="none" stroke="#FF3B30" strokeWidth="5"/>
        <circle cx="165" cy="105" r="5" fill="#FF3B30"/>
      </svg>
    ),
    wrestling: (
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="100" cy="90" r="75" fill="none" stroke="#1A1A1A" strokeWidth="4"/>
        <text x="45" y="120" fontFamily="Arial Black, sans-serif" fontSize="75" fill="#1A1A1A">N</text>
        <text x="105" y="120" fontFamily="Arial Black, sans-serif" fontSize="75" fill="#FF3B30">x</text>
      </svg>
    ),
    lacrosse: (
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className}>
        <text x="40" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#1A1A1A">N</text>
        <text x="100" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#FF3B30">x</text>
        <path d="M110 60 L145 60 L155 90 L145 120 L110 120" fill="none" stroke="#FF3B30" strokeWidth="3"/>
        <path d="M115 60 L115 120 M125 60 L125 120 M135 60 L135 120" stroke="#FF3B30" strokeWidth="1" opacity="0.5"/>
      </svg>
    ),
  };

  return logos[sport] || (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className}>
      <text x="40" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#1A1A1A">N</text>
      <text x="100" y="120" fontFamily="Arial Black, sans-serif" fontSize="80" fill="#FF3B30">x</text>
    </svg>
  );
};