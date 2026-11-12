import React, { useMemo } from 'react';
import { FileDown, ArrowUpRight } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useCRM } from '../context/CRMContext';
import { formatPKR, exportRecordsToCSV } from '../services/crmService';
import { ALL_LEAD_SOURCES } from '../data/demoData';

export const LeadSourcesView: React.FC = () => {
  const { visibleLeads, settings, setActiveSection } = useCRM();

  const sourceAnalytics = useMemo(() => {
    const totalAllLeads = visibleLeads.length || 1;
    return ALL_LEAD_SOURCES.map((sourceName) => {
      const sourceLeads = visibleLeads.filter((l) => l.source === sourceName);
      const count = sourceLeads.length;
      const converted = sourceLeads.filter((l) => l.status === 'Converted').length;
      const qualifiedOrHigher = sourceLeads.filter(
        (l) =>
          l.status === 'Qualified' ||
          l.status === 'Site Visit Scheduled' ||
          l.status === 'Negotiation' ||
          l.status === 'Converted'
      ).length;
      const lost = sourceLeads.filter((l) => l.status === 'Lost').length;
      const conversionRate = count > 0 ? Number(((converted / count) * 100).toFixed(1)) : 0;
      const shareOfTotal = Number(((count / totalAllLeads) * 100).toFixed(1));
      const totalPipelineValuePKR = sourceLeads.reduce((sum, l) => sum + l.maxBudget, 0);
      const adBudget =
        settings.customLeadSources.find((s) => s.name === sourceName)?.monthlyBudgetPKR || 0;

      return {
        sourceName,
        count,
        converted,
        qualifiedOrHigher,
        lost,
        conversionRate,
        shareOfTotal,
        totalPipelineValuePKR,
        adBudget,
      };
    });
  }, [visibleLeads, settings]);

  const handleExportSourcesCSV = () => {
    exportRecordsToCSV(
      'lead_sources_attribution_report',
      [
        'Lead Source',
        'Total Leads',
        'Qualified / Site Visit',
        'Converted Customers',
        'Lost Leads',
        'Conversion Rate (%)',
        'Share of Total (%)',
        'Pipeline Value (PKR)',
      ],
      sourceAnalytics.map((s) => [
        s.sourceName,
        s.count,
        s.qualifiedOrHigher,
        s.converted,
        s.lost,
        s.conversionRate,
        s.shareOfTotal,
        s.totalPipelineValuePKR,
      ])
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Lead Sources & Channel Conversion Attribution
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track inquiry volume, customer conversion efficiency, and PKR pipeline value across all 10 acquisition channels
          </p>
        </div>
        <button
          onClick={handleExportSourcesCSV}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FileDown className="w-3.5 h-3.5" />
          Export Attribution CSV
        </button>
      </div>

      {/* Interactive Recharts Attribution Comparison Graph */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Channel Inquiry Volume vs. Qualified & Converted Buyers
            </h2>
            <p className="text-xs text-slate-500">
              Visual comparison of total inbound leads, qualified prospects, and closed deals per source
            </p>
          </div>
          <span className="font-mono text-xs text-slate-500">10 Active Sources</span>
        </div>

        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sourceAnalytics}
              margin={{ top: 10, right: 16, left: -15, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="sourceName"
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
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar dataKey="count" name="Total Leads" fill="#1E293B" radius={[4, 4, 0, 0]} />
              <Bar
                dataKey="qualifiedOrHigher"
                name="Qualified / Site Visit"
                fill="#2563EB"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="converted"
                name="Converted Customers"
                fill="#16A34A"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Channel Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {sourceAnalytics.map((item) => (
          <div
            key={item.sourceName}
            className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{item.sourceName}</span>
                <span className="font-mono text-[11px] text-slate-500">
                  {item.shareOfTotal}% share
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between font-mono tabular-nums">
                <div>
                  <span className="text-2xl font-bold text-slate-900">{item.count}</span>
                  <span className="text-xs font-sans text-slate-500 ml-1">leads</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-700">
                    {item.converted} converted
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Conversion Rate</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {item.conversionRate}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pipeline Value</span>
                <span className="font-mono font-semibold text-blue-700 tabular-nums">
                  {formatPKR(item.totalPipelineValuePKR)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Attribution Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Channel Performance & Customer Conversion Matrix
          </h3>
          <button
            onClick={() => setActiveSection('leads')}
            className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            Inspect Leads by Source
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-3 pl-5 pr-3">Acquisition Channel</th>
                <th className="py-3 px-3 text-right">Total Leads</th>
                <th className="py-3 px-3 text-right">Qualified / Site Visit</th>
                <th className="py-3 px-3 text-right">Converted Customers</th>
                <th className="py-3 px-3 text-right">Lost Leads</th>
                <th className="py-3 px-3 text-right">Conversion Rate</th>
                <th className="py-3 px-3 text-right">Total Pipeline Value (PKR)</th>
                <th className="py-3 pl-3 pr-5 text-right">Monthly Ad Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sourceAnalytics.map((s) => (
                <tr key={s.sourceName} className="hover:bg-slate-50">
                  <td className="py-3.5 pl-5 pr-3 font-semibold text-slate-900">
                    {s.sourceName}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {s.count}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums text-blue-700">
                    {s.qualifiedOrHigher}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums font-bold text-emerald-700">
                    {s.converted}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-500">
                    {s.lost}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                    {s.conversionRate}%
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums font-medium text-slate-900">
                    {formatPKR(s.totalPipelineValuePKR)}
                  </td>
                  <td className="py-3.5 pl-3 pr-5 text-right font-mono tabular-nums text-slate-600">
                    {formatPKR(s.adBudget)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
