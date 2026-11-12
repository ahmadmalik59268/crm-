import React, { useState } from 'react';
import {
  UserPlus,
  Phone,
  Mail,
  CheckCircle2,
  Edit3,
  Power,
  Eye,
  LayoutDashboard,
  X,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { formatPKR } from '../services/crmService';
import { SYSTEM_TODAY } from '../data/demoData';
import {
  Agent,
  AgentMetrics,
  UserRole,
  NavSection,
  ALL_GRANTABLE_MODULES,
  DEFAULT_ROLE_SECTIONS,
} from '../types/crm';

export const AgentsTeamView: React.FC = () => {
  const {
    agentMetrics,
    userAccounts,
    currentRole,
    visibleLeads,
    visibleFollowUps,
    visibleTasks,
    assignments,
    addAgent,
    updateAgent,
    toggleAgentStatus,
    setSelectedLeadId,
    toggleTaskStatus,
    getUserAllowedSections,
    updateUserAllowedSections,
  } = useCRM();

  // View mode: Team Directory vs. Individual Agent Dashboard
  const [selectedAgentDashboardId, setSelectedAgentDashboardId] = useState<string | null>(null);

  // Add / Edit Agent Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [name, setName] = useState('');
  const [systemRole, setSystemRole] = useState<UserRole>('Sales Agent');
  const [roleTitle, setRoleTitle] = useState('Sales Agent');
  const [phone, setPhone] = useState('+92 300 ');
  const [email, setEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('123456');
  const [specialization, setSpecialization] = useState('DHA & Luxury Residential');
  const [joiningDate, setJoiningDate] = useState(SYSTEM_TODAY);
  const [selectedModules, setSelectedModules] = useState<NavSection[]>(
    DEFAULT_ROLE_SECTIONS['Sales Agent']
  );

  const openAddModal = () => {
    setEditingAgent(null);
    setName('');
    setSystemRole('Sales Agent');
    setRoleTitle('Sales Agent');
    setPhone('+92 300 ');
    setEmail('');
    setLoginPassword('123456');
    setSpecialization('Residential & Commercial Plots');
    setJoiningDate(SYSTEM_TODAY);
    setSelectedModules(DEFAULT_ROLE_SECTIONS['Sales Agent']);
    setIsModalOpen(true);
  };

  const openEditModal = (ag: AgentMetrics) => {
    const linkedAccount = userAccounts.find(
      (u) => u.agentId === ag.id || u.email.toLowerCase().trim() === ag.email.toLowerCase().trim()
    );
    const resolvedRole =
      (linkedAccount?.role as UserRole) || ag.systemRole || 'Sales Agent';
    setEditingAgent(ag);
    setName(ag.name);
    setSystemRole(resolvedRole);
    setRoleTitle(ag.roleTitle);
    setPhone(ag.phone);
    setEmail(ag.email);
    setLoginPassword(linkedAccount?.loginPassword || ag.loginPassword || '123456');
    setSpecialization(ag.specialization);
    setJoiningDate(ag.joiningDate);
    setSelectedModules(
      getUserAllowedSections(ag.email || ag.id, resolvedRole)
    );
    setIsModalOpen(true);
  };

  const toggleModuleInModal = (sec: NavSection) => {
    const exists = selectedModules.includes(sec);
    const updated = exists
      ? selectedModules.filter((s) => s !== sec)
      : [...selectedModules, sec];
    setSelectedModules(updated.includes('dashboard') ? updated : ['dashboard', ...updated]);
  };

  const handleSaveAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim()) return;
    const cleanEmail = email.trim().toLowerCase();
    const cleanRoleTitle =
      roleTitle.trim() ||
      (systemRole === 'Sales Manager'
        ? 'Sales Manager'
        : systemRole === 'Admin'
        ? 'CRM Admin'
        : 'Sales Agent');

    if (editingAgent) {
      updateAgent(editingAgent.id, {
        name: name.trim(),
        systemRole,
        roleTitle: cleanRoleTitle,
        phone: phone.trim(),
        email: cleanEmail,
        loginPassword: loginPassword.trim() || '123456',
        specialization: specialization.trim(),
        joiningDate,
      });
      updateUserAllowedSections(cleanEmail, selectedModules);
      updateUserAllowedSections(editingAgent.id, selectedModules);
    } else {
      addAgent({
        name: name.trim(),
        systemRole,
        roleTitle: cleanRoleTitle,
        avatarUrl: '',
        phone: phone.trim(),
        email: cleanEmail,
        loginPassword: loginPassword.trim() || '123456',
        specialization: specialization.trim(),
        joiningDate,
        accountStatus: 'Active',
      });
      updateUserAllowedSections(cleanEmail, selectedModules);
    }
    setIsModalOpen(false);
  };

  const inspectedAgent = agentMetrics.find((a) => a.id === selectedAgentDashboardId);

  // If inspecting an Individual Agent Dashboard:
  if (inspectedAgent) {
    const agentLeads = visibleLeads.filter((l) => l.assignedAgentId === inspectedAgent.id);
    const agentFollowUps = visibleFollowUps.filter((f) => f.agentId === inspectedAgent.id);
    const agentTasks = visibleTasks.filter((t) => t.assignedAgentId === inspectedAgent.id);
    const agentAssignmentHistory = assignments.filter(
      (asn) =>
        asn.newAgentId === inspectedAgent.id || asn.previousAgentId === inspectedAgent.id
    );

    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-mono text-base font-bold flex items-center justify-center shrink-0">
              {inspectedAgent.initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{inspectedAgent.name}</h1>
                <span className="font-mono text-xs text-slate-500">({inspectedAgent.id})</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {inspectedAgent.roleTitle} · {inspectedAgent.specialization} · Joined{' '}
                {inspectedAgent.joiningDate}
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedAgentDashboardId(null)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            ← Back to Sales Team Directory
          </button>
        </div>

        {/* Agent KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {[
            { label: 'Assigned Leads', value: inspectedAgent.assignedLeads },
            { label: 'Active Pipeline', value: inspectedAgent.activeLeads },
            { label: 'Follow-ups Done', value: inspectedAgent.followUpsCompleted },
            { label: 'Site Visits', value: inspectedAgent.siteVisitsCount },
            { label: 'Converted Deals', value: inspectedAgent.convertedLeads },
            { label: 'Conversion Rate', value: `${inspectedAgent.conversionRate}%` },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white border border-slate-200 rounded-xl p-4"
            >
              <span className="text-xs text-slate-500 block">{stat.label}</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        {/* Agent's Own Leads & Follow-ups */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              Assigned Leads Portfolio ({agentLeads.length})
            </h3>
            <div className="divide-y divide-slate-100 mt-2">
              {agentLeads.map((l) => (
                <div
                  key={l.id}
                  onClick={() => setSelectedLeadId(l.id)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      {l.id} · {l.customerName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {l.interestedProperty} ({l.propertySize})
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs tabular-nums">
                    <div className="font-semibold text-slate-900">
                      {formatPKR(l.maxBudget)}
                    </div>
                    <div className="text-[11px] text-blue-700">{l.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              Agent Follow-ups & Tasks ({agentFollowUps.length} Follow-ups · {agentTasks.length} Tasks)
            </h3>
            <div className="divide-y divide-slate-100 mt-2">
              {agentFollowUps.map((f) => (
                <div key={f.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900">{f.customerName}</span>
                    <span className="text-slate-400 mx-1.5">·</span>
                    <span className="text-blue-700 font-medium">{f.type}</span>
                    <p className="text-[11px] text-slate-500">{f.discussionNotes}</p>
                  </div>
                  <span className="font-mono text-[11px] text-slate-600 shrink-0 tabular-nums">
                    {f.scheduledDate} ({f.status})
                  </span>
                </div>
              ))}
              {agentTasks.map((t) => (
                <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={t.status === 'Completed'}
                      onChange={() => toggleTaskStatus(t.id)}
                      className="rounded border-slate-300 cursor-pointer"
                    />
                    <span
                      className={
                        t.status === 'Completed'
                          ? 'line-through text-slate-400'
                          : 'font-medium text-slate-900'
                      }
                    >
                      Task: {t.title}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">Due {t.dueDate}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Assigned Lead History for this Agent */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
            Assigned Lead Audit History ({agentAssignmentHistory.length})
          </h3>
          <div className="divide-y divide-slate-100 mt-2 text-xs">
            {agentAssignmentHistory.map((asn) => (
              <div key={asn.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-mono font-semibold text-blue-700">{asn.leadId}</span>
                  <span className="mx-1.5 text-slate-300">·</span>
                  <span className="font-semibold text-slate-900">{asn.leadName}</span>
                  <span className="mx-1.5 text-slate-300">·</span>
                  <span className="text-slate-600">
                    {asn.previousAgentName} → {asn.newAgentName}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-500">{asn.assignedAt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Sales Team & Consultant Performance Directory
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage real estate consultants, track individual conversion ratios, and inspect personal agent dashboards
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Add Sales Agent
        </button>
      </div>

      {/* Complete Sales Team Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1150px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-3.5 pl-5 pr-3">Agent Name & Profile</th>
                <th className="py-3.5 px-3">Phone & Email</th>
                <th className="py-3.5 px-3 text-right">Assigned Leads</th>
                <th className="py-3.5 px-3 text-right">Active Leads</th>
                <th className="py-3.5 px-3 text-right">Follow-ups Completed</th>
                <th className="py-3.5 px-3 text-right">Site Visits</th>
                <th className="py-3.5 px-3 text-right">Converted Leads</th>
                <th className="py-3.5 px-3 text-right">Conversion Rate</th>
                <th className="py-3.5 px-3">Joining Date</th>
                <th className="py-3.5 px-3">Account Status</th>
                <th className="py-3.5 pl-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {agentMetrics.map((ag) => (
                <tr key={ag.id} className="hover:bg-slate-50/90 transition-colors">
                  <td className="py-3.5 pl-5 pr-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {ag.initials}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{ag.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {ag.roleTitle} · {ag.specialization}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="font-mono text-slate-800">{ag.phone}</div>
                    <div className="text-[11px] font-mono text-slate-600">{ag.email}</div>
                    {currentRole === 'Super Admin' && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded">
                          {userAccounts.find((u) => u.agentId === ag.id)?.role ||
                            ag.systemRole ||
                            'Sales Agent'}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 rounded">
                          Pass:{' '}
                          {userAccounts.find((u) => u.agentId === ag.id)?.loginPassword ||
                            ag.loginPassword ||
                            '123456'}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {ag.assignedLeads}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums text-blue-700 font-semibold">
                    {ag.activeLeads}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-700">
                    {ag.followUpsCompleted}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-700">
                    {ag.siteVisitsCount}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums font-bold text-emerald-700">
                    {ag.convertedLeads}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                    {ag.conversionRate}%
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-600 tabular-nums">
                    {ag.joiningDate}
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`font-semibold ${
                        ag.accountStatus === 'Active'
                          ? 'text-emerald-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {ag.accountStatus}
                    </span>
                  </td>
                  <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedAgentDashboardId(ag.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        Agent Dashboard
                      </button>
                      <button
                        onClick={() => openEditModal(ag)}
                        title="Edit Agent & Login Password"
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleAgentStatus(ag.id)}
                        title={
                          ag.accountStatus === 'Active'
                            ? 'Deactivate Agent'
                            : 'Activate Agent'
                        }
                        className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-md cursor-pointer"
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Agent Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingAgent ? `Edit Agent, Login & Access — ${editingAgent.name}` : 'Add New Sales Agent, Login & Access'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAgent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ali Raza or Saad bin Tariq"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    System Access Role *
                  </label>
                  <select
                    value={systemRole}
                    onChange={(e) => {
                      const nextRole = e.target.value as UserRole;
                      setSystemRole(nextRole);
                      setRoleTitle(nextRole);
                      setSelectedModules(DEFAULT_ROLE_SECTIONS[nextRole]);
                    }}
                    className="w-full px-3 py-2 font-semibold border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Sales Agent">Sales Agent (Sales Access)</option>
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Designation Title
                  </label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                <div>
                  <label className="block font-bold text-blue-900 mb-1">
                    Login Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="agent@gmail.com"
                    className="w-full px-3 py-2 font-mono bg-white border border-blue-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-blue-900 mb-1">
                    Login Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Set login password"
                    className="w-full px-3 py-2 font-mono bg-white border border-blue-300 rounded-lg"
                  />
                </div>
                <p className="col-span-2 text-[11px] text-blue-800">
                  The agent can Sign In directly using this Email & Password (and sees only their assigned leads).
                </p>
              </div>

              {/* Super Admin Granular Module Access Picker */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="font-bold text-slate-800">
                    Allowed Access Modules (Click to Grant / Revoke Any Tab):
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedModules(DEFAULT_ROLE_SECTIONS['Sales Agent'])
                      }
                      className="px-2 py-0.5 text-[10px] font-bold bg-white text-slate-700 hover:bg-slate-200 border border-slate-300 rounded cursor-pointer"
                    >
                      Sales Only (4 Tabs)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedModules(DEFAULT_ROLE_SECTIONS['Sales Manager'])
                      }
                      className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded cursor-pointer"
                    >
                      Manager
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedModules([
                          'dashboard',
                          ...ALL_GRANTABLE_MODULES.map((m) => m.id),
                        ])
                      }
                      className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded cursor-pointer"
                    >
                      Grant All Access
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_GRANTABLE_MODULES.map((mod) => {
                    const isAllowed = selectedModules.includes(mod.id);
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => toggleModuleInModal(mod.id)}
                        className={`px-2 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                          isAllowed
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-white text-slate-400 border-slate-200 line-through'
                        }`}
                      >
                        {isAllowed ? '✓ ' : '+ '}
                        {mod.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Project / Sector Specialization
                </label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  {editingAgent ? 'Save Agent, Login & Access' : 'Create Agent, Login & Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
