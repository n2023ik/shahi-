import { ReactNode, useState } from "react";
import {
  LayoutDashboard,
  Truck,
  BarChart3,
  Plus,
  Package,
  MapPin,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNewTrip: () => void;
}

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "trips", label: "Trips", icon: Truck },
  { id: "by-source", label: "By Source", icon: MapPin },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "shahi", label: "Advanced View Control", icon: Package },
];

export default function DashboardLayout({
  children,
  activeTab,
  onTabChange,
  onNewTrip,
}: DashboardLayoutProps) {
  const [tabDropdownOpen, setTabDropdownOpen] = useState(false);

  const handleTabSelect = (tabId: string) => {
    onTabChange(tabId);
    setTabDropdownOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-200">
      {/* SIDEBAR - Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-800 bg-slate-900">
        {/* Logo with Tab Dropdown Button */}
        <div className="relative px-6 py-5 border-b border-slate-800">
          <button
            onClick={() => setTabDropdownOpen(!tabDropdownOpen)}
            className="flex w-full items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="text-left flex-1">
              <h1 className="text-sm font-semibold tracking-tight">
                Shahi Dashboard
              </h1>
              <p className="text-xs text-slate-400">
                Shipment Control System
              </p>
            </div>
            <Menu className="h-4 w-4 text-slate-400" />
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

        {/* Bottom Actions */}
        <div className="flex-1" />
        <div className="p-4 border-t border-slate-800 space-y-3">
          <button
            onClick={onNewTrip}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
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
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex md:hidden items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Package className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Shahi
            </span>
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
    </div>
  );
}
