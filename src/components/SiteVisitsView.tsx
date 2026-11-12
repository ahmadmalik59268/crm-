import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  CheckCircle2,
  XCircle,
  Calendar,
  MessageSquare,
  X,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { SYSTEM_TODAY } from '../data/demoData';
import { SiteVisit } from '../types/crm';

export const SiteVisitsView: React.FC = () => {
  const {
    visibleSiteVisits,
    visibleLeads,
    projects,
    agents,
    scheduleSiteVisit,
    updateSiteVisitStatus,
    setSelectedLeadId,
  } = useCRM();

  const [statusFilter, setStatusFilter] = useState<'ALL' | SiteVisit['status']>('ALL');
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // Schedule form state
  const [leadId, setLeadId] = useState(visibleLeads[0]?.id || 'LD-1001');
  const [projectId, setProjectId] = useState(projects[0]?.id || 'PRJ-01');
  const [agentId, setAgentId] = useState(
    agents.find((a) => a.accountStatus === 'Active')?.id || 'AGT-01'
  );
  const [visitDate, setVisitDate] = useState(SYSTEM_TODAY);
  const [visitTime, setVisitTime] = useState('11:30 AM');
  const [notes, setNotes] = useState('');

  // Feedback / Status Update Modal
  const [editingVisit, setEditingVisit] = useState<SiteVisit | null>(null);
  const [nextStatus, setNextStatus] = useState<SiteVisit['status']>('Completed');
  const [feedbackText, setFeedbackText] = useState('');
  const [reschedDate, setReschedDate] = useState(SYSTEM_TODAY);
  const [reschedTime, setReschedTime] = useState('03:00 PM');

  const filteredVisits = visibleSiteVisits.filter(
    (sv) => statusFilter === 'ALL' || sv.status === statusFilter
  );

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const leadObj = visibleLeads.find((l) => l.id === leadId);
    const projObj = projects.find((p) => p.id === projectId);
    const agentObj = agents.find((a) => a.id === agentId);
    if (!leadObj || !projObj || !agentObj) return;

    scheduleSiteVisit({
      leadId: leadObj.id,
      customerName: leadObj.customerName,
      customerPhone: leadObj.phone,
      projectId: projObj.id,
      projectName: projObj.name,
      propertyType: projObj.propertyType,
      agentId: agentObj.id,
      agentName: agentObj.name,
      visitDate,
      visitTime,
      status: 'Scheduled',
      notes: notes.trim() || 'Physical project tour scheduled.',
      customerFeedback: '',
    });

    setNotes('');
    setIsScheduleOpen(false);
  };

  const handleStatusUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVisit) return;
    updateSiteVisitStatus(
      editingVisit.id,
      nextStatus,
      feedbackText.trim(),
      nextStatus === 'Rescheduled' ? reschedDate : undefined,
      nextStatus === 'Rescheduled' ? reschedTime : undefined
    );
    setEditingVisit(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Site Visit Coordination & Buyer Feedback
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Schedule on-ground plot and model apartment inspections, assign field agents, and record post-visit client impressions
          </p>
        </div>
        <button
          onClick={() => setIsScheduleOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Schedule Site Visit
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl w-fit">
        {(['ALL', 'Scheduled', 'Completed', 'Rescheduled', 'Cancelled'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              statusFilter === st
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {st === 'ALL' ? `All Visits (${visibleSiteVisits.length})` : st}
          </button>
        ))}
      </div>

      {/* Site Visits Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-3 pl-5 pr-3">Visit Date & Time</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Project / Property</th>
                <th className="py-3 px-3">Assigned Agent</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Visit Notes & Buyer Feedback</th>
                <th className="py-3 pl-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredVisits.map((sv) => (
                <tr key={sv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 pl-5 pr-3 font-mono tabular-nums whitespace-nowrap">
                    <div className="font-semibold text-slate-900">{sv.visitDate}</div>
                    <div className="text-[11px] text-slate-500">{sv.visitTime}</div>
                  </td>
                  <td className="py-3.5 px-3">
                    <button
                      onClick={() => setSelectedLeadId(sv.leadId)}
                      className="font-semibold text-slate-900 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      {sv.customerName}
                    </button>
                    <div className="font-mono text-[11px] text-slate-500">
                      {sv.leadId} · {sv.customerPhone}
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="font-semibold text-blue-800">{sv.projectName}</div>
                    <div className="text-[11px] text-slate-500">{sv.propertyType}</div>
                  </td>
                  <td className="py-3.5 px-3 text-slate-800 whitespace-nowrap">
                    {sv.agentName}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span
                      className={`font-semibold ${
                        sv.status === 'Completed'
                          ? 'text-emerald-700'
                          : sv.status === 'Cancelled'
                          ? 'text-red-600'
                          : sv.status === 'Rescheduled'
                          ? 'text-amber-700'
                          : 'text-blue-700'
                      }`}
                    >
                      {sv.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 max-w-md space-y-1">
                    <div className="text-slate-700">{sv.notes}</div>
                    {sv.customerFeedback && (
                      <div className="text-emerald-800 font-medium">
                        Feedback: "{sv.customerFeedback}"
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                    <button
                      onClick={() => {
                        setEditingVisit(sv);
                        setNextStatus('Completed');
                        setFeedbackText(sv.customerFeedback || '');
                        setReschedDate(sv.visitDate);
                        setReschedTime(sv.visitTime);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Update Status / Feedback
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Schedule Site Visit */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Schedule Property Site Visit</h3>
              <button
                onClick={() => setIsScheduleOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleScheduleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Select Customer</label>
                <select
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {visibleLeads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.id} — {l.customerName} ({l.phone})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Select Project / Property
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.propertyType})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Assign Agent</label>
                  <select
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {agents
                      .filter((a) => a.accountStatus === 'Active')
                      .map((ag) => (
                        <option key={ag.id} value={ag.id}>
                          {ag.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Visit Date *</label>
                  <input
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Visit Time *</label>
                  <input
                    type="text"
                    required
                    value={visitTime}
                    onChange={(e) => setVisitTime(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Visit Logistics & Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter meeting point, gate pass details, or specific plots/units to showcase..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(false)}
                  className="px-4 py-2 font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  Confirm Site Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Update Site Visit Status & Record Customer Feedback */}
      {editingVisit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Update Site Visit — {editingVisit.customerName}
            </h3>
            <form onSubmit={handleStatusUpdateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Visit Outcome Status</label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as SiteVisit['status'])}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Completed">Completed</option>
                  <option value="Rescheduled">Rescheduled</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Scheduled">Scheduled</option>
                </select>
              </div>
              {nextStatus === 'Rescheduled' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">New Date</label>
                    <input
                      type="date"
                      value={reschedDate}
                      onChange={(e) => setReschedDate(e.target.value)}
                      className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">New Time</label>
                    <input
                      type="text"
                      value={reschedTime}
                      onChange={(e) => setReschedTime(e.target.value)}
                      className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Customer Feedback & Impressions
                </label>
                <textarea
                  rows={3}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Record buyer feedback on plot location, pricing, or next steps..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingVisit(null)}
                  className="px-4 py-2 font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  Save Visit Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
