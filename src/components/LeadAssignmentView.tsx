import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  UserX,
  Shuffle,
  CheckSquare,
  History,
  ArrowRight,
  Eye,
  FileDown,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { formatPKR, exportRecordsToCSV } from '../services/crmService';

export const LeadAssignmentView: React.FC = () => {
  const {
    currentRole,
    visibleLeads,
    agents,
    agentMetrics,
    assignments,
    assignLead,
    bulkAssignLeads,
    autoAssignUnassignedLeads,
    setSelectedLeadId,
  } = useCRM();

  const [queueMode, setQueueMode] = useState<'unassigned' | 'all' | 'history'>(
    currentRole === 'Super Admin' ? 'unassigned' : 'all'
  );
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [targetAgentId, setTargetAgentId] = useState<string>(
    agents.find((a) => a.accountStatus === 'Active')?.id || 'AGT-01'
  );
  const [assignmentNote, setAssignmentNote] = useState('');

  // Per-row quick agent selection map
  const [rowAgentMap, setRowAgentMap] = useState<Record<string, string>>({});

  const unassignedLeads = useMemo(
    () => visibleLeads.filter((l) => !l.assignedAgentId),
    [visibleLeads]
  );

  const displayedLeads = queueMode === 'unassigned' ? unassignedLeads : visibleLeads;

  const activeAgentsMetrics = useMemo(
    () => agentMetrics.filter((a) => a.accountStatus === 'Active'),
    [agentMetrics]
  );

  const toggleLeadCheckbox = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllDisplayed = () => {
    const allIds = displayedLeads.map((l) => l.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedLeadIds.includes(id));
    if (allSelected) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(allIds);
    }
  };

  const handleBulkAssign = () => {
    if (selectedLeadIds.length === 0 || !targetAgentId) return;
    bulkAssignLeads(
      selectedLeadIds,
      targetAgentId,
      assignmentNote.trim() || 'Bulk assigned via Lead Assignment Center.'
    );
    setSelectedLeadIds([]);
    setAssignmentNote('');
  };

  const handleSingleRowAssign = (leadId: string) => {
    const chosenId = rowAgentMap[leadId] || targetAgentId;
    if (!chosenId) return;
    assignLead(
      leadId,
      chosenId,
      assignmentNote.trim() || 'Assigned via Lead Assignment Center.'
    );
  };

  const handleExportHistory = () => {
    exportRecordsToCSV(
      'lead_assignment_audit_history',
      [
        'Assignment ID',
        'Lead ID',
        'Customer Name',
        'Previous Agent',
        'Assigned Agent',
        'Assigned By',
        'Role',
        'Date & Time',
        'Notes',
      ],
      assignments.map((a) => [
        a.id,
        a.leadId,
        a.leadName,
        a.previousAgentName,
        a.newAgentName,
        a.assignedByName,
        a.assignedByRole,
        a.assignedAt,
        a.notes,
      ])
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Smart Workload Auto-Assign CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Lead Assignment & Workload Distribution Center
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Allocate unassigned leads, balance sales consultant capacity, and audit every historical reassignment
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportHistory}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export Assignment Log
          </button>
          <button
            onClick={autoAssignUnassignedLeads}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Smart Workload Auto-Assign ({unassignedLeads.length})
          </button>
        </div>
      </div>

      {/* Sales Agent Workload & Capacity Cards */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Active Sales Team Workload & Conversion Metrics
            </h2>
            <p className="text-xs text-slate-500">
              Real-time total assigned, pending follow-up leads, converted deals, and active capacity per consultant
            </p>
          </div>
          <span className="font-mono text-xs text-slate-500">
            {unassignedLeads.length} Unassigned · {visibleLeads.length - unassignedLeads.length} Assigned
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mt-4">
          {activeAgentsMetrics.map((ag) => (
            <div
              key={ag.id}
              className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between bg-slate-50/40"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900 truncate">{ag.name}</span>
                  <span className="font-mono text-[11px] text-slate-500">{ag.id}</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {ag.specialization}
                </p>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200/80 text-center font-mono tabular-nums">
                  <div>
                    <span className="block text-[10px] font-sans text-slate-500">Assigned</span>
                    <span className="text-sm font-bold text-slate-900">{ag.assignedLeads}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-sans text-slate-500">Pending</span>
                    <span className="text-sm font-bold text-amber-700">{ag.pendingLeads}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-sans text-slate-500">Converted</span>
                    <span className="text-sm font-bold text-emerald-700">{ag.convertedLeads}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-500">Active Workload</span>
                  <span className="font-mono font-semibold text-slate-800 tabular-nums">
                    {ag.activeLeads} active ({ag.workloadPercentage}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      ag.workloadPercentage >= 80
                        ? 'bg-amber-600'
                        : 'bg-blue-700'
                    }`}
                    style={{ width: `${Math.max(10, ag.workloadPercentage)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mode Switcher & Bulk Assignment Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Segmented View Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            <button
              onClick={() => {
                setQueueMode('unassigned');
                setSelectedLeadIds([]);
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                queueMode === 'unassigned'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unassigned Leads Queue ({unassignedLeads.length})
            </button>
            <button
              onClick={() => {
                setQueueMode('all');
                setSelectedLeadIds([]);
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                queueMode === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Leads / Reassign Agent ({visibleLeads.length})
            </button>
            <button
              onClick={() => setQueueMode('history')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                queueMode === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Complete Assignment History ({assignments.length})
            </button>
          </div>

          {/* Bulk Assignment Controls */}
          {queueMode !== 'history' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-600">
                Selected ({selectedLeadIds.length}):
              </span>
              <select
                value={targetAgentId}
                onChange={(e) => setTargetAgentId(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {activeAgentsMetrics.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} ({ag.activeLeads} active)
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={assignmentNote}
                onChange={(e) => setAssignmentNote(e.target.value)}
                placeholder="Assignment or handover note..."
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg w-52"
              />
              <button
                disabled={selectedLeadIds.length === 0}
                onClick={handleBulkAssign}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Assign Selected ({selectedLeadIds.length})
              </button>
            </div>
          )}
        </div>

        {/* Queue Table vs. Immutable Assignment History Table */}
        {queueMode !== 'history' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 pr-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        displayedLeads.length > 0 &&
                        displayedLeads.every((l) => selectedLeadIds.includes(l.id))
                      }
                      onChange={toggleSelectAllDisplayed}
                      className="rounded border-slate-300 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3">Lead ID</th>
                  <th className="py-2.5 px-3">Customer & Phone</th>
                  <th className="py-2.5 px-3">Interested Project & Size</th>
                  <th className="py-2.5 px-3 text-right">Max Budget</th>
                  <th className="py-2.5 px-3">Priority & Source</th>
                  <th className="py-2.5 px-3">Current Agent</th>
                  <th className="py-2.5 pl-3 text-right">Assign / Reassign Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {displayedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      All leads in the queue are currently assigned to active sales consultants.
                    </td>
                  </tr>
                ) : (
                  displayedLeads.map((lead) => {
                    const currentAgent = agents.find((a) => a.id === lead.assignedAgentId);
                    const selectedRowAgent =
                      rowAgentMap[lead.id] || lead.assignedAgentId || targetAgentId;

                    return (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 pr-3">
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.includes(lead.id)}
                            onChange={() => toggleLeadCheckbox(lead.id)}
                            className="rounded border-slate-300 cursor-pointer"
                          />
                        </td>
                        <td
                          onClick={() => setSelectedLeadId(lead.id)}
                          className="py-3 px-3 font-mono font-semibold text-blue-700 hover:underline cursor-pointer"
                        >
                          {lead.id}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{lead.customerName}</div>
                          <div className="font-mono text-[11px] text-slate-500">{lead.phone}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-900">
                            {lead.interestedProperty}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {lead.propertyType} · {lead.propertySize}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-medium text-slate-900">
                          {formatPKR(lead.maxBudget)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-semibold ${
                              lead.priority === 'Urgent'
                                ? 'text-red-600'
                                : lead.priority === 'High'
                                ? 'text-amber-700'
                                : 'text-slate-700'
                            }`}
                          >
                            {lead.priority}
                          </span>
                          <span className="text-slate-300 mx-1.5">·</span>
                          <span className="text-slate-500">{lead.source}</span>
                        </td>
                        <td className="py-3 px-3">
                          {currentAgent ? (
                            <span className="font-medium text-slate-900">
                              {currentAgent.name}
                            </span>
                          ) : (
                            <span className="text-amber-700 font-semibold">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 pl-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <select
                              value={selectedRowAgent}
                              onChange={(e) =>
                                setRowAgentMap((prev) => ({
                                  ...prev,
                                  [lead.id]: e.target.value,
                                }))
                              }
                              className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white"
                            >
                              {activeAgentsMetrics.map((ag) => (
                                <option key={ag.id} value={ag.id}>
                                  {ag.name} ({ag.activeLeads} active)
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleSingleRowAssign(lead.id)}
                              className="px-3 py-1 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                            >
                              {currentAgent ? 'Reassign' : 'Assign'}
                            </button>
                            <button
                              onClick={() => setSelectedLeadId(lead.id)}
                              title="Inspect Lead & Timeline"
                              className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Complete Immutable Assignment History Log */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 pr-4">Log ID</th>
                  <th className="py-2.5 px-4">Lead & Customer</th>
                  <th className="py-2.5 px-4">Previous Agent</th>
                  <th className="py-2.5 px-4">Assigned Agent</th>
                  <th className="py-2.5 px-4">Assigned By</th>
                  <th className="py-2.5 px-4">Assignment Date & Time</th>
                  <th className="py-2.5 pl-4">Audit Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {assignments.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-mono text-slate-500">{rec.id}</td>
                    <td
                      onClick={() => setSelectedLeadId(rec.leadId)}
                      className="py-3 px-4 cursor-pointer"
                    >
                      <span className="font-mono text-blue-700 font-semibold hover:underline">
                        {rec.leadId}
                      </span>
                      <span className="text-slate-300 mx-1.5">·</span>
                      <span className="font-semibold text-slate-900">{rec.leadName}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{rec.previousAgentName}</td>
                    <td className="py-3 px-4 font-semibold text-blue-800">{rec.newAgentName}</td>
                    <td className="py-3 px-4 text-slate-700">{rec.assignedByName}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 tabular-nums">
                      {rec.assignedAt}
                    </td>
                    <td className="py-3 pl-4 text-slate-600">{rec.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
