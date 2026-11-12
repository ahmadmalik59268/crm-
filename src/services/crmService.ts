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
  CRMUserAccount,
  UserRole,
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
const USERS_STORAGE_KEY = 'crestline_realty_crm_users_v1';
export const PRIMARY_SUPER_ADMIN_EMAIL = 'malik59223@gmail.com';

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
 * Safe JSON Fetch helper that gracefully handles Vercel static hosting
 * where /api/* routes return 404 plain-text ("The page could not be found")
 * instead of throwing "Unexpected token 'T', 'The page c'... is not valid JSON".
 */
export async function safeFetchJson(
  url: string,
  options?: RequestInit
): Promise<{ available: boolean; ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { available: false, ok: false, status: res.status, data: null };
    }
    const text = await res.text();
    if (!text || text.trim().startsWith('The page') || text.trim().startsWith('<')) {
      return { available: false, ok: false, status: res.status, data: null };
    }
    const parsed = JSON.parse(text);
    return { available: true, ok: res.ok, status: res.status, data: parsed };
  } catch {
    return { available: false, ok: false, status: 0, data: null };
  }
}

const DEFAULT_SEED_USERS: CRMUserAccount[] = [
  {
    uid: 'usr-super-admin-malik',
    email: PRIMARY_SUPER_ADMIN_EMAIL,
    name: 'malik',
    role: 'Super Admin',
    agentId: '',
    phone: '+92 300 8400111',
    specialization: 'Executive Leadership & Full System Control',
    accountStatus: 'Active',
    loginPassword: '1234',
  },
  {
    uid: 'usr-agent-ali-09',
    email: 'alimalik59223@gmail.com',
    name: 'ali',
    role: 'Sales Agent',
    agentId: 'AGT-09',
    phone: '+92 300 0000000',
    specialization: 'Real Estate Consultant',
    accountStatus: 'Active',
    loginPassword: 'agent123',
  },
  {
    uid: 'usr-agent-hamza-10',
    email: 'hamza112233@gmail.com',
    name: 'hamza1',
    role: 'Sales Agent',
    agentId: 'AGT-10',
    phone: '+92 300 0000000',
    specialization: 'Real Estate Consultant',
    accountStatus: 'Active',
    loginPassword: '11223344',
  },
];

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
 * Storage Adapter — Supports Cloud SQL (/api/crm/*), Supabase, and Vercel Static Local Persistence
 */
export const CRMStorageRepository = {
  loadUsers(): CRMUserAccount[] {
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure primary Super Admin always exists
          const hasSuper = parsed.some(
            (u: any) =>
              String(u.email || '').toLowerCase().trim() === PRIMARY_SUPER_ADMIN_EMAIL
          );
          const merged = hasSuper ? parsed : [DEFAULT_SEED_USERS[0], ...parsed];
          return merged.map((u: any) => ({
            ...u,
            email: String(u.email || '').toLowerCase().trim(),
            role:
              String(u.email || '').toLowerCase().trim() === PRIMARY_SUPER_ADMIN_EMAIL
                ? 'Super Admin'
                : u.role === 'Super Admin'
                ? 'Sales Agent'
                : u.role || 'Sales Agent',
            loginPassword: u.loginPassword || '123456',
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to load users from localStorage, using defaults.', e);
    }
    const seed = JSON.parse(JSON.stringify(DEFAULT_SEED_USERS));
    this.saveUsers(seed);
    return seed;
  },

  saveUsers(usersList: CRMUserAccount[]): void {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersList));
    } catch (e) {
      console.warn('Failed to save users to localStorage.', e);
    }
  },

  syncUsersAndSnapshotClientSide(
    snapshot: CRMDatabaseSnapshot,
    usersList: CRMUserAccount[]
  ): { snapshot: CRMDatabaseSnapshot; users: CRMUserAccount[] } {
    const updatedUsers = [...usersList];
    const currentAgents: Agent[] = Array.isArray(snapshot.agents)
      ? [...snapshot.agents]
      : [];

    // 1. Register any dashboard-added agent in updatedUsers if not present
    for (const ag of currentAgents) {
      if (!ag || !ag.id) continue;
      const agEmail = String(ag.email || '').toLowerCase().trim();
      if (!agEmail || agEmail === PRIMARY_SUPER_ADMIN_EMAIL) continue;

      const existingUser = updatedUsers.find(
        (u) =>
          (u.email || '').toLowerCase().trim() === agEmail ||
          (u.agentId && u.agentId === ag.id)
      );

      const isCustomAgent =
        !agEmail.endsWith('@crestlinerealty.pk') ||
        Boolean(ag.loginPassword) ||
        Boolean(ag.systemRole);

      if (!existingUser && isCustomAgent) {
        const resolvedRole: UserRole =
          ag.systemRole && ag.systemRole !== 'Super Admin'
            ? ag.systemRole
            : 'Sales Agent';
        updatedUsers.push({
          uid: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          email: agEmail,
          name: ag.name || agEmail.split('@')[0],
          role: resolvedRole,
          agentId: ag.id,
          phone: ag.phone || '+92 300 0000000',
          specialization: ag.specialization || 'Real Estate Consultant',
          accountStatus: ag.accountStatus || 'Active',
          loginPassword: ag.loginPassword || '123456',
        });
      }
    }

    // 2. Ensure every non-Super-Admin user has a matching agent record in currentAgents
    for (const u of updatedUsers) {
      const cleanEmail = (u.email || '').toLowerCase().trim();
      if (cleanEmail === PRIMARY_SUPER_ADMIN_EMAIL) {
        u.role = 'Super Admin';
        continue;
      }
      if (u.role === 'Super Admin') {
        u.role = 'Sales Agent';
      }

      let targetAgentId = u.agentId || '';
      const matchedAgent = currentAgents.find(
        (a) =>
          (targetAgentId && a.id === targetAgentId) ||
          (cleanEmail && String(a.email || '').toLowerCase().trim() === cleanEmail)
      );

      if (!targetAgentId) {
        if (matchedAgent) {
          targetAgentId = matchedAgent.id;
        } else {
          const maxNum = currentAgents.reduce((max, a) => {
            const num = parseInt(String(a.id || '').replace('AGT-', ''), 10);
            return !isNaN(num) && num > max ? num : max;
          }, 8);
          const nextNum = maxNum + 1;
          targetAgentId = nextNum < 10 ? `AGT-0${nextNum}` : `AGT-${nextNum}`;
        }
        u.agentId = targetAgentId;
      }

      const cleanName = (u.name || cleanEmail.split('@')[0] || 'Team Member').trim();
      const parts = cleanName.split(' ');
      const initials =
        parts.length >= 2
          ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
          : cleanName.slice(0, 2).toUpperCase();

      const roleBadgeTitle =
        u.role === 'Sales Manager'
          ? 'Sales Manager'
          : u.role === 'Admin'
          ? 'CRM Admin'
          : 'Sales Agent';

      if (!matchedAgent) {
        currentAgents.unshift({
          id: targetAgentId,
          name: cleanName,
          roleTitle: roleBadgeTitle,
          systemRole: u.role as UserRole,
          loginPassword: u.loginPassword || '123456',
          avatarUrl: '',
          initials,
          phone: u.phone || '+92 300 0000000',
          email: cleanEmail,
          joiningDate: SYSTEM_TODAY,
          accountStatus: (u.accountStatus as 'Active' | 'Inactive') || 'Active',
          specialization: u.specialization || `${roleBadgeTitle} (${cleanEmail})`,
        });
      } else {
        if (matchedAgent.loginPassword && matchedAgent.loginPassword !== u.loginPassword) {
          u.loginPassword = matchedAgent.loginPassword;
        }
        if (
          matchedAgent.systemRole &&
          matchedAgent.systemRole !== 'Super Admin' &&
          matchedAgent.systemRole !== u.role
        ) {
          u.role = matchedAgent.systemRole;
        }
        matchedAgent.name = cleanName;
        matchedAgent.email = cleanEmail;
        matchedAgent.roleTitle = roleBadgeTitle;
        matchedAgent.systemRole = u.role as UserRole;
        matchedAgent.loginPassword = u.loginPassword || '123456';
      }
    }

    // 3. Remove duplicate demo agents AGT-07 ("Ali Raza") & AGT-02 ("Hamza Sikandar") when real users exist
    const filteredAgents = currentAgents.filter((a) => {
      if (
        (a.id === 'AGT-07' || a.id === 'AGT-02') &&
        String(a.email || '').includes('crestlinerealty.pk')
      ) {
        return false;
      }
      return true;
    });

    // 4. Deduplicate agents by ID and email
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();
    const dedupedAgents: Agent[] = [];
    for (const ag of filteredAgents) {
      if (!ag || !ag.id) continue;
      const idKey = String(ag.id).trim();
      const emailKey = String(ag.email || '').toLowerCase().trim();
      if (seenIds.has(idKey) || (emailKey && seenEmails.has(emailKey))) continue;
      seenIds.add(idKey);
      if (emailKey) seenEmails.add(emailKey);
      dedupedAgents.push(ag);
    }

    const nextSnapshot: CRMDatabaseSnapshot = {
      ...snapshot,
      agents: dedupedAgents,
    };

    this.saveUsers(updatedUsers);
    this.saveSnapshot(nextSnapshot);

    return { snapshot: nextSnapshot, users: updatedUsers };
  },

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
    const def = this.getDefaultSnapshot();
    const synced = this.syncUsersAndSnapshotClientSide(def, this.loadUsers());
    return synced.snapshot;
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
