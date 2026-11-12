import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Building2,
  User,
  Users,
  Sliders,
  RotateCcw,
  Save,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { formatPKR } from '../services/crmService';

export const NotificationsView: React.FC = () => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    setActiveSection,
    setSelectedLeadId,
  } = useCRM();

  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const filtered = notifications.filter(
    (n) => typeFilter === 'ALL' || n.type === typeFilter
  );

  const notificationCategories = [
    'ALL',
    'New lead assigned',
    'Follow-up due',
    'Overdue follow-up',
    'New task assigned',
    'Site visit reminder',
    'Lead status updated',
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            CRM Notification Center & SLA Alerts
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time alerts for lead assignments, due follow-ups, overdue escalations, tasks, and site visit reminders
          </p>
        </div>
        <button
          onClick={markAllNotificationsRead}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <CheckCheck className="w-4 h-4" />
          Mark All as Read
        </button>
      </div>

      {/* Category Filter Bar */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-white border border-slate-200 rounded-xl w-fit">
        {notificationCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setTypeFilter(cat)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              typeFilter === cat
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {cat === 'ALL' ? `All Notifications (${notifications.length})` : cat}
          </button>
        ))}
      </div>

      {/* Notification Feed */}
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
              !item.isRead ? 'bg-blue-50/40' : 'hover:bg-slate-50'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`font-bold ${
                    item.type === 'Overdue follow-up'
                      ? 'text-red-600'
                      : 'text-blue-700'
                  }`}
                >
                  {item.type}
                </span>
                <span className="text-slate-300">·</span>
                <span className="font-semibold text-slate-900">{item.title}</span>
                {!item.isRead && (
                  <span className="text-[10px] font-bold text-blue-700 uppercase">
                    Unread
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600">{item.message}</p>
            </div>

            <div className="flex items-center gap-3 shrink-0 text-xs">
              <span className="font-mono text-[11px] text-slate-500">
                {item.timestamp}
              </span>
              {item.relatedLeadId && (
                <button
                  onClick={() => {
                    markNotificationRead(item.id);
                    setSelectedLeadId(item.relatedLeadId!);
                  }}
                  className="px-2.5 py-1 font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md cursor-pointer"
                >
                  Inspect Lead
                </button>
              )}
              <button
                onClick={() => {
                  markNotificationRead(item.id);
                  setActiveSection(item.targetSection);
                }}
                className="px-2.5 py-1 font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
              >
                Open Module
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, agents, toggleAgentStatus, resetDemoData } = useCRM();

  const [activeTab, setActiveTab] = useState<
    | 'company'
    | 'logo'
    | 'profile'
    | 'team'
    | 'statuses'
    | 'sources'
    | 'notifications'
    | 'general'
  >('company');

  const [companyName, setCompanyName] = useState(settings.companyName);
  const [companyTagline, setCompanyTagline] = useState(settings.companyTagline);
  const [primaryPhone, setPrimaryPhone] = useState(settings.primaryPhone);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  const [headOfficeAddress, setHeadOfficeAddress] = useState(settings.headOfficeAddress);
  const [website, setWebsite] = useState(settings.website);
  const [logoText, setLogoText] = useState(settings.logoText);

  const [profileName, setProfileName] = useState(settings.currentUserProfile.name);
  const [profileEmail, setProfileEmail] = useState(settings.currentUserProfile.email);
  const [profilePhone, setProfilePhone] = useState(settings.currentUserProfile.phone);
  const [profileTitle, setProfileTitle] = useState(settings.currentUserProfile.title);

  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const settingsTabs = [
    { id: 'company', label: 'Company Information' },
    { id: 'logo', label: 'Company Logo & Branding' },
    { id: 'profile', label: 'User Profile' },
    { id: 'team', label: 'Team Management' },
    { id: 'statuses', label: 'Lead Status Settings' },
    { id: 'sources', label: 'Lead Sources' },
    { id: 'notifications', label: 'Notification Preferences' },
    { id: 'general', label: 'General CRM Settings' },
  ] as const;

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      companyName,
      companyTagline,
      primaryPhone,
      supportEmail,
      headOfficeAddress,
      website,
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      currentUserProfile: {
        name: profileName,
        email: profileEmail,
        phone: profilePhone,
        title: profileTitle,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Enterprise CRM Configuration & System Settings
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure agency details, branding, lead status SLAs, marketing budgets, and demo database state
          </p>
        </div>
        <button
          onClick={() => setConfirmResetOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Demo Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Left Navigation */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 h-fit space-y-1">
          {settingsTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === t.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Settings Right Content Area */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-6">
          {activeTab === 'company' && (
            <form onSubmit={handleSaveCompany} className="space-y-4 text-xs">
              <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
                Company Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Registered Agency Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Corporate Tagline
                  </label>
                  <input
                    type="text"
                    value={companyTagline}
                    onChange={(e) => setCompanyTagline(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Primary Helpline
                  </label>
                  <input
                    type="text"
                    value={primaryPhone}
                    onChange={(e) => setPrimaryPhone(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Advisory Email
                  </label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">
                    Head Office Address
                  </label>
                  <input
                    type="text"
                    value={headOfficeAddress}
                    onChange={(e) => setHeadOfficeAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">
                    Official Website
                  </label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Save Company Information
              </button>
            </form>
          )}

          {activeTab === 'logo' && (
            <div className="space-y-4 text-xs">
              <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
                Company Logo & Sidebar Wordmark
              </h2>
              <div className="p-5 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-mono font-bold text-base">
                    {logoText.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-base font-bold tracking-tight block">
                      {logoText} REALTY
                    </span>
                    <span className="text-xs text-slate-400">
                      Sidebar Brand Preview
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Brand Wordmark Text
                </label>
                <input
                  type="text"
                  value={logoText}
                  onChange={(e) => setLogoText(e.target.value)}
                  className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <button
                onClick={() => updateSettings({ logoText })}
                className="px-4 py-2 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                Update Brand Logo
              </button>
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
                Current Administrator Profile
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={profileTitle}
                    onChange={(e) => setProfileTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Direct Phone</label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                Save User Profile
              </button>
            </form>
          )}

          {activeTab === 'team' && (
            <div className="space-y-4 text-xs">
              <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
                Team Access & Account Activation
              </h2>
              <div className="divide-y divide-slate-100">
                {agents.map((ag) => (
                  <div
                    key={ag.id}
                    className="py-3 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{ag.name}</span>
                      <span className="text-slate-400 mx-1.5">·</span>
                      <span className="text-slate-600">{ag.roleTitle}</span>
                    </div>
                    <button
                      onClick={() => toggleAgentStatus(ag.id)}
                      className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                        ag.accountStatus === 'Active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {ag.accountStatus} (Click to Toggle)
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'statuses' && (
            <div className="space-y-4 text-xs">
              <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
                Lead Status Pipeline & SLA Escalation Hours
              </h2>
              <div className="divide-y divide-slate-100">
                {settings.customLeadStatuses.map((st) => (
                  <div
                    key={st.name}
                    className="py-2.5 flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-900">{st.name}</span>
                    <span className="font-mono text-slate-600">
                      Target SLA: {st.defaultSlaHours > 0 ? `${st.defaultSlaHours} hours` : 'Terminal Stage'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="space-y-4 text-xs">
              <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
                Lead Sources & Monthly Marketing Budget (PKR)
              </h2>
              <div className="divide-y divide-slate-100">
                {settings.customLeadSources.map((sr) => (
                  <div
                    key={sr.name}
                    className="py-2.5 flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-900">{sr.name}</span>
                    <span className="font-mono text-slate-800 font-medium tabular-nums">
                      Monthly Budget: {formatPKR(sr.monthlyBudgetPKR)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4 text-xs">
              <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
                Notification & Escalation Preferences
              </h2>
              {(
                [
                  ['emailAlertsOnNewLead', 'Email Alerts on New Inquiry Capture'],
                  ['whatsappAlertsOnAssignment', 'Instant WhatsApp Alert to Agent on Lead Assignment'],
                  ['overdueFollowUpEscalation', 'Escalate Overdue Follow-ups (>24h) to Sales Manager'],
                  ['dailyDigestReport', 'Send 8:00 AM Daily Pipeline Digest'],
                  ['siteVisitSmsReminder', 'Automated Client SMS 2 Hours Before Scheduled Site Visit'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between py-2.5 border-b border-slate-100 cursor-pointer"
                >
                  <span className="font-medium text-slate-800">{label}</span>
                  <input
                    type="checkbox"
                    checked={settings.notificationPreferences[key]}
                    onChange={(e) =>
                      updateSettings({
                        notificationPreferences: {
                          ...settings.notificationPreferences,
                          [key]: e.target.checked,
                        },
                      })
                    }
                    className="rounded border-slate-300 cursor-pointer"
                  />
                </label>
              ))}
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-4 text-xs">
              <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
                General Regional & CRM Settings
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-500 block">Primary Currency Format</span>
                  <span className="font-mono font-bold text-slate-900 mt-1 block">
                    PKR (Crore / Lakh / Rupees)
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-500 block">Supported Area Measurement Units</span>
                  <span className="font-mono font-bold text-slate-900 mt-1 block">
                    {settings.areaUnits.join(' · ')}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-500 block">Default Auto-Assignment Engine</span>
                  <span className="font-semibold text-blue-700 mt-1 block">
                    {settings.generalSettings.autoAssignMode}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-500 block">Database Persistence Architecture</span>
                  <span className="font-semibold text-emerald-700 mt-1 block">
                    Repository Pattern (localStorage Active · Supabase Ready)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Reset Demo Data Dialog */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Reset CRM Demo Database to Initial Seed?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will restore all leads, agent assignments, follow-ups, site visits, and tasks to the original deterministic dataset.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetDemoData();
                  setConfirmResetOpen(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
              >
                Confirm Reset Demo Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
