import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  FileDown,
  ArrowUpDown,
  Edit3,
  Trash2,
  UserCheck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Table as TableIcon,
  Phone,
  BadgeCheck,
  ArrowRight,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { formatBudgetRange, formatPKR, exportRecordsToCSV } from '../services/crmService';
import {
  ALL_LEAD_STATUSES,
  ALL_LEAD_SOURCES,
  ALL_LEAD_PRIORITIES,
  SYSTEM_TODAY,
} from '../data/demoData';
import { Lead, LeadStatus } from '../types/crm';

type SortField = 'id' | 'customerName' | 'maxBudget' | 'createdAt' | 'nextFollowUpDate';
type SequenceStepFilter = 'ALL' | 'STEP_1' | 'STEP_2' | 'STEP_3' | 'STEP_4' | 'STEP_5';

export const LeadsManagementView: React.FC = () => {
  const {
    visibleLeads,
    agents,
    projects,
    setSelectedLeadId,
    setIsAddLeadModalOpen,
    setEditingLead,
    setConvertingLeadToCustomer,
    deleteLead,
    changeLeadStatus,
    updateLead,
    assignLead,
    bulkAssignLeads,
    canAssignLeads,
    currentRole,
  } = useCRM();

  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [sequenceStep, setSequenceStep] = useState<SequenceStepFilter>('ALL');

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [agentFilter, setAgentFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Bulk selection & assignment state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAgentId, setBulkAgentId] = useState<string>(
    agents.find((a) => a.accountStatus === 'Active')?.id || 'AGT-01'
  );
  const [bulkNote, setBulkNote] = useState('');

  // Delete confirmation dialog state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // 5-Step Sequence Counts across visibleLeads
  const sequenceCounts = useMemo(() => {
    return {
      all: visibleLeads.length,
      step1: visibleLeads.filter((l) => l.status === 'New' || !l.assignedAgentId).length,
      step2: visibleLeads.filter((l) =>
        ['Contacted', 'Interested', 'Qualified'].includes(l.status)
      ).length,
      step3: visibleLeads.filter((l) => l.status === 'Site Visit Scheduled').length,
      step4: visibleLeads.filter((l) => l.status === 'Negotiation').length,
      step5: visibleLeads.filter((l) => l.status === 'Converted').length,
    };
  }, [visibleLeads]);

  const filteredAndSortedLeads = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = visibleLeads.filter((l) => {
      if (q) {
        const match =
          l.id.toLowerCase().includes(q) ||
          l.customerName.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          l.whatsapp.toLowerCase().includes(q) ||
          (l.leadReference || '').toLowerCase().includes(q) ||
          l.interestedProperty.toLowerCase().includes(q) ||
          l.area.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (sequenceStep === 'STEP_1' && !(l.status === 'New' || !l.assignedAgentId)) {
        return false;
      }
      if (
        sequenceStep === 'STEP_2' &&
        !['Contacted', 'Interested', 'Qualified'].includes(l.status)
      ) {
        return false;
      }
      if (sequenceStep === 'STEP_3' && l.status !== 'Site Visit Scheduled') {
        return false;
      }
      if (sequenceStep === 'STEP_4' && l.status !== 'Negotiation') {
        return false;
      }
      if (sequenceStep === 'STEP_5' && l.status !== 'Converted') {
        return false;
      }

      if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
      if (sourceFilter !== 'ALL' && l.source !== sourceFilter) return false;
      if (priorityFilter !== 'ALL' && l.priority !== priorityFilter) return false;
      if (agentFilter === 'UNASSIGNED' && l.assignedAgentId !== null) return false;
      if (
        agentFilter !== 'ALL' &&
        agentFilter !== 'UNASSIGNED' &&
        l.assignedAgentId !== agentFilter
      ) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'id') cmp = a.id.localeCompare(b.id);
      else if (sortField === 'customerName')
        cmp = a.customerName.localeCompare(b.customerName);
      else if (sortField === 'maxBudget') cmp = a.maxBudget - b.maxBudget;
      else if (sortField === 'createdAt') cmp = a.createdAt.localeCompare(b.createdAt);
      else if (sortField === 'nextFollowUpDate')
        cmp = (a.nextFollowUpDate || '9999').localeCompare(b.nextFollowUpDate || '9999');

      return sortAsc ? cmp : -cmp;
    });
  }, [
    visibleLeads,
    searchQuery,
    sequenceStep,
    statusFilter,
    sourceFilter,
    agentFilter,
    priorityFilter,
    sortField,
    sortAsc,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedLeads.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedLeads = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAndSortedLeads.slice(start, start + pageSize);
  }, [filteredAndSortedLeads, safePage, pageSize]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSequenceStep('ALL');
    setStatusFilter('ALL');
    setSourceFilter('ALL');
    setAgentFilter('ALL');
    setPriorityFilter('ALL');
    setCurrentPage(1);
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllCurrentPage = () => {
    const pageIds = paginatedLeads.map((l) => l.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleBulkAssignSubmit = () => {
    if (selectedIds.length === 0 || !bulkAgentId) return;
    bulkAssignLeads(
      selectedIds,
      bulkAgentId,
      bulkNote.trim() || 'Bulk assigned from 1-Loop Leads Workspace.'
    );
    setSelectedIds([]);
    setBulkNote('');
  };

  // 1-Click Sequence Advancement right from the row
  const handleAdvanceLeadInSequence = (lead: Lead) => {
    if (lead.status === 'New') {
      changeLeadStatus(
        lead.id,
        'Contacted',
        'Advanced in 1-Loop sequence: Lead contacted and follow-up started.'
      );
    } else if (['Contacted', 'Interested', 'Qualified'].includes(lead.status)) {
      changeLeadStatus(
        lead.id,
        'Site Visit Scheduled',
        'Advanced in 1-Loop sequence: Site visit scheduled.'
      );
    } else if (lead.status === 'Site Visit Scheduled') {
      changeLeadStatus(
        lead.id,
        'Negotiation',
        'Advanced in 1-Loop sequence: Entered price negotiation.'
      );
    } else if (lead.status === 'Negotiation') {
      changeLeadStatus(
        lead.id,
        'Converted',
        'Advanced in 1-Loop sequence: Deal closed and marked as Converted.'
      );
    } else {
      setSelectedLeadId(lead.id);
    }
  };

  const getNextStepLabel = (status: LeadStatus): string => {
    if (status === 'New') return 'Step 2: Mark Contacted';
    if (['Contacted', 'Interested', 'Qualified'].includes(status))
      return 'Step 3: Site Visit';
    if (status === 'Site Visit Scheduled') return 'Step 4: Negotiation';
    if (status === 'Negotiation') return 'Step 5: Close Deal';
    if (status === 'Converted') return 'Closed';
    return 'Open Loop';
  };

  const handleExportCSV = () => {
    exportRecordsToCSV(
      'crestline_leads_export',
      [
        'Lead ID',
        'Customer Name',
        'Phone Number',
        'WhatsApp Number',
        'Email',
        'City',
        'Area',
        'Interested Property',
        'Property Type',
        'Property Size',
        'Min Budget (PKR)',
        'Max Budget (PKR)',
        'Lead Source',
        'Lead Reference',
        'Lead Status',
        'Assigned Agent',
        'Priority',
        'Last Follow-up',
        'Next Follow-up',
        'Created Date',
      ],
      filteredAndSortedLeads.map((l) => {
        const ag = agents.find((a) => a.id === l.assignedAgentId);
        return [
          l.id,
          l.customerName,
          l.phone,
          l.whatsapp,
          l.email,
          l.city,
          l.area,
          l.interestedProperty,
          l.propertyType,
          l.propertySize,
          l.minBudget,
          l.maxBudget,
          l.source,
          l.leadReference || '',
          l.status,
          ag ? ag.name : 'Unassigned',
          l.priority,
          l.lastFollowUpDate || '-',
          l.nextFollowUpDate || '-',
          l.createdAt,
        ];
      })
    );
  };

  const leadToDelete = visibleLeads.find((l) => l.id === confirmDeleteId);

  const sequenceStepsConfig: {
    id: SequenceStepFilter;
    stepLabel: string;
    title: string;
    subtitle: string;
    count: number;
  }[] = [
    {
      id: 'ALL',
      stepLabel: 'FULL LOOP',
      title: 'All Visible Leads',
      subtitle: 'All active pipeline leads',
      count: sequenceCounts.all,
    },
    {
      id: 'STEP_1',
      stepLabel: 'STEP 01',
      title: 'New & Assign',
      subtitle: 'Assign to agent / manager',
      count: sequenceCounts.step1,
    },
    {
      id: 'STEP_2',
      stepLabel: 'STEP 02',
      title: 'Contact & Follow-up',
      subtitle: 'Calls & scheduled callbacks',
      count: sequenceCounts.step2,
    },
    {
      id: 'STEP_3',
      stepLabel: 'STEP 03',
      title: 'Site Visit',
      subtitle: 'On-ground property tours',
      count: sequenceCounts.step3,
    },
    {
      id: 'STEP_4',
      stepLabel: 'STEP 04',
      title: 'Negotiation',
      subtitle: 'Price & plot finalization',
      count: sequenceCounts.step4,
    },
    {
      id: 'STEP_5',
      stepLabel: 'STEP 05',
      title: 'Deal Closed',
      subtitle: 'Converted sales leads',
      count: sequenceCounts.step5,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Leads Management & Sales Pipeline
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Search, filter, assign, and track all real estate buyer inquiries and follow-up schedules
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table View
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban Board
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export CSV ({filteredAndSortedLeads.length})
          </button>
          <button
            onClick={() => setIsAddLeadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Lead
          </button>
        </div>
      </div>

      {/* Compact Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search name, phone, reference, project, or ID..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="lg:col-span-2">
            {canAssignLeads ? (
              <select
                value={agentFilter}
                onChange={(e) => {
                  setAgentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
              >
                <option value="ALL">All Agents / Managers</option>
                <option value="UNASSIGNED">Unassigned Leads Only</option>
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} ({ag.email || ag.id})
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full px-2.5 py-2 text-xs font-semibold border border-emerald-200 rounded-lg bg-emerald-50 text-emerald-800 truncate">
                My Assigned Sales Leads
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">All Statuses</option>
              {ALL_LEAD_STATUSES.map((st) => (
                <option key={st} value={st}>
                  Status: {st}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">All Lead Sources</option>
              {ALL_LEAD_SOURCES.map((sr) => (
                <option key={sr} value={sr}>
                  {sr}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2 flex items-center justify-between gap-2">
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">All Priorities</option>
              {ALL_LEAD_PRIORITIES.map((pr) => (
                <option key={pr} value={pr}>
                  {pr}
                </option>
              ))}
            </select>
            <button
              onClick={resetFilters}
              title="Reset All Filters"
              className="p-2 text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Lead Assignment Action Bar */}
      {canAssignLeads && selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <UserCheck className="w-4 h-4 text-blue-400" />
            <span className="font-semibold">
              {selectedIds.length} lead{selectedIds.length > 1 ? 's' : ''} selected for bulk assignment
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkAgentId}
              onChange={(e) => setBulkAgentId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              {agents
                .filter((a) => a.accountStatus === 'Active')
                .map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    Assign to: {ag.name} ({ag.email || ag.id})
                  </option>
                ))}
            </select>
            <input
              type="text"
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
              placeholder="Optional assignment note..."
              className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-400"
            />
            <button
              onClick={handleBulkAssignSubmit}
              className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors cursor-pointer"
            >
              Assign Selected Leads
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODE 1: ALL-IN-ONE 1-LOOP SEQUENCE TABLE */}
      {viewMode === 'table' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[960px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                  <th className="py-3 pl-4 pr-2 w-9">
                    {canAssignLeads && (
                      <input
                        type="checkbox"
                        checked={
                          paginatedLeads.length > 0 &&
                          paginatedLeads.every((l) => selectedIds.includes(l.id))
                        }
                        onChange={toggleSelectAllCurrentPage}
                        className="rounded border-slate-300 cursor-pointer"
                      />
                    )}
                  </th>
                  <th
                    onClick={() => toggleSort('customerName')}
                    className="py-3 px-3 cursor-pointer hover:text-slate-900 whitespace-nowrap"
                  >
                    <span className="inline-flex items-center gap-1">
                      Buyer & Contact
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th
                    onClick={() => toggleSort('maxBudget')}
                    className="py-3 px-3 cursor-pointer hover:text-slate-900 whitespace-nowrap"
                  >
                    <span className="inline-flex items-center gap-1">
                      Property & PKR Budget
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap">Source & Sent By</th>
                  <th className="py-3 px-3 whitespace-nowrap">Assigned Agent</th>
                  <th
                    onClick={() => toggleSort('nextFollowUpDate')}
                    className="py-3 px-3 cursor-pointer hover:text-slate-900 whitespace-nowrap"
                  >
                    <span className="inline-flex items-center gap-1">
                      Next Follow-up
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="py-3 pl-3 pr-4 text-right whitespace-nowrap">
                    Status & Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No leads match your current filter. Click &ldquo;Reset Filters&rdquo; or add a new lead.
                    </td>
                  </tr>
                ) : (
                  paginatedLeads.map((lead) => {
                    const isOverdue =
                      lead.status !== 'Converted' &&
                      lead.status !== 'Lost' &&
                      lead.nextFollowUpDate &&
                      lead.nextFollowUpDate < SYSTEM_TODAY;

                    const matchingPrj = projects.find(
                      (p) => p.name.toLowerCase() === lead.interestedProperty.toLowerCase()
                    );
                    const thumbUrl = lead.propertyImageUrl || matchingPrj?.imageUrl;

                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-slate-50/90 transition-colors group"
                      >
                        <td className="py-3.5 pl-4 pr-2">
                          {canAssignLeads && (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(lead.id)}
                              onChange={() => toggleSelectRow(lead.id)}
                              className="rounded border-slate-300 cursor-pointer"
                            />
                          )}
                        </td>

                        {/* Col 1: Buyer & Contact */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {lead.id}
                            </span>
                            <button
                              onClick={() => setSelectedLeadId(lead.id)}
                              className="font-bold text-slate-900 hover:text-blue-700 text-left cursor-pointer"
                            >
                              {lead.customerName}
                            </button>
                          </div>
                          <div className="font-mono text-[11px] text-slate-600 mt-1 flex items-center gap-2">
                            <span>{lead.phone}</span>
                            <span className="text-slate-300">·</span>
                            <span className="text-slate-500">
                              {lead.area}, {lead.city}
                            </span>
                          </div>
                        </td>

                        {/* Col 2: Property & Budget */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2.5">
                            {thumbUrl && (
                              <img
                                src={thumbUrl}
                                alt={lead.interestedProperty}
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate max-w-[200px]">
                                {lead.interestedProperty}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {lead.propertyType} ·{' '}
                                <span className="font-mono font-semibold text-slate-700">
                                  {lead.propertySize}
                                </span>
                              </div>
                              <div className="font-mono text-[11px] font-bold text-emerald-700 tabular-nums mt-0.5">
                                {formatBudgetRange(lead.minBudget, lead.maxBudget)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Col 3: Source, Reference & Priority */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="font-medium text-slate-900">{lead.source}</div>
                          <div className="text-[11px] text-blue-700 font-semibold mt-0.5">
                            Sent By: {lead.leadReference || 'Direct'}
                          </div>
                          <span
                            className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-wider ${
                              lead.priority === 'Urgent'
                                ? 'text-red-600'
                                : lead.priority === 'High'
                                ? 'text-amber-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {lead.priority} Priority
                          </span>
                        </td>

                        {/* Col 4: Step 1 — Inline Assign To Agent / Manager (Locked for Sales-Only Agents) */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {canAssignLeads ? (
                            <select
                              value={lead.assignedAgentId || ''}
                              onChange={(e) => {
                                if (e.target.value) {
                                  assignLead(
                                    lead.id,
                                    e.target.value,
                                    'Assigned directly from 1-Loop Leads table.'
                                  );
                                }
                              }}
                              className={`w-44 px-2.5 py-1.5 text-xs font-semibold rounded-lg border focus:outline-none focus:border-blue-600 cursor-pointer ${
                                lead.assignedAgentId
                                  ? 'bg-white border-slate-200 text-slate-900'
                                  : 'bg-amber-50 border-amber-300 text-amber-900'
                              }`}
                            >
                              <option value="">Unassigned — Assign Now</option>
                              {agents
                                .filter((a) => a.accountStatus === 'Active')
                                .map((ag) => (
                                  <option key={ag.id} value={ag.id}>
                                    {ag.name} ({ag.email || ag.id})
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Assigned:{' '}
                              {agents.find((a) => a.id === lead.assignedAgentId)?.name || 'You'}
                            </span>
                          )}
                        </td>

                        {/* Col 5: Step 2 — Inline Next Follow-up Date Picker */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <input
                            type="date"
                            value={lead.nextFollowUpDate || ''}
                            onChange={(e) =>
                              updateLead(
                                lead.id,
                                { nextFollowUpDate: e.target.value || null },
                                `Next follow-up date set to ${e.target.value || 'Cleared'}.`
                              )
                            }
                            className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-lg border focus:outline-none focus:border-blue-600 cursor-pointer ${
                              isOverdue
                                ? 'bg-red-50 border-red-300 text-red-700'
                                : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          />
                          {isOverdue && (
                            <span className="block text-[10px] font-bold text-red-600 mt-0.5">
                              Overdue Follow-up
                            </span>
                          )}
                        </td>

                        {/* Col 6: Step 3-5 — Connected Sequence Status + 1-Click Next Step + Actions */}
                        <td className="py-3.5 pl-3 pr-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Current Status Dropdown */}
                            <select
                              value={lead.status}
                              onChange={(e) =>
                                changeLeadStatus(lead.id, e.target.value as LeadStatus)
                              }
                              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border cursor-pointer ${
                                lead.status === 'Converted'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : lead.status === 'Lost'
                                  ? 'bg-red-50 border-red-200 text-red-700'
                                  : 'bg-slate-100 border-slate-200 text-slate-900'
                              }`}
                            >
                              {ALL_LEAD_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>

                            {/* Open Lead Details Drawer */}
                            <button
                              type="button"
                              onClick={() => setSelectedLeadId(lead.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                              title="View Lead Details & Activity Timeline"
                            >
                              View Details
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingLead(lead)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Lead"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {currentRole === 'Super Admin' && (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(lead.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Lead"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-slate-600">
              <span>
                Page <strong className="font-mono text-slate-900">{safePage}</strong> of{' '}
                <strong className="font-mono text-slate-900">{totalPages}</strong> (
                {filteredAndSortedLeads.length} leads)
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-slate-300 rounded bg-white text-xs font-mono"
              >
                <option value={8}>8 / page</option>
                <option value={10}>10 / page</option>
                <option value={15}>15 / page</option>
                <option value={25}>25 / page</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: INTERACTIVE KANBAN PIPELINE BOARD */}
      {viewMode === 'kanban' && (
        <div className="overflow-x-auto pb-3">
          <div className="flex gap-4 min-w-max">
            {(
              [
                'New',
                'Contacted',
                'Qualified',
                'Site Visit Scheduled',
                'Negotiation',
                'Converted',
              ] as LeadStatus[]
            ).map((stage) => {
              const stageLeads = filteredAndSortedLeads.filter((l) => l.status === stage);
              const stageVolume = stageLeads.reduce((s, l) => s + l.maxBudget, 0);

              return (
                <div
                  key={stage}
                  className="w-80 bg-slate-100/90 border border-slate-200 rounded-xl p-3 flex flex-col max-h-[680px]"
                >
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/80">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-900">{stage}</h3>
                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                          {stageLeads.length}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500 block mt-0.5">
                        {formatPKR(stageVolume)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
                    {stageLeads.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">
                        No leads in {stage}
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className="bg-white border border-slate-200 hover:border-blue-500 rounded-xl p-3.5 shadow-2xs transition-all space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono text-[10px] font-bold text-blue-700">
                                {lead.id}
                              </span>
                              <button
                                onClick={() => setSelectedLeadId(lead.id)}
                                className="font-bold text-xs text-slate-900 hover:text-blue-700 block text-left cursor-pointer"
                              >
                                {lead.customerName}
                              </button>
                            </div>
                            <span className="font-mono text-xs font-bold text-emerald-700 tabular-nums">
                              {formatPKR(lead.maxBudget)}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-600">
                            <div className="font-medium text-slate-800 truncate">
                              {lead.interestedProperty}
                            </div>
                            <div>
                              {lead.propertyType} · {lead.propertySize}
                            </div>
                          </div>

                          {/* Inline Assign Agent right on Kanban Card (Locked for Sales-Only Agents) */}
                          {canAssignLeads ? (
                            <select
                              value={lead.assignedAgentId || ''}
                              onChange={(e) => {
                                if (e.target.value) {
                                  assignLead(
                                    lead.id,
                                    e.target.value,
                                    'Assigned from Kanban Pipeline card.'
                                  );
                                }
                              }}
                              className="w-full px-2 py-1 text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-md text-slate-800 cursor-pointer"
                            >
                              <option value="">Unassigned — Select Agent</option>
                              {agents
                                .filter((a) => a.accountStatus === 'Active')
                                .map((ag) => (
                                  <option key={ag.id} value={ag.id}>
                                    {ag.name} ({ag.email || ag.id})
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <div className="w-full px-2 py-1 text-[11px] font-semibold bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800">
                              Assigned: {agents.find((a) => a.id === lead.assignedAgentId)?.name || 'You'}
                            </div>
                          )}

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                            <span className="font-mono text-[11px] text-slate-500 inline-flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {lead.phone}
                            </span>

                            <div className="flex items-center gap-1">
                              {lead.status !== 'Converted' && (
                                <button
                                  onClick={() => handleAdvanceLeadInSequence(lead)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded cursor-pointer"
                                >
                                  <span>{getNextStepLabel(lead.status)}</span>
                                  <ArrowRight className="w-2.5 h-2.5" />
                                </button>
                              )}
                              {lead.status !== 'Converted' && (
                                <button
                                  onClick={() =>
                                    changeLeadStatus(
                                      lead.id,
                                      'Converted',
                                      'Deal closed directly from Kanban Pipeline board.'
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded cursor-pointer"
                                  title="Mark Deal Closed (Converted)"
                                >
                                  <BadgeCheck className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && leadToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Delete Lead {leadToDelete.id}?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently remove{' '}
              <strong className="text-slate-900">{leadToDelete.customerName}</strong> (
              {leadToDelete.interestedProperty}) from the CRM database?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteLead(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
