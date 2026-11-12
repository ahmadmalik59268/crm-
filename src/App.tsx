import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CalendarClock,
  Briefcase,
  Building2,
  MapPin,
  CheckSquare,
  Share2,
  BarChart3,
  Bell,
  Settings,
  Menu,
  X,
  Plus,
  RotateCcw,
  Shield,
  Search,
  LogOut,
  Lock,
} from 'lucide-react';
import { CRMProvider, useCRM } from './context/CRMContext';
import { NavSection, UserRole } from './types/crm';
import { formatPKR } from './services/crmService';
import { AuthScreen } from './components/AuthScreen';
import { DashboardView } from './components/DashboardView';
import { LeadsManagementView } from './components/LeadsManagementView';
import { LeadAssignmentView } from './components/LeadAssignmentView';
import { RolesManagementView } from './components/RolesManagementView';
import { FollowUpsView } from './components/FollowUpsView';
import { AgentsTeamView } from './components/AgentsTeamView';
import { ProjectsView } from './components/ProjectsView';
import { SiteVisitsView } from './components/SiteVisitsView';
import { TasksView } from './components/TasksView';
import { LeadSourcesView } from './components/LeadSourcesView';
import { ReportsView } from './components/ReportsView';
import {
  NotificationsView,
  SettingsView,
} from './components/NotificationsAndSettingsView';
import { LeadFormModal } from './components/LeadFormModal';
import { LeadDetailsModal } from './components/LeadDetailsModal';

const NAV_ITEMS: {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: UserRole[];
}[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    allowedRoles: ['Super Admin', 'Admin', 'Sales Manager', 'Sales Agent'],
  },
  {
    id: 'leads',
    label: 'Leads Management',
    icon: Users,
    allowedRoles: ['Super Admin', 'Admin', 'Sales Manager', 'Sales Agent'],
  },
  {
    id: 'assignments',
    label: 'Lead Assignment',
    icon: UserCheck,
    allowedRoles: ['Super Admin', 'Admin', 'Sales Manager'],
  },
  {
    id: 'roles',
    label: 'Roles & Team Access',
    icon: Shield,
    allowedRoles: ['Super Admin', 'Admin', 'Sales Manager', 'Sales Agent'],
  },
  {
    id: 'followups',
    label: 'Follow-ups',
    icon: CalendarClock,
    allowedRoles: ['Super Admin', 'Admin', 'Sales Manager', 'Sales Agent'],
  },
  {
    id: 'agents',
    label: 'Sales Team / Agents',
    icon: Briefcase,
    allowedRoles: ['Super Admin', 'Admin', 'Sales Manager'],
  },
  {
    id: 'projects',
    label: 'Projects & Inventory',
    icon: Building2,
    allowedRoles: ['Super Admin', 'Admin', 'Sales Manager', 'Sales Agent'],
  },
  {
    id: 'sitevisits',
    label: 'Site Visits',
    icon: MapPin,
    allowedRoles: ['Super Admin', 'Admin', 'Sales Manager', 'Sales Agent'],
  },
  {
    id: 'tasks',
    label: 'Tasks & Reminders',
    icon: CheckSquare,
    allowedRoles: ['Super Admin', 'Admin', 'Sales Manager', 'Sales Agent'],
  },
  {
    id: 'sources',
    label: 'Lead Sources',
    icon: Share2,
    allowedRoles: ['Super Admin', 'Admin', 'Sales Manager'],
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    icon: BarChart3,
    allowedRoles: ['Super Admin', 'Admin', 'Sales Manager'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    allowedRoles: ['Super Admin', 'Admin', 'Sales Manager', 'Sales Agent'],
  },
  {
    id: 'settings',
    label: 'CRM Settings',
    icon: Settings,
    allowedRoles: ['Super Admin', 'Admin'],
  },
];

const CRMWorkspaceShell: React.FC = () => {
  const {
    authenticatedUser,
    logoutUser,
    activeSection,
    setActiveSection,
    currentRole,
    setCurrentRole,
    activeSalesAgentId,
    setActiveSalesAgentId,
    allowedSections,
    visibleLeads,
    agents,
    dashboardKPIs,
    notifications,
    settings,
    setSelectedLeadId,
    setIsAddLeadModalOpen,
    resetDemoData,
    toasts,
    dismissToast,
  } = useCRM();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const quickSearchResults = useMemo(() => {
    const q = globalSearch.toLowerCase().trim();
    if (!q) return [];
    return visibleLeads
      .filter(
        (l) =>
          l.id.toLowerCase().includes(q) ||
          l.customerName.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          l.interestedProperty.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [globalSearch, visibleLeads]);

  // Show Sign-Up & Login Screen when user is not logged in
  if (!authenticatedUser) {
    return (
      <>
        <AuthScreen />
        {toasts.length > 0 && (
          <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map((t) => (
              <div
                key={t.id}
                onClick={() => dismissToast(t.id)}
                className="pointer-events-auto bg-slate-900 text-white border border-slate-700 rounded-xl px-4 py-3 shadow-lg cursor-pointer transition-all"
              >
                <div className="text-xs font-bold">{t.title}</div>
                {t.description && (
                  <div className="text-[11px] text-slate-300 mt-0.5">{t.description}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    allowedSections.includes(item.id)
  );

  const handleRoleSwitch = (nextRole: UserRole) => {
    setCurrentRole(nextRole);
    setActiveSection('dashboard');
  };

  const currentNavLabel =
    NAV_ITEMS.find((i) => i.id === activeSection)?.label || 'Dashboard';

  const currentSalesAgentObj = agents.find((a) => a.id === activeSalesAgentId);

  const renderNavButton = (item: (typeof NAV_ITEMS)[number]) => {
    const Icon = item.icon;
    const isActive = activeSection === item.id;

    let badgeValue: number | null = null;
    let badgeAlert = false;
    if (item.id === 'leads') {
      badgeValue = visibleLeads.length;
    } else if (item.id === 'assignments' && dashboardKPIs.unassignedLeads > 0) {
      badgeValue = dashboardKPIs.unassignedLeads;
      badgeAlert = true;
    } else if (item.id === 'followups' && dashboardKPIs.overdueFollowUps > 0) {
      badgeValue = dashboardKPIs.overdueFollowUps;
      badgeAlert = true;
    } else if (item.id === 'notifications' && unreadNotificationsCount > 0) {
      badgeValue = unreadNotificationsCount;
    }

    return (
      <button
        key={item.id}
        onClick={() => {
          setActiveSection(item.id);
          setMobileSidebarOpen(false);
        }}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
          isActive
            ? 'bg-blue-700 text-white font-semibold shadow-xs'
            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
        }`}
      >
        <span className="flex items-center gap-2.5 whitespace-nowrap">
          <Icon className="w-4 h-4 shrink-0" />
          {item.label}
        </span>
        {badgeValue !== null && (
          <span
            className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded tabular-nums ${
              isActive
                ? 'bg-blue-900 text-white'
                : badgeAlert
                ? 'bg-red-500/20 text-red-300'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {badgeValue}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden"
        />
      )}

      {/* Left Sidebar Navigation (Dark Navy #0F172A) */}
      <aside
        className={`fixed lg:sticky lg:top-0 inset-y-0 left-0 z-40 w-64 h-screen bg-[#0F172A] text-slate-200 flex flex-col shrink-0 border-r border-slate-800/80 transition-transform duration-200 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Lockup */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <button
            onClick={() => setActiveSection('dashboard')}
            className="flex items-center gap-2.5 text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-mono text-sm font-bold flex items-center justify-center shrink-0">
              {settings.logoText.slice(0, 2).toUpperCase()}
            </div>
            <span className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap">
              {settings.logoText} REALTY
            </span>
          </button>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 min-h-0 px-3 py-3 space-y-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#334155_transparent]">
          {visibleNavItems.map(renderNavButton)}
        </nav>

        {/* Sidebar Account & Logout Controls (Pinned at Bottom of Viewport) */}
        <div className="shrink-0 p-3 border-t border-slate-800 bg-slate-950/80 space-y-2">
          <div className="px-2 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold text-slate-200 truncate">
                {currentRole !== 'Super Admin' && currentSalesAgentObj
                  ? currentSalesAgentObj.name
                  : authenticatedUser.name}
              </span>
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 shrink-0">
                {currentRole}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {authenticatedUser.email}
            </div>

            {authenticatedUser.role === 'Super Admin' && currentRole !== 'Super Admin' && (
              <div className="pt-1">
                <select
                  value={activeSalesAgentId}
                  onChange={(e) => setActiveSalesAgentId(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] font-semibold bg-emerald-950/80 border border-emerald-700 rounded text-emerald-200 focus:outline-none cursor-pointer"
                >
                  {agents
                    .filter((a) => a.accountStatus === 'Active')
                    .map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.roleTitle} · {ag.id})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          <div
            className={`grid gap-1.5 ${
              authenticatedUser.role === 'Super Admin' ? 'grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {authenticatedUser.role === 'Super Admin' && (
              <button
                onClick={resetDemoData}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Data
              </button>
            )}
            <button
              onClick={logoutUser}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-red-300 hover:text-white bg-red-950/50 hover:bg-red-700 border border-red-800/50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Right Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Contextual Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          {/* Left Zone: Mobile Menu + Breadcrumb Trail */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm truncate">
              <span className="text-slate-400 hidden sm:inline">Crestline CRM</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="font-bold text-slate-900 truncate">{currentNavLabel}</span>
            </div>
          </div>

          {/* Center Zone: Global Lead Quick Search */}
          <div className="hidden xl:block relative w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Quick search your visible leads..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-lg focus:outline-none transition-colors"
            />
            {quickSearchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 z-50 overflow-hidden">
                {quickSearchResults.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      setSelectedLeadId(l.id);
                      setGlobalSearch('');
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center justify-between text-xs cursor-pointer"
                  >
                    <div>
                      <span className="font-mono font-bold text-blue-700">{l.id}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="font-semibold text-slate-900">{l.customerName}</span>
                      <div className="text-[11px] text-slate-500">{l.interestedProperty}</div>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-slate-800">
                      {formatPKR(l.maxBudget)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Zone: Role Switcher, Notification Bell & Primary Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden md:flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <Shield className="w-3.5 h-3.5 text-blue-700" />
              <span className="text-[11px] font-medium text-slate-500">Role:</span>
              {authenticatedUser.role === 'Super Admin' ? (
                <>
                  <select
                    value={currentRole}
                    onChange={(e) => handleRoleSwitch(e.target.value as UserRole)}
                    className="text-xs font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Sales Manager">Sales Manager (Preview)</option>
                    <option value="Sales Agent">Sales Agent (Preview)</option>
                    <option value="Admin">Admin (Preview)</option>
                  </select>

                  {currentRole !== 'Super Admin' && (
                    <select
                      value={activeSalesAgentId}
                      onChange={(e) => setActiveSalesAgentId(e.target.value)}
                      className="ml-1 pl-2 border-l border-slate-300 text-xs font-semibold text-emerald-700 bg-transparent focus:outline-none cursor-pointer"
                    >
                      {agents
                        .filter((a) => a.accountStatus === 'Active')
                        .map((ag) => (
                          <option key={ag.id} value={ag.id}>
                            Profile: {ag.name} ({ag.id})
                          </option>
                        ))}
                    </select>
                  )}
                </>
              ) : (
                <span className="text-xs font-semibold text-slate-900">
                  {currentRole}
                  {currentRole !== 'Super Admin' ? ` (${activeSalesAgentId})` : ''}
                </span>
              )}
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => setActiveSection('notifications')}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white font-mono text-[10px] font-bold px-1.5 rounded-full">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Primary Action Button */}
            <button
              onClick={() => setIsAddLeadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Lead
            </button>
          </div>
        </header>

        {/* Active Role Isolation Banner when viewing as a Sales Manager / Sales Agent */}
        {currentRole !== 'Super Admin' && (
          <div className="bg-emerald-900 text-white px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs border-b border-emerald-800">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>
                <strong>Role & Lead Isolation Active:</strong> Logged in as{' '}
                <strong className="text-emerald-300">
                  {currentSalesAgentObj?.name || authenticatedUser.name} ({currentRole} · {activeSalesAgentId})
                </strong>
                . Showing ONLY your{' '}
                <strong className="underline">{visibleLeads.length} assigned leads</strong>.
              </span>
            </div>
            {authenticatedUser.role === 'Super Admin' && (
              <button
                onClick={() => setActiveSection('roles')}
                className="text-[11px] font-semibold px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-emerald-100 cursor-pointer"
              >
                Manage Access & Roles
              </button>
            )}
          </div>
        )}

        {/* Active Module Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">
          {(!allowedSections.includes(activeSection) || activeSection === 'dashboard') && (
            <DashboardView />
          )}
          {allowedSections.includes(activeSection) && activeSection === 'leads' && (
            <LeadsManagementView />
          )}
          {allowedSections.includes(activeSection) && activeSection === 'assignments' && (
            <LeadAssignmentView />
          )}
          {allowedSections.includes(activeSection) && activeSection === 'roles' && (
            <RolesManagementView />
          )}
          {allowedSections.includes(activeSection) && activeSection === 'followups' && (
            <FollowUpsView />
          )}
          {allowedSections.includes(activeSection) && activeSection === 'agents' && (
            <AgentsTeamView />
          )}
          {allowedSections.includes(activeSection) && activeSection === 'projects' && (
            <ProjectsView />
          )}
          {allowedSections.includes(activeSection) && activeSection === 'sitevisits' && (
            <SiteVisitsView />
          )}
          {allowedSections.includes(activeSection) && activeSection === 'tasks' && (
            <TasksView />
          )}
          {allowedSections.includes(activeSection) && activeSection === 'sources' && (
            <LeadSourcesView />
          )}
          {allowedSections.includes(activeSection) && activeSection === 'reports' && (
            <ReportsView />
          )}
          {allowedSections.includes(activeSection) && activeSection === 'notifications' && (
            <NotificationsView />
          )}
          {allowedSections.includes(activeSection) && activeSection === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <LeadFormModal />
      <LeadDetailsModal />

      {/* Toast Feedback Stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              onClick={() => dismissToast(t.id)}
              className="pointer-events-auto bg-slate-900 text-white border border-slate-700 rounded-xl px-4 py-3 shadow-lg cursor-pointer transition-all"
            >
              <div className="text-xs font-bold">{t.title}</div>
              {t.description && (
                <div className="text-[11px] text-slate-300 mt-0.5">{t.description}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <CRMProvider>
      <CRMWorkspaceShell />
    </CRMProvider>
  );
}
