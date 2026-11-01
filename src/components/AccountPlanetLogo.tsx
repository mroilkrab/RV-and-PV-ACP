import React, { useId } from 'react';

interface LogoProps {
  customLogoUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  isPrint?: boolean;
  hideTaxBadge?: boolean;
}

export const AccountPlanetLogo: React.FC<LogoProps> = ({
  customLogoUrl,
  size = 'md',
  showText = true,
  className = '',
  isPrint = false,
  hideTaxBadge = false,
}) => {
  const uid = useId().replace(/:/g, '');

  // Dimension maps - enlarged and prominent company name
  const dimMap = {
    sm: { iconH: 'h-9', iconW: 'w-14', textTitle: 'text-sm sm:text-base font-extrabold', textSub: 'text-[10px] sm:text-[11px]' },
    md: { iconH: 'h-11 sm:h-12', iconW: 'w-16 sm:w-20', textTitle: 'text-lg sm:text-xl lg:text-2xl font-extrabold', textSub: 'text-[11px] sm:text-xs' },
    lg: { iconH: 'h-14 sm:h-16', iconW: 'w-24 sm:w-28', textTitle: 'text-xl sm:text-2xl lg:text-3xl font-extrabold', textSub: 'text-xs sm:text-sm' },
    xl: { iconH: 'h-18 sm:h-20', iconW: 'w-32 sm:w-36', textTitle: 'text-2xl sm:text-3xl lg:text-4xl font-extrabold', textSub: 'text-sm sm:text-base' },
  };

  const currentDim = dimMap[size];

  // If a custom image URL is provided (and not the default svg path or empty), render the image
  if (customLogoUrl && customLogoUrl.trim().length > 0 && customLogoUrl !== '/account-planet-logo.svg') {
    return (
      <div className={`flex items-center gap-3 sm:gap-3.5 ${className}`}>
        <img
          src={customLogoUrl}
          alt="Account Planet Logo"
          className={`${currentDim.iconH} w-auto object-contain`}
          referrerPolicy="no-referrer"
        />
        {showText && (
          <div className="flex flex-col leading-tight">
            <span className={`font-extrabold tracking-tight ${isPrint ? 'text-slate-900 text-xl' : 'text-slate-950 ' + currentDim.textTitle} font-prompt`}>
              บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`font-bold tracking-wider ${isPrint ? 'text-slate-600' : 'text-blue-700'} ${currentDim.textSub}`}>
                ACCOUNT PLANET CO., LTD.
              </span>
              {!hideTaxBadge && (
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap font-mono font-medium">
                  Tax ID: 0105556026458
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Official Account Planet Vector Logo (Blue Dots Constellation + 3D Letter A with Ribbon & Gold Peak)
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`relative flex-shrink-0 ${currentDim.iconH} ${currentDim.iconW}`}>
        <svg
          viewBox="0 0 460 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-contain"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Blue Dots Gradient */}
            <linearGradient id={`dotGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0033ff" />
              <stop offset="100%" stopColor="#0018d6" />
            </linearGradient>

            {/* Gold Peak Gradient */}
            <linearGradient id={`goldPeakGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="60%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>

            {/* Gold Peak Shadow */}
            <linearGradient id={`goldPeakShadow-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#854d0e" />
              <stop offset="100%" stopColor="#713f12" />
            </linearGradient>

            {/* Gold Sphere Radial */}
            <radialGradient id={`goldSphereGrad-${uid}`} cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="85%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </radialGradient>

            {/* Red Front Face Gradient */}
            <linearGradient id={`redFrontGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="40%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            {/* Red 3D Dark Extrusion */}
            <linearGradient id={`redExtrudeGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7f1d1d" />
              <stop offset="50%" stopColor="#581c1c" />
              <stop offset="100%" stopColor="#450a0a" />
            </linearGradient>

            {/* Red Ribbon Gradient */}
            <linearGradient id={`ribbonGrad-${uid}`} x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#991b1b" />
              <stop offset="25%" stopColor="#dc2626" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="75%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            {/* Text Path for Arched 'Account Planet' */}
            <path id={`ribbonArcPath-${uid}`} d="M 175 190 Q 295 135 415 190" fill="none" />

            {/* Soft Drop Shadow Filter */}
            <filter id={`softShadow-${uid}`} x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.25" floodColor="#000000" />
            </filter>
          </defs>

          {/* ==================== BLUE DOTS CLUSTER (TOP-LEFT) ==================== */}
          <g id="blue-dots" fill={`url(#dotGrad-${uid})`}>
            {/* Row 1 */}
            <circle cx="45" cy="38" r="22" />
            <circle cx="90" cy="30" r="16" />
            <circle cx="130" cy="28" r="13" />
            <circle cx="163" cy="27" r="10" />
            <circle cx="193" cy="30" r="11" />

            {/* Row 2 */}
            <circle cx="33" cy="85" r="24" />
            <circle cx="80" cy="78" r="17" />
            <circle cx="120" cy="70" r="14" />
            <circle cx="155" cy="62" r="11" />
            <circle cx="185" cy="60" r="9" />
            <circle cx="207" cy="72" r="7" />

            {/* Row 3 */}
            <circle cx="43" cy="138" r="20" />
            <circle cx="85" cy="125" r="16" />
            <circle cx="125" cy="112" r="13" />
            <circle cx="157" cy="100" r="10" />
            <circle cx="183" cy="94" r="8" />
            <circle cx="205" cy="95" r="7" />
            <circle cx="200" cy="120" r="8" />

            {/* Row 4 */}
            <circle cx="37" cy="188" r="17" />
            <circle cx="75" cy="172" r="15" />
            <circle cx="113" cy="158" r="13" />
            <circle cx="143" cy="144" r="10" />
            <circle cx="167" cy="136" r="8" />
            <circle cx="187" cy="132" r="6" />
            <circle cx="185" cy="155" r="7" />

            {/* Row 5 */}
            <circle cx="47" cy="235" r="13" />
            <circle cx="77" cy="216" r="14" />
            <circle cx="107" cy="202" r="11" />
            <circle cx="133" cy="188" r="9" />
            <circle cx="153" cy="178" r="7" />
            <circle cx="171" cy="170" r="6" />
          </g>

          {/* ==================== LETTER "A" 3D SYMBOL ==================== */}
          <g id="letter-A-mark">
            {/* 1. Gold Peak 3D Shadow (Left Facet) */}
            <polygon points="295,25 278,28 264,86 280,82" fill={`url(#goldPeakShadow-${uid})`} />

            {/* 2. Gold Peak Front Face */}
            <polygon points="295,25 280,82 312,82" fill={`url(#goldPeakGrad-${uid})`} />

            {/* 3. Red 3D Extrusion Shadow (Left Side of Left Leg) */}
            <polygon points="280,82 264,86 158,260 176,260" fill={`url(#redExtrudeGrad-${uid})`} />

            {/* 4. Red 3D Extrusion Shadow (Inner Gap of A) */}
            <polygon points="284,115 306,115 342,210 324,210" fill="#450a0a" opacity="0.85" />

            {/* 5. Red 3D Extrusion Shadow (Right Leg Inner Depth) */}
            <polygon points="312,82 332,82 412,260 392,260" fill={`url(#redExtrudeGrad-${uid})`} />

            {/* 6. Left Red Leg (Front) */}
            <polygon points="280,82 298,82 206,260 176,260" fill={`url(#redFrontGrad-${uid})`} />

            {/* 7. Right Red Leg (Front) */}
            <polygon points="298,82 314,82 412,260 382,260" fill={`url(#redFrontGrad-${uid})`} />

            {/* 8. Subtle Foot Reflection on ground */}
            <polygon points="176,260 206,260 202,268 174,268" fill="#b91c1c" opacity="0.3" />
            <polygon points="382,260 412,260 410,268 384,268" fill="#b91c1c" opacity="0.3" />

            {/* 9. Curved Red Ribbon / Crossbar Shadow */}
            <path d="M 170 182 Q 295 125 420 182 Q 295 150 170 182" fill="#581c1c" />

            {/* 10. Curved Red Ribbon / Crossbar (Front 3D Arch) */}
            <path
              d="M 162 178 Q 295 120 428 178 L 424 205 Q 295 152 166 205 Z"
              fill={`url(#ribbonGrad-${uid})`}
              filter={`url(#softShadow-${uid})`}
            />

            {/* 11. White Text 'Account Planet' arched across ribbon */}
            <text
              fontFamily="'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
              fontWeight="800"
              fontSize="21"
              fill="#ffffff"
              letterSpacing="0.8"
            >
              <textPath href={`#ribbonArcPath-${uid}`} startOffset="50%" textAnchor="middle">
                Account Planet
              </textPath>
            </text>

            {/* 12. Golden Spheres at both ends of the Ribbon */}
            {/* Left Sphere */}
            <circle cx="168" cy="188" r="13" fill={`url(#goldSphereGrad-${uid})`} filter={`url(#softShadow-${uid})`} />
            <ellipse cx="164" cy="184" rx="4" ry="2.5" fill="#ffffff" opacity="0.6" />

            {/* Right Sphere */}
            <circle cx="422" cy="188" r="13" fill={`url(#goldSphereGrad-${uid})`} filter={`url(#softShadow-${uid})`} />
            <ellipse cx="418" cy="184" rx="4" ry="2.5" fill="#ffffff" opacity="0.6" />
          </g>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-extrabold tracking-tight ${
                isPrint ? 'text-slate-900 text-xl' : 'text-slate-950 ' + currentDim.textTitle
              } font-prompt leading-tight`}
            >
              บริษัท แอ็คเคาน์ แพลนเน็ท จำกัด
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`font-bold tracking-wider ${
                isPrint ? 'text-slate-600' : 'text-blue-700'
              } ${currentDim.textSub}`}
            >
              ACCOUNT PLANET CO., LTD.
            </span>
            {!hideTaxBadge && (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap font-mono font-medium">
                Tax ID: 0105556026458
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
