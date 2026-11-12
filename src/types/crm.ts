export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Interested'
  | 'Qualified'
  | 'Site Visit Scheduled'
  | 'Negotiation'
  | 'Converted'
  | 'Lost'
  | 'On Hold';

export type LeadPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type LeadSourceType =
  | 'Property Portals'
  | 'Lead Reference'
  | 'Facebook Ads'
  | 'Instagram'
  | 'WhatsApp'
  | 'Website'
  | 'Google Ads'
  | 'Phone Calls'
  | 'Direct Office Inquiry'
  | 'Other';

export type PropertyType =
  | 'Residential Plots'
  | 'Commercial Plots'
  | 'Houses'
  | 'Apartments'
  | 'Shops'
  | 'Files';

export type PurchasePurpose = 'Investment' | 'Personal Residence' | 'Commercial Rental' | 'Development';

export type FollowUpType =
  | 'Phone Call'
  | 'WhatsApp'
  | 'Office Meeting'
  | 'Site Visit'
  | 'Video Meeting'
  | 'Other';

export type FollowUpStatus = 'Pending' | 'Completed' | 'Rescheduled';

export type ActivityType =
  | 'Lead Created'
  | 'Lead Assigned'
  | 'Agent Changed'
  | 'Customer Contacted'
  | 'Phone Call Made'
  | 'WhatsApp Conversation'
  | 'Meeting Scheduled'
  | 'Site Visit Completed'
  | 'Follow-up Added'
  | 'Status Changed'
  | 'Notes Added'
  | 'Lead Converted'
  | 'Lead Marked as Lost';

export type UserRole = 'Super Admin' | 'Admin' | 'Sales Manager' | 'Sales Agent';

export type NavSection =
  | 'dashboard'
  | 'leads'
  | 'customers'
  | 'assignments'
  | 'roles'
  | 'followups'
  | 'agents'
  | 'projects'
  | 'sitevisits'
  | 'tasks'
  | 'sources'
  | 'reports'
  | 'notifications'
  | 'settings';

export interface CRMUserAccount {
  id?: number;
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  agentId: string;
  phone: string;
  specialization: string;
  accountStatus: string;
  loginPassword?: string;
}

export type BookingDealStage =
  | 'Token / Biyana'
  | 'Booking Confirmed'
  | 'Installments Ongoing'
  | 'Possession Ready'
  | 'Registry / Completed';

export type PaymentPlanType = 'Full Cash Payment' | 'Installment Plan' | 'Token Hold';

export type PaymentMethodType = 'Bank Transfer' | 'Pay Order / DD' | 'Cheque' | 'Cash';

export interface PaymentReceipt {
  id: string;
  receiptNumber: string;
  date: string;
  amount: number;
  paymentStage:
    | 'Token / Biyana'
    | 'Down Payment'
    | 'Installment'
    | 'Possession / Transfer'
    | 'Final Settlement';
  paymentMethod: PaymentMethodType;
  referenceNo: string;
  receivedBy: string;
  notes: string;
}

export interface CustomerBooking {
  id: string;
  leadId: string | null;
  customerName: string;
  fatherOrSpouseName: string;
  cnic: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  nomineeName: string;
  nomineeRelation: string;
  nomineeCnic: string;
  projectId: string;
  projectName: string;
  propertyType: PropertyType;
  unitNumber: string;
  propertySize: string;
  propertyImageUrl: string;
  salesAgentId: string;
  salesAgentName: string;
  bookingDate: string;
  dealStage: BookingDealStage;
  paymentPlanType: PaymentPlanType;
  totalDealAmount: number;
  tokenAmount: number;
  downPaymentAmount: number;
  paidAmount: number;
  remainingAmount: number;
  totalInstallments: number;
  installmentFrequency: 'Monthly' | 'Quarterly' | 'Lump Sum';
  nextDueDate: string | null;
  nextInstallmentAmount: number;
  receipts: PaymentReceipt[];
  notes: string;
}

export interface Lead {
  id: string;
  customerName: string;
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  area: string;
  interestedProjectId: string;
  interestedProperty: string;
  propertyType: PropertyType;
  propertySize: string; // e.g., "10 Marla", "1 Kanal", "2,200 Sq. Ft."
  minBudget: number; // in PKR
  maxBudget: number; // in PKR
  purchasePurpose: PurchasePurpose;
  source: LeadSourceType;
  status: LeadStatus;
  priority: LeadPriority;
  assignedAgentId: string | null;
  lastFollowUpDate: string | null; // YYYY-MM-DD
  nextFollowUpDate: string | null; // YYYY-MM-DD
  notes: string;
  createdAt: string; // YYYY-MM-DD
  propertyImageUrl?: string;
  leadReference?: string;
}

export interface AssignmentRecord {
  id: string;
  leadId: string;
  leadName: string;
  previousAgentId: string | null;
  previousAgentName: string;
  newAgentId: string;
  newAgentName: string;
  assignedByName: string;
  assignedByRole: UserRole;
  assignedAt: string; // ISO or YYYY-MM-DD HH:mm
  notes: string;
}

export interface ActivityLog {
  id: string;
  leadId: string;
  leadName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm AM/PM
  actorName: string;
  activityType: ActivityType;
  description: string;
}

export interface FollowUp {
  id: string;
  leadId: string;
  customerName: string;
  CustomerPhone: string;
  interestedProperty: string;
  agentId: string;
  agentName: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  type: FollowUpType;
  discussionNotes: string;
  nextFollowUpDate: string | null;
  status: FollowUpStatus;
  createdAt: string;
  completedAt?: string;
}

export interface Agent {
  id: string;
  name: string;
  roleTitle: string;
  avatarUrl: string;
  initials: string;
  phone: string;
  email: string;
  joiningDate: string;
  accountStatus: 'Active' | 'Inactive';
  specialization: string;
  systemRole?: UserRole;
  loginPassword?: string;
}

export interface AgentMetrics extends Agent {
  assignedLeads: number;
  activeLeads: number;
  pendingLeads: number;
  followUpsCompleted: number;
  siteVisitsCount: number;
  convertedLeads: number;
  lostLeads: number;
  conversionRate: number;
  workloadPercentage: number;
}

export interface Project {
  id: string;
  name: string;
  developerName: string;
  location: string;
  city: string;
  propertyType: PropertyType;
  availableUnits: number;
  totalUnits: number;
  minPrice: number; // PKR
  maxPrice: number; // PKR
  priceRangeLabel: string;
  description: string;
  imageUrl: string;
  galleryImages?: string[];
  status: 'Active' | 'Pre-Launch' | 'Completed' | 'Sold Out';
}

export interface SiteVisit {
  id: string;
  leadId: string;
  customerName: string;
  customerPhone: string;
  projectId: string;
  projectName: string;
  propertyType: PropertyType;
  agentId: string;
  agentName: string;
  visitDate: string; // YYYY-MM-DD
  visitTime: string; // HH:mm
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled';
  notes: string;
  customerFeedback: string;
}

export interface CRMTask {
  id: string;
  title: string;
  description: string;
  assignedAgentId: string;
  assignedAgentName: string;
  relatedLeadId?: string;
  relatedLeadName?: string;
  dueDate: string; // YYYY-MM-DD
  priority: LeadPriority;
  status: 'Pending' | 'Completed';
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type:
    | 'New lead assigned'
    | 'Follow-up due'
    | 'Overdue follow-up'
    | 'New task assigned'
    | 'Site visit reminder'
    | 'Lead status updated';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  targetSection: NavSection;
  relatedLeadId?: string;
  targetAgentId?: string;
}

export interface CRMSettings {
  companyName: string;
  companyTagline: string;
  registrationNumber: string;
  primaryPhone: string;
  supportEmail: string;
  headOfficeAddress: string;
  city: string;
  website: string;
  currencySymbol: string;
  areaUnits: string[];
  logoText: string;
  currentUserProfile: {
    name: string;
    email: string;
    phone: string;
    title: string;
  };
  customLeadStatuses: { name: LeadStatus; active: boolean; defaultSlaHours: number }[];
  customLeadSources: { name: LeadSourceType; active: boolean; monthlyBudgetPKR: number }[];
  notificationPreferences: {
    emailAlertsOnNewLead: boolean;
    whatsappAlertsOnAssignment: boolean;
    overdueFollowUpEscalation: boolean;
    dailyDigestReport: boolean;
    siteVisitSmsReminder: boolean;
  };
  generalSettings: {
    autoAssignMode: 'Workload Balanced' | 'Round Robin' | 'Manual Only';
    overdueThresholdHours: number;
    defaultFollowUpDays: number;
    fiscalYearStart: string;
  };
  userPermissions?: Record<string, NavSection[]>;
}

export const DEFAULT_ROLE_SECTIONS: Record<UserRole, NavSection[]> = {
  'Super Admin': [
    'dashboard',
    'leads',
    'followups',
    'sitevisits',
    'projects',
    'roles',
    'agents',
    'assignments',
    'tasks',
    'sources',
    'reports',
    'notifications',
    'settings',
  ],
  Admin: [
    'dashboard',
    'leads',
    'followups',
    'sitevisits',
    'projects',
    'agents',
    'assignments',
    'tasks',
    'reports',
    'notifications',
  ],
  'Sales Manager': [
    'dashboard',
    'leads',
    'followups',
    'sitevisits',
    'projects',
    'reports',
    'notifications',
  ],
  'Sales Agent': [
    'dashboard',
    'leads',
    'followups',
    'sitevisits',
  ],
};

export const ALL_GRANTABLE_MODULES: { id: NavSection; label: string }[] = [
  { id: 'leads', label: 'Leads' },
  { id: 'followups', label: 'Follow-ups' },
  { id: 'sitevisits', label: 'Site Visits' },
  { id: 'assignments', label: 'Assign Leads' },
  { id: 'projects', label: 'Projects' },
  { id: 'agents', label: 'Sales Team' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'sources', label: 'Lead Sources' },
  { id: 'reports', label: 'Reports' },
  { id: 'notifications', label: 'Alerts' },
  { id: 'roles', label: 'Roles & Access' },
  { id: 'settings', label: 'Settings' },
];


