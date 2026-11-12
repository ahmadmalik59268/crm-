import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  syncSnapshotToSupabaseTables,
  syncUserAuthToSupabase,
  fetchUsersFromSupabase,
  isSupabaseConfigured,
} from '../lib/supabase';
import {
  Lead,
  CustomerBooking,
  PaymentReceipt,
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
  UserRole,
  NavSection,
  LeadStatus,
  ActivityType,
  CRMUserAccount,
  DEFAULT_ROLE_SECTIONS,
} from '../types/crm';
import {
  CRMStorageRepository,
  AgentRepository,
  ReportRepository,
  formatPKR,
  safeFetchJson,
  PRIMARY_SUPER_ADMIN_EMAIL,
} from '../services/crmService';
import { SYSTEM_TODAY } from '../data/demoData';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

interface CRMContextValue {
  // Authentication & User Accounts State
  authenticatedUser: CRMUserAccount | null;
  userAccounts: CRMUserAccount[];
  loginWithCredentials: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  signupNewAccount: (input: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    phone: string;
    specialization: string;
    createdBySuperAdmin?: boolean;
  }) => Promise<{ ok: boolean; error?: string; createdUser?: CRMUserAccount }>;
  loginWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  logoutUser: () => void;
  updateUserAccountRole: (
    uid: string,
    updates: {
      role?: UserRole;
      agentId?: string;
      accountStatus?: string;
      name?: string;
      password?: string;
      email?: string;
    }
  ) => Promise<void>;
  switchIdentityForPreview: (account: CRMUserAccount) => void;

  // Navigation & Role State
  activeSection: NavSection;
  setActiveSection: (section: NavSection) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  activeSalesAgentId: string;
  setActiveSalesAgentId: (agentId: string) => void;
  allowedSections: NavSection[];
  canAssignLeads: boolean;
  getUserAllowedSections: (emailOrAgentId: string, role: UserRole) => NavSection[];
  updateUserAllowedSections: (emailOrAgentId: string, sections: NavSection[]) => void;

  // Selected Lead Details Modal / Drawer
  selectedLeadId: string | null;
  setSelectedLeadId: (leadId: string | null) => void;
  isAddLeadModalOpen: boolean;
  setIsAddLeadModalOpen: (open: boolean) => void;
  editingLead: Lead | null;
  setEditingLead: (lead: Lead | null) => void;

  // Lead -> Customer Conversion Modal Trigger
  convertingLeadToCustomer: Lead | null;
  setConvertingLeadToCustomer: (lead: Lead | null) => void;

  // Raw & Role-Scoped Data
  leads: Lead[];
  visibleLeads: Lead[];
  customers: CustomerBooking[];
  visibleCustomers: CustomerBooking[];
  agents: Agent[];
  agentMetrics: AgentMetrics[];
  followUps: FollowUp[];
  visibleFollowUps: FollowUp[];
  activities: ActivityLog[];
  assignments: AssignmentRecord[];
  projects: Project[];
  siteVisits: SiteVisit[];
  visibleSiteVisits: SiteVisit[];
  tasks: CRMTask[];
  visibleTasks: CRMTask[];
  notifications: NotificationItem[];
  settings: CRMSettings;
  dashboardKPIs: ReturnType<typeof ReportRepository.computeDashboardKPIs>;

  // Toast Notifications
  toasts: ToastMessage[];
  addToast: (title: string, description?: string, variant?: ToastMessage['variant']) => void;
  dismissToast: (id: string) => void;

  // Lead Actions
  addLead: (leadInput: Omit<Lead, 'id'>) => Lead;
  updateLead: (id: string, updates: Partial<Lead>, activityNote?: string) => void;
  deleteLead: (id: string) => void;
  changeLeadStatus: (leadId: string, newStatus: LeadStatus, note?: string) => void;

  // Customer & Property Booking Actions
  createCustomerBooking: (
    bookingInput: Omit<CustomerBooking, 'id' | 'paidAmount' | 'remainingAmount' | 'receipts'>,
    initialPayment?: {
      amount: number;
      stage: PaymentReceipt['paymentStage'];
      method: PaymentReceipt['paymentMethod'];
      referenceNo: string;
      notes: string;
    }
  ) => CustomerBooking;
  recordCustomerPayment: (
    customerId: string,
    receiptInput: Omit<PaymentReceipt, 'id' | 'receiptNumber' | 'receivedBy'>
  ) => void;
  updateCustomerBooking: (customerId: string, updates: Partial<CustomerBooking>) => void;

  // Lead Assignment Actions (Immutable History + Timeline)
  assignLead: (leadId: string, targetAgentId: string, notes?: string) => void;
  bulkAssignLeads: (leadIds: string[], targetAgentId: string, notes?: string) => void;
  autoAssignUnassignedLeads: () => number;

  // Activity Timeline Action
  logActivity: (
    leadId: string,
    activityType: ActivityType,
    description: string,
    actorName?: string
  ) => void;

  // Follow-Up Actions (Preserves Full History)
  scheduleFollowUp: (
    input: Omit<FollowUp, 'id' | 'createdAt' | 'status'>
  ) => void;
  completeFollowUp: (
    followUpId: string,
    outcomeNotes: string,
    nextFollowUpDate?: string | null,
    nextFollowUpType?: FollowUp['type']
  ) => void;
  rescheduleFollowUp: (
    followUpId: string,
    newDate: string,
    newTime: string,
    reasonNotes: string
  ) => void;

  // Agent Actions
  addAgent: (agentInput: Omit<Agent, 'id' | 'initials'>) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  toggleAgentStatus: (id: string) => void;

  // Project Actions
  addProject: (projectInput: Omit<Project, 'id'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;

  // Site Visit Actions
  scheduleSiteVisit: (visitInput: Omit<SiteVisit, 'id'>) => void;
  updateSiteVisitStatus: (
    visitId: string,
    status: SiteVisit['status'],
    feedback?: string,
    newDate?: string,
    newTime?: string
  ) => void;

  // Task Actions
  addTask: (taskInput: Omit<CRMTask, 'id' | 'createdAt' | 'status'>) => void;
  toggleTaskStatus: (taskId: string) => void;
  deleteTask: (taskId: string) => void;

  // Notification & Settings Actions
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  updateSettings: (updates: Partial<CRMSettings>) => void;
  resetDemoData: () => void;
}

const CRMContext = createContext<CRMContextValue | undefined>(undefined);

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snapshot, setSnapshot] = useState(() => CRMStorageRepository.loadSnapshot());
  const [authenticatedUser, setAuthenticatedUser] = useState<CRMUserAccount | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userAccounts, setUserAccounts] = useState<CRMUserAccount[]>(() =>
    CRMStorageRepository.loadUsers()
  );

  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('Super Admin');
  const [activeSalesAgentId, setActiveSalesAgentId] = useState<string>('AGT-09');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [convertingLeadToCustomer, setConvertingLeadToCustomer] = useState<Lead | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const isBootstrappingRef = useRef(false);
  const pendingSyncRef = useRef<Promise<any> | null>(null);

  // Persist snapshot to localStorage, Cloud SQL PostgreSQL, and Supabase tables when configured
  useEffect(() => {
    CRMStorageRepository.saveSnapshot(snapshot);
    if (isBootstrappingRef.current) return;

    if (isSupabaseConfigured) {
      syncSnapshotToSupabaseTables({
        leads: snapshot.leads,
        agents: snapshot.agents,
        projects: snapshot.projects,
        customers: snapshot.customers,
        followUps: snapshot.followUps,
        siteVisits: snapshot.siteVisits,
        tasks: snapshot.tasks,
        activities: snapshot.activities,
        assignments: snapshot.assignments,
        notifications: snapshot.notifications,
        users: userAccounts,
      });
    }
    if (authToken) {
      const p = safeFetchJson('/api/crm/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ snapshot }),
      })
        .then((res) => {
          if (res.available && res.ok && res.data && Array.isArray(res.data.users)) {
            setUserAccounts(res.data.users);
            CRMStorageRepository.saveUsers(res.data.users);
          } else if (!res.available) {
            // Static Vercel hosting: sync users & snapshot client-side
            const synced = CRMStorageRepository.syncUsersAndSnapshotClientSide(
              snapshot,
              CRMStorageRepository.loadUsers()
            );
            setUserAccounts(synced.users);
          }
        })
        .catch((err) => {
          console.warn('Background Cloud SQL sync warning:', err);
        });
      pendingSyncRef.current = p;
    }
  }, [snapshot]);

  const addToast = (
    title: string,
    description?: string,
    variant: ToastMessage['variant'] = 'default'
  ) => {
    const id = `tst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, title, description, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const applyAuthenticatedUserSession = async (
    userObj: CRMUserAccount,
    token: string
  ) => {
    // Wait for any in-flight lead assignment or snapshot sync to finish before bootstrapping
    if (pendingSyncRef.current) {
      try {
        await pendingSyncRef.current;
      } catch {}
    }

    isBootstrappingRef.current = true;
    let effectiveUser = userObj;
    let loadedSnapshot = CRMStorageRepository.loadSnapshot();
    let loadedUsers = CRMStorageRepository.loadUsers();

    try {
      const res = await safeFetchJson('/api/crm/bootstrap', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.available && res.ok && res.data) {
        const data = res.data;
        if (data.snapshot && Array.isArray(data.snapshot.leads)) {
          loadedSnapshot = data.snapshot;
          setSnapshot(data.snapshot);
        }
        if (Array.isArray(data.users) && data.users.length > 0) {
          loadedUsers = data.users;
          setUserAccounts(data.users);
          CRMStorageRepository.saveUsers(data.users);
        }
        if (data.currentUser) {
          effectiveUser = data.currentUser;
        }
      } else {
        // Vercel / Static Hosting mode: merge with Supabase users if configured, then sync with local snapshot
        if (isSupabaseConfigured) {
          const sbUsers = await fetchUsersFromSupabase();
          if (sbUsers && sbUsers.length > 0) {
            const byEmail = new Map<string, CRMUserAccount>();
            loadedUsers.forEach((u) => byEmail.set(u.email.toLowerCase().trim(), u));
            sbUsers.forEach((su) => {
              const key = su.email.toLowerCase().trim();
              const existing = byEmail.get(key);
              byEmail.set(key, {
                ...su,
                loginPassword: su.loginPassword || existing?.loginPassword || '123456',
              });
            });
            loadedUsers = Array.from(byEmail.values());
          }
        }
        const synced = CRMStorageRepository.syncUsersAndSnapshotClientSide(
          loadedSnapshot,
          loadedUsers
        );
        loadedSnapshot = synced.snapshot;
        loadedUsers = synced.users;
        setSnapshot(loadedSnapshot);
        setUserAccounts(loadedUsers);
        const refreshedCurrent = loadedUsers.find(
          (u) =>
            u.uid === effectiveUser.uid ||
            u.email.toLowerCase().trim() === (effectiveUser.email || '').toLowerCase().trim()
        );
        if (refreshedCurrent) {
          effectiveUser = refreshedCurrent;
        }
      }
    } catch (err) {
      console.warn('Bootstrap from backend warning, using local state:', err);
    }

    const cleanLoginEmail = (effectiveUser.email || '').toLowerCase().trim();
    const effectiveRole: UserRole =
      cleanLoginEmail === PRIMARY_SUPER_ADMIN_EMAIL
        ? 'Super Admin'
        : ((effectiveUser.role as UserRole) || 'Sales Agent');

    setAuthenticatedUser({ ...effectiveUser, role: effectiveRole });
    setAuthToken(token);
    setCurrentRole(effectiveRole);

    if (effectiveRole !== 'Super Admin') {
      const matchedAgent = (loadedSnapshot.agents || []).find(
        (a) =>
          (effectiveUser.agentId && a.id === effectiveUser.agentId) ||
          (cleanLoginEmail && String(a.email || '').toLowerCase().trim() === cleanLoginEmail)
      );
      const resolvedAgentId = effectiveUser.agentId || matchedAgent?.id || '';
      setActiveSalesAgentId(resolvedAgentId);
    } else {
      const firstTeamUser = loadedUsers.find((u) => u.role !== 'Super Admin' && u.agentId);
      if (firstTeamUser?.agentId) {
        setActiveSalesAgentId(firstTeamUser.agentId);
      } else if (loadedSnapshot.agents?.[0]?.id) {
        setActiveSalesAgentId(loadedSnapshot.agents[0].id);
      }
    }

    if (isSupabaseConfigured) {
      syncSnapshotToSupabaseTables({
        leads: loadedSnapshot.leads,
        agents: loadedSnapshot.agents,
        projects: loadedSnapshot.projects,
        customers: loadedSnapshot.customers,
        followUps: loadedSnapshot.followUps,
        siteVisits: loadedSnapshot.siteVisits,
        tasks: loadedSnapshot.tasks,
        activities: loadedSnapshot.activities,
        assignments: loadedSnapshot.assignments,
        notifications: loadedSnapshot.notifications,
        users: loadedUsers,
      });
    }

    setTimeout(() => {
      isBootstrappingRef.current = false;
    }, 100);
  };

  const loginWithCredentials = async (
    email: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const cleanPassword = password.trim();

      const res = await safeFetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
      });

      if (res.available) {
        if (!res.ok) {
          return { ok: false, error: res.data?.error || 'Invalid credentials' };
        }
        await applyAuthenticatedUserSession(res.data.user, res.data.token);
        if (isSupabaseConfigured) {
          syncUserAuthToSupabase({
            uid: res.data.user.uid,
            email: res.data.user.email,
            password: cleanPassword,
            name: res.data.user.name,
            role: res.data.user.role,
            agentId: res.data.user.agentId,
            phone: res.data.user.phone,
          });
        }
        addToast(
          `Welcome, ${res.data.user.name}`,
          `Logged in as ${res.data.user.role}${res.data.user.agentId ? ` (${res.data.user.agentId})` : ''}.`,
          'success'
        );
        return { ok: true };
      }

      // Vercel / Static Hosting Fallback (when /api/auth/login returns 404 plain text)
      const currentSnap = CRMStorageRepository.loadSnapshot();
      let localUsers = CRMStorageRepository.loadUsers();
      if (isSupabaseConfigured) {
        const sbUsers = await fetchUsersFromSupabase();
        if (sbUsers && sbUsers.length > 0) {
          const map = new Map<string, CRMUserAccount>();
          localUsers.forEach((u) => map.set(u.email.toLowerCase().trim(), u));
          sbUsers.forEach((su) => {
            const key = su.email.toLowerCase().trim();
            const existing = map.get(key);
            map.set(key, {
              ...su,
              loginPassword: su.loginPassword || existing?.loginPassword || '123456',
            });
          });
          localUsers = Array.from(map.values());
        }
      }

      const synced = CRMStorageRepository.syncUsersAndSnapshotClientSide(
        currentSnap,
        localUsers
      );
      localUsers = synced.users;

      let matchedUser = localUsers.find(
        (u) => u.email.toLowerCase().trim() === cleanEmail
      );

      if (!matchedUser) {
        return {
          ok: false,
          error:
            'No account found with this email. Please Sign Up or ask Super Admin to add your email.',
        };
      }

      const expectedPass = matchedUser.loginPassword || '123456';
      const isPlaceholderPass =
        matchedUser.role !== 'Super Admin' &&
        (expectedPass === 'agent123' || expectedPass === '123456');

      if (expectedPass !== cleanPassword) {
        if (isPlaceholderPass || cleanEmail === PRIMARY_SUPER_ADMIN_EMAIL) {
          matchedUser = { ...matchedUser, loginPassword: cleanPassword };
          localUsers = localUsers.map((u) =>
            u.uid === matchedUser!.uid ? matchedUser! : u
          );
          CRMStorageRepository.saveUsers(localUsers);
        } else {
          return {
            ok: false,
            error:
              'Incorrect password for this email. Please check your password or ask Super Admin.',
          };
        }
      }

      if (matchedUser.accountStatus === 'Inactive') {
        return { ok: false, error: 'This account is currently inactive.' };
      }

      const token = `crm-uid:${matchedUser.uid}`;
      await applyAuthenticatedUserSession(matchedUser, token);
      if (isSupabaseConfigured) {
        syncUserAuthToSupabase({
          uid: matchedUser.uid,
          email: matchedUser.email,
          password: cleanPassword,
          name: matchedUser.name,
          role: matchedUser.role,
          agentId: matchedUser.agentId,
          phone: matchedUser.phone,
        });
      }
      addToast(
        `Welcome, ${matchedUser.name}`,
        `Logged in as ${matchedUser.role}${matchedUser.agentId ? ` (${matchedUser.agentId})` : ''}.`,
        'success'
      );
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message || 'Login request failed' };
    }
  };

  const signupNewAccount = async (input: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    phone: string;
    specialization: string;
    createdBySuperAdmin?: boolean;
  }): Promise<{ ok: boolean; error?: string; createdUser?: CRMUserAccount }> => {
    try {
      const cleanSignupEmail = input.email.toLowerCase().trim();
      const cleanPassword = input.password.trim();

      const res = await safeFetchJson('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (res.available) {
        if (!res.ok) {
          return { ok: false, error: res.data?.error || 'Sign up failed' };
        }
        const data = res.data;

        if (input.createdBySuperAdmin && authToken) {
          isBootstrappingRef.current = true;
          const bootRes = await safeFetchJson('/api/crm/bootstrap', {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (bootRes.available && bootRes.ok && bootRes.data) {
            if (bootRes.data.snapshot) setSnapshot(bootRes.data.snapshot);
            if (Array.isArray(bootRes.data.users)) {
              setUserAccounts(bootRes.data.users);
              CRMStorageRepository.saveUsers(bootRes.data.users);
            }
          } else {
            setUserAccounts((prev) => [...prev, data.user]);
          }
          setTimeout(() => {
            isBootstrappingRef.current = false;
          }, 200);
          addToast(
            'Team Account Created',
            `${data.user.name} registered as ${data.user.role}${data.user.agentId ? ` (${data.user.agentId})` : ''}.`,
            'success'
          );
          return { ok: true, createdUser: data.user };
        }

        if (isSupabaseConfigured && data.user) {
          syncUserAuthToSupabase({
            uid: data.user.uid,
            email: data.user.email,
            password: cleanPassword,
            name: data.user.name,
            role: data.user.role,
            agentId: data.user.agentId,
            phone: data.user.phone,
          });
        }

        addToast(
          'Account Created Successfully',
          `Registered as ${data.user.role}. Please Sign In now with your email and password.`,
          'success'
        );
        return { ok: true, createdUser: data.user };
      }

      // Vercel / Static Hosting Fallback for Sign Up
      const currentSnap = CRMStorageRepository.loadSnapshot();
      const localUsers = CRMStorageRepository.loadUsers();
      const existing = localUsers.find(
        (u) => u.email.toLowerCase().trim() === cleanSignupEmail
      );

      if (existing) {
        if (existing.role === 'Super Admin' && !input.createdBySuperAdmin) {
          // Update Super Admin password if signing up with malik59223@gmail.com
          existing.loginPassword = cleanPassword;
          existing.name = input.name.trim() || existing.name;
          CRMStorageRepository.saveUsers(localUsers);
          setUserAccounts([...localUsers]);
          return { ok: true, createdUser: existing };
        }
        existing.name = input.name.trim() || existing.name;
        existing.loginPassword = cleanPassword;
        if (input.createdBySuperAdmin && input.role && input.role !== 'Super Admin') {
          existing.role = input.role;
        }
        if (input.phone) existing.phone = input.phone.trim();
        const synced = CRMStorageRepository.syncUsersAndSnapshotClientSide(
          currentSnap,
          localUsers
        );
        setSnapshot(synced.snapshot);
        setUserAccounts(synced.users);
        if (isSupabaseConfigured) {
          syncUserAuthToSupabase({
            uid: existing.uid,
            email: existing.email,
            password: cleanPassword,
            name: existing.name,
            role: existing.role,
            agentId: existing.agentId,
            phone: existing.phone,
          });
        }
        return { ok: true, createdUser: existing };
      }

      const assignedRole: UserRole =
        cleanSignupEmail === PRIMARY_SUPER_ADMIN_EMAIL
          ? 'Super Admin'
          : input.createdBySuperAdmin && input.role && input.role !== 'Super Admin'
          ? input.role
          : 'Sales Agent';

      const maxNum = (currentSnap.agents || []).reduce((max, a) => {
        const num = parseInt(String(a.id || '').replace('AGT-', ''), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 8);
      const nextIdx = maxNum + 1;
      const linkedAgentId =
        assignedRole === 'Super Admin'
          ? ''
          : nextIdx < 10
          ? `AGT-0${nextIdx}`
          : `AGT-${nextIdx}`;

      const newUser: CRMUserAccount = {
        uid: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        email: cleanSignupEmail,
        name: input.name.trim(),
        role: assignedRole,
        agentId: linkedAgentId,
        phone: input.phone.trim() || '+92 300 0000000',
        specialization: input.specialization.trim() || 'Real Estate Consultant',
        accountStatus: 'Active',
        loginPassword: cleanPassword,
      };

      const nextUsers = [...localUsers, newUser];
      const synced = CRMStorageRepository.syncUsersAndSnapshotClientSide(
        currentSnap,
        nextUsers
      );
      setSnapshot(synced.snapshot);
      setUserAccounts(synced.users);

      if (isSupabaseConfigured) {
        syncUserAuthToSupabase({
          uid: newUser.uid,
          email: newUser.email,
          password: cleanPassword,
          name: newUser.name,
          role: newUser.role,
          agentId: newUser.agentId,
          phone: newUser.phone,
        });
      }

      addToast(
        input.createdBySuperAdmin ? 'Team Account Created' : 'Account Created Successfully',
        `${newUser.name} registered as ${newUser.role}${newUser.agentId ? ` (${newUser.agentId})` : ''}.`,
        'success'
      );
      return { ok: true, createdUser: newUser };
    } catch (error: any) {
      return { ok: false, error: error.message || 'Sign up request failed' };
    }
  };

  const loginWithGoogle = async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      const res = await safeFetchJson('/api/auth/google-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: cred.user.displayName || cred.user.email,
        }),
      });
      if (res.available && res.ok && res.data?.user) {
        await applyAuthenticatedUserSession(res.data.user, idToken);
        addToast(
          `Signed in with Google`,
          `Welcome ${res.data.user.name} (${res.data.user.role}).`,
          'success'
        );
        return { ok: true };
      }
      return { ok: false, error: res.data?.error || 'Google sign-in sync failed' };
    } catch (error: any) {
      return { ok: false, error: error.message || 'Google sign-in cancelled or failed' };
    }
  };

  const logoutUser = () => {
    signOut(auth).catch(() => {});
    setAuthenticatedUser(null);
    setAuthToken(null);
    setSelectedLeadId(null);
    addToast('Signed Out', 'You have been logged out of Crestline CRM.', 'default');
  };

  const switchIdentityForPreview = (account: CRMUserAccount) => {
    if (authenticatedUser?.role !== 'Super Admin') {
      addToast(
        'Access Restricted',
        'Only the Super Admin can preview other team members’ workspaces.',
        'warning'
      );
      return;
    }
    setCurrentRole(account.role as UserRole);
    if (account.role !== 'Super Admin' && account.agentId) {
      setActiveSalesAgentId(account.agentId);
    }
    setActiveSection('dashboard');
    addToast(
      `Previewing Workspace: ${account.name}`,
      account.role !== 'Super Admin'
        ? `Strict Lead Isolation Active: Showing ONLY leads assigned to ${account.name} (${account.role} · ${account.agentId}).`
        : `Viewing as ${account.role}.`,
      'success'
    );
  };

  const updateUserAccountRole = async (
    uid: string,
    updates: {
      role?: UserRole;
      agentId?: string;
      accountStatus?: string;
      name?: string;
      password?: string;
      email?: string;
    }
  ) => {
    if (authenticatedUser?.role !== 'Super Admin') {
      addToast(
        'Permission Denied',
        'Only the Super Admin can assign or modify user roles.',
        'danger'
      );
      return;
    }

    if (authToken) {
      try {
        const res = await safeFetchJson(`/api/crm/users/${uid}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(updates),
        });

        if (res.available) {
          if (!res.ok) {
            addToast('Role Update Failed', res.data?.error || 'Could not update role', 'danger');
            return;
          }
          isBootstrappingRef.current = true;
          const bootRes = await safeFetchJson('/api/crm/bootstrap', {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (bootRes.available && bootRes.ok && bootRes.data) {
            const bootData = bootRes.data;
            if (bootData.snapshot) {
              const targetAcct = (bootData.users || userAccounts).find(
                (u: CRMUserAccount) => u.uid === uid
              );
              if (updates.role && targetAcct) {
                const emailKey = (targetAcct.email || '').toLowerCase().trim();
                const nextPerms = { ...(bootData.snapshot.settings?.userPermissions || {}) };
                nextPerms[emailKey] =
                  DEFAULT_ROLE_SECTIONS[updates.role] || DEFAULT_ROLE_SECTIONS['Sales Agent'];
                if (targetAcct.agentId) {
                  nextPerms[targetAcct.agentId] = nextPerms[emailKey];
                }
                bootData.snapshot.settings = {
                  ...bootData.snapshot.settings,
                  userPermissions: nextPerms,
                };
              }
              setSnapshot(bootData.snapshot);
            }
            if (Array.isArray(bootData.users)) {
              setUserAccounts(bootData.users);
              CRMStorageRepository.saveUsers(bootData.users);
            }
          }
          setTimeout(() => {
            isBootstrappingRef.current = false;
          }, 200);
          addToast('User Role & Access Updated', 'Automatic role permissions applied.', 'success');
          return;
        }
      } catch (e: any) {
        console.warn('Backend role update warning, applying client-side:', e);
      }
    }

    // Vercel / Static Hosting Fallback for Role & Password Update
    const localUsers = CRMStorageRepository.loadUsers().map((u) => {
      if (u.uid !== uid) return u;
      return {
        ...u,
        role: updates.role || u.role,
        agentId: updates.agentId !== undefined ? updates.agentId : u.agentId,
        accountStatus: updates.accountStatus || u.accountStatus,
        name: updates.name ? updates.name.trim() : u.name,
        email: updates.email ? updates.email.toLowerCase().trim() : u.email,
        loginPassword:
          updates.password && updates.password.trim()
            ? updates.password.trim()
            : u.loginPassword,
      };
    });

    const synced = CRMStorageRepository.syncUsersAndSnapshotClientSide(
      snapshot,
      localUsers
    );
    setSnapshot(synced.snapshot);
    setUserAccounts(synced.users);
    addToast('User Role & Access Updated', 'Changes saved successfully.', 'success');
  };

  const getUserAllowedSections = (emailOrAgentId: string, role: UserRole): NavSection[] => {
    const cleanKey = (emailOrAgentId || '').toLowerCase().trim();
    if (role === 'Super Admin' || cleanKey === 'malik59223@gmail.com') {
      return DEFAULT_ROLE_SECTIONS['Super Admin'];
    }
    const customMap = snapshot.settings?.userPermissions || {};
    const matchedAcct = userAccounts.find(
      (u) =>
        (u.email || '').toLowerCase().trim() === cleanKey ||
        (u.agentId && u.agentId === emailOrAgentId)
    );
    const matchedAgent = snapshot.agents.find(
      (a) =>
        a.id === emailOrAgentId ||
        String(a.email || '').toLowerCase().trim() === cleanKey
    );

    const customList =
      customMap[cleanKey] ||
      customMap[emailOrAgentId] ||
      (matchedAcct?.email ? customMap[matchedAcct.email.toLowerCase().trim()] : undefined) ||
      (matchedAcct?.agentId ? customMap[matchedAcct.agentId] : undefined) ||
      (matchedAgent?.email ? customMap[matchedAgent.email.toLowerCase().trim()] : undefined) ||
      (matchedAgent?.id ? customMap[matchedAgent.id] : undefined);

    if (Array.isArray(customList) && customList.length > 0) {
      return Array.from(new Set(['dashboard', ...customList])) as NavSection[];
    }
    return DEFAULT_ROLE_SECTIONS[role] || DEFAULT_ROLE_SECTIONS['Sales Agent'];
  };

  const updateUserAllowedSections = (emailOrAgentId: string, sections: NavSection[]) => {
    if (authenticatedUser?.role !== 'Super Admin') {
      addToast('Permission Denied', 'Only the Super Admin can modify module access.', 'danger');
      return;
    }
    const cleanKey = (emailOrAgentId || '').toLowerCase().trim();
    const safeSections = Array.from(new Set(['dashboard', ...sections])) as NavSection[];
    const matchedAcct = userAccounts.find(
      (u) =>
        (u.email || '').toLowerCase().trim() === cleanKey ||
        (u.agentId && u.agentId === emailOrAgentId)
    );
    const matchedAgent = snapshot.agents.find(
      (a) =>
        a.id === emailOrAgentId ||
        String(a.email || '').toLowerCase().trim() === cleanKey
    );

    setSnapshot((prev) => {
      const nextPerms: Record<string, NavSection[]> = {
        ...(prev.settings.userPermissions || {}),
        [cleanKey]: safeSections,
        [emailOrAgentId]: safeSections,
      };
      if (matchedAcct?.agentId) {
        nextPerms[matchedAcct.agentId] = safeSections;
      }
      if (matchedAcct?.email) {
        nextPerms[matchedAcct.email.toLowerCase().trim()] = safeSections;
      }
      if (matchedAgent?.id) {
        nextPerms[matchedAgent.id] = safeSections;
      }
      if (matchedAgent?.email) {
        nextPerms[matchedAgent.email.toLowerCase().trim()] = safeSections;
      }
      return {
        ...prev,
        settings: {
          ...prev.settings,
          userPermissions: nextPerms,
        },
      };
    });
    addToast('Access Permissions Saved', 'Updated allowed modules for this account.', 'success');
  };

  const allowedSections = useMemo<NavSection[]>(() => {
    if (currentRole === 'Super Admin') {
      return DEFAULT_ROLE_SECTIONS['Super Admin'];
    }
    // Check if logged in as non-Super-Admin or previewing a profile
    const previewUser = userAccounts.find((u) => u.agentId === activeSalesAgentId);
    const previewAgent = snapshot.agents.find((a) => a.id === activeSalesAgentId);
    const lookupKey =
      authenticatedUser?.role !== 'Super Admin'
        ? authenticatedUser?.email || activeSalesAgentId
        : previewUser?.email || previewAgent?.email || activeSalesAgentId;

    return getUserAllowedSections(lookupKey, currentRole);
  }, [currentRole, activeSalesAgentId, authenticatedUser, userAccounts, snapshot.agents, snapshot.settings.userPermissions]);

  const canAssignLeads = useMemo(() => {
    return currentRole === 'Super Admin' || allowedSections.includes('assignments');
  }, [currentRole, allowedSections]);

  const getCurrentActorName = () => {
    if (currentRole !== 'Super Admin') {
      const ag = snapshot.agents.find((a) => a.id === activeSalesAgentId);
      const displayName = ag ? ag.name : authenticatedUser?.name || currentRole;
      return `${displayName} (${currentRole})`;
    }
    return `${authenticatedUser?.name || snapshot.settings.currentUserProfile.name} (${currentRole})`;
  };

  // Strict Per-User Lead Isolation:
  // 1. If logged in as a non-Super-Admin (Sales Agent, Sales Manager, Admin), isolate strictly to THIS user's linked Agent ID(s).
  // 2. If logged in as Super Admin and previewing a role/agent, isolate to activeSalesAgentId.
  // 3. Only Super Admin in 'Super Admin' role sees all agency leads.
  const isolatedAgentIds = useMemo<Set<string> | null>(() => {
    const isRealSuperAdmin =
      authenticatedUser?.role === 'Super Admin' ||
      (authenticatedUser?.email || '').toLowerCase().trim() === 'malik59223@gmail.com';

    if (!isRealSuperAdmin && authenticatedUser) {
      const ids = new Set<string>();
      const myEmail = (authenticatedUser.email || '').toLowerCase().trim();
      if (authenticatedUser.agentId) {
        ids.add(authenticatedUser.agentId);
      }
      for (const ag of snapshot.agents) {
        if (myEmail && String(ag.email || '').toLowerCase().trim() === myEmail) {
          ids.add(ag.id);
        }
      }
      for (const u of userAccounts) {
        if (myEmail && (u.email || '').toLowerCase().trim() === myEmail && u.agentId) {
          ids.add(u.agentId);
        }
      }
      if (ids.size === 0 && activeSalesAgentId) {
        ids.add(activeSalesAgentId);
      }
      return ids;
    }

    if (currentRole !== 'Super Admin') {
      return new Set(activeSalesAgentId ? [activeSalesAgentId] : []);
    }

    return null;
  }, [authenticatedUser, currentRole, activeSalesAgentId, snapshot.agents, userAccounts]);

  const visibleLeads = useMemo(() => {
    if (isolatedAgentIds !== null) {
      return snapshot.leads.filter(
        (l) => Boolean(l.assignedAgentId && isolatedAgentIds.has(l.assignedAgentId))
      );
    }
    return snapshot.leads;
  }, [snapshot.leads, isolatedAgentIds]);

  const visibleLeadIds = useMemo(
    () => new Set(visibleLeads.map((l) => l.id)),
    [visibleLeads]
  );

  const visibleCustomers = useMemo(() => {
    if (isolatedAgentIds !== null) {
      return snapshot.customers.filter(
        (c) =>
          (c.salesAgentId && isolatedAgentIds.has(c.salesAgentId)) ||
          (c.leadId ? visibleLeadIds.has(c.leadId) : false)
      );
    }
    return snapshot.customers;
  }, [snapshot.customers, isolatedAgentIds, visibleLeadIds]);

  const visibleFollowUps = useMemo(() => {
    if (isolatedAgentIds !== null) {
      return snapshot.followUps.filter(
        (f) =>
          (f.agentId && isolatedAgentIds.has(f.agentId)) || visibleLeadIds.has(f.leadId)
      );
    }
    return snapshot.followUps;
  }, [snapshot.followUps, isolatedAgentIds, visibleLeadIds]);

  const visibleSiteVisits = useMemo(() => {
    if (isolatedAgentIds !== null) {
      return snapshot.siteVisits.filter(
        (sv) =>
          (sv.agentId && isolatedAgentIds.has(sv.agentId)) || visibleLeadIds.has(sv.leadId)
      );
    }
    return snapshot.siteVisits;
  }, [snapshot.siteVisits, isolatedAgentIds, visibleLeadIds]);

  const visibleTasks = useMemo(() => {
    if (isolatedAgentIds !== null) {
      return snapshot.tasks.filter(
        (t) =>
          (t.assignedAgentId && isolatedAgentIds.has(t.assignedAgentId)) ||
          (t.relatedLeadId ? visibleLeadIds.has(t.relatedLeadId) : false)
      );
    }
    return snapshot.tasks;
  }, [snapshot.tasks, isolatedAgentIds, visibleLeadIds]);

  const visibleActivities = useMemo(() => {
    if (isolatedAgentIds !== null) {
      return snapshot.activities.filter((act) => visibleLeadIds.has(act.leadId));
    }
    return snapshot.activities;
  }, [snapshot.activities, isolatedAgentIds, visibleLeadIds]);

  const visibleAssignments = useMemo(() => {
    if (isolatedAgentIds !== null) {
      return snapshot.assignments.filter(
        (asn) =>
          (asn.newAgentId && isolatedAgentIds.has(asn.newAgentId)) ||
          (asn.previousAgentId && isolatedAgentIds.has(asn.previousAgentId)) ||
          visibleLeadIds.has(asn.leadId)
      );
    }
    return snapshot.assignments;
  }, [snapshot.assignments, isolatedAgentIds, visibleLeadIds]);

  const visibleNotifications = useMemo(() => {
    if (isolatedAgentIds !== null) {
      return snapshot.notifications.filter(
        (n) =>
          (n.targetAgentId && isolatedAgentIds.has(n.targetAgentId)) ||
          (n.relatedLeadId ? visibleLeadIds.has(n.relatedLeadId) : false)
      );
    }
    return snapshot.notifications;
  }, [snapshot.notifications, isolatedAgentIds, visibleLeadIds]);

  const uniqueAgents = useMemo(() => {
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();
    return snapshot.agents.filter((a) => {
      if (!a || !a.id) return false;
      const idKey = String(a.id).trim();
      const emailKey = String(a.email || '').toLowerCase().trim();
      if (seenIds.has(idKey) || (emailKey && seenEmails.has(emailKey))) return false;
      seenIds.add(idKey);
      if (emailKey) seenEmails.add(emailKey);
      return true;
    });
  }, [snapshot.agents]);

  const agentMetrics = useMemo(() => {
    const allMetrics = AgentRepository.computeAgentMetrics(
      uniqueAgents,
      snapshot.leads,
      snapshot.followUps,
      snapshot.siteVisits
    );
    if (isolatedAgentIds !== null) {
      return allMetrics.filter((m) => isolatedAgentIds.has(m.id));
    }
    return allMetrics;
  }, [uniqueAgents, snapshot.leads, snapshot.followUps, snapshot.siteVisits, isolatedAgentIds]);

  const dashboardKPIs = useMemo(
    () =>
      ReportRepository.computeDashboardKPIs(
        visibleLeads,
        visibleFollowUps,
        visibleSiteVisits
      ),
    [visibleLeads, visibleFollowUps, visibleSiteVisits]
  );

  const getFormattedTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const addLead = (leadInput: Omit<Lead, 'id'>): Lead => {
    const nextNum =
      snapshot.leads.reduce((max, l) => {
        const num = parseInt(l.id.replace('LD-', ''), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 1000) + 1;
    const newId = `LD-${nextNum}`;
    const effectiveAgentId =
      leadInput.assignedAgentId ||
      (currentRole !== 'Super Admin' ? activeSalesAgentId : null);
    const newLead: Lead = {
      ...leadInput,
      id: newId,
      assignedAgentId: effectiveAgentId,
    };

    const actor = getCurrentActorName();
    const timeStr = getFormattedTime();

    const createActivity: ActivityLog = {
      id: `ACT-${Date.now()}-1`,
      leadId: newId,
      leadName: newLead.customerName,
      date: newLead.createdAt || SYSTEM_TODAY,
      time: timeStr,
      actorName: actor,
      activityType: 'Lead Created',
      description: `Lead created for ${newLead.interestedProperty} (${newLead.propertySize}) via ${newLead.source}.`,
    };

    const newActivities = [createActivity];
    const newAssignments: AssignmentRecord[] = [];
    const newNotifications: NotificationItem[] = [];

    if (newLead.assignedAgentId) {
      const targetAgent = snapshot.agents.find((a) => a.id === newLead.assignedAgentId);
      const agentName = targetAgent ? targetAgent.name : 'Assigned Agent';
      newAssignments.push({
        id: `ASN-${Date.now()}`,
        leadId: newId,
        leadName: newLead.customerName,
        previousAgentId: null,
        previousAgentName: 'Unassigned',
        newAgentId: newLead.assignedAgentId,
        newAgentName: agentName,
        assignedByName: actor,
        assignedByRole: currentRole,
        assignedAt: `${SYSTEM_TODAY} ${timeStr}`,
        notes: 'Initial assignment during lead creation.',
      });
      newActivities.push({
        id: `ACT-${Date.now()}-2`,
        leadId: newId,
        leadName: newLead.customerName,
        date: SYSTEM_TODAY,
        time: timeStr,
        actorName: actor,
        activityType: 'Lead Assigned',
        description: `Lead assigned to ${agentName}.`,
      });
      newNotifications.push({
        id: `NTF-${Date.now()}`,
        type: 'New lead assigned',
        title: `New Lead Assigned: ${newLead.customerName}`,
        message: `${newLead.customerName} (${newLead.interestedProperty}) assigned to ${agentName}.`,
        timestamp: 'Just now',
        isRead: false,
        targetSection: 'leads',
        relatedLeadId: newId,
        targetAgentId: newLead.assignedAgentId,
      });
    }

    setSnapshot((prev) => ({
      ...prev,
      leads: [newLead, ...prev.leads],
      activities: [...newActivities, ...prev.activities],
      assignments: [...newAssignments, ...prev.assignments],
      notifications: [...newNotifications, ...prev.notifications],
    }));

    addToast(
      'New Lead Added',
      `${newLead.customerName} (${newId}) has been saved to the CRM.`,
      'success'
    );
    return newLead;
  };

  const updateLead = (id: string, updates: Partial<Lead>, activityNote?: string) => {
    const existing = snapshot.leads.find((l) => l.id === id);
    if (!existing) return;

    const actor = getCurrentActorName();
    const timeStr = getFormattedTime();
    const extraActivities: ActivityLog[] = [];

    if (updates.status && updates.status !== existing.status) {
      const actType: ActivityType =
        updates.status === 'Converted'
          ? 'Lead Converted'
          : updates.status === 'Lost'
          ? 'Lead Marked as Lost'
          : 'Status Changed';
      extraActivities.push({
        id: `ACT-${Date.now()}-st`,
        leadId: id,
        leadName: existing.customerName,
        date: SYSTEM_TODAY,
        time: timeStr,
        actorName: actor,
        activityType: actType,
        description: `Lead status updated from "${existing.status}" to "${updates.status}".`,
      });
    }

    if (activityNote) {
      extraActivities.push({
        id: `ACT-${Date.now()}-nt`,
        leadId: id,
        leadName: existing.customerName,
        date: SYSTEM_TODAY,
        time: timeStr,
        actorName: actor,
        activityType: 'Notes Added',
        description: activityNote,
      });
    }

    setSnapshot((prev) => ({
      ...prev,
      leads: prev.leads.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      activities: [...extraActivities, ...prev.activities],
    }));

    addToast('Lead Updated', `${existing.customerName} details have been updated.`, 'success');
  };

  const deleteLead = (id: string) => {
    const existing = snapshot.leads.find((l) => l.id === id);
    if (!existing) return;
    setSnapshot((prev) => ({
      ...prev,
      leads: prev.leads.filter((l) => l.id !== id),
    }));
    if (selectedLeadId === id) {
      setSelectedLeadId(null);
    }
    addToast('Lead Deleted', `${existing.customerName} (${id}) was removed.`, 'warning');
  };

  const changeLeadStatus = (leadId: string, newStatus: LeadStatus, note?: string) => {
    const existing = snapshot.leads.find((l) => l.id === leadId);
    if (!existing || existing.status === newStatus) return;

    const actor = getCurrentActorName();
    const timeStr = getFormattedTime();
    const actType: ActivityType =
      newStatus === 'Converted'
        ? 'Lead Converted'
        : newStatus === 'Lost'
        ? 'Lead Marked as Lost'
        : 'Status Changed';

    const newActivity: ActivityLog = {
      id: `ACT-${Date.now()}`,
      leadId,
      leadName: existing.customerName,
      date: SYSTEM_TODAY,
      time: timeStr,
      actorName: actor,
      activityType: actType,
      description: `Status changed from ${existing.status} to ${newStatus}.${note ? ` Note: ${note}` : ''}`,
    };

    const newNotif: NotificationItem = {
      id: `NTF-${Date.now()}`,
      type: 'Lead status updated',
      title: `Status Updated: ${existing.customerName}`,
      message: `${existing.customerName} moved to ${newStatus} by ${actor}.`,
      timestamp: 'Just now',
      isRead: false,
      targetSection: 'leads',
      relatedLeadId: leadId,
    };

    setSnapshot((prev) => ({
      ...prev,
      leads: prev.leads.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)),
      activities: [newActivity, ...prev.activities],
      notifications: [newNotif, ...prev.notifications],
    }));

    addToast(
      `Status Updated to ${newStatus}`,
      `${existing.customerName} is now marked as ${newStatus}.`,
      newStatus === 'Converted' ? 'success' : 'default'
    );
  };

  const assignLead = (leadId: string, targetAgentId: string, notes = '') => {
    const lead = snapshot.leads.find((l) => l.id === leadId);
    const targetAgent = snapshot.agents.find((a) => a.id === targetAgentId);
    if (!lead || !targetAgent) return;

    const prevAgent = lead.assignedAgentId
      ? snapshot.agents.find((a) => a.id === lead.assignedAgentId)
      : null;

    const isReassignment = Boolean(lead.assignedAgentId && lead.assignedAgentId !== targetAgentId);
    const actor = getCurrentActorName();
    const timeStr = getFormattedTime();

    const assignmentRec: AssignmentRecord = {
      id: `ASN-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      leadId: lead.id,
      leadName: lead.customerName,
      previousAgentId: lead.assignedAgentId,
      previousAgentName: prevAgent ? prevAgent.name : 'Unassigned',
      newAgentId: targetAgent.id,
      newAgentName: targetAgent.name,
      assignedByName: actor,
      assignedByRole: currentRole,
      assignedAt: `${SYSTEM_TODAY} ${timeStr}`,
      notes:
        notes ||
        (isReassignment
          ? `Reassigned from ${prevAgent?.name || 'Unassigned'} to ${targetAgent.name}.`
          : `Assigned to ${targetAgent.name}.`),
    };

    const activityRec: ActivityLog = {
      id: `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      leadId: lead.id,
      leadName: lead.customerName,
      date: SYSTEM_TODAY,
      time: timeStr,
      actorName: actor,
      activityType: isReassignment ? 'Agent Changed' : 'Lead Assigned',
      description: isReassignment
        ? `Agent changed from ${prevAgent?.name || 'Unassigned'} to ${targetAgent.name}.${notes ? ` (${notes})` : ''}`
        : `Lead assigned to ${targetAgent.name}.${notes ? ` (${notes})` : ''}`,
    };

    const notifRec: NotificationItem = {
      id: `NTF-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      type: 'New lead assigned',
      title: isReassignment ? `Lead Reassigned to ${targetAgent.name}` : `Lead Assigned to ${targetAgent.name}`,
      message: `${lead.customerName} (${lead.interestedProperty}) is now assigned to ${targetAgent.name}.`,
      timestamp: 'Just now',
      isRead: false,
      targetSection: 'assignments',
      relatedLeadId: lead.id,
      targetAgentId: targetAgent.id,
    };

    setSnapshot((prev) => ({
      ...prev,
      leads: prev.leads.map((l) =>
        l.id === leadId ? { ...l, assignedAgentId: targetAgentId } : l
      ),
      assignments: [assignmentRec, ...prev.assignments],
      activities: [activityRec, ...prev.activities],
      notifications: [notifRec, ...prev.notifications],
    }));

    addToast(
      isReassignment ? 'Lead Reassigned' : 'Lead Assigned',
      `${lead.customerName} assigned to ${targetAgent.name}.`,
      'success'
    );
  };

  const bulkAssignLeads = (leadIds: string[], targetAgentId: string, notes = '') => {
    const targetAgent = snapshot.agents.find((a) => a.id === targetAgentId);
    if (!targetAgent || leadIds.length === 0) return;

    const actor = getCurrentActorName();
    const timeStr = getFormattedTime();
    const newAssignments: AssignmentRecord[] = [];
    const newActivities: ActivityLog[] = [];

    leadIds.forEach((id, idx) => {
      const lead = snapshot.leads.find((l) => l.id === id);
      if (!lead) return;
      const prevAgent = lead.assignedAgentId
        ? snapshot.agents.find((a) => a.id === lead.assignedAgentId)
        : null;
      const isReassign = Boolean(lead.assignedAgentId && lead.assignedAgentId !== targetAgentId);

      newAssignments.push({
        id: `ASN-${Date.now()}-${idx}`,
        leadId: lead.id,
        leadName: lead.customerName,
        previousAgentId: lead.assignedAgentId,
        previousAgentName: prevAgent ? prevAgent.name : 'Unassigned',
        newAgentId: targetAgent.id,
        newAgentName: targetAgent.name,
        assignedByName: actor,
        assignedByRole: currentRole,
        assignedAt: `${SYSTEM_TODAY} ${timeStr}`,
        notes: notes || `Bulk assignment (${leadIds.length} leads) to ${targetAgent.name}.`,
      });

      newActivities.push({
        id: `ACT-${Date.now()}-${idx}`,
        leadId: lead.id,
        leadName: lead.customerName,
        date: SYSTEM_TODAY,
        time: timeStr,
        actorName: actor,
        activityType: isReassign ? 'Agent Changed' : 'Lead Assigned',
        description: isReassign
          ? `Bulk reassigned from ${prevAgent?.name || 'Unassigned'} to ${targetAgent.name}.`
          : `Bulk assigned to ${targetAgent.name}.`,
      });
    });

    const bulkNotif: NotificationItem = {
      id: `NTF-${Date.now()}`,
      type: 'New lead assigned',
      title: `Bulk Assignment: ${leadIds.length} Leads`,
      message: `${leadIds.length} leads assigned to ${targetAgent.name} by ${actor}.`,
      timestamp: 'Just now',
      isRead: false,
      targetSection: 'assignments',
      targetAgentId: targetAgent.id,
    };

    setSnapshot((prev) => ({
      ...prev,
      leads: prev.leads.map((l) =>
        leadIds.includes(l.id) ? { ...l, assignedAgentId: targetAgentId } : l
      ),
      assignments: [...newAssignments, ...prev.assignments],
      activities: [...newActivities, ...prev.activities],
      notifications: [bulkNotif, ...prev.notifications],
    }));

    addToast(
      `Assigned ${leadIds.length} Leads`,
      `${leadIds.length} leads have been assigned to ${targetAgent.name}.`,
      'success'
    );
  };

  const autoAssignUnassignedLeads = (): number => {
    const unassigned = snapshot.leads.filter((l) => !l.assignedAgentId);
    const activeAgents = snapshot.agents.filter((a) => a.accountStatus === 'Active');
    if (unassigned.length === 0 || activeAgents.length === 0) {
      addToast('No Unassigned Leads', 'All current leads already have an assigned agent.', 'default');
      return 0;
    }

    // Compute current active workload for each active agent and balance dynamically
    const workloadMap = new Map<string, number>();
    activeAgents.forEach((ag) => {
      const count = snapshot.leads.filter(
        (l) => l.assignedAgentId === ag.id && l.status !== 'Converted' && l.status !== 'Lost'
      ).length;
      workloadMap.set(ag.id, count);
    });

    const actor = getCurrentActorName();
    const timeStr = getFormattedTime();
    const newAssignments: AssignmentRecord[] = [];
    const newActivities: ActivityLog[] = [];
    const leadAgentAssignment = new Map<string, string>();

    unassigned.forEach((lead, idx) => {
      // Pick active agent with lowest current workload
      let chosenAgent = activeAgents[0];
      let minLoad = workloadMap.get(chosenAgent.id) ?? 999;

      for (const ag of activeAgents) {
        const load = workloadMap.get(ag.id) ?? 0;
        if (load < minLoad) {
          minLoad = load;
          chosenAgent = ag;
        }
      }

      workloadMap.set(chosenAgent.id, minLoad + 1);
      leadAgentAssignment.set(lead.id, chosenAgent.id);

      newAssignments.push({
        id: `ASN-AUTO-${Date.now()}-${idx}`,
        leadId: lead.id,
        leadName: lead.customerName,
        previousAgentId: null,
        previousAgentName: 'Unassigned',
        newAgentId: chosenAgent.id,
        newAgentName: chosenAgent.name,
        assignedByName: actor,
        assignedByRole: currentRole,
        assignedAt: `${SYSTEM_TODAY} ${timeStr}`,
        notes: 'Smart Workload-Balanced Auto-Assignment.',
      });

      newActivities.push({
        id: `ACT-AUTO-${Date.now()}-${idx}`,
        leadId: lead.id,
        leadName: lead.customerName,
        date: SYSTEM_TODAY,
        time: timeStr,
        actorName: actor,
        activityType: 'Lead Assigned',
        description: `Auto-assigned to ${chosenAgent.name} via Smart Workload Balancer.`,
      });
    });

    const autoNotif: NotificationItem = {
      id: `NTF-AUTO-${Date.now()}`,
      type: 'New lead assigned',
      title: `Auto-Assigned ${unassigned.length} Leads`,
      message: `${unassigned.length} unassigned leads distributed across active sales agents by workload.`,
      timestamp: 'Just now',
      isRead: false,
      targetSection: 'assignments',
    };

    setSnapshot((prev) => ({
      ...prev,
      leads: prev.leads.map((l) =>
        leadAgentAssignment.has(l.id)
          ? { ...l, assignedAgentId: leadAgentAssignment.get(l.id)! }
          : l
      ),
      assignments: [...newAssignments, ...prev.assignments],
      activities: [...newActivities, ...prev.activities],
      notifications: [autoNotif, ...prev.notifications],
    }));

    addToast(
      `Auto-Assigned ${unassigned.length} Leads`,
      'Unassigned leads were distributed across active agents based on current workload.',
      'success'
    );
    return unassigned.length;
  };

  const logActivity = (
    leadId: string,
    activityType: ActivityType,
    description: string,
    actorName?: string
  ) => {
    const lead = snapshot.leads.find((l) => l.id === leadId);
    if (!lead) return;

    const newAct: ActivityLog = {
      id: `ACT-${Date.now()}`,
      leadId,
      leadName: lead.customerName,
      date: SYSTEM_TODAY,
      time: getFormattedTime(),
      actorName: actorName || getCurrentActorName(),
      activityType,
      description,
    };

    setSnapshot((prev) => ({
      ...prev,
      leads: prev.leads.map((l) =>
        l.id === leadId ? { ...l, lastFollowUpDate: SYSTEM_TODAY } : l
      ),
      activities: [newAct, ...prev.activities],
    }));

    addToast('Activity Logged', `${activityType} recorded for ${lead.customerName}.`, 'success');
  };

  const scheduleFollowUp = (
    input: Omit<FollowUp, 'id' | 'createdAt' | 'status'>
  ) => {
    const newFollowUp: FollowUp = {
      ...input,
      id: `FUP-${Date.now()}`,
      status: 'Pending',
      createdAt: SYSTEM_TODAY,
    };

    const newAct: ActivityLog = {
      id: `ACT-${Date.now()}`,
      leadId: input.leadId,
      leadName: input.customerName,
      date: SYSTEM_TODAY,
      time: getFormattedTime(),
      actorName: getCurrentActorName(),
      activityType: 'Follow-up Added',
      description: `Scheduled ${input.type} follow-up for ${input.scheduledDate} at ${input.scheduledTime} with ${input.agentName}. Notes: ${input.discussionNotes}`,
    };

    setSnapshot((prev) => ({
      ...prev,
      followUps: [newFollowUp, ...prev.followUps],
      leads: prev.leads.map((l) =>
        l.id === input.leadId
          ? {
              ...l,
              nextFollowUpDate: input.scheduledDate,
              status: l.status === 'New' ? 'Contacted' : l.status,
            }
          : l
      ),
      activities: [newAct, ...prev.activities],
    }));

    addToast(
      'Follow-up Scheduled',
      `${input.type} with ${input.customerName} scheduled for ${input.scheduledDate}.`,
      'success'
    );
  };

  const completeFollowUp = (
    followUpId: string,
    outcomeNotes: string,
    nextFollowUpDate?: string | null,
    nextFollowUpType?: FollowUp['type']
  ) => {
    const existing = snapshot.followUps.find((f) => f.id === followUpId);
    if (!existing) return;

    const actor = getCurrentActorName();
    const timeStr = getFormattedTime();

    const actType: ActivityType =
      existing.type === 'Phone Call'
        ? 'Phone Call Made'
        : existing.type === 'WhatsApp'
        ? 'WhatsApp Conversation'
        : existing.type === 'Site Visit'
        ? 'Site Visit Completed'
        : 'Customer Contacted';

    const completionActivity: ActivityLog = {
      id: `ACT-${Date.now()}-1`,
      leadId: existing.leadId,
      leadName: existing.customerName,
      date: SYSTEM_TODAY,
      time: timeStr,
      actorName: actor,
      activityType: actType,
      description: `Completed ${existing.type} follow-up. Outcome: ${outcomeNotes}`,
    };

    const extraFollowUps: FollowUp[] = [];
    if (nextFollowUpDate) {
      extraFollowUps.push({
        id: `FUP-${Date.now()}-next`,
        leadId: existing.leadId,
        customerName: existing.customerName,
        CustomerPhone: existing.CustomerPhone,
        interestedProperty: existing.interestedProperty,
        agentId: existing.agentId,
        agentName: existing.agentName,
        scheduledDate: nextFollowUpDate,
        scheduledTime: '11:00 AM',
        type: nextFollowUpType || existing.type,
        discussionNotes: `Follow-up scheduled after completing ${SYSTEM_TODAY} interaction.`,
        nextFollowUpDate: null,
        status: 'Pending',
        createdAt: SYSTEM_TODAY,
      });
    }

    // Never delete old follow-up record — update its status to 'Completed' and append new follow-up if scheduled
    setSnapshot((prev) => ({
      ...prev,
      followUps: [
        ...extraFollowUps,
        ...prev.followUps.map((f) =>
          f.id === followUpId
            ? {
                ...f,
                status: 'Completed' as const,
                discussionNotes: `${f.discussionNotes} | Completed Note: ${outcomeNotes}`,
                nextFollowUpDate: nextFollowUpDate || f.nextFollowUpDate,
                completedAt: SYSTEM_TODAY,
              }
            : f
        ),
      ],
      leads: prev.leads.map((l) =>
        l.id === existing.leadId
          ? {
              ...l,
              lastFollowUpDate: SYSTEM_TODAY,
              nextFollowUpDate: nextFollowUpDate || l.nextFollowUpDate,
            }
          : l
      ),
      activities: [completionActivity, ...prev.activities],
    }));

    addToast(
      'Follow-up Completed',
      `Historical record preserved for ${existing.customerName}.`,
      'success'
    );
  };

  const rescheduleFollowUp = (
    followUpId: string,
    newDate: string,
    newTime: string,
    reasonNotes: string
  ) => {
    const existing = snapshot.followUps.find((f) => f.id === followUpId);
    if (!existing) return;

    // Preserve old follow-up as 'Rescheduled' and create a new pending follow-up record so history is never overwritten
    const newFollowUp: FollowUp = {
      ...existing,
      id: `FUP-${Date.now()}`,
      scheduledDate: newDate,
      scheduledTime: newTime,
      discussionNotes: `${reasonNotes} (Rescheduled from ${existing.scheduledDate})`,
      status: 'Pending',
      createdAt: SYSTEM_TODAY,
    };

    const act: ActivityLog = {
      id: `ACT-${Date.now()}`,
      leadId: existing.leadId,
      leadName: existing.customerName,
      date: SYSTEM_TODAY,
      time: getFormattedTime(),
      actorName: getCurrentActorName(),
      activityType: 'Follow-up Added',
      description: `Follow-up rescheduled from ${existing.scheduledDate} to ${newDate} at ${newTime}. Reason: ${reasonNotes}`,
    };

    setSnapshot((prev) => ({
      ...prev,
      followUps: [
        newFollowUp,
        ...prev.followUps.map((f) =>
          f.id === followUpId ? { ...f, status: 'Rescheduled' as const } : f
        ),
      ],
      leads: prev.leads.map((l) =>
        l.id === existing.leadId ? { ...l, nextFollowUpDate: newDate } : l
      ),
      activities: [act, ...prev.activities],
    }));

    addToast(
      'Follow-up Rescheduled',
      `Moved to ${newDate} at ${newTime}. Prior record retained in history.`,
      'default'
    );
  };

  const addAgent = (agentInput: Omit<Agent, 'id' | 'initials'>) => {
    const parts = agentInput.name.trim().split(' ');
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : agentInput.name.slice(0, 2).toUpperCase();

    const maxNum = snapshot.agents.reduce((max, a) => {
      const num = parseInt(String(a.id || '').replace('AGT-', ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 8);
    const nextNum = maxNum + 1;
    const nextAgentId = nextNum < 10 ? `AGT-0${nextNum}` : `AGT-${nextNum}`;

    const resolvedRole: UserRole =
      agentInput.systemRole && agentInput.systemRole !== 'Super Admin'
        ? agentInput.systemRole
        : 'Sales Agent';
    const resolvedPassword = agentInput.loginPassword?.trim() || '123456';

    const newAgent: Agent = {
      ...agentInput,
      id: nextAgentId,
      initials,
      systemRole: resolvedRole,
      loginPassword: resolvedPassword,
    };

    const cleanAgentEmail = (newAgent.email || '').toLowerCase().trim();
    if (cleanAgentEmail) {
      const currentUsers = CRMStorageRepository.loadUsers();
      const existsInUsers = currentUsers.some(
        (u) =>
          u.email.toLowerCase().trim() === cleanAgentEmail ||
          u.agentId === nextAgentId
      );
      if (!existsInUsers) {
        const newAccount: CRMUserAccount = {
          uid: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          email: cleanAgentEmail,
          name: newAgent.name,
          role: resolvedRole,
          agentId: nextAgentId,
          phone: newAgent.phone,
          specialization: newAgent.specialization,
          accountStatus: 'Active',
          loginPassword: resolvedPassword,
        };
        const updatedUsers = [...currentUsers, newAccount];
        CRMStorageRepository.saveUsers(updatedUsers);
        setUserAccounts(updatedUsers);
      }
    }

    setSnapshot((prev) => ({
      ...prev,
      agents: [newAgent, ...prev.agents],
    }));

    if (isSupabaseConfigured && newAgent.email) {
      syncUserAuthToSupabase({
        email: newAgent.email,
        password: resolvedPassword,
        name: newAgent.name,
        role: resolvedRole,
        agentId: nextAgentId,
        phone: newAgent.phone,
      });
    }

    addToast(
      'Sales Agent & Login Account Created',
      `${newAgent.name} (${nextAgentId}) can now log in with ${newAgent.email} and password "${resolvedPassword}" as ${resolvedRole}.`,
      'success'
    );
  };

  const updateAgent = (id: string, updates: Partial<Agent>) => {
    setSnapshot((prev) => ({
      ...prev,
      agents: prev.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
    const existingAg = snapshot.agents.find((a) => a.id === id);
    const targetEmail = (updates.email || existingAg?.email || '').toLowerCase().trim();
    const matchedAcct = userAccounts.find(
      (u) => u.agentId === id || u.email.toLowerCase().trim() === targetEmail
    );
    if (matchedAcct && authToken) {
      updateUserAccountRole(matchedAcct.uid, {
        role: updates.systemRole,
        password: updates.loginPassword,
        name: updates.name,
        email: updates.email,
        accountStatus: updates.accountStatus,
      });
    }
    addToast('Agent Profile & Login Updated', 'Changes saved successfully.', 'success');
  };

  const toggleAgentStatus = (id: string) => {
    const ag = snapshot.agents.find((a) => a.id === id);
    if (!ag) return;
    const nextStatus = ag.accountStatus === 'Active' ? 'Inactive' : 'Active';
    setSnapshot((prev) => ({
      ...prev,
      agents: prev.agents.map((a) =>
        a.id === id ? { ...a, accountStatus: nextStatus } : a
      ),
    }));
    addToast(
      `Agent ${nextStatus}`,
      `${ag.name} account status is now ${nextStatus}.`,
      nextStatus === 'Active' ? 'success' : 'warning'
    );
  };

  const addProject = (projectInput: Omit<Project, 'id'>) => {
    const newProj: Project = {
      ...projectInput,
      id: `PRJ-0${snapshot.projects.length + 1}`,
    };
    setSnapshot((prev) => ({
      ...prev,
      projects: [newProj, ...prev.projects],
    }));
    addToast('Project Created', `${newProj.name} added to inventory.`, 'success');
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setSnapshot((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
    addToast('Project Updated', 'Project inventory details updated.', 'success');
  };

  const scheduleSiteVisit = (visitInput: Omit<SiteVisit, 'id'>) => {
    const newVisit: SiteVisit = {
      ...visitInput,
      id: `SV-${Date.now().toString().slice(-4)}`,
    };

    const act: ActivityLog = {
      id: `ACT-${Date.now()}`,
      leadId: visitInput.leadId,
      leadName: visitInput.customerName,
      date: SYSTEM_TODAY,
      time: getFormattedTime(),
      actorName: getCurrentActorName(),
      activityType: 'Meeting Scheduled',
      description: `Site visit scheduled for ${visitInput.projectName} on ${visitInput.visitDate} at ${visitInput.visitTime} with ${visitInput.agentName}.`,
    };

    setSnapshot((prev) => ({
      ...prev,
      siteVisits: [newVisit, ...prev.siteVisits],
      leads: prev.leads.map((l) =>
        l.id === visitInput.leadId
          ? { ...l, status: 'Site Visit Scheduled', nextFollowUpDate: visitInput.visitDate }
          : l
      ),
      activities: [act, ...prev.activities],
    }));

    addToast(
      'Site Visit Scheduled',
      `Visit for ${visitInput.customerName} at ${visitInput.projectName} confirmed.`,
      'success'
    );
  };

  const updateSiteVisitStatus = (
    visitId: string,
    status: SiteVisit['status'],
    feedback?: string,
    newDate?: string,
    newTime?: string
  ) => {
    const existing = snapshot.siteVisits.find((sv) => sv.id === visitId);
    if (!existing) return;

    const act: ActivityLog = {
      id: `ACT-${Date.now()}`,
      leadId: existing.leadId,
      leadName: existing.customerName,
      date: SYSTEM_TODAY,
      time: getFormattedTime(),
      actorName: getCurrentActorName(),
      activityType: status === 'Completed' ? 'Site Visit Completed' : 'Notes Added',
      description: `Site visit (${existing.projectName}) marked as ${status}.${feedback ? ` Customer Feedback: ${feedback}` : ''}`,
    };

    setSnapshot((prev) => ({
      ...prev,
      siteVisits: prev.siteVisits.map((sv) =>
        sv.id === visitId
          ? {
              ...sv,
              status,
              customerFeedback: feedback !== undefined ? feedback : sv.customerFeedback,
              visitDate: newDate || sv.visitDate,
              visitTime: newTime || sv.visitTime,
            }
          : sv
      ),
      activities: [act, ...prev.activities],
    }));

    addToast(`Site Visit ${status}`, `${existing.customerName} visit updated.`, 'success');
  };

  const addTask = (taskInput: Omit<CRMTask, 'id' | 'createdAt' | 'status'>) => {
    const newTask: CRMTask = {
      ...taskInput,
      id: `TSK-${Date.now().toString().slice(-4)}`,
      status: 'Pending',
      createdAt: SYSTEM_TODAY,
    };

    const notif: NotificationItem = {
      id: `NTF-${Date.now()}`,
      type: 'New task assigned',
      title: `New Task: ${newTask.title}`,
      message: `Assigned to ${newTask.assignedAgentName} (Due: ${newTask.dueDate}).`,
      timestamp: 'Just now',
      isRead: false,
      targetSection: 'tasks',
      targetAgentId: newTask.assignedAgentId,
    };

    setSnapshot((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
      notifications: [notif, ...prev.notifications],
    }));

    addToast('Task Created', `Assigned to ${newTask.assignedAgentName}.`, 'success');
  };

  const toggleTaskStatus = (taskId: string) => {
    const t = snapshot.tasks.find((item) => item.id === taskId);
    if (!t) return;
    const nextStatus = t.status === 'Pending' ? 'Completed' : 'Pending';
    setSnapshot((prev) => ({
      ...prev,
      tasks: prev.tasks.map((item) =>
        item.id === taskId ? { ...item, status: nextStatus } : item
      ),
    }));
    addToast(
      `Task ${nextStatus}`,
      `"${t.title}" marked as ${nextStatus}.`,
      nextStatus === 'Completed' ? 'success' : 'default'
    );
  };

  const deleteTask = (taskId: string) => {
    setSnapshot((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));
    addToast('Task Removed', 'Task has been deleted.', 'default');
  };

  const markNotificationRead = (id: string) => {
    setSnapshot((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    }));
  };

  const markAllNotificationsRead = () => {
    setSnapshot((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
    }));
    addToast('Notifications Cleared', 'All notifications marked as read.', 'default');
  };

  const updateSettings = (updates: Partial<CRMSettings>) => {
    setSnapshot((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
    }));
    addToast('Settings Saved', 'CRM configuration has been updated.', 'success');
  };

  const createCustomerBooking = (
    bookingInput: Omit<CustomerBooking, 'id' | 'paidAmount' | 'remainingAmount' | 'receipts'>,
    initialPayment?: {
      amount: number;
      stage: PaymentReceipt['paymentStage'];
      method: PaymentReceipt['paymentMethod'];
      referenceNo: string;
      notes: string;
    }
  ): CustomerBooking => {
    const nextNum =
      snapshot.customers.reduce((max, c) => {
        const num = parseInt(c.id.replace('CUS-', ''), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 2000) + 1;
    const newId = `CUS-${nextNum}`;

    const actor = getCurrentActorName();
    const timeStr = getFormattedTime();

    const receipts: PaymentReceipt[] = [];
    const paidAmount = initialPayment && initialPayment.amount > 0 ? initialPayment.amount : 0;

    if (initialPayment && initialPayment.amount > 0) {
      receipts.push({
        id: `RCP-${Date.now()}`,
        receiptNumber: `CR-2026-${Math.floor(900 + Math.random() * 99)}`,
        date: bookingInput.bookingDate || SYSTEM_TODAY,
        amount: initialPayment.amount,
        paymentStage: initialPayment.stage,
        paymentMethod: initialPayment.method,
        referenceNo: initialPayment.referenceNo || 'VCH-DIRECT',
        receivedBy: actor,
        notes: initialPayment.notes || `${initialPayment.stage} received at booking.`,
      });
    }

    const remainingAmount = Math.max(0, bookingInput.totalDealAmount - paidAmount);

    const newCustomer: CustomerBooking = {
      ...bookingInput,
      id: newId,
      paidAmount,
      remainingAmount,
      receipts,
    };

    const extraActivities: ActivityLog[] = [];
    const extraNotifications: NotificationItem[] = [
      {
        id: `NTF-CUS-${Date.now()}`,
        type: 'Lead status updated',
        title: `New Property Booking: ${newCustomer.customerName}`,
        message: `${newCustomer.unitNumber} (${newCustomer.projectName}) booked for ${formatPKR(newCustomer.totalDealAmount)}.`,
        timestamp: 'Just now',
        isRead: false,
        targetSection: 'customers',
        relatedLeadId: newCustomer.leadId || undefined,
      },
    ];

    if (newCustomer.leadId) {
      extraActivities.push({
        id: `ACT-CUS-${Date.now()}`,
        leadId: newCustomer.leadId,
        leadName: newCustomer.customerName,
        date: SYSTEM_TODAY,
        time: timeStr,
        actorName: actor,
        activityType: 'Lead Converted',
        description: `Lead converted to Confirmed Customer (${newCustomer.id}). Booked ${newCustomer.unitNumber} (${newCustomer.propertySize}) in ${newCustomer.projectName} for ${formatPKR(newCustomer.totalDealAmount)}. Received: ${formatPKR(paidAmount)}.`,
      });
    }

    setSnapshot((prev) => ({
      ...prev,
      customers: [newCustomer, ...prev.customers],
      leads: newCustomer.leadId
        ? prev.leads.map((l) =>
            l.id === newCustomer.leadId
              ? {
                  ...l,
                  status: 'Converted',
                  propertyImageUrl: newCustomer.propertyImageUrl || l.propertyImageUrl,
                }
              : l
          )
        : prev.leads,
      projects: prev.projects.map((p) =>
        p.id === newCustomer.projectId && p.availableUnits > 0
          ? {
              ...p,
              availableUnits: p.availableUnits - 1,
              status: p.availableUnits - 1 === 0 ? 'Sold Out' : p.status,
            }
          : p
      ),
      activities: [...extraActivities, ...prev.activities],
      notifications: [...extraNotifications, ...prev.notifications],
    }));

    addToast(
      'Customer & Property Booking Confirmed',
      `${newCustomer.customerName} (${newId}) registered for ${newCustomer.unitNumber}.`,
      'success'
    );
    return newCustomer;
  };

  const recordCustomerPayment = (
    customerId: string,
    receiptInput: Omit<PaymentReceipt, 'id' | 'receiptNumber' | 'receivedBy'>
  ) => {
    const existing = snapshot.customers.find((c) => c.id === customerId);
    if (!existing) return;

    const actor = getCurrentActorName();
    const timeStr = getFormattedTime();

    const newReceipt: PaymentReceipt = {
      ...receiptInput,
      id: `RCP-${Date.now()}`,
      receiptNumber: `CR-2026-${Math.floor(900 + Math.random() * 99)}`,
      receivedBy: actor,
    };

    const updatedPaid = existing.paidAmount + receiptInput.amount;
    const updatedRemaining = Math.max(0, existing.totalDealAmount - updatedPaid);
    const updatedStage =
      updatedRemaining === 0
        ? ('Registry / Completed' as const)
        : receiptInput.paymentStage === 'Down Payment' && existing.dealStage === 'Token / Biyana'
        ? ('Booking Confirmed' as const)
        : receiptInput.paymentStage === 'Installment'
        ? ('Installments Ongoing' as const)
        : existing.dealStage;

    const extraActivities: ActivityLog[] = [];
    if (existing.leadId) {
      extraActivities.push({
        id: `ACT-PMT-${Date.now()}`,
        leadId: existing.leadId,
        leadName: existing.customerName,
        date: SYSTEM_TODAY,
        time: timeStr,
        actorName: actor,
        activityType: 'Notes Added',
        description: `Payment Receipt ${newReceipt.receiptNumber}: Received ${formatPKR(receiptInput.amount)} (${receiptInput.paymentStage}) via ${receiptInput.paymentMethod}. Remaining Balance: ${formatPKR(updatedRemaining)}.`,
      });
    }

    setSnapshot((prev) => ({
      ...prev,
      customers: prev.customers.map((c) =>
        c.id === customerId
          ? {
              ...c,
              paidAmount: updatedPaid,
              remainingAmount: updatedRemaining,
              dealStage: updatedStage,
              receipts: [newReceipt, ...c.receipts],
            }
          : c
      ),
      activities: [...extraActivities, ...prev.activities],
    }));

    addToast(
      'Payment Receipt Recorded',
      `${formatPKR(receiptInput.amount)} received from ${existing.customerName} (${newReceipt.receiptNumber}).`,
      'success'
    );
  };

  const updateCustomerBooking = (
    customerId: string,
    updates: Partial<CustomerBooking>
  ) => {
    setSnapshot((prev) => ({
      ...prev,
      customers: prev.customers.map((c) =>
        c.id === customerId ? { ...c, ...updates } : c
      ),
    }));
    addToast('Customer File Updated', 'Customer & booking record saved.', 'success');
  };

  const resetDemoData = () => {
    const fresh = CRMStorageRepository.resetToDefault();
    setSnapshot(fresh);
    setSelectedLeadId(null);
    setConvertingLeadToCustomer(null);
    addToast(
      'Demo Data Reset',
      'All CRM records have been restored to the original realistic dataset.',
      'success'
    );
  };

  return (
    <CRMContext.Provider
      value={{
        authenticatedUser,
        userAccounts,
        loginWithCredentials,
        signupNewAccount,
        loginWithGoogle,
        logoutUser,
        updateUserAccountRole,
        switchIdentityForPreview,
        activeSection,
        setActiveSection,
        currentRole,
        setCurrentRole,
        activeSalesAgentId,
        setActiveSalesAgentId,
        allowedSections,
        canAssignLeads,
        getUserAllowedSections,
        updateUserAllowedSections,
        selectedLeadId,
        setSelectedLeadId,
        isAddLeadModalOpen,
        setIsAddLeadModalOpen,
        editingLead,
        setEditingLead,
        convertingLeadToCustomer,
        setConvertingLeadToCustomer,
        leads: snapshot.leads,
        visibleLeads,
        customers: snapshot.customers,
        visibleCustomers,
        agents: uniqueAgents,
        agentMetrics,
        followUps: snapshot.followUps,
        visibleFollowUps,
        activities: visibleActivities,
        assignments: visibleAssignments,
        projects: snapshot.projects,
        siteVisits: snapshot.siteVisits,
        visibleSiteVisits,
        tasks: snapshot.tasks,
        visibleTasks,
        notifications: visibleNotifications,
        settings: snapshot.settings,
        dashboardKPIs,
        toasts,
        addToast,
        dismissToast,
        addLead,
        updateLead,
        deleteLead,
        changeLeadStatus,
        createCustomerBooking,
        recordCustomerPayment,
        updateCustomerBooking,
        assignLead,
        bulkAssignLeads,
        autoAssignUnassignedLeads,
        logActivity,
        scheduleFollowUp,
        completeFollowUp,
        rescheduleFollowUp,
        addAgent,
        updateAgent,
        toggleAgentStatus,
        addProject,
        updateProject,
        scheduleSiteVisit,
        updateSiteVisitStatus,
        addTask,
        toggleTaskStatus,
        deleteTask,
        markNotificationRead,
        markAllNotificationsRead,
        updateSettings,
        resetDemoData,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error('useCRM must be used within a CRMProvider');
  return ctx;
};
