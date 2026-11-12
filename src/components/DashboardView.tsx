import React, { useMemo } from 'react';
import {
  Users,
  UserPlus,
  UserX,
  UserCheck,
  CalendarClock,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Plus,
  FileDown,
  Shuffle,
  ArrowUpRight,
  Clock,
  Award,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
} from 'recharts';
import { useCRM } from '../context/CRMContext';
import { formatPKR, formatBudgetRange, exportRecordsToCSV } from '../services/crmService';
import {
  MONTHLY_LEAD_TRENDS,
  DAILY_ACTIVITY_TREND,
  SYSTEM_TODAY,
  ALL_LEAD_SOURCES,
  ALL_LEAD_STATUSES,
} from '../data/demoData';
import { LeadStatus } from '../types/crm';

const CHART_COLORS = [
  '#1D4ED8',
  '#0284C7',
  '#0D9488',
  '#16A34A',
  '#D97706',
  '#7C3AED',
  '#DB2777',
  '#475569',
  '#2563EB',
  '#059669',
];

const STATUS_COLORS: Record<LeadStatus, string> = {
  New: '#2563EB',
  Contacted: '#0284C7',
  Interested: '#4F46E5',
  Qualified: '#0D9488',
  'Site Visit Scheduled': '#D97706',
  Negotiation: '#7C3AED',
  Converted: '#16A34A',
  Lost: '#DC2626',
  'On Hold': '#64748B',
};

export const DashboardView: React.FC = () => {
  const {
    visibleLeads,
    visibleFollowUps,
    activities,
    agentMetrics,
    dashboardKPIs,
    setActiveSection,
    setSelectedLeadId,
    setIsAddLeadModalOpen,
    assignLead,
    autoAssignUnassignedLeads,
    completeFollowUp,
    currentRole,
    activeSalesAgentId,
    agents,
    canAssignLeads,
    allowedSections,
  } = useCRM();

  const activeAgentObj = agents.find((a) => a.id === activeSalesAgentId);

  // Executive Financial Metrics computed from visible leads
  const financialMetrics = useMemo(() => {
    const totalPipelinePKR = visibleLeads
      .filter((l) => l.status !== 'Lost')
      .reduce((sum, l) => sum + l.maxBudget, 0);
    const closedRevenuePKR = visibleLeads
      .filter((l) => l.status === 'Converted')
      .reduce((sum, l) => sum + l.maxBudget, 0);
    const negotiationPKR = visibleLeads
      .filter((l) => l.status === 'Negotiation' || l.status === 'Site Visit Scheduled')
      .reduce((sum, l) => sum + l.maxBudget, 0);
    return { totalPipelinePKR, closedRevenuePKR, negotiationPKR };
  }, [visibleLeads]);

  // 1. Source Distribution Data
  const sourceChartData = useMemo(() => {
    return ALL_LEAD_SOURCES.map((src, idx) => {
      const count = visibleLeads.filter((l) => l.source === src).length;
      return {
        name: src,
        value: count,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      };
    }).filter((item) => item.value > 0);
  }, [visibleLeads]);

  // 2. Status Distribution Data
  const statusChartData = useMemo(() => {
    return ALL_LEAD_STATUSES.map((status) => {
      const count = visibleLeads.filter((l) => l.status === status).length;
      return {
        status,
        count,
        fill: STATUS_COLORS[status] || '#1D4ED8',
      };
    }).filter((s) => s.count > 0);
  }, [visibleLeads]);

  // 3. Agent Performance Chart Data
  const agentChartData = useMemo(() => {
    const activeList = agentMetrics.filter((a) => a.accountStatus === 'Active');
    const scopedList =
      currentRole !== 'Super Admin' && !allowedSections.includes('agents')
        ? activeList.filter((a) => a.id === activeSalesAgentId)
        : activeList;
    return scopedList.map((a) => ({
      name: a.name.split(' ')[0],
      Assigned: a.assignedLeads,
      Converted: a.convertedLeads,
      Pending: a.pendingLeads,
    }));
  }, [agentMetrics, currentRole, allowedSections, activeSalesAgentId]);

  // 4. Leads Requiring Immediate Attention (Unassigned, Overdue Follow-up, or Urgent Priority)
  const attentionLeads = useMemo(() => {
    return visibleLeads
      .filter((l) => {
        if (l.status === 'Converted' || l.status === 'Lost') return false;
        const isUnassigned = !l.assignedAgentId;
        const isOverdue = Boolean(l.nextFollowUpDate && l.nextFollowUpDate < SYSTEM_TODAY);
        const isUrgent = l.priority === 'Urgent';
        return isUnassigned || isOverdue || isUrgent;
      })
      .slice(0, 6);
  }, [visibleLeads]);

  // 5. Upcoming Follow-ups Queue
  const upcomingFollowUps = useMemo(() => {
    return visibleFollowUps
      .filter((f) => f.status !== 'Completed')
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
      .slice(0, 6);
  }, [visibleFollowUps]);

  // 6. Recent Leads
  const recentLeads = useMemo(() => {
    return [...visibleLeads]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6);
  }, [visibleLeads]);

  // 7. Top Performing Sales Agents
  const topAgents = useMemo(() => {
    const activeList = [...agentMetrics].filter((a) => a.accountStatus === 'Active');
    if (currentRole !== 'Super Admin' && !allowedSections.includes('agents')) {
      return activeList.filter((a) => a.id === activeSalesAgentId);
    }
    return activeList
      .sort((a, b) => b.convertedLeads - a.convertedLeads || b.conversionRate - a.conversionRate)
      .slice(0, 5);
  }, [agentMetrics, currentRole, allowedSections, activeSalesAgentId]);

  // 8. Recent Activities Scoped to Visible Leads
  const recentActivities = useMemo(() => {
    const visibleIds = new Set(visibleLeads.map((l) => l.id));
    return activities.filter((act) => visibleIds.has(act.leadId)).slice(0, 6);
  }, [activities, visibleLeads]);

  const handleExportSummary = () => {
    exportRecordsToCSV(
      'crm_executive_dashboard_summary',
      ['Metric', 'Value'],
      [
        ['Total Leads', dashboardKPIs.totalLeads],
        ['New Leads Today', dashboardKPIs.newLeadsToday],
        ['Unassigned Leads', dashboardKPIs.unassignedLeads],
        ['Assigned Leads', dashboardKPIs.assignedLeads],
        ['Follow-ups Today', dashboardKPIs.followUpsToday],
        ['Overdue Follow-ups', dashboardKPIs.overdueFollowUps],
        ['Site Visits Scheduled', dashboardKPIs.siteVisitsScheduled],
        ['Converted Leads', dashboardKPIs.convertedLeads],
        ['Lost Leads', dashboardKPIs.lostLeads],
        ['Conversion Rate (%)', `${dashboardKPIs.conversionRate}%`],
      ]
    );
  };

  const kpiCards = [
    {
      label: 'Total Leads',
      value: dashboardKPIs.totalLeads,
      subtext: 'Active inquiries in pipeline',
      icon: Users,
      accent: 'text-blue-700 bg-blue-50',
      onClick: () => setActiveSection('leads'),
    },
    {
      label: 'New Leads Today',
      value: dashboardKPIs.newLeadsToday,
      subtext: `Captured on ${SYSTEM_TODAY}`,
      icon: UserPlus,
      accent: 'text-sky-700 bg-sky-50',
      onClick: () => setActiveSection('leads'),
    },
    {
      label: 'Unassigned Leads',
      value: dashboardKPIs.unassignedLeads,
      subtext:
        dashboardKPIs.unassignedLeads > 0
          ? 'Action required — assign now'
          : 'All leads assigned',
      icon: UserX,
      accent:
        dashboardKPIs.unassignedLeads > 0
          ? 'text-amber-700 bg-amber-50'
          : 'text-slate-600 bg-slate-100',
      onClick: () =>
        setActiveSection(allowedSections.includes('assignments') ? 'assignments' : 'leads'),
    },
    {
      label: 'Assigned Leads',
      value: dashboardKPIs.assignedLeads,
      subtext: 'Allocated to consultants',
      icon: UserCheck,
      accent: 'text-indigo-700 bg-indigo-50',
      onClick: () => setActiveSection('leads'),
    },
    {
      label: 'Follow-ups Today',
      value: dashboardKPIs.followUpsToday,
      subtext: 'Scheduled calls & meetings',
      icon: CalendarClock,
      accent: 'text-teal-700 bg-teal-50',
      onClick: () => setActiveSection('followups'),
    },
    {
      label: 'Overdue Follow-ups',
      value: dashboardKPIs.overdueFollowUps,
      subtext:
        dashboardKPIs.overdueFollowUps > 0
          ? 'Immediate callback needed'
          : 'Zero overdue tasks',
      icon: AlertTriangle,
      accent:
        dashboardKPIs.overdueFollowUps > 0
          ? 'text-red-700 bg-red-50'
          : 'text-emerald-700 bg-emerald-50',
      onClick: () => setActiveSection('followups'),
    },
    {
      label: 'Site Visits Scheduled',
      value: dashboardKPIs.siteVisitsScheduled,
      subtext: 'Upcoming project tours',
      icon: MapPin,
      accent: 'text-purple-700 bg-purple-50',
      onClick: () => setActiveSection('sitevisits'),
    },
    {
      label: 'Converted Leads',
      value: dashboardKPIs.convertedLeads,
      subtext: 'Closed property deals',
      icon: CheckCircle2,
      accent: 'text-emerald-700 bg-emerald-50',
      onClick: () => setActiveSection('leads'),
    },
    {
      label: 'Lost Leads',
      value: dashboardKPIs.lostLeads,
      subtext: 'Disqualified / dropped',
      icon: XCircle,
      accent: 'text-slate-600 bg-slate-100',
      onClick: () => setActiveSection('leads'),
    },
    {
      label: 'Lead Conversion Rate',
      value: `${dashboardKPIs.conversionRate}%`,
      subtext: 'Closed vs. total inquiries',
      icon: TrendingUp,
      accent: 'text-blue-700 bg-blue-50',
      onClick: () =>
        setActiveSection(allowedSections.includes('reports') ? 'reports' : 'leads'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Executive Command Banner */}
      <div className="bg-[#0F172A] text-white rounded-xl p-5 sm:p-6 border border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold whitespace-nowrap">
              <span>CRESTLINE REALTY</span>
              <span>·</span>
              <span>EXECUTIVE COMMAND</span>
              <span>·</span>
              <span className="font-mono">{SYSTEM_TODAY}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {currentRole !== 'Super Admin'
                ? `${activeAgentObj?.name || 'Sales'} — Personal Sales Dashboard`
                : 'Real Estate Lead & Pipeline Command Center'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              {currentRole !== 'Super Admin'
                ? `Showing strictly your assigned leads, scheduled follow-ups, and property site visits.`
                : 'Live visibility across DHA Lahore, Gulberg III, Bahria Town, and Capital Smart City inquiries, agent workloads, and follow-up SLAs.'}
            </p>
          </div>

          {/* Financial Pipeline Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-4 py-3">
              <span className="text-xs text-slate-400 block">Active Pipeline Volume</span>
              <span className="font-mono text-base sm:text-lg font-bold text-white tabular-nums mt-0.5 block">
                {formatPKR(financialMetrics.totalPipelinePKR)}
              </span>
              <span className="text-[11px] text-emerald-400">
                Across {visibleLeads.filter((l) => l.status !== 'Lost').length} active leads
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-4 py-3">
              <span className="text-xs text-slate-400 block">Negotiation & Visit Stage</span>
              <span className="font-mono text-base sm:text-lg font-bold text-blue-400 tabular-nums mt-0.5 block">
                {formatPKR(financialMetrics.negotiationPKR)}
              </span>
              <span className="text-[11px] text-slate-400">
                High-probability closing pool
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-4 py-3">
              <span className="text-xs text-slate-400 block">Closed Deal Revenue</span>
              <span className="font-mono text-base sm:text-lg font-bold text-emerald-400 tabular-nums mt-0.5 block">
                {formatPKR(financialMetrics.closedRevenuePKR)}
              </span>
              <span className="text-[11px] text-slate-400">
                {dashboardKPIs.convertedLeads} converted deals
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-800/90">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="font-medium text-white">Quick Actions:</span>
            {dashboardKPIs.unassignedLeads > 0 && canAssignLeads && (
              <button
                onClick={autoAssignUnassignedLeads}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" />
                Smart Auto-Assign ({dashboardKPIs.unassignedLeads} Unassigned)
              </button>
            )}
            <button
              onClick={() => setActiveSection('followups')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <CalendarClock className="w-3.5 h-3.5 text-blue-400" />
              Inspect Follow-up Queue
            </button>
            <button
              onClick={handleExportSummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-400" />
              Export Summary CSV
            </button>
          </div>

          <button
            onClick={() => setIsAddLeadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Lead
          </button>
        </div>
      </div>

      {/* 10 KPI Stat Cards Grid (2 rows of 5 on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={card.onClick}
              className="bg-white border border-slate-200 hover:border-blue-500/60 rounded-xl p-4 text-left transition-all group cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2 w-full">
                <span className="text-xs font-medium text-slate-500 group-hover:text-slate-800 transition-colors">
                  {card.label}
                </span>
                <div className={`p-2 rounded-lg shrink-0 ${card.accent}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
                  {card.value}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                  <span className="truncate">{card.subtext}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Analytical Charts Row 1: Pipeline Status Breakdown + Lead Sources Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Chart 1: Leads by Pipeline Status (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Leads by Pipeline Status
              </h2>
              <p className="text-xs text-slate-500">
                Distribution of inquiries from initial capture to deal conversion
              </p>
            </div>
            <button
              onClick={() => setActiveSection('leads')}
              className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
            >
              Open Pipeline →
            </button>
          </div>
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusChartData}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 16, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#475569' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="status"
                  type="category"
                  width={125}
                  tick={{ fontSize: 11, fill: '#0F172A', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Leads" radius={[0, 6, 6, 0]} barSize={18}>
                  {statusChartData.map((entry, idx) => (
                    <Cell key={`status-cell-${idx}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Leads by Source Distribution (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Leads by Acquisition Source
              </h2>
              <p className="text-xs text-slate-500">
                Inquiry share across portals, ads, and lead references
              </p>
            </div>
            {allowedSections.includes('sources') && (
              <button
                onClick={() => setActiveSection('sources')}
                className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                All Channels →
              </button>
            )}
          </div>
          <div className="h-64 w-full mt-4 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {sourceChartData.map((entry, idx) => (
                    <Cell key={`src-cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Analytical Charts Row 2: Monthly Lead Generation & Agent Performance + Daily Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart 3: Monthly Lead Generation & Conversions */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              Monthly Lead & Conversion Trend
            </h2>
            <p className="text-xs text-slate-500">
              6-month inquiry inflow vs. site visits & conversions
            </p>
          </div>
          <div className="h-56 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MONTHLY_LEAD_TRENDS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  type="monotone"
                  dataKey="totalLeads"
                  name="Total Leads"
                  stroke="#1D4ED8"
                  strokeWidth={2.5}
                />
                <Line
                  type="monotone"
                  dataKey="converted"
                  name="Converted"
                  stroke="#16A34A"
                  strokeWidth={2.5}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Agent Workload & Conversion Comparison */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              Agent Assigned vs. Converted Leads
            </h2>
            <p className="text-xs text-slate-500">
              Active workload and closed deals per consultant
            </p>
          </div>
          <div className="h-56 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Assigned" fill="#1E293B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Converted" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Daily Follow-up & Call Activity */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              Daily Follow-ups & Outbound Calls
            </h2>
            <p className="text-xs text-slate-500">
              7-day consultant call volume and scheduled follow-ups
            </p>
          </div>
          <div className="h-56 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DAILY_ACTIVITY_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="calls" name="Calls Made" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="followUps" name="Follow-ups" fill="#0D9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Actionable Queues Row 1: Leads Requiring Attention + Upcoming Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Leads Requiring Immediate Attention (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Leads Requiring Immediate Attention
              </h3>
            </div>
            <button
              onClick={() => setActiveSection('leads')}
              className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
            >
              View All Leads →
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {attentionLeads.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No urgent or unassigned leads requiring attention right now.
              </div>
            ) : (
              attentionLeads.map((lead) => {
                const isOverdue =
                  lead.nextFollowUpDate && lead.nextFollowUpDate < SYSTEM_TODAY;
                return (
                  <div
                    key={lead.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {lead.id}
                        </span>
                        <button
                          onClick={() => setSelectedLeadId(lead.id)}
                          className="text-xs font-bold text-slate-900 hover:text-blue-700 truncate cursor-pointer"
                        >
                          {lead.customerName}
                        </button>
                        {!lead.assignedAgentId && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            UNASSIGNED
                          </span>
                        )}
                        {isOverdue && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                            OVERDUE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {lead.interestedProperty} ({lead.propertySize}) ·{' '}
                        <span className="font-mono font-semibold text-emerald-700">
                          {formatBudgetRange(lead.minBudget, lead.maxBudget)}
                        </span>{' '}
                        · Sent By: <strong>{lead.leadReference || 'Direct'}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canAssignLeads ? (
                        <select
                          value={lead.assignedAgentId || ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              assignLead(
                                lead.id,
                                e.target.value,
                                'Assigned from Dashboard attention queue.'
                              );
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-lg bg-white cursor-pointer"
                        >
                          <option value="">Assign Agent...</option>
                          {agents
                            .filter((a) => a.accountStatus === 'Active')
                            .map((ag) => (
                              <option key={ag.id} value={ag.id}>
                                {ag.name}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <span className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md">
                          {agents.find((a) => a.id === lead.assignedAgentId)?.name || 'Assigned'}
                        </span>
                      )}
                      <button
                        onClick={() => setSelectedLeadId(lead.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Upcoming Follow-ups & Callbacks (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-blue-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Upcoming Follow-ups & Callbacks
              </h3>
            </div>
            <button
              onClick={() => setActiveSection('followups')}
              className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
            >
              All Follow-ups →
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {upcomingFollowUps.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                All scheduled follow-ups are completed!
              </div>
            ) : (
              upcomingFollowUps.map((fup) => {
                const isOverdue = fup.scheduledDate < SYSTEM_TODAY;
                return (
                  <div
                    key={fup.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedLeadId(fup.leadId)}
                          className="text-xs font-bold text-slate-900 hover:text-blue-700 truncate cursor-pointer"
                        >
                          {fup.customerName}
                        </button>
                        <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {fup.type}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] font-bold text-red-600">
                            OVERDUE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {fup.interestedProperty} · {fup.discussionNotes}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right font-mono text-[11px] text-slate-500 tabular-nums">
                        <div>{fup.scheduledDate}</div>
                        <div>{fup.scheduledTime}</div>
                      </div>
                      <button
                        onClick={() =>
                          completeFollowUp(
                            fup.id,
                            'Completed directly from Dashboard follow-up queue.'
                          )
                        }
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Leads Table + Top Agents & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Leads Table (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Inquiries</h3>
              <p className="text-xs text-slate-500">
                Latest property leads with source, sender reference, and assigned agent
              </p>
            </div>
            <button
              onClick={() => setActiveSection('leads')}
              className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
            >
              Manage All Leads →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                  <th className="py-2.5 pl-4 pr-3">Lead & Buyer</th>
                  <th className="py-2.5 px-3">Property & Budget</th>
                  <th className="py-2.5 px-3">Source & Sent By</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 pl-3 pr-4 text-right">Assigned Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLeads.map((l) => {
                  const ag = agents.find((a) => a.id === l.assignedAgentId);
                  return (
                    <tr
                      key={l.id}
                      onClick={() => setSelectedLeadId(l.id)}
                      className="hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="py-3 pl-4 pr-3">
                        <div className="font-bold text-slate-900">{l.customerName}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {l.id} · {l.phone}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900 truncate max-w-[180px]">
                          {l.interestedProperty}
                        </div>
                        <div className="font-mono text-[11px] font-bold text-emerald-700">
                          {formatPKR(l.maxBudget)}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{l.source}</div>
                        <div className="text-[11px] text-blue-700 font-semibold">
                          Sent By: {l.leadReference || 'Direct'}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-slate-100 text-slate-800">
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3 pl-3 pr-4 text-right whitespace-nowrap font-medium text-slate-700">
                        {ag ? ag.name : 'Unassigned'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Performing Agents & Recent Activity (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Top Performing Agents */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  {currentRole === 'Sales Agent'
                    ? 'My Sales Performance'
                    : 'Top Performing Sales Agents'}
                </h3>
              </div>
              {allowedSections.includes('agents') && (
                <button
                  onClick={() => setActiveSection('agents')}
                  className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                >
                  Sales Team →
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {topAgents.map((ag) => (
                <div
                  key={ag.id}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center">
                      {ag.initials}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">{ag.name}</div>
                      <div className="text-[11px] text-slate-500">{ag.roleTitle}</div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px] tabular-nums">
                    <div>
                      <strong className="text-slate-900">{ag.assignedLeads}</strong> Assigned ·{' '}
                      <strong className="text-emerald-700">{ag.convertedLeads}</strong> Converted
                    </div>
                    <div className="text-slate-500">{ag.conversionRate}% Conversion Rate</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-700" />
                <h3 className="text-sm font-bold text-slate-900">Recent CRM Activity</h3>
              </div>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="divide-y divide-slate-100 mt-2">
              {recentActivities.map((act) => (
                <div key={act.id} className="py-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{act.activityType}</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {act.date} · {act.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{act.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
