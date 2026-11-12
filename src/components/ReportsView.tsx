import React, { useState, useMemo } from 'react';
import { FileDown, Filter, RotateCcw } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { useCRM } from '../context/CRMContext';
import { formatPKR, exportRecordsToCSV } from '../services/crmService';
import {
  ALL_LEAD_SOURCES,
  DAILY_ACTIVITY_TREND,
  MONTHLY_LEAD_TRENDS,
  SYSTEM_TODAY,
} from '../data/demoData';

type ReportType =
  | 'Total Leads Report'
  | 'Daily Leads Report'
  | 'Monthly Leads Report'
  | 'Agent Performance Report'
  | 'Lead Assignment Report'
  | 'Follow-up Report'
  | 'Conversion Report'
  | 'Lost Leads Report'
  | 'Lead Source Report'
  | 'Site Visit Report';

const ALL_REPORTS: ReportType[] = [
  'Total Leads Report',
  'Daily Leads Report',
  'Monthly Leads Report',
  'Agent Performance Report',
  'Lead Assignment Report',
  'Follow-up Report',
  'Conversion Report',
  'Lost Leads Report',
  'Lead Source Report',
  'Site Visit Report',
];

const BAR_COLORS = [
  '#1D4ED8',
  '#0F172A',
  '#059669',
  '#2563EB',
  '#D97706',
  '#4F46E5',
  '#0D9488',
  '#DC2626',
];

export const ReportsView: React.FC = () => {
  const {
    visibleLeads,
    visibleFollowUps,
    visibleSiteVisits,
    assignments,
    agentMetrics,
    agents,
  } = useCRM();

  const [selectedReport, setSelectedReport] = useState<ReportType>('Total Leads Report');
  const [dateFrom, setDateFrom] = useState('2026-10-01');
  const [dateTo, setDateTo] = useState(SYSTEM_TODAY);

  const dateFilteredLeads = useMemo(() => {
    return visibleLeads.filter((l) => {
      if (dateFrom && l.createdAt < dateFrom) return false;
      if (dateTo && l.createdAt > dateTo) return false;
      return true;
    });
  }, [visibleLeads, dateFrom, dateTo]);

  const reportContent = useMemo(() => {
    switch (selectedReport) {
      case 'Total Leads Report': {
        const totalBudget = dateFilteredLeads.reduce((s, l) => s + l.maxBudget, 0);
        return {
          summary: [
            { label: 'Total Leads in Period', value: String(dateFilteredLeads.length) },
            {
              label: 'Assigned vs Unassigned',
              value: `${dateFilteredLeads.filter((l) => l.assignedAgentId).length} / ${
                dateFilteredLeads.filter((l) => !l.assignedAgentId).length
              }`,
            },
            {
              label: 'Converted Deals',
              value: String(
                dateFilteredLeads.filter((l) => l.status === 'Converted').length
              ),
            },
            { label: 'Cumulative Pipeline Value', value: formatPKR(totalBudget) },
          ],
          chartTitle: 'Leads Breakdown by Property Type',
          chartItems: [
            'Residential Plots',
            'Commercial Plots',
            'Houses',
            'Apartments',
            'Shops',
            'Files',
          ].map((pt) => ({
            label: pt,
            value: dateFilteredLeads.filter((l) => l.propertyType === pt).length,
          })),
          headers: [
            'Lead ID',
            'Customer Name',
            'Interested Property',
            'Property Type',
            'Size',
            'Max Budget (PKR)',
            'Status',
            'Created Date',
          ],
          rows: dateFilteredLeads.map((l) => [
            l.id,
            l.customerName,
            l.interestedProperty,
            l.propertyType,
            l.propertySize,
            formatPKR(l.maxBudget),
            l.status,
            l.createdAt,
          ]),
        };
      }

      case 'Daily Leads Report': {
        return {
          summary: [
            {
              label: 'Leads Captured Today',
              value: String(
                visibleLeads.filter((l) => l.createdAt === SYSTEM_TODAY).length
              ),
            },
            { label: '7-Day New Inquiries', value: '24 Leads' },
            { label: '7-Day Outbound Calls', value: '145 Calls' },
            { label: '7-Day Follow-ups Logged', value: '77 Touchpoints' },
          ],
          chartTitle: 'Daily Lead Intake & Outbound Call Volume',
          chartItems: DAILY_ACTIVITY_TREND.map((d) => ({
            label: d.day,
            value: d.calls,
          })),
          headers: [
            'Date',
            'New Leads Captured',
            'Follow-ups Executed',
            'Outbound Calls Made',
          ],
          rows: DAILY_ACTIVITY_TREND.map((d) => [
            d.day,
            d.newLeads,
            d.followUps,
            d.calls,
          ]),
        };
      }

      case 'Monthly Leads Report': {
        return {
          summary: [
            { label: 'Nov 2026 Leads', value: '96 Leads' },
            { label: '6-Month Cumulative Leads', value: '427 Leads' },
            { label: '6-Month Conversions', value: '68 Deals' },
            { label: 'Gross Sales Volume', value: 'PKR 311.0 Cr' },
          ],
          chartTitle: 'Monthly Lead Volume Progression (Jun – Nov 2026)',
          chartItems: MONTHLY_LEAD_TRENDS.map((m) => ({
            label: m.month,
            value: m.totalLeads,
          })),
          headers: [
            'Month',
            'Total Leads',
            'Site Visits Conducted',
            'Converted Deals',
            'Gross Sales Value (PKR Cr)',
          ],
          rows: MONTHLY_LEAD_TRENDS.map((m) => [
            m.month,
            m.totalLeads,
            m.siteVisits,
            m.converted,
            `PKR ${m.revenueCr.toFixed(1)} Cr`,
          ]),
        };
      }

      case 'Agent Performance Report': {
        return {
          summary: [
            {
              label: 'Active Consultants',
              value: String(
                agentMetrics.filter((a) => a.accountStatus === 'Active').length
              ),
            },
            {
              label: 'Total Assigned Leads',
              value: String(agentMetrics.reduce((s, a) => s + a.assignedLeads, 0)),
            },
            {
              label: 'Total Converted Deals',
              value: String(agentMetrics.reduce((s, a) => s + a.convertedLeads, 0)),
            },
            {
              label: 'Completed Follow-ups',
              value: String(
                agentMetrics.reduce((s, a) => s + a.followUpsCompleted, 0)
              ),
            },
          ],
          chartTitle: 'Conversion Rate (%) by Sales Consultant',
          chartItems: agentMetrics.map((a) => ({
            label: a.name,
            value: a.conversionRate,
          })),
          headers: [
            'Agent ID',
            'Consultant Name',
            'Assigned Leads',
            'Active Pipeline',
            'Follow-ups Completed',
            'Site Visits',
            'Converted Leads',
            'Conversion Rate',
          ],
          rows: agentMetrics.map((a) => [
            a.id,
            a.name,
            a.assignedLeads,
            a.activeLeads,
            a.followUpsCompleted,
            a.siteVisitsCount,
            a.convertedLeads,
            `${a.conversionRate}%`,
          ]),
        };
      }

      case 'Lead Assignment Report': {
        return {
          summary: [
            { label: 'Total Assignment Events', value: String(assignments.length) },
            {
              label: 'Unassigned Queue',
              value: String(
                visibleLeads.filter((l) => !l.assignedAgentId).length
              ),
            },
            {
              label: 'Assigned Leads',
              value: String(
                visibleLeads.filter((l) => l.assignedAgentId).length
              ),
            },
            { label: 'Audit Trail Integrity', value: '100% Verified' },
          ],
          chartTitle: 'Current Assigned Lead Distribution Across Team',
          chartItems: agentMetrics.map((a) => ({
            label: a.name,
            value: a.assignedLeads,
          })),
          headers: [
            'Assignment ID',
            'Lead ID',
            'Customer Name',
            'Previous Agent',
            'Assigned Agent',
            'Assigned By',
            'Timestamp',
            'Audit Note',
          ],
          rows: assignments.map((a) => [
            a.id,
            a.leadId,
            a.leadName,
            a.previousAgentName,
            a.newAgentName,
            a.assignedByName,
            a.assignedAt,
            a.notes,
          ]),
        };
      }

      case 'Follow-up Report': {
        const overdue = visibleFollowUps.filter(
          (f) => f.status === 'Pending' && f.scheduledDate < SYSTEM_TODAY
        ).length;
        const completed = visibleFollowUps.filter(
          (f) => f.status === 'Completed'
        ).length;
        return {
          summary: [
            { label: 'Total Follow-up Records', value: String(visibleFollowUps.length) },
            { label: 'Completed Touchpoints', value: String(completed) },
            {
              label: 'Scheduled Today',
              value: String(
                visibleFollowUps.filter((f) => f.scheduledDate === SYSTEM_TODAY)
                  .length
              ),
            },
            { label: 'Overdue Follow-ups', value: String(overdue) },
          ],
          chartTitle: 'Follow-ups by Touchpoint Type',
          chartItems: [
            'Phone Call',
            'WhatsApp',
            'Office Meeting',
            'Site Visit',
            'Video Meeting',
          ].map((t) => ({
            label: t,
            value: visibleFollowUps.filter((f) => f.type === t).length,
          })),
          headers: [
            'Follow-up ID',
            'Lead ID',
            'Customer',
            'Type',
            'Agent',
            'Scheduled Date',
            'Status',
            'Discussion Notes',
          ],
          rows: visibleFollowUps.map((f) => [
            f.id,
            f.leadId,
            f.customerName,
            f.type,
            f.agentName,
            `${f.scheduledDate} ${f.scheduledTime}`,
            f.status,
            f.discussionNotes,
          ]),
        };
      }

      case 'Conversion Report': {
        const convertedList = visibleLeads.filter((l) => l.status === 'Converted');
        const closedValue = convertedList.reduce((s, l) => s + l.maxBudget, 0);
        return {
          summary: [
            { label: 'Converted Deals', value: String(convertedList.length) },
            {
              label: 'Overall Conversion Rate',
              value: `${
                visibleLeads.length > 0
                  ? ((convertedList.length / visibleLeads.length) * 100).toFixed(1)
                  : 0
              }%`,
            },
            { label: 'Closed Deal Value', value: formatPKR(closedValue) },
            {
              label: 'Active Negotiation Stage',
              value: String(
                visibleLeads.filter((l) => l.status === 'Negotiation').length
              ),
            },
          ],
          chartTitle: 'Converted Deals by Property Type',
          chartItems: [
            'Residential Plots',
            'Commercial Plots',
            'Houses',
            'Apartments',
          ].map((pt) => ({
            label: pt,
            value: convertedList.filter((l) => l.propertyType === pt).length,
          })),
          headers: [
            'Lead ID',
            'Buyer Name',
            'Project Sold',
            'Property Type & Size',
            'Closed Value (PKR)',
            'Lead Source',
            'Closing Agent',
          ],
          rows: convertedList.map((l) => [
            l.id,
            l.customerName,
            l.interestedProperty,
            `${l.propertyType} (${l.propertySize})`,
            formatPKR(l.maxBudget),
            l.source,
            agents.find((a) => a.id === l.assignedAgentId)?.name ||
              'Assigned Agent',
          ]),
        };
      }

      case 'Lost Leads Report': {
        const lostList = visibleLeads.filter(
          (l) => l.status === 'Lost' || l.status === 'On Hold'
        );
        return {
          summary: [
            {
              label: 'Lost Leads',
              value: String(
                visibleLeads.filter((l) => l.status === 'Lost').length
              ),
            },
            {
              label: 'On Hold Leads',
              value: String(
                visibleLeads.filter((l) => l.status === 'On Hold').length
              ),
            },
            {
              label: 'Lost Pipeline Value',
              value: formatPKR(lostList.reduce((s, l) => s + l.maxBudget, 0)),
            },
            { label: 'Primary Drop Reason', value: 'Capital Reallocation / Timing' },
          ],
          chartTitle: 'Lost & On-Hold Leads by Source',
          chartItems: ALL_LEAD_SOURCES.slice(0, 6).map((sr) => ({
            label: sr,
            value: lostList.filter((l) => l.source === sr).length,
          })),
          headers: [
            'Lead ID',
            'Customer Name',
            'Project',
            'Status',
            'Budget',
            'Source',
            'Reason / Notes',
          ],
          rows: lostList.map((l) => [
            l.id,
            l.customerName,
            l.interestedProperty,
            l.status,
            formatPKR(l.maxBudget),
            l.source,
            l.notes,
          ]),
        };
      }

      case 'Lead Source Report': {
        return {
          summary: [
            { label: 'Active Channels', value: '10 Channels' },
            { label: 'Top Channel by Volume', value: 'Property Portals / Ads' },
            { label: 'Highest Conversion Source', value: 'Referral & Walk-ins' },
            { label: 'Total Tracked Inquiries', value: String(visibleLeads.length) },
          ],
          chartTitle: 'Inquiries Generated per Marketing Source',
          chartItems: ALL_LEAD_SOURCES.map((sr) => ({
            label: sr,
            value: visibleLeads.filter((l) => l.source === sr).length,
          })),
          headers: [
            'Lead Source',
            'Total Leads',
            'Converted Deals',
            'Conversion Rate (%)',
            'Pipeline Value (PKR)',
          ],
          rows: ALL_LEAD_SOURCES.map((sr) => {
            const list = visibleLeads.filter((l) => l.source === sr);
            const conv = list.filter((l) => l.status === 'Converted').length;
            const rate =
              list.length > 0 ? ((conv / list.length) * 100).toFixed(1) : '0.0';
            const val = list.reduce((s, l) => s + l.maxBudget, 0);
            return [sr, list.length, conv, `${rate}%`, formatPKR(val)];
          }),
        };
      }

      case 'Site Visit Report': {
        return {
          summary: [
            { label: 'Total Site Visits', value: String(visibleSiteVisits.length) },
            {
              label: 'Scheduled / Upcoming',
              value: String(
                visibleSiteVisits.filter((s) => s.status === 'Scheduled').length
              ),
            },
            {
              label: 'Completed Tours',
              value: String(
                visibleSiteVisits.filter((s) => s.status === 'Completed').length
              ),
            },
            {
              label: 'Rescheduled / Cancelled',
              value: String(
                visibleSiteVisits.filter(
                  (s) => s.status === 'Rescheduled' || s.status === 'Cancelled'
                ).length
              ),
            },
          ],
          chartTitle: 'Site Visits by Outcome Status',
          chartItems: ['Scheduled', 'Completed', 'Rescheduled', 'Cancelled'].map(
            (st) => ({
              label: st,
              value: visibleSiteVisits.filter((s) => s.status === st).length,
            })
          ),
          headers: [
            'Visit ID',
            'Date & Time',
            'Customer Name',
            'Project Inspected',
            'Assigned Agent',
            'Status',
            'Customer Feedback',
          ],
          rows: visibleSiteVisits.map((sv) => [
            sv.id,
            `${sv.visitDate} ${sv.visitTime}`,
            sv.customerName,
            sv.projectName,
            sv.agentName,
            sv.status,
            sv.customerFeedback || sv.notes,
          ]),
        };
      }
    }
  }, [
    selectedReport,
    dateFilteredLeads,
    visibleLeads,
    visibleFollowUps,
    visibleSiteVisits,
    assignments,
    agentMetrics,
    agents,
  ]);

  const handleExportCurrentReport = () => {
    exportRecordsToCSV(
      selectedReport.toLowerCase().replace(/\s+/g, '_'),
      reportContent.headers,
      reportContent.rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Enterprise CRM Reports & Executive Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Generate, filter, visualize, and export all 10 real estate brokerage performance reports
          </p>
        </div>
        <button
          onClick={handleExportCurrentReport}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FileDown className="w-4 h-4" />
          Export "{selectedReport}" CSV
        </button>
      </div>

      {/* 10 Report Selector Buttons & Date Range Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {ALL_REPORTS.map((rep) => (
            <button
              key={rep}
              onClick={() => setSelectedReport(rep)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                selectedReport === rep
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {rep}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-medium text-slate-600 inline-flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Report Date Range:
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2.5 py-1 font-mono border border-slate-300 rounded-md"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2.5 py-1 font-mono border border-slate-300 rounded-md"
            />
          </div>
          <button
            onClick={() => {
              setDateFrom('2026-10-01');
              setDateTo(SYSTEM_TODAY);
            }}
            className="text-blue-700 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Dates
          </button>
        </div>
      </div>

      {/* Report Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {reportContent.summary.map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <span className="text-xs text-slate-500 block">{s.label}</span>
            <span className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1.5 block">
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Interactive Recharts Visualization */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">{reportContent.chartTitle}</h3>
          <span className="font-mono text-xs text-slate-500">{selectedReport}</span>
        </div>
        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={reportContent.chartItems}
              margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#0F172A', fontWeight: 500 }}
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#475569', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500 }}
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
              <Bar dataKey="value" name="Count / Metric" radius={[6, 6, 0, 0]} barSize={36}>
                {reportContent.chartItems.map((_, idx) => (
                  <Cell key={`rep-bar-${idx}`} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Report Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            {selectedReport} — Granular Records ({reportContent.rows.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                {reportContent.headers.map((h) => (
                  <th key={h} className="py-3 px-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {reportContent.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50">
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={`py-3 px-4 ${
                        cIdx === 0 ? 'font-mono font-semibold text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
