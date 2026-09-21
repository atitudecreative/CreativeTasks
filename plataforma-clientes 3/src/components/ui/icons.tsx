/* =========================================================================
   ÍCONES
   -------------------------------------------------------------------------
   Set único, inline, sem dependência nova. Todo ícone segue a MESMA
   especificação, que é o que faz eles parecerem uma família e não uma
   coleção: grade 24, traço 1.75 escalável com currentColor, pontas e
   junções arredondadas, sem preenchimento.

   Antes disso o produto misturava emoji (📎, 🔗) com oito SVGs soltos em
   uma pasta de rota — nada combinava com nada.

   Uso: <Icon.Calendar className="h-4 w-4" />. O tamanho vem sempre da
   classe (nunca hardcoded), pra herdar a escala do texto ao redor.
   ========================================================================= */

type IconProps = React.SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      // Decorativo por padrão: o significado vem do texto ao lado. Quando
      // um ícone é o único conteúdo de um botão, quem chama passa
      // aria-hidden={false} + o IconButton exige `label`.
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/* ---------- Navegação e estrutura ---------- */
const Home = (p: IconProps) => (
  <Svg {...p}><path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></Svg>
);
const Layers = (p: IconProps) => (
  <Svg {...p}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /><path d="m3 17 9 5 9-5" /></Svg>
);
const ListChecks = (p: IconProps) => (
  <Svg {...p}><path d="m3 6 2 2 3-3" /><path d="m3 13 2 2 3-3" /><path d="m3 20 2 2 3-3" /><path d="M12 6h9M12 13h9M12 20h9" /></Svg>
);
const Folder = (p: IconProps) => (
  <Svg {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></Svg>
);
const Building = (p: IconProps) => (
  <Svg {...p}><path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16" /><path d="M15 9h3a2 2 0 0 1 2 2v10" /><path d="M2 21h20M8 7h3M8 11h3M8 15h3" /></Svg>
);
const Users = (p: IconProps) => (
  <Svg {...p}><path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20" /><circle cx="9" cy="7" r="3.2" /><path d="M22 20v-1.5a4 4 0 0 0-3-3.85" /><path d="M16.5 4.15a4 4 0 0 1 0 7.7" /></Svg>
);
const User = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></Svg>
);
const Settings = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 14.5a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 .97-1.47V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47.97H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.47.97z" /></Svg>
);
const Palette = (p: IconProps) => (
  <Svg {...p}><path d="M12 21a9 9 0 1 1 9-9c0 1.66-1.34 2.5-3 2.5h-1.5a2.5 2.5 0 0 0-1.9 4.13A1.9 1.9 0 0 1 12 21z" /><circle cx="7.5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="10" cy="7.8" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="8.5" r="1" fill="currentColor" stroke="none" /></Svg>
);
const Shield = (p: IconProps) => (
  <Svg {...p}><path d="M12 3l7.5 3v5.5c0 4.6-3.1 8.4-7.5 9.5-4.4-1.1-7.5-4.9-7.5-9.5V6z" /><path d="m9.2 12.2 2 2 3.6-3.8" /></Svg>
);

/* ---------- Ações ---------- */
const Search = (p: IconProps) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></Svg>
);
const Plus = (p: IconProps) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
const Minus = (p: IconProps) => <Svg {...p}><path d="M5 12h14" /></Svg>;
const X = (p: IconProps) => <Svg {...p}><path d="M18 6 6 18M6 6l12 12" /></Svg>;
const Check = (p: IconProps) => <Svg {...p}><path d="m4.5 12.5 5 5 10-11" /></Svg>;
const Filter = (p: IconProps) => (
  <Svg {...p}><path d="M3 5h18l-7 8v6l-4 2v-8z" /></Svg>
);
const Download = (p: IconProps) => (
  <Svg {...p}><path d="M12 3v12" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5" /><path d="M4 20h16" /></Svg>
);
const Printer = (p: IconProps) => (
  <Svg {...p}><path d="M7 9V3h10v6" /><path d="M6 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1" /><rect x="7" y="15" width="10" height="6" rx="1" /></Svg>
);
const Share = (p: IconProps) => (
  <Svg {...p}><path d="M12 15V3" /><path d="m8 7 4-4 4 4" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></Svg>
);
const Copy = (p: IconProps) => (
  <Svg {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></Svg>
);
const Edit = (p: IconProps) => (
  <Svg {...p}><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z" /><path d="M14.5 6.5 17.5 9.5" /></Svg>
);
const Trash = (p: IconProps) => (
  <Svg {...p}><path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /><path d="M10 11v6M14 11v6" /></Svg>
);
const Logout = (p: IconProps) => (
  <Svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></Svg>
);
const External = (p: IconProps) => (
  <Svg {...p}><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" /></Svg>
);
const Link = (p: IconProps) => (
  <Svg {...p}><path d="M10 13.5a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.4 1.4" /><path d="M14 10.5a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.4-1.4" /></Svg>
);
const Paperclip = (p: IconProps) => (
  <Svg {...p}><path d="M20 11.5 12 19.5a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 1 1 5 5L10.5 16.5a2 2 0 0 1-3-3L15 6" /></Svg>
);
const Menu = (p: IconProps) => <Svg {...p}><path d="M3 6h18M3 12h18M3 18h18" /></Svg>;
const MoreHorizontal = (p: IconProps) => (
  <Svg {...p}><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" /></Svg>
);
const Refresh = (p: IconProps) => (
  <Svg {...p}><path d="M20 11a8 8 0 0 0-14-4.5L3 9" /><path d="M3 4v5h5" /><path d="M4 13a8 8 0 0 0 14 4.5L21 15" /><path d="M21 20v-5h-5" /></Svg>
);

/* ---------- Direção ---------- */
const ChevronDown = (p: IconProps) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>;
const ChevronUp = (p: IconProps) => <Svg {...p}><path d="m6 15 6-6 6 6" /></Svg>;
const ChevronLeft = (p: IconProps) => <Svg {...p}><path d="m15 6-6 6 6 6" /></Svg>;
const ChevronRight = (p: IconProps) => <Svg {...p}><path d="m9 6 6 6-6 6" /></Svg>;
const ChevronsLeft = (p: IconProps) => <Svg {...p}><path d="m11 6-6 6 6 6M18 6l-6 6 6 6" /></Svg>;
const ChevronsRight = (p: IconProps) => <Svg {...p}><path d="m13 6 6 6-6 6M6 6l6 6-6 6" /></Svg>;
const ArrowLeft = (p: IconProps) => <Svg {...p}><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></Svg>;
const ArrowRight = (p: IconProps) => <Svg {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Svg>;
const ArrowUpRight = (p: IconProps) => <Svg {...p}><path d="M7 17 17 7" /><path d="M8 7h9v9" /></Svg>;

/* ---------- Estado e sinal ---------- */
const CheckCircle = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m8 12.3 2.6 2.6L16 9.5" /></Svg>
);
const AlertTriangle = (p: IconProps) => (
  <Svg {...p}><path d="M10.3 3.8 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z" /><path d="M12 9v4.5" /><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none" /></Svg>
);
const AlertCircle = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V13" /><circle cx="12" cy="16.4" r=".9" fill="currentColor" stroke="none" /></Svg>
);
const Info = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5" /><circle cx="12" cy="7.8" r=".9" fill="currentColor" stroke="none" /></Svg>
);
const Clock = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5.3l3.3 2" /></Svg>
);
const Pause = (p: IconProps) => (
  <Svg {...p}><path d="M9 5v14M15 5v14" /></Svg>
);
const Eye = (p: IconProps) => (
  <Svg {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></Svg>
);
const EyeOff = (p: IconProps) => (
  <Svg {...p}><path d="M10 6a9.5 9.5 0 0 1 2-.2c6 0 9.5 6.2 9.5 6.2a16 16 0 0 1-2.7 3.5" /><path d="M6.3 7.8A16 16 0 0 0 2.5 12S6 18.2 12 18.2c1.5 0 2.8-.4 4-1" /><path d="M10 10a3 3 0 0 0 4 4" /><path d="m3 3 18 18" /></Svg>
);

/* ---------- Dados e métricas ---------- */
const TrendingUp = (p: IconProps) => (
  <Svg {...p}><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></Svg>
);
const TrendingDown = (p: IconProps) => (
  <Svg {...p}><path d="m3 7 6 6 4-4 8 8" /><path d="M15 17h6v-6" /></Svg>
);
const Minus2 = (p: IconProps) => <Svg {...p}><path d="M6 12h12" /></Svg>;
const BarChart = (p: IconProps) => (
  <Svg {...p}><path d="M4 20V11M10 20V4M16 20v-6M22 20H2" /></Svg>
);
const PieChart = (p: IconProps) => (
  <Svg {...p}><path d="M12 3a9 9 0 1 0 9 9h-9z" /><path d="M15 3.6A9 9 0 0 1 20.4 9H15z" /></Svg>
);
const Activity = (p: IconProps) => (
  <Svg {...p}><path d="M2 12h4l3 8 6-16 3 8h4" /></Svg>
);
const Target = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none" /></Svg>
);
const Wallet = (p: IconProps) => (
  <Svg {...p}><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a1 1 0 0 1 1 1v2" /><path d="M3 7.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a1 1 0 0 0-1-1H5.5A2.5 2.5 0 0 1 3 7.5z" /><circle cx="16.5" cy="14.5" r="1.1" fill="currentColor" stroke="none" /></Svg>
);
const Megaphone = (p: IconProps) => (
  <Svg {...p}><path d="M3 11v2a1 1 0 0 0 1 1h3l8 5V5L7 10H4a1 1 0 0 0-1 1z" /><path d="M18.5 9.5a3.5 3.5 0 0 1 0 5" /><path d="M7 14v5a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-3.2" /></Svg>
);
const Calendar = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Svg>
);
const Flag = (p: IconProps) => (
  <Svg {...p}><path d="M5 21V4" /><path d="M5 5h12l-2 3.5L17 12H5z" /></Svg>
);
const Sparkles = (p: IconProps) => (
  <Svg {...p}><path d="m12 3 1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7z" /><path d="m18.5 15.5.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></Svg>
);

/* ---------- Tema ---------- */
const Sun = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" /></Svg>
);
const Moon = (p: IconProps) => (
  <Svg {...p}><path d="M20 14.3A8.5 8.5 0 0 1 9.7 4 8.5 8.5 0 1 0 20 14.3z" /></Svg>
);
const Command = (p: IconProps) => (
  <Svg {...p}><path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z" /></Svg>
);
const Bell = (p: IconProps) => (
  <Svg {...p}><path d="M18 9a6 6 0 0 0-12 0c0 5-2 6-2 6h16s-2-1-2-6z" /><path d="M10.3 20a2 2 0 0 0 3.4 0" /></Svg>
);
const Inbox = (p: IconProps) => (
  <Svg {...p}><path d="M3 13h5l1.5 3h5L16 13h5" /><path d="M5.5 4h13l2.5 9v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z" /></Svg>
);
const File = (p: IconProps) => (
  <Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></Svg>
);
const Image = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="m4 17 4.5-4.5 3 3L15 11l5 5" /></Svg>
);
const Play = (p: IconProps) => (
  <Svg {...p}><path d="M7 4.5v15l12-7.5z" /></Svg>
);
const Message = (p: IconProps) => (
  <Svg {...p}><path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.2-4.2A8 8 0 1 1 21 12z" /></Svg>
);
const Loader = (p: IconProps) => (
  <Svg {...p}><path d="M12 3v3.5" opacity=".9" /><path d="M12 17.5V21" opacity=".25" /><path d="M21 12h-3.5" opacity=".45" /><path d="M6.5 12H3" opacity=".7" /><path d="m18.4 5.6-2.5 2.5" opacity=".6" /><path d="m8.1 15.9-2.5 2.5" opacity=".3" /><path d="m18.4 18.4-2.5-2.5" opacity=".35" /><path d="M8.1 8.1 5.6 5.6" opacity=".8" /></Svg>
);

export const Icon = {
  Home, Layers, ListChecks, Folder, Building, Users, User, Settings, Palette, Shield,
  Search, Plus, Minus, X, Check, Filter, Download, Printer, Share, Copy, Edit, Trash,
  Logout, External, Link, Paperclip, Menu, MoreHorizontal, Refresh,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowLeft, ArrowRight, ArrowUpRight,
  CheckCircle, AlertTriangle, AlertCircle, Info, Clock, Pause, Eye, EyeOff,
  TrendingUp, TrendingDown, Flat: Minus2, BarChart, PieChart, Activity, Target,
  Wallet, Megaphone, Calendar, Flag, Sparkles,
  Sun, Moon, Command, Bell, Inbox, File, Image, Play, Message, Loader,
};

export type IconComponent = (props: IconProps) => JSX.Element;
