import {
  Lead,
  CustomerBooking,
  Agent,
  AgentMetrics,
  FollowUp,
  ActivityLog,
  AssignmentRecord,
  Project,
  SiteVisit,
  CRMTask,
  NotificationItem,
  CRMSettings,
} from '../types/crm';
import {
  INITIAL_LEADS,
  INITIAL_CUSTOMERS,
  INITIAL_AGENTS,
  INITIAL_FOLLOWUPS,
  INITIAL_ACTIVITIES,
  INITIAL_ASSIGNMENTS,
  INITIAL_PROJECTS,
  INITIAL_SITE_VISITS,
  INITIAL_TASKS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SETTINGS,
  SYSTEM_TODAY,
} from '../data/demoData';

const STORAGE_KEY = 'crestline_realty_crm_v1';

export interface CRMDatabaseSnapshot {
  leads: Lead[];
  customers: CustomerBooking[];
  agents: Agent[];
  followUps: FollowUp[];
  activities: ActivityLog[];
  assignments: AssignmentRecord[];
  projects: Project[];
  siteVisits: SiteVisit[];
  tasks: CRMTask[];
  notifications: NotificationItem[];
  settings: CRMSettings;
}

/**
 * Currency & Budget Formatting Utility (PKR Crore / Lakh)
 */
export function formatPKR(amount: number, compact = true): string {
  if (!amount || isNaN(amount)) return 'PKR 0';
  if (!compact) {
    return `PKR ${amount.toLocaleString('en-PK')}`;
  }
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `PKR ${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    const lakh = amount / 100000;
    return `PKR ${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)} Lakh`;
  }
  return `PKR ${amount.toLocaleString('en-PK')}`;
}

export function formatBudgetRange(min: number, max: number): string {
  return `${formatPKR(min)} – ${formatPKR(max)}`;
}

export const PRESET_PROPERTY_IMAGES = [
  {
    label: 'Luxury Designer Villa / House',
    url: '/src/assets/images/project_gulberg_executive_villas_1794304364817.jpg',
  },
  {
    label: 'Residential Plots & Boulevard',
    url: '/src/assets/images/project_dha_prism_residences_1794304364213.jpg',
  },
  {
    label: 'High-Rise Apartment Towers',
    url: '/src/assets/images/project_bahria_panorama_towers_1794304365334.jpg',
  },
  {
    label: 'Commercial Plaza & Retail Shops',
    url: '/src/assets/images/project_capital_smart_boulevard_1794304368492.jpg',
  },
];

/**
 * Reads an uploaded image file from the user's device and compresses it via HTML5 Canvas
 * so it stores cleanly in localStorage and renders immediately.
 */
export function readAndCompressImageFile(file: File, maxWidth = 960): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Failed to read image file'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Universal CSV Exporter
 */
export function exportRecordsToCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escapeCell = (val: string | number | null | undefined) => {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}_${SYSTEM_TODAY}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Storage Adapter — Prepared for drop-in replacement with Supabase Client in Phase 2
 */
export const CRMStorageRepository = {
  loadSnapshot(): CRMDatabaseSnapshot {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.leads) && Array.isArray(parsed.agents)) {
          const normalizedLeads = parsed.leads.map((l: any) => ({
            ...l,
            source:
              l.source === 'Referral'
                ? 'Lead Reference'
                : l.source === 'Walk-in Customers'
                ? 'Direct Office Inquiry'
                : l.source,
            leadReference:
              l.source === 'Referral' && !l.leadReference
                ? 'Partner Company Reference'
                : l.leadReference,
          }));
          const seenIds = new Set<string>();
          const seenEmails = new Set<string>();
          const dedupedAgents = parsed.agents.filter((ag: any) => {
            if (!ag || !ag.id) return false;
            const idKey = String(ag.id).trim();
            const emailKey = String(ag.email || '').toLowerCase().trim();
            if (seenIds.has(idKey) || (emailKey && seenEmails.has(emailKey))) {
              return false;
            }
            seenIds.add(idKey);
            if (emailKey) seenEmails.add(emailKey);
            return true;
          });
          return {
            ...parsed,
            agents: dedupedAgents,
            leads: normalizedLeads,
            customers: Array.isArray(parsed.customers)
              ? parsed.customers
              : JSON.parse(JSON.stringify(INITIAL_CUSTOMERS)),
          };
        }
      }
    } catch (e) {
      console.warn('Failed to read CRM snapshot from localStorage, falling back to seed data.', e);
    }
    return this.getDefaultSnapshot();
  },

  saveSnapshot(snapshot: CRMDatabaseSnapshot): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
      console.warn('Failed to persist CRM snapshot to localStorage.', e);
    }
  },

  resetToDefault(): CRMDatabaseSnapshot {
    const fresh = this.getDefaultSnapshot();
    this.saveSnapshot(fresh);
    return fresh;
  },

  getDefaultSnapshot(): CRMDatabaseSnapshot {
    return {
      leads: JSON.parse(JSON.stringify(INITIAL_LEADS)),
      customers: JSON.parse(JSON.stringify(INITIAL_CUSTOMERS)),
      agents: JSON.parse(JSON.stringify(INITIAL_AGENTS)),
      followUps: JSON.parse(JSON.stringify(INITIAL_FOLLOWUPS)),
      activities: JSON.parse(JSON.stringify(INITIAL_ACTIVITIES)),
      assignments: JSON.parse(JSON.stringify(INITIAL_ASSIGNMENTS)),
      projects: JSON.parse(JSON.stringify(INITIAL_PROJECTS)),
      siteVisits: JSON.parse(JSON.stringify(INITIAL_SITE_VISITS)),
      tasks: JSON.parse(JSON.stringify(INITIAL_TASKS)),
      notifications: JSON.parse(JSON.stringify(INITIAL_NOTIFICATIONS)),
      settings: JSON.parse(JSON.stringify(INITIAL_SETTINGS)),
    };
  },
};

/**
 * Domain Repository: Agent Performance & Workload Computation
 */
export const AgentRepository = {
  computeAgentMetrics(
    agents: Agent[],
    leads: Lead[],
    followUps: FollowUp[],
    siteVisits: SiteVisit[]
  ): AgentMetrics[] {
    const seenIds = new Set<string>();
    const uniqueAgents = agents.filter((a) => {
      if (!a || !a.id || seenIds.has(a.id)) return false;
      seenIds.add(a.id);
      return true;
    });
    return uniqueAgents.map((agent) => {
      const agentLeads = leads.filter((l) => l.assignedAgentId === agent.id);
      const assignedLeads = agentLeads.length;
      const convertedLeads = agentLeads.filter((l) => l.status === 'Converted').length;
      const lostLeads = agentLeads.filter((l) => l.status === 'Lost').length;
      const activeLeads = agentLeads.filter(
        (l) => l.status !== 'Converted' && l.status !== 'Lost'
      ).length;
      const pendingLeads = agentLeads.filter(
        (l) => l.status === 'New' || l.status === 'Contacted' || l.status === 'Interested'
      ).length;
      const followUpsCompleted = followUps.filter(
        (f) => f.agentId === agent.id && f.status === 'Completed'
      ).length;
      const siteVisitsCount = siteVisits.filter((sv) => sv.agentId === agent.id).length;
      const conversionRate =
        assignedLeads > 0 ? Math.round((convertedLeads / assignedLeads) * 100) : 0;
      // Target capacity per agent is ~8 active leads for 100% workload bar
      const workloadPercentage = Math.min(100, Math.round((activeLeads / 6) * 100));

      return {
        ...agent,
        assignedLeads,
        activeLeads,
        pendingLeads,
        followUpsCompleted,
        siteVisitsCount,
        convertedLeads,
        lostLeads,
        conversionRate,
        workloadPercentage,
      };
    });
  },
};

/**
 * Domain Repository: Dashboard & Analytics Aggregation
 */
export const ReportRepository = {
  computeDashboardKPIs(
    leads: Lead[],
    followUps: FollowUp[],
    siteVisits: SiteVisit[]
  ) {
    const totalLeads = leads.length;
    const newLeadsToday = leads.filter((l) => l.createdAt === SYSTEM_TODAY).length;
    const unassignedLeads = leads.filter((l) => !l.assignedAgentId).length;
    const assignedLeads = leads.filter((l) => Boolean(l.assignedAgentId)).length;

    const pendingFollowUps = followUps.filter((f) => f.status !== 'Completed');
    const followUpsToday = pendingFollowUps.filter(
      (f) => f.scheduledDate === SYSTEM_TODAY
    ).length;
    const overdueFollowUps = pendingFollowUps.filter(
      (f) => f.scheduledDate < SYSTEM_TODAY
    ).length;

    const siteVisitsScheduled = siteVisits.filter(
      (sv) => sv.status === 'Scheduled' || sv.status === 'Rescheduled'
    ).length;

    const convertedLeads = leads.filter((l) => l.status === 'Converted').length;
    const lostLeads = leads.filter((l) => l.status === 'Lost').length;
    const conversionRate =
      totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0;

    return {
      totalLeads,
      newLeadsToday,
      unassignedLeads,
      assignedLeads,
      followUpsToday,
      overdueFollowUps,
      siteVisitsScheduled,
      convertedLeads,
      lostLeads,
      conversionRate,
    };
  },
};
