"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AreaChart,
  ArrowLeftRight,
  Bell,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardCheck,
  Goal,
  House,
  Landmark,
  Menu,
  Moon,
  PiggyBank,
  ReceiptText,
  Settings,
  Sun,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { FinanceProvider, useFinance } from "./finance-provider";
import { PwaRegister } from "./pwa-register";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/spending-plan", label: "Spending Plan", icon: PiggyBank },
  { href: "/goals", label: "Goals", icon: Goal },
  { href: "/investments", label: "Investments", icon: ChartNoAxesCombined },
  { href: "/net-worth", label: "Net Worth", icon: AreaChart },
  { href: "/reports", label: "Reports", icon: ClipboardCheck },
  { href: "/accounts", label: "Accounts", icon: WalletCards },
  { href: "/monthly-review", label: "Monthly Review", icon: Landmark },
  { href: "/settings", label: "Settings", icon: Settings },
];

function ShellContent({ children, email }: { children: React.ReactNode; email: string }) {
  const pathname = usePathname();
  const { state, dismissNotification, updatePreferences } = useFinance();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const activeNotices = state.notifications.filter((notice) => !notice.dismissed);
  useEffect(() => {
    const theme = state.preferences.theme;
    const dark =
      theme === "dark" ||
      (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }, [state.preferences.theme]);

  return (
    <div className="app-frame">
      <aside
        className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}
        aria-label="Primary navigation"
      >
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            <CircleDollarSign size={23} />
          </div>
          <div>
            <strong>Cash Flow</strong>
            <span>Personal wealth tracker</span>
          </div>
          <button
            className="icon-button sidebar-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        <div className="demo-badge">
          <span /> Fictional demo data
        </div>
        <nav className="nav-list">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={pathname === href ? "active" : ""}
              onClick={() => setMobileMenu(false)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sync-status">
            <span className={state.bankConnection.status === "connected" ? "online" : "offline"} />
            <div>
              <strong>
                {state.bankConnection.status === "connected"
                  ? "Demo sync current"
                  : "Connection offline"}
              </strong>
              <span>Synthetic environment</span>
            </div>
          </div>
          <div className="privacy-note">Read-only tracking. No financial advice.</div>
        </div>
      </aside>
      {mobileMenu && (
        <button
          className="sidebar-scrim"
          aria-label="Close menu"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <div className="main-column">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            onClick={() => setMobileMenu(true)}
            aria-label="Open menu"
          >
            <Menu size={21} />
          </button>
          <div className="topbar-context">
            <span>Cash Flow App</span>
            <strong>{navItems.find((item) => item.href === pathname)?.label ?? "Overview"}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="icon-button"
              onClick={() =>
                updatePreferences({ theme: state.preferences.theme === "dark" ? "light" : "dark" })
              }
              aria-label="Toggle light or dark mode"
            >
              {state.preferences.theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <div className="notice-wrap">
              <button
                className="icon-button"
                onClick={() => setNoticesOpen((open) => !open)}
                aria-label={`${activeNotices.length} notifications`}
              >
                <Bell size={19} />
                {activeNotices.length > 0 && (
                  <span className="notice-count">{activeNotices.length}</span>
                )}
              </button>
              {noticesOpen && (
                <div className="notice-popover">
                  <div className="popover-heading">
                    <strong>Notifications</strong>
                    <span>{activeNotices.length} open</span>
                  </div>
                  {activeNotices.length === 0 ? (
                    <p className="empty-small">You’re all caught up.</p>
                  ) : (
                    activeNotices.map((notice) => (
                      <div className="notice-item" key={notice.id}>
                        <div>
                          <strong>{notice.title}</strong>
                          <p>{notice.message}</p>
                        </div>
                        <button onClick={() => dismissNotification(notice.id)}>Dismiss</button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="user-chip">
              <span>{email.slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>Owner</strong>
                <small>{email}</small>
              </div>
            </div>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
      <nav className="mobile-tabs" aria-label="Mobile navigation">
        {[
          navItems[0],
          navItems[1],
          navItems[3],
          navItems[5],
          { href: "/settings", label: "More", icon: ArrowLeftRight },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={label} href={href} className={pathname === href ? "active" : ""}>
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function AppShell({ children, email }: { children: React.ReactNode; email: string }) {
  return (
    <FinanceProvider>
      <PwaRegister />
      <ShellContent email={email}>{children}</ShellContent>
    </FinanceProvider>
  );
}
