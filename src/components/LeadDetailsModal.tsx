import React, { useState, useRef } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  UserCheck,
  Edit3,
  Send,
  BadgeCheck,
  Camera,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { formatBudgetRange, formatPKR } from '../services/crmService';
import {
  ALL_LEAD_STATUSES,
  ALL_FOLLOWUP_TYPES,
  SYSTEM_TODAY,
} from '../data/demoData';
import { LeadStatus, ActivityType, FollowUpType } from '../types/crm';

const LOOP_SEQUENCE_STEPS: {
  stepNumber: number;
  title: string;
  subtitle: string;
  targetStatus: LeadStatus;
  matchStatuses: LeadStatus[];
}[] = [
  {
    stepNumber: 1,
    title: '1. New & Assign',
    subtitle: 'Assign to agent / manager',
    targetStatus: 'New',
    matchStatuses: ['New'],
  },
  {
    stepNumber: 2,
    title: '2. Contact & Follow-up',
    subtitle: 'Call & schedule callback',
    targetStatus: 'Contacted',
    matchStatuses: ['Contacted', 'Interested', 'Qualified'],
  },
  {
    stepNumber: 3,
    title: '3. Site Visit',
    subtitle: 'On-ground property tour',
    targetStatus: 'Site Visit Scheduled',
    matchStatuses: ['Site Visit Scheduled'],
  },
  {
    stepNumber: 4,
    title: '4. Negotiation',
    subtitle: 'Finalize plot & price',
    targetStatus: 'Negotiation',
    matchStatuses: ['Negotiation'],
  },
  {
    stepNumber: 5,
    title: '5. Close Deal',
    subtitle: 'Mark lead as Converted',
    targetStatus: 'Converted',
    matchStatuses: ['Converted'],
  },
];

export const LeadDetailsModal: React.FC = () => {
  const {
    selectedLeadId,
    setSelectedLeadId,
    visibleLeads,
    agents,
    projects,
    activities,
    followUps,
    assignments,
    siteVisits,
    changeLeadStatus,
    assignLead,
    logActivity,
    scheduleFollowUp,
    scheduleSiteVisit,
    setEditingLead,
    setConvertingLeadToCustomer,
    updateLead,
    canAssignLeads,
  } = useCRM();

  const [activeTab, setActiveTab] = useState<'timeline' | 'followups' | 'visits' | 'assignments'>(
    'timeline'
  );
  const [quickActionPanel, setQuickActionPanel] = useState<'followup' | 'visit' | 'note'>(
    'followup'
  );

  const [quickNote, setQuickNote] = useState('');
  const [quickActivityType, setQuickActivityType] =
    useState<ActivityType>('Phone Call Made');

  // Quick Follow-up Scheduler inside Drawer
  const [fupType, setFupType] = useState<FollowUpType>('Phone Call');
  const [fupDate, setFupDate] = useState('2026-11-12');
  const [fupTime, setFupTime] = useState('02:30 PM');
  const [fupNotes, setFupNotes] = useState('');

  // Quick Site Visit Scheduler inside Drawer
  const [visitDate, setVisitDate] = useState('2026-11-13');
  const [visitTime, setVisitTime] = useState('03:00 PM');
  const [visitNotes, setVisitNotes] = useState('');

  const photoUploadRef = useRef<HTMLInputElement | null>(null);

  if (!selectedLeadId) return null;

  const lead = visibleLeads.find((l) => l.id === selectedLeadId);
  if (!lead) return null;

  const assignedAgent = agents.find((a) => a.id === lead.assignedAgentId);
  const matchingProject = projects.find(
    (p) => p.name.toLowerCase() === lead.interestedProperty.toLowerCase()
  );
  const propertyPhoto = lead.propertyImageUrl || matchingProject?.imageUrl;

  const leadActivities = activities.filter((a) => a.leadId === lead.id);
  const leadFollowUps = followUps.filter((f) => f.leadId === lead.id);
  const leadAssignments = assignments.filter((as) => as.leadId === lead.id);
  const leadSiteVisits = siteVisits.filter((sv) => sv.leadId === lead.id);

  // Determine current step in the 5-step sequence
  const currentStepIndex = LOOP_SEQUENCE_STEPS.findIndex((s) =>
    s.matchStatuses.includes(lead.status)
  );
  const activeStepNumber = currentStepIndex >= 0 ? currentStepIndex + 1 : 1;

  const handleAdvanceNextStep = () => {
    if (lead.status === 'Converted') return;
    if (activeStepNumber === 1) {
      changeLeadStatus(
        lead.id,
        'Contacted',
        'Advanced in 1-Loop sequence: Lead contacted and follow-up initiated.'
      );
      setQuickActionPanel('followup');
    } else if (activeStepNumber === 2) {
      changeLeadStatus(
        lead.id,
        'Site Visit Scheduled',
        'Advanced in 1-Loop sequence: Moved to Site Visit stage.'
      );
      setQuickActionPanel('visit');
    } else if (activeStepNumber === 3) {
      changeLeadStatus(
        lead.id,
        'Negotiation',
        'Advanced in 1-Loop sequence: Site visit completed, now in price negotiation.'
      );
    } else {
      changeLeadStatus(
        lead.id,
        'Converted',
        'Advanced in 1-Loop sequence: Deal closed and marked as Converted.'
      );
    }
  };

  const handleStepClick = (step: (typeof LOOP_SEQUENCE_STEPS)[number]) => {
    changeLeadStatus(
      lead.id,
      step.targetStatus,
      `Stage updated via 1-Loop Sequence bar to ${step.targetStatus}.`
    );
    if (step.stepNumber === 2) setQuickActionPanel('followup');
    if (step.stepNumber === 3) setQuickActionPanel('visit');
  };

  const handleUploadLeadPropertyPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateLead(
          lead.id,
          { propertyImageUrl: reader.result },
          'Uploaded custom property picture for buyer.'
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQuickLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim()) return;
    logActivity(lead.id, quickActivityType, quickNote.trim());
    setQuickNote('');
  };

  const handleQuickScheduleFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fupNotes.trim()) return;
    scheduleFollowUp({
      leadId: lead.id,
      customerName: lead.customerName,
      CustomerPhone: lead.phone,
      interestedProperty: lead.interestedProperty,
      agentId: lead.assignedAgentId || 'AGT-01',
      agentName: assignedAgent ? assignedAgent.name : 'Zainab Tariq',
      type: fupType,
      scheduledDate: fupDate,
      scheduledTime: fupTime,
      discussionNotes: fupNotes.trim(),
      nextFollowUpDate: fupDate,
    });
    if (lead.status === 'New') {
      changeLeadStatus(lead.id, 'Contacted', 'Follow-up scheduled from 1-Loop workspace.');
    }
    setFupNotes('');
    setActiveTab('followups');
  };

  const handleQuickScheduleSiteVisit = (e: React.FormEvent) => {
    e.preventDefault();
    const projectObj =
      matchingProject ||
      projects[0] || {
        id: 'PRJ-01',
        name: lead.interestedProperty,
      };
    scheduleSiteVisit({
      leadId: lead.id,
      customerName: lead.customerName,
      customerPhone: lead.phone,
      projectId: projectObj.id,
      projectName: lead.interestedProperty || projectObj.name,
      propertyType: lead.propertyType,
      agentId: lead.assignedAgentId || 'AGT-01',
      agentName: assignedAgent ? assignedAgent.name : 'Zainab Tariq',
      visitDate,
      visitTime,
      status: 'Scheduled',
      notes:
        visitNotes.trim() ||
        `On-ground site visit scheduled for ${lead.interestedProperty} (${lead.propertySize}).`,
      customerFeedback: 'Awaiting visit feedback',
    });
    if (lead.status !== 'Converted' && lead.status !== 'Negotiation') {
      changeLeadStatus(
        lead.id,
        'Site Visit Scheduled',
        `Site visit scheduled for ${visitDate} at ${visitTime}.`
      );
    }
    setVisitNotes('');
    setActiveTab('visits');
  };

  const activityTypesList: ActivityType[] = [
    'Phone Call Made',
    'WhatsApp Conversation',
    'Meeting Scheduled',
    'Site Visit Completed',
    'Follow-up Added',
    'Notes Added',
  ];

  const nextStepButtonLabel =
    activeStepNumber === 1
      ? 'Next: Mark Contacted & Follow-up'
      : activeStepNumber === 2
      ? 'Next: Schedule Site Visit'
      : activeStepNumber === 3
      ? 'Next: Move to Negotiation'
      : activeStepNumber === 4
      ? 'Next: Confirm Property Booking'
      : 'Deal Completed & Booked';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-[1px]">
      <div className="bg-white w-full max-w-4xl h-full flex flex-col shadow-2xl border-l border-slate-200 overflow-hidden">
        {/* Top Sticky Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-blue-600 text-white shrink-0">
              {lead.id}
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white truncate">{lead.customerName}</h2>
              <p className="text-xs text-slate-300 truncate">
                {lead.interestedProperty} · {lead.propertySize} ({lead.propertyType}) ·{' '}
                <span className="text-emerald-400 font-mono font-semibold">
                  {formatPKR(lead.maxBudget)}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {lead.status !== 'Converted' && (
              <button
                onClick={() =>
                  changeLeadStatus(
                    lead.id,
                    'Converted',
                    'Deal closed directly from 1-Loop Lead Workspace.'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <BadgeCheck className="w-3.5 h-3.5" />
                Close Deal
              </button>
            )}
            <button
              onClick={() => setEditingLead(lead)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Lead
            </button>
            <button
              onClick={() => setSelectedLeadId(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Lead Details Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Status, Assigned Agent & Next Follow-up Control Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Assign Agent / Sales Manager */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 whitespace-nowrap">
                  Assigned Agent / Consultant
                </label>
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-700 shrink-0" />
                  {canAssignLeads ? (
                    <select
                      value={lead.assignedAgentId || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          assignLead(
                            lead.id,
                            e.target.value,
                            'Assigned directly from Lead Details drawer.'
                          );
                        }
                      }}
                      className={`w-full px-2.5 py-1.5 text-xs font-semibold border rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer ${
                        lead.assignedAgentId
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-amber-50 border-amber-300 text-amber-900'
                      }`}
                    >
                      <option value="">Unassigned — Select Person</option>
                      {agents
                        .filter((a) => a.accountStatus === 'Active')
                        .map((ag) => (
                          <option key={ag.id} value={ag.id}>
                            {ag.name} ({ag.roleTitle})
                          </option>
                        ))}
                    </select>
                  ) : (
                    <div className="w-full px-2.5 py-1.5 text-xs font-semibold border border-emerald-200 rounded-lg bg-emerald-50 text-emerald-800 truncate">
                      {assignedAgent ? `${assignedAgent.name} (${assignedAgent.roleTitle})` : 'Assigned to You'}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Exact Pipeline Status */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 whitespace-nowrap">
                  Current Lead Status
                </label>
                <select
                  value={lead.status}
                  onChange={(e) => changeLeadStatus(lead.id, e.target.value as LeadStatus)}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  {ALL_LEAD_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Next Follow-up Date Inline Picker */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 whitespace-nowrap">
                  Next Follow-up Date
                </label>
                <input
                  type="date"
                  value={lead.nextFollowUpDate || ''}
                  onChange={(e) =>
                    updateLead(
                      lead.id,
                      { nextFollowUpDate: e.target.value || null },
                      `Updated next follow-up date to ${e.target.value || 'Cleared'}.`
                    )
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Quick Actions Box: Schedule Follow-up, Schedule Site Visit, or Log Call Note */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 whitespace-nowrap">
                Quick Actions & Follow-up Scheduler
              </span>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setQuickActionPanel('followup')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    quickActionPanel === 'followup'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                  Schedule Follow-up
                </button>
                <button
                  type="button"
                  onClick={() => setQuickActionPanel('visit')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    quickActionPanel === 'visit'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Schedule Site Visit
                </button>
                <button
                  type="button"
                  onClick={() => setQuickActionPanel('note')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    quickActionPanel === 'note'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  Log Call / Note
                </button>
              </div>
            </div>

            {quickActionPanel === 'followup' && (
              <form onSubmit={handleQuickScheduleFollowUp} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Follow-up Channel
                    </label>
                    <select
                      value={fupType}
                      onChange={(e) => setFupType(e.target.value as FollowUpType)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      {ALL_FOLLOWUP_TYPES.map((ft) => (
                        <option key={ft} value={ft}>
                          {ft}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={fupDate}
                      onChange={(e) => setFupDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Time
                    </label>
                    <input
                      type="text"
                      value={fupTime}
                      onChange={(e) => setFupTime(e.target.value)}
                      placeholder="02:30 PM"
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={fupNotes}
                    onChange={(e) => setFupNotes(e.target.value)}
                    placeholder="Enter call agenda or client follow-up note..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Save Follow-up
                  </button>
                </div>
              </form>
            )}

            {quickActionPanel === 'visit' && (
              <form onSubmit={handleQuickScheduleSiteVisit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Project / Property
                    </label>
                    <div className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 truncate">
                      {lead.interestedProperty} ({lead.propertySize})
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Site Visit Date
                    </label>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Visit Time
                    </label>
                    <input
                      type="text"
                      value={visitTime}
                      onChange={(e) => setVisitTime(e.target.value)}
                      placeholder="03:00 PM"
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                    placeholder="Meeting point, plot numbers to show, or client preferences..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Confirm Site Visit
                  </button>
                </div>
              </form>
            )}

            {quickActionPanel === 'note' && (
              <form onSubmit={handleQuickLogSubmit} className="flex flex-col sm:flex-row gap-2">
                <select
                  value={quickActivityType}
                  onChange={(e) => setQuickActivityType(e.target.value as ActivityType)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
                >
                  {activityTypesList.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Enter call summary, WhatsApp message, or price discussion..."
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Save Note
                </button>
              </form>
            )}
          </div>

          {/* Buyer Contact & Property Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900">
                  Buyer Contact & Reference Details
                </h3>
                <span className="font-mono text-xs font-bold text-blue-700">
                  {formatBudgetRange(lead.minBudget, lead.maxBudget)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Phone Number</span>
                  <span className="font-mono font-medium text-slate-900 mt-0.5 inline-flex items-center gap-1">
                    <Phone className="w-3 h-3 text-blue-600" />
                    {lead.phone}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">WhatsApp</span>
                  <span className="font-mono font-medium text-emerald-700 mt-0.5 inline-flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-emerald-600" />
                    {lead.whatsapp}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Email Address</span>
                  <span className="font-medium text-slate-900 mt-0.5 inline-flex items-center gap-1 truncate max-w-full">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{lead.email || 'Not provided'}</span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">City & Area</span>
                  <span className="font-medium text-slate-900 mt-0.5 inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {lead.area}, {lead.city}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Lead Source</span>
                  <span className="font-medium text-slate-900 mt-0.5 block">{lead.source}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Lead Reference (Company / Sent By)</span>
                  <span className="font-semibold text-blue-700 mt-0.5 block">
                    {lead.leadReference || 'Direct Inquiry'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900">
                  Interested Property & Picture
                </h3>
                <input
                  ref={photoUploadRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadLeadPropertyPhoto}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => photoUploadRef.current?.click()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Upload Property Photo
                </button>
              </div>

              {propertyPhoto && (
                <div className="h-28 w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-900 relative">
                  <img
                    src={propertyPhoto}
                    alt={lead.interestedProperty}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <span className="absolute bottom-2 left-3 text-white text-xs font-bold">
                    {lead.interestedProperty} ({lead.propertySize})
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Property Type & Size</span>
                  <span className="font-medium text-slate-900 mt-0.5 block">
                    {lead.propertyType} · {lead.propertySize}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Purchase Purpose</span>
                  <span className="font-medium text-slate-900 mt-0.5 block">
                    {lead.purchasePurpose}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Buyer Requirement Notes */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <span className="text-xs font-bold text-slate-800 block mb-1">
              Buyer Requirements & Consultant Notes
            </span>
            <p className="text-xs text-slate-700 leading-relaxed">
              {lead.notes || 'No additional notes recorded for this buyer.'}
            </p>
          </div>

          {/* Segmented History Tabs */}
          <div>
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === 'timeline'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Activity Timeline ({leadActivities.length})
              </button>
              <button
                onClick={() => setActiveTab('followups')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === 'followups'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Follow-ups ({leadFollowUps.length})
              </button>
              <button
                onClick={() => setActiveTab('visits')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === 'visits'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Site Visits ({leadSiteVisits.length})
              </button>
              {canAssignLeads && (
                <button
                  onClick={() => setActiveTab('assignments')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeTab === 'assignments'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Assignment History ({leadAssignments.length})
                </button>
              )}
            </div>

            {activeTab === 'timeline' && (
              <div className="mt-4 space-y-2.5">
                {leadActivities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start justify-between gap-4 p-3.5 bg-white border border-slate-200 rounded-xl"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-900">{act.activityType}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-blue-700 font-medium">By {act.actorName}</span>
                      </div>
                      <p className="text-xs text-slate-600">{act.description}</p>
                    </div>
                    <div className="text-right font-mono text-[11px] text-slate-500 shrink-0 tabular-nums">
                      <div>{act.date}</div>
                      <div>{act.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'followups' && (
              <div className="mt-4 space-y-2.5">
                {leadFollowUps.map((fup) => {
                  const isOverdue =
                    fup.status !== 'Completed' && fup.scheduledDate < SYSTEM_TODAY;
                  return (
                    <div
                      key={fup.id}
                      className="flex items-start justify-between gap-4 p-3.5 bg-white border border-slate-200 rounded-xl"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-slate-900">{fup.type}</span>
                          <span className="text-slate-300">·</span>
                          <span
                            className={`font-semibold ${
                              fup.status === 'Completed'
                                ? 'text-emerald-700'
                                : isOverdue
                                ? 'text-red-600'
                                : 'text-blue-700'
                            }`}
                          >
                            {isOverdue ? 'OVERDUE' : fup.status}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-600">Agent: {fup.agentName}</span>
                        </div>
                        <p className="text-xs text-slate-600">{fup.discussionNotes}</p>
                      </div>
                      <div className="text-right font-mono text-[11px] text-slate-500 shrink-0 tabular-nums">
                        <div>Scheduled: {fup.scheduledDate}</div>
                        <div>{fup.scheduledTime}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'visits' && (
              <div className="mt-4 space-y-2.5">
                {leadSiteVisits.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                    No site visits scheduled yet for this buyer. Click “Schedule Site Visit” above to book a tour.
                  </div>
                ) : (
                  leadSiteVisits.map((sv) => (
                    <div
                      key={sv.id}
                      className="flex items-start justify-between gap-4 p-3.5 bg-white border border-slate-200 rounded-xl"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <Building2 className="w-3.5 h-3.5 text-blue-700" />
                          <span className="font-bold text-slate-900">{sv.projectName}</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-semibold text-blue-700">{sv.status}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-600">Consultant: {sv.agentName}</span>
                        </div>
                        <p className="text-xs text-slate-600">
                          {sv.notes || sv.customerFeedback}
                        </p>
                      </div>
                      <div className="text-right font-mono text-[11px] text-slate-500 shrink-0 tabular-nums">
                        <div>{sv.visitDate}</div>
                        <div>{sv.visitTime}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'assignments' && (
              <div className="mt-4 space-y-2.5">
                {leadAssignments.map((asn) => (
                  <div
                    key={asn.id}
                    className="flex items-start justify-between gap-4 p-3.5 bg-white border border-slate-200 rounded-xl"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-700">
                          {asn.previousAgentName}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="font-bold text-blue-700">{asn.newAgentName}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500">
                          Assigned by {asn.assignedByName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{asn.notes}</p>
                    </div>
                    <div className="text-right font-mono text-[11px] text-slate-500 shrink-0 tabular-nums">
                      {asn.assignedAt}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
