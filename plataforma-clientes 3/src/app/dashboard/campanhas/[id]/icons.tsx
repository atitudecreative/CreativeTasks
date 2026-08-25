// Ícones inline (svg puro, sem lib externa — o projeto não usa nenhuma
// hoje) pra dar um acabamento mais visual às seções do dashboard da
// campanha/evento. Só desenho, sem lógica — pode ser importado tanto por
// componentes de servidor (page.tsx) quanto de cliente sem risco nenhum
// de arrastar código de servidor pro bundle do navegador.
type IconProps = { className?: string };

const base = "h-4 w-4";

export function IconArrowLeft({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

export function IconTarget({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconLayers({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 4.5-8 4.5-8-4.5L12 3Z" />
      <path d="M4 12l8 4.5 8-4.5" />
      <path d="M4 16.5l8 4.5 8-4.5" />
    </svg>
  );
}

export function IconCalendar({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M16 3v4M8 3v4M3.5 10h17" />
    </svg>
  );
}

export function IconWallet({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h11A2.5 2.5 0 0 1 19 7.5V8H5.5A2.5 2.5 0 0 1 3 5.5v2Z" />
      <rect x="3" y="8" width="18" height="11" rx="2.5" />
      <circle cx="16" cy="13.5" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconFlag({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3v18" />
      <path d="M5 4.5h11l-2.5 3.5L16 11.5H5" />
    </svg>
  );
}

export function IconListChecks({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="m3.5 6 1.5 1.5L8 4.5" />
      <path d="m3.5 12.5 1.5 1.5L8 11" />
      <path d="m3.5 19 1.5 1.5L8 17.5" />
      <path d="M11.5 6h9M11.5 12.5h9M11.5 19h9" />
    </svg>
  );
}

export function IconPaperclip({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 7.5 9 16a3 3 0 0 1-4.24-4.24l8.5-8.5a4.5 4.5 0 1 1 6.36 6.36l-8.5 8.5a1.5 1.5 0 1 1-2.12-2.12l7.5-7.5" />
    </svg>
  );
}

export function IconMessage({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5h16v11H8.5L4 20V5.5Z" />
    </svg>
  );
}

export function IconUsers({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.25" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16.5 5.5a3.25 3.25 0 0 1 0 6.4" />
      <path d="M21.5 20a6.2 6.2 0 0 0-4.5-6" />
    </svg>
  );
}

export function IconCheckCircle({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.5 2.5L16 9.5" />
    </svg>
  );
}

export function IconAlertTriangle({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
      <path d="M12 9.5v4.5M12 16.75v.1" />
    </svg>
  );
}

export function IconTrendingUp({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 6.5h6V12.5" />
    </svg>
  );
}
