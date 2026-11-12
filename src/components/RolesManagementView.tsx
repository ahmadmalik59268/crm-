import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Users,
  UserCheck,
  Lock,
  Eye,
  UserPlus,
  CheckCircle2,
  XCircle,
  ArrowRight,
  KeyRound,
  Briefcase,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { formatPKR } from '../services/crmService';
import {
  UserRole,
  NavSection,
  DEFAULT_ROLE_SECTIONS,
  ALL_GRANTABLE_MODULES,
} from '../types/crm';

export const RolesManagementView: React.FC = () => {
  const {
    authenticatedUser,
    userAccounts,
    currentRole,
    activeSalesAgentId,
    leads,
    visibleLeads,
    agents,
    agentMetrics,
    assignLead,
    signupNewAccount,
    updateUserAccountRole,
    switchIdentityForPreview,
    setSelectedLeadId,
    getUserAllowedSections,
    updateUserAllowedSections,
  } = useCRM();

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('agent123');
  const [newRole, setNewRole] = useState<UserRole>('Sales Agent');
  const [newPhone, setNewPhone] = useState('+92 300 ');
  const [newSpec, setNewSpec] = useState('Residential & Commercial Properties');

  const isSuperAdminUser = authenticatedUser?.role === 'Super Admin';
  const unassignedLeads =
    currentRole === 'Super Admin' ? leads.filter((l) => !l.assignedAgentId) : [];
  const activeAgents = agents.filter((a) => a.accountStatus === 'Active');

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return;
    await signupNewAccount({
      name: newName.trim(),
      email: newEmail.trim(),
      password: newPassword.trim(),
      role: newRole,
      phone: newPhone.trim(),
      specialization: newSpec.trim(),
      createdBySuperAdmin: true,
    });
    setNewName('');
    setNewEmail('');
    setIsAddUserModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
              Role-Based Access Control (RBAC)
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-medium text-emerald-700">
              Single Super Admin & Strict Lead Isolation
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Roles, Sales Manager Oversight & Agent Lead Isolation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Only the sole Super Admin can assign roles (Sales Manager, Admin, or Sales Agent). Each Sales Agent only sees leads assigned strictly to them.
          </p>
        </div>

        {isSuperAdminUser && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsAddUserModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Add Team Member Account
            </button>
          </div>
        )}
      </div>

      {/* Current Active Session Info */}
      <div className="bg-slate-900 text-white rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 block">
              Logged-In Account & Active Authority
            </span>
            <h2 className="text-base font-bold mt-0.5">
              Logged In As:{' '}
              <span className="text-emerald-400">
                {authenticatedUser?.name} ({authenticatedUser?.email})
              </span>{' '}
              — Role: <span className="text-blue-300">{currentRole}</span>
              {currentRole !== 'Super Admin' && (
                <span className="ml-2 text-xs font-mono text-amber-300">
                  [Locked to Profile ID: {activeSalesAgentId} · {visibleLeads.length} Assigned Leads]
                </span>
              )}
            </h2>
          </div>
          {isSuperAdminUser && currentRole !== 'Super Admin' && (
            <button
              onClick={() => {
                if (authenticatedUser) switchIdentityForPreview(authenticatedUser);
              }}
              className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer"
            >
              Return to Super Admin View
            </button>
          )}
        </div>
      </div>

      {/* Role Hierarchy Comparison Cards (Super Admin vs Sales Manager vs Sales Agent) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 rounded-md">
              1. Super Admin / Admin
            </span>
            <ShieldCheck className="w-5 h-5 text-blue-700" />
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Full executive authority over the entire real estate agency. Can view all leads, all sales managers, all sales agents, financial reports, and system settings.
          </p>
          <ul className="space-y-1.5 text-xs text-slate-700 pt-1">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Views all {leads.length} agency leads & unassigned queue
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Creates & manages Sales Manager and Agent roles
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Full access to CRM Settings, Reports & Lead Sources
            </li>
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-md whitespace-nowrap">
              2. Sales Manager
            </span>
            <Briefcase className="w-5 h-5 text-indigo-700 shrink-0" />
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Receives assigned leads and manages buyer follow-ups, site visits, and property bookings within their role-isolated workspace.
          </p>
          <ul className="space-y-1.5 text-xs text-slate-700 pt-1">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Sees strictly the leads assigned to their profile
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Advances leads through pipeline stages & follow-ups
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Schedules follow-ups, site visits & bookings
            </li>
          </ul>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-md whitespace-nowrap">
              3. Sales Agent (Auto Sales-Only Access)
            </span>
            <Lock className="w-5 h-5 text-emerald-700 shrink-0" />
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Automatic <strong>Sales-Only Workspace</strong>. Sees strictly the Sales sections (Dashboard, My Leads, Follow-ups, Site Visits) with zero extra access unless granted by Super Admin.
          </p>
          <ul className="space-y-1.5 text-xs text-slate-700 pt-1">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Automatic Sales-Only access (Dashboard, Leads, Follow-ups, Site Visits)
            </li>
            <li className="flex items-center gap-2">
              <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              Zero extra menus (No Projects, Reports, Team, or Settings)
            </li>
            <li className="flex items-center gap-2">
              <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              Cannot reassign leads or see other agents’ leads
            </li>
          </ul>
        </div>
      </div>

      {/* Sales Agent Isolated Lead Buckets (Ali vs Usama & All Sales Agents) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Salesperson & Manager Private Lead Isolation Matrix
            </h2>
            <p className="text-xs text-slate-500">
              Leads in each box below are strictly isolated to that specific salesperson when they log in
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-slate-600">
            Total Active Agents: {activeAgents.length} · Unassigned Pool: {unassignedLeads.length}
          </span>
        </div>

        {/* Unassigned Leads Quick Assignment Bar */}
        {unassignedLeads.length > 0 && currentRole !== 'Sales Agent' && (
          <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">
                Unassigned Leads Waiting for Assignment ({unassignedLeads.length}) — Hidden from all Sales Agents until assigned:
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {unassignedLeads.map((ul) => (
                <div
                  key={ul.id}
                  className="bg-white border border-amber-300 rounded-lg p-3 flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-blue-700">{ul.id}</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {formatPKR(ul.maxBudget)}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">
                      {ul.customerName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {ul.interestedProperty} ({ul.propertySize})
                    </div>
                  </div>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        assignLead(
                          ul.id,
                          e.target.value,
                          'Assigned via Role & Lead Isolation Matrix.'
                        );
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-md cursor-pointer"
                  >
                    <option value="">Assign to Agent (Ali / Usama / Team)...</option>
                    {activeAgents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        Assign to {ag.name} ({ag.id})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agent-by-Agent Isolated Lead Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agentMetrics
            .filter((ag) => ag.accountStatus === 'Active')
            .map((agent) => {
              const agentLeads = visibleLeads.filter((l) => l.assignedAgentId === agent.id);
              const linkedUser = userAccounts.find((u) => u.agentId === agent.id);

              return (
                <div
                  key={agent.id}
                  className="border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between bg-slate-50/50"
                >
                  <div>
                    <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                            {agent.id}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900">
                            {agent.name}
                          </h3>
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          {agent.email}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-sm font-bold text-emerald-700 block">
                          {agentLeads.length} Leads
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Strictly Isolated
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 space-y-2 max-h-60 overflow-y-auto">
                      {agentLeads.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          No leads currently assigned to {agent.name}
                        </div>
                      ) : (
                        agentLeads.map((ld) => (
                          <div
                            key={ld.id}
                            onClick={() => setSelectedLeadId(ld.id)}
                            className="p-2.5 bg-white border border-slate-200 hover:border-blue-500 rounded-lg cursor-pointer transition-colors"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-mono font-bold text-blue-700">
                                {ld.id}
                              </span>
                              <span className="font-semibold text-slate-700">
                                {ld.status}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-slate-900 mt-0.5">
                              {ld.customerName}
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                              <span className="truncate max-w-[150px]">
                                {ld.interestedProperty}
                              </span>
                              <span className="font-mono font-semibold text-slate-800">
                                {formatPKR(ld.maxBudget)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="px-4 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500">
                      Converted: <strong>{agent.convertedLeads}</strong> · Pending:{' '}
                      <strong>{agent.pendingLeads}</strong>
                    </span>
                    <button
                      onClick={() =>
                        switchIdentityForPreview(
                          linkedUser || {
                            uid: `preview-${agent.id}`,
                            email: agent.email,
                            name: agent.name,
                            role: 'Sales Agent',
                            agentId: agent.id,
                            phone: agent.phone,
                            specialization: agent.specialization,
                            accountStatus: 'Active',
                          }
                        )
                      }
                      className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View as {agent.name.split(' ')[0]}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Registered User Accounts & Role Management Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Registered CRM Login Accounts & Super Admin Role Assignment ({userAccounts.length})
            </h3>
            <p className="text-xs text-slate-500">
              Only the sole Super Admin can change user roles (Sales Manager, Admin, or Sales Agent) and link Sales Agents to their isolated lead profile.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                <th className="py-3 px-4">User Name & Email</th>
                <th className="py-3 px-3">Assigned Role</th>
                <th className="py-3 px-3">Linked Agent ID & Leads</th>
                <th className="py-3 px-3">
                  Allowed Access Modules (Super Admin Grants Access)
                </th>
                {isSuperAdminUser && (
                  <th className="py-3 px-4 text-right">Workspace Preview</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(isSuperAdminUser
                ? userAccounts
                : userAccounts.filter((u) => u.uid === authenticatedUser?.uid)
              ).map((u) => {
                const scopedCount =
                  u.role === 'Super Admin'
                    ? leads.length
                    : leads.filter((l) => l.assignedAgentId === u.agentId).length;
                const userKey = u.email || u.agentId;
                const currentModules = getUserAllowedSections(userKey, u.role);

                const handleToggleModule = (modId: NavSection) => {
                  if (!isSuperAdminUser || u.role === 'Super Admin') return;
                  const exists = currentModules.includes(modId);
                  const updated = exists
                    ? currentModules.filter((m) => m !== modId)
                    : [...currentModules, modId];
                  updateUserAllowedSections(userKey, updated);
                };

                const handleSetPreset = (preset: NavSection[]) => {
                  if (!isSuperAdminUser || u.role === 'Super Admin') return;
                  updateUserAllowedSections(userKey, preset);
                };

                return (
                  <tr key={u.uid} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="font-mono text-[11px] text-slate-500">{u.email}</div>
                      {isSuperAdminUser && u.role !== 'Super Admin' && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-semibold text-slate-500">
                            Password:
                          </span>
                          <input
                            type="text"
                            defaultValue={u.loginPassword || '123456'}
                            onBlur={(e) => {
                              const nextPass = e.target.value.trim();
                              if (nextPass && nextPass !== (u.loginPassword || '123456')) {
                                updateUserAccountRole(u.uid, { password: nextPass });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            title="Edit password and press Enter or click outside to save"
                            className="w-24 px-1.5 py-0.5 text-[11px] font-mono font-bold text-blue-800 bg-blue-50 border border-blue-200 rounded focus:outline-none focus:border-blue-600"
                          />
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {u.role === 'Super Admin' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-blue-600 text-white rounded-md">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Super Admin (Sole Owner)
                        </span>
                      ) : isSuperAdminUser ? (
                        <select
                          value={u.role}
                          onChange={(e) =>
                            updateUserAccountRole(u.uid, {
                              role: e.target.value as UserRole,
                            })
                          }
                          className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-md bg-white cursor-pointer"
                        >
                          <option value="Sales Agent">Sales Agent (Sales Only)</option>
                          <option value="Sales Manager">Sales Manager</option>
                          <option value="Admin">Admin</option>
                        </select>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-800 rounded-md">
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {u.role !== 'Super Admin' ? (
                        <div className="space-y-1">
                          {isSuperAdminUser ? (
                            <select
                              value={u.agentId}
                              onChange={(e) =>
                                updateUserAccountRole(u.uid, { agentId: e.target.value })
                              }
                              className="px-2 py-1 text-xs font-mono border border-slate-300 rounded-md bg-white cursor-pointer block"
                            >
                              {agents.map((ag) => (
                                <option key={ag.id} value={ag.id}>
                                  {ag.id} — {ag.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="font-mono text-xs font-semibold text-slate-700 block">
                              {u.agentId}
                            </span>
                          )}
                          <span className="inline-block font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Strictly {scopedCount} Assigned Leads
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono font-bold px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          All {scopedCount} Agency Leads
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      {u.role === 'Super Admin' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-slate-900 text-white rounded-md">
                          Full System Access (All Modules)
                        </span>
                      ) : (
                        <div className="space-y-2 max-w-xl">
                          {isSuperAdminUser && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Quick Presets:
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleSetPreset(DEFAULT_ROLE_SECTIONS['Sales Agent'])
                                }
                                className="px-2 py-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded cursor-pointer"
                              >
                                Sales Only (4 Tabs)
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleSetPreset(DEFAULT_ROLE_SECTIONS['Sales Manager'])
                                }
                                className="px-2 py-0.5 text-[10px] font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded cursor-pointer"
                              >
                                Manager Access
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleSetPreset(DEFAULT_ROLE_SECTIONS['Super Admin'])
                                }
                                className="px-2 py-0.5 text-[10px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded cursor-pointer"
                              >
                                Grant All Access (All Tabs)
                              </button>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-1">
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 text-white rounded">
                              ✓ Dashboard
                            </span>
                            {ALL_GRANTABLE_MODULES.map((mod) => {
                              const enabled = currentModules.includes(mod.id);
                              return (
                                <button
                                  key={mod.id}
                                  type="button"
                                  disabled={!isSuperAdminUser}
                                  onClick={() => handleToggleModule(mod.id)}
                                  className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors ${
                                    isSuperAdminUser ? 'cursor-pointer' : ''
                                  } ${
                                    enabled
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                                  }`}
                                >
                                  {enabled ? `✓ ${mod.label}` : `+ ${mod.label}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </td>
                    {isSuperAdminUser && (
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => switchIdentityForPreview(u)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md cursor-pointer"
                        >
                          Preview Access
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New User / Agent Account Modal (Super Admin Only) */}
      {isAddUserModalOpen && isSuperAdminUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">
              Add New Team Member Account (Super Admin Only)
            </h3>
            <p className="text-xs text-slate-500">
              Create a login account for a <strong>Sales Manager</strong>, <strong>Sales Agent</strong>, or <strong>Admin</strong>. Sales Agents automatically receive an isolated Agent ID.
            </p>
            <form onSubmit={handleCreateUserSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Ali Raza or Usama Tariq"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Login Email *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="member@crestlinerealty.pk"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assign Role *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Sales Agent">Sales Agent</option>
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  Create Team Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
