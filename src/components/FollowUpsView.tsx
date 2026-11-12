import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Plus,
  RotateCcw,
  History,
  X,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { ALL_FOLLOWUP_TYPES, SYSTEM_TODAY } from '../data/demoData';
import { FollowUp, FollowUpType } from '../types/crm';

export const FollowUpsView: React.FC = () => {
  const {
    visibleFollowUps,
    visibleLeads,
    agents,
    scheduleFollowUp,
    completeFollowUp,
    rescheduleFollowUp,
    setSelectedLeadId,
  } = useCRM();

  const [tab, setTab] = useState<'overdue' | 'today' | 'upcoming' | 'completed' | 'all'>('today');
  const [agentFilter, setAgentFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Schedule New Follow-Up Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedLeadForNew, setSelectedLeadForNew] = useState(visibleLeads[0]?.id || 'LD-1001');
  const [selectedAgentForNew, setSelectedAgentForNew] = useState(
    agents.find((a) => a.accountStatus === 'Active')?.id || 'AGT-01'
  );
  const [newType, setNewType] = useState<FollowUpType>('Phone Call');
  const [newDate, setNewDate] = useState(SYSTEM_TODAY);
  const [newTime, setNewTime] = useState('03:00 PM');
  const [newNotes, setNewNotes] = useState('');
  const [newNextDate, setNewNextDate] = useState('');

  // Complete Follow-Up Modal
  const [completingItem, setCompletingItem] = useState<FollowUp | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [nextFollowUpAfterComplete, setNextFollowUpAfterComplete] = useState('');
  const [nextFollowUpTypeAfterComplete, setNextFollowUpTypeAfterComplete] =
    useState<FollowUpType>('Phone Call');

  // Reschedule Follow-Up Modal
  const [reschedulingItem, setReschedulingItem] = useState<FollowUp | null>(null);
  const [reschedDate, setReschedDate] = useState(SYSTEM_TODAY);
  const [reschedTime, setReschedTime] = useState('04:00 PM');
  const [reschedReason, setReschedReason] = useState('');

  // Customer Follow-Up History Drawer
  const [historyLeadId, setHistoryLeadId] = useState<string | null>(null);

  const overdueList = useMemo(
    () =>
      visibleFollowUps.filter(
        (f) => f.status === 'Pending' && f.scheduledDate < SYSTEM_TODAY
      ),
    [visibleFollowUps]
  );

  const todayList = useMemo(
    () =>
      visibleFollowUps.filter(
        (f) => f.status === 'Pending' && f.scheduledDate === SYSTEM_TODAY
      ),
    [visibleFollowUps]
  );

  const upcomingList = useMemo(
    () =>
      visibleFollowUps.filter(
        (f) => f.status === 'Pending' && f.scheduledDate > SYSTEM_TODAY
      ),
    [visibleFollowUps]
  );

  const completedList = useMemo(
    () =>
      visibleFollowUps.filter(
        (f) => f.status === 'Completed' || f.status === 'Rescheduled'
      ),
    [visibleFollowUps]
  );

  const displayedFollowUps = useMemo(() => {
    let base = visibleFollowUps;
    if (tab === 'overdue') base = overdueList;
    else if (tab === 'today') base = todayList;
    else if (tab === 'upcoming') base = upcomingList;
    else if (tab === 'completed') base = completedList;

    return base.filter((f) => {
      if (agentFilter !== 'ALL' && f.agentId !== agentFilter) return false;
      if (typeFilter !== 'ALL' && f.type !== typeFilter) return false;
      return true;
    });
  }, [
    visibleFollowUps,
    overdueList,
    todayList,
    upcomingList,
    completedList,
    tab,
    agentFilter,
    typeFilter,
  ]);

  const handleCreateFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    const leadObj = visibleLeads.find((l) => l.id === selectedLeadForNew);
    const agentObj = agents.find((a) => a.id === selectedAgentForNew);
    if (!leadObj || !agentObj || !newNotes.trim()) return;

    scheduleFollowUp({
      leadId: leadObj.id,
      customerName: leadObj.customerName,
      CustomerPhone: leadObj.phone,
      interestedProperty: leadObj.interestedProperty,
      agentId: agentObj.id,
      agentName: agentObj.name,
      scheduledDate: newDate,
      scheduledTime: newTime,
      type: newType,
      discussionNotes: newNotes.trim(),
      nextFollowUpDate: newNextDate || null,
    });

    setNewNotes('');
    setIsNewModalOpen(false);
  };

  const handleConfirmComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingItem || !outcomeNotes.trim()) return;
    completeFollowUp(
      completingItem.id,
      outcomeNotes.trim(),
      nextFollowUpAfterComplete || null,
      nextFollowUpTypeAfterComplete
    );
    setCompletingItem(null);
    setOutcomeNotes('');
    setNextFollowUpAfterComplete('');
  };

  const handleConfirmReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingItem || !reschedReason.trim()) return;
    rescheduleFollowUp(
      reschedulingItem.id,
      reschedDate,
      reschedTime,
      reschedReason.trim()
    );
    setReschedulingItem(null);
    setReschedReason('');
  };

  const historyCustomerFollowUps = useMemo(
    () => visibleFollowUps.filter((f) => f.leadId === historyLeadId),
    [visibleFollowUps, historyLeadId]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Follow-up Scheduling & Client Touchpoint Log
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track overdue calls, today's client meetings, and preserve complete customer conversation histories
          </p>
        </div>
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Schedule Follow-up
        </button>
      </div>

      {/* Prominent Visual Warning Banner for Overdue Follow-ups */}
      {overdueList.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <h3 className="text-xs font-bold text-red-900">
                Action Required: {overdueList.length} Overdue Follow-up
                {overdueList.length > 1 ? 's' : ''} Detected
              </h3>
              <p className="text-xs text-red-700 mt-0.5">
                High-intent buyers are awaiting callback or meeting confirmation past their scheduled SLA date.
              </p>
            </div>
          </div>
          <button
            onClick={() => setTab('overdue')}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Review Overdue Queue ({overdueList.length})
          </button>
        </div>
      )}

      {/* Filter & Segmented Tab Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            <button
              onClick={() => setTab('overdue')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                tab === 'overdue'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-red-700 hover:bg-red-50'
              }`}
            >
              Overdue ({overdueList.length})
            </button>
            <button
              onClick={() => setTab('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                tab === 'today'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today's Follow-ups ({todayList.length})
            </button>
            <button
              onClick={() => setTab('upcoming')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                tab === 'upcoming'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upcoming ({upcomingList.length})
            </button>
            <button
              onClick={() => setTab('completed')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                tab === 'completed'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completed & Rescheduled ({completedList.length})
            </button>
            <button
              onClick={() => setTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                tab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Records ({visibleFollowUps.length})
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">All Follow-up Types</option>
              {ALL_FOLLOWUP_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">All Agents</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Follow-Ups Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 pr-4">Scheduled Date & Time</th>
                <th className="py-2.5 px-4">Customer & Lead ID</th>
                <th className="py-2.5 px-4">Interested Project</th>
                <th className="py-2.5 px-4">Follow-up Type</th>
                <th className="py-2.5 px-4">Assigned Agent</th>
                <th className="py-2.5 px-4">Discussion Notes</th>
                <th className="py-2.5 px-4">Next Follow-up</th>
                <th className="py-2.5 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {displayedFollowUps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No follow-up records found for this view.
                  </td>
                </tr>
              ) : (
                displayedFollowUps.map((fup) => {
                  const isOverdue =
                    fup.status === 'Pending' && fup.scheduledDate < SYSTEM_TODAY;

                  return (
                    <tr
                      key={fup.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isOverdue ? 'bg-red-50/40' : ''
                      }`}
                    >
                      <td className="py-3 pr-4 font-mono tabular-nums whitespace-nowrap">
                        <div
                          className={`font-semibold ${
                            isOverdue
                              ? 'text-red-600'
                              : fup.scheduledDate === SYSTEM_TODAY
                              ? 'text-blue-700'
                              : 'text-slate-900'
                          }`}
                        >
                          {fup.scheduledDate}
                          {isOverdue && ' (OVERDUE)'}
                        </div>
                        <div className="text-[11px] text-slate-500">{fup.scheduledTime}</div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedLeadId(fup.leadId)}
                          className="font-semibold text-slate-900 hover:text-blue-700 hover:underline text-left cursor-pointer"
                        >
                          {fup.customerName}
                        </button>
                        <div className="font-mono text-[11px] text-slate-500">
                          {fup.leadId} · {fup.CustomerPhone}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-800">{fup.interestedProperty}</td>
                      <td className="py-3 px-4 font-medium text-blue-800 whitespace-nowrap">
                        {fup.type}
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {fup.agentName}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">
                        {fup.discussionNotes}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {fup.nextFollowUpDate || '—'}
                      </td>
                      <td className="py-3 pl-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {fup.status === 'Pending' ? (
                            <>
                              <button
                                onClick={() => {
                                  setCompletingItem(fup);
                                  setOutcomeNotes('');
                                  setNextFollowUpAfterComplete(fup.nextFollowUpDate || '');
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors cursor-pointer"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => {
                                  setReschedulingItem(fup);
                                  setReschedDate(SYSTEM_TODAY);
                                  setReschedTime('04:00 PM');
                                  setReschedReason('');
                                }}
                                className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                              >
                                Reschedule
                              </button>
                            </>
                          ) : (
                            <span className="font-mono text-[11px] font-semibold text-emerald-700 px-2">
                              {fup.status}
                            </span>
                          )}
                          <button
                            onClick={() => setHistoryLeadId(fup.leadId)}
                            title="View All Follow-ups for This Customer"
                            className="p-1.5 text-slate-500 hover:text-blue-700 rounded-md cursor-pointer"
                          >
                            <History className="w-4 h-4" />
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
      </div>

      {/* Modal 1: Schedule New Follow-up */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Schedule Client Follow-up</h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateFollowUp} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Select Customer Lead</label>
                <select
                  value={selectedLeadForNew}
                  onChange={(e) => setSelectedLeadForNew(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {visibleLeads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.id} — {l.customerName} ({l.interestedProperty})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Assigned Sales Agent</label>
                  <select
                    value={selectedAgentForNew}
                    onChange={(e) => setSelectedAgentForNew(e.target.value)}
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
                  <label className="block font-medium text-slate-700 mb-1">Follow-up Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as FollowUpType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {ALL_FOLLOWUP_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Time</label>
                  <input
                    type="text"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Next Follow-up</label>
                  <input
                    type="date"
                    value={newNextDate}
                    onChange={(e) => setNewNextDate(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Customer Discussion Notes / Agenda *
                </label>
                <textarea
                  rows={3}
                  required
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Enter discussion points, payment plan questions, or plot selection agenda..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  Save Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Mark Follow-up Completed */}
      {completingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Complete Follow-up — {completingItem.customerName}
            </h3>
            <form onSubmit={handleConfirmComplete} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Call / Meeting Outcome Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="Record what was discussed with the customer..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Schedule Next Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={nextFollowUpAfterComplete}
                    onChange={(e) => setNextFollowUpAfterComplete(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Next Touchpoint Type
                  </label>
                  <select
                    value={nextFollowUpTypeAfterComplete}
                    onChange={(e) =>
                      setNextFollowUpTypeAfterComplete(e.target.value as FollowUpType)
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {ALL_FOLLOWUP_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCompletingItem(null)}
                  className="px-4 py-2 font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                >
                  Mark Completed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Reschedule Follow-up */}
      {reschedulingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Reschedule Follow-up — {reschedulingItem.customerName}
            </h3>
            <p className="text-xs text-slate-500">
              The prior follow-up record ({reschedulingItem.scheduledDate}) will be preserved in customer history.
            </p>
            <form onSubmit={handleConfirmReschedule} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">New Date *</label>
                  <input
                    type="date"
                    required
                    value={reschedDate}
                    onChange={(e) => setReschedDate(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">New Time *</label>
                  <input
                    type="text"
                    required
                    value={reschedTime}
                    onChange={(e) => setReschedTime(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Reason / Discussion Note *
                </label>
                <textarea
                  rows={2}
                  required
                  value={reschedReason}
                  onChange={(e) => setReschedReason(e.target.value)}
                  placeholder="e.g. Client travelling abroad until Thursday..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReschedulingItem(null)}
                  className="px-4 py-2 font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Customer Follow-up History Viewer */}
      {historyLeadId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Complete Follow-up History — {historyCustomerFollowUps[0]?.customerName || historyLeadId}
                </h3>
                <p className="text-xs text-slate-500">
                  Chronological log of all past, rescheduled, and upcoming touchpoints
                </p>
              </div>
              <button
                onClick={() => setHistoryLeadId(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2.5 max-h-96 overflow-y-auto">
              {historyCustomerFollowUps.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 border border-slate-200 rounded-xl flex items-start justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{item.type}</span>
                      <span className="text-slate-300">·</span>
                      <span className="font-semibold text-blue-700">{item.status}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">Agent: {item.agentName}</span>
                    </div>
                    <p className="text-slate-600">{item.discussionNotes}</p>
                  </div>
                  <div className="text-right font-mono text-[11px] text-slate-500 shrink-0 tabular-nums">
                    <div>{item.scheduledDate}</div>
                    <div>{item.scheduledTime}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
