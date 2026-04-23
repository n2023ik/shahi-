import { ReactNode, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Truck,
  BarChart3,
  Plus,
  Package,
  MapPin,
  ClipboardList,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserEmail } from "@/lib/auth";

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNewTrip: () => void;
  modeCounts?: {
    lsd: number;
    knits: number;
    mAndD: number;
  };
}

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "daily-summary", label: "Daily Summary", icon: ClipboardList },
  { id: "trips", label: "Trips", icon: Truck },
  { id: "by-source", label: "By Source", icon: MapPin },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "shahi", label: "Advanced View Control", icon: Package },
];

function getDisplayName(email: string): string {
  if (!email || email === "Unknown User") return "Shipment User";
  const localPart = email.split("@")[0] || "Shipment User";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function DashboardLayout({
  children,
  activeTab,
  onTabChange,
  onNewTrip,
  modeCounts,
}: DashboardLayoutProps) {
  const [tabDropdownOpen, setTabDropdownOpen] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);

  const userEmail = useMemo(() => getUserEmail(), []);
  const displayName = useMemo(() => getDisplayName(userEmail), [userEmail]);
  const profileImageUrl = "https://github.com/n2023ik/project-imh/blob/main/Gemini_Generated_Image_lhftytlhftytlhft.png?raw=true";

  const handleTabSelect = (tabId: string) => {
    onTabChange(tabId);
    setTabDropdownOpen(false);
  };

  return (
    <div className="avc-shell flex h-screen overflow-hidden text-slate-200">
      {/* SIDEBAR - Desktop */}
      <aside className="avc-content hidden md:flex w-60 lg:w-64 flex-col border-r border-slate-800 bg-slate-900/90">
        {/* Profile Header with Tab Dropdown Button */}
        <div className="relative border-b border-slate-800 px-4 py-4">
          <button
            onClick={() => setTabDropdownOpen(!tabDropdownOpen)}
            className="avc-surface group relative w-full overflow-hidden rounded-2xl border border-cyan-300/35 bg-[radial-gradient(circle_at_top,_#7FC0F5_0%,_#3E77AF_45%,_#244E7A_100%)] p-4 text-left transition-all duration-200 hover:border-cyan-200/55 min-h-[210px]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.17)_1px,_transparent_1px)] [background-size:16px_16px] opacity-30" />
            <div className="relative z-10 flex flex-col items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!profileImageError) setPhotoPreviewOpen(true);
                }}
                className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-cyan-100/60 bg-white/20 shadow-[0_8px_28px_rgba(2,8,23,0.35)] transition-transform hover:scale-[1.03]"
                title="View profile photo"
              >
                {!profileImageError ? (
                  <img
                    src={profileImageUrl}
                    alt="User profile"
                    className="h-full w-full object-cover object-center"
                    referrerPolicy="no-referrer"
                    onError={() => setProfileImageError(true)}
                  />
                ) : (
                  <Package className="h-8 w-8 text-primary-foreground" />
                )}
              </button>
              <p className="mt-2 max-w-[190px] px-1 text-center text-lg font-extrabold leading-tight tracking-tight text-white sm:text-xl break-words" title={displayName}>
                {displayName} <span aria-hidden="true">👋</span>
              </p>
              <p className="max-w-[190px] px-1 text-center text-[11px] font-medium leading-snug text-cyan-50/95 break-all" title={userEmail}>
                {userEmail}
              </p>
            </div>
            <Menu className="absolute right-3 top-3 h-4 w-4 text-white/85 transition-opacity group-hover:opacity-100" />
          </button>

          {/* Tab Dropdown Menu */}
          {tabDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
              <div className="py-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTabSelect(item.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors",
                      activeTab === item.id
                        ? "bg-primary/20 text-primary"
                        : "text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3">
          <div className="avc-panel rounded-xl border border-slate-800 bg-[#111B35] p-4 min-h-[280px]">
            <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200/90">
              Mode Count
            </p>
            <div className="space-y-3">
              <div className="avc-surface rounded-lg border border-cyan-300/40 bg-cyan-950/45 px-3 py-3 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-cyan-200">LSD</p>
                <p className="mt-1 text-2xl font-extrabold leading-none text-white">{modeCounts?.lsd ?? 0}</p>
              </div>
              <div className="avc-surface rounded-lg border border-amber-300/40 bg-amber-950/40 px-3 py-3 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-200">KNITS</p>
                <p className="mt-1 text-2xl font-extrabold leading-none text-white">{modeCounts?.knits ?? 0}</p>
              </div>
              <div className="avc-surface rounded-lg border border-emerald-300/40 bg-emerald-950/40 px-3 py-3 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">M&amp;D</p>
                <p className="mt-1 text-2xl font-extrabold leading-none text-white">{modeCounts?.mAndD ?? 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex-1" />
        <div className="p-4 border-t border-slate-800 space-y-3">
          <button
            onClick={onNewTrip}
            className="avc-surface flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Trip
          </button>
          <button className="w-full rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800">
            Logout
          </button>
        </div>
      </aside>

      {/* CONTENT AREA */}
      <div className="avc-content flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="avc-panel flex md:hidden items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-900/90">
          <div className="min-w-0 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (!profileImageError) setPhotoPreviewOpen(true);
              }}
              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-cyan-300/35 bg-primary/20 transition-transform hover:scale-[1.03]"
              title="View profile photo"
            >
              {!profileImageError ? (
                <img
                  src={profileImageUrl}
                  alt="User profile"
                  className="h-full w-full object-cover object-center"
                  referrerPolicy="no-referrer"
                  onError={() => setProfileImageError(true)}
                />
              ) : (
                <Package className="h-5 w-5 text-primary-foreground" />
              )}
            </button>
            <div className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-bold tracking-tight text-white" title={displayName}>
                {displayName}
              </span>
              <span className="block truncate text-[11px] text-cyan-200" title={userEmail}>
                {userEmail}
              </span>
              <span className="block text-[11px] text-slate-400">Shipment Control System</span>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setTabDropdownOpen(!tabDropdownOpen)}
              className="rounded-lg p-2 transition-colors text-slate-400 hover:bg-slate-800"
            >
              {tabDropdownOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            {/* Mobile Tab Dropdown */}
            {tabDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 min-w-max">
                <div className="py-2">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleTabSelect(item.id)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 text-sm transition-colors whitespace-nowrap",
                        activeTab === item.id
                          ? "bg-primary/20 text-primary"
                          : "text-slate-300 hover:bg-slate-700"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {photoPreviewOpen && !profileImageError && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-0"
          onClick={() => setPhotoPreviewOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Profile photo preview"
        >
          <button
            type="button"
            onClick={() => setPhotoPreviewOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-slate-900/90 p-2 text-slate-100 ring-1 ring-slate-600/80 transition-colors hover:bg-slate-800"
            aria-label="Close photo preview"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={profileImageUrl}
            alt="Profile preview"
            className="h-screen w-screen object-contain"
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
