import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Lead,
  Agent,
  Project,
  CustomerBooking,
  FollowUp,
  SiteVisit,
  CRMTask,
  ActivityLog,
  AssignmentRecord,
  NotificationItem,
  CRMUserAccount,
} from '../types/crm';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project-id')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Syncs the current CRM leads, agents, projects, customers, receipts, follow-ups,
 * site visits, tasks, activities, assignments, and notifications into the 13 Supabase SQL tables
 * created from the All-in-One Supabase schema script.
 */
export async function syncSnapshotToSupabaseTables(params: {
  leads: Lead[];
  agents: Agent[];
  projects: Project[];
  customers: CustomerBooking[];
  followUps?: FollowUp[];
  siteVisits?: SiteVisit[];
  tasks?: CRMTask[];
  activities?: ActivityLog[];
  assignments?: AssignmentRecord[];
  notifications?: NotificationItem[];
  users?: CRMUserAccount[];
}) {
  if (!supabase) return;

  try {
    // 1. Upsert Agents (including Super Admin profile row) into public.crm_agents
    if (params.agents.length > 0) {
      const agentRows = [
        {
          id: 'SUPER-ADMIN',
          name: 'Malik (Super Admin)',
          email: 'malik59223@gmail.com',
          phone: '+92 300 8400111',
          avatar: '',
          designation: 'Super Admin',
          specialization: 'Sole Super Admin & Owner',
          joining_date: '2026-01-01',
          status: 'Active',
          monthly_target_pkr: 100000000,
        },
        ...params.agents.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          phone: a.phone,
          avatar: a.avatarUrl || '',
          designation: a.roleTitle || 'Sales Executive',
          specialization: a.specialization || 'General Real Estate',
          joining_date: a.joiningDate || '2026-01-01',
          status: a.accountStatus || 'Active',
          monthly_target_pkr: 50000000,
        })),
      ];
      await supabase.from('crm_agents').upsert(agentRows, { onConflict: 'id' });
    }

    // 2. Upsert Projects into public.crm_projects
    if (params.projects.length > 0) {
      const projectRows = params.projects.map((p) => ({
        id: p.id,
        name: p.name,
        developer: p.developerName,
        location: p.location,
        city: p.city || 'Lahore',
        property_type: p.propertyType,
        available_units: p.availableUnits,
        total_units: p.totalUnits,
        min_price_pkr: p.minPrice,
        max_price_pkr: p.maxPrice,
        price_range_display: p.priceRangeLabel,
        description: p.description,
        image: p.imageUrl,
        gallery_images: p.galleryImages || [],
        status: p.status,
      }));
      await supabase.from('crm_projects').upsert(projectRows, { onConflict: 'id' });
    }

    // 3. Upsert Leads into public.crm_leads (with lead_reference)
    if (params.leads.length > 0) {
      const leadRows = params.leads.map((l) => ({
        id: l.id,
        customer_name: l.customerName,
        phone: l.phone,
        whatsapp: l.whatsapp,
        email: l.email,
        city: l.city,
        area: l.area,
        interested_project_id: l.interestedProjectId || null,
        interested_project_name: l.interestedProperty,
        property_type: l.propertyType,
        property_size: l.propertySize,
        property_image: l.propertyImageUrl || '',
        budget_min: l.minBudget,
        budget_max: l.maxBudget,
        purpose: l.purchasePurpose,
        source: l.source,
        lead_reference: l.leadReference || '',
        status: l.status,
        priority: l.priority,
        assigned_agent_id: l.assignedAgentId || null,
        last_follow_up: l.lastFollowUpDate || null,
        next_follow_up: l.nextFollowUpDate || null,
        notes: l.notes || '',
        created_at: l.createdAt || '2026-11-11',
      }));
      await supabase.from('crm_leads').upsert(leadRows, { onConflict: 'id' });
    }

    // 4. Upsert Customer Bookings into public.crm_customers & Receipts into public.crm_payment_receipts
    if (params.customers.length > 0) {
      const customerRows = params.customers.map((c) => ({
        id: c.id,
        lead_id: c.leadId || null,
        customer_name: c.customerName,
        father_or_spouse_name: c.fatherOrSpouseName || '',
        cnic: c.cnic,
        phone: c.phone,
        whatsapp: c.whatsapp || '',
        email: c.email || '',
        address: c.address || '',
        city: c.city || 'Lahore',
        nominee_name: c.nomineeName || '',
        nominee_cnic: c.nomineeCnic || '',
        nominee_relation: c.nomineeRelation || '',
        project_id: c.projectId || null,
        project_name: c.projectName,
        unit_number: c.unitNumber,
        property_type: c.propertyType,
        property_size: c.propertySize,
        property_image: c.propertyImageUrl || '',
        total_deal_value: c.totalDealAmount,
        token_amount: c.tokenAmount,
        down_payment_amount: c.downPaymentAmount,
        total_paid_amount: c.paidAmount,
        remaining_balance: c.remainingAmount,
        payment_plan: c.paymentPlanType,
        total_installments: c.totalInstallments,
        paid_installments: c.receipts ? c.receipts.length : 0,
        next_due_date: c.nextDueDate || null,
        booking_date: c.bookingDate,
        booking_status: c.dealStage,
        sales_agent_id: c.salesAgentId || null,
        notes: c.notes || '',
      }));
      await supabase.from('crm_customers').upsert(customerRows, { onConflict: 'id' });

      const allReceipts = params.customers.flatMap((c) =>
        (c.receipts || []).map((r) => ({
          id: r.id,
          customer_id: c.id,
          receipt_number: r.receiptNumber,
          payment_date: r.date,
          amount: r.amount,
          payment_type: r.paymentStage,
          payment_method: r.paymentMethod,
          reference_no: r.referenceNo,
          received_by: r.receivedBy,
          notes: r.notes || '',
        }))
      );
      if (allReceipts.length > 0) {
        await supabase.from('crm_payment_receipts').upsert(allReceipts, { onConflict: 'id' });
      }
    }

    // 5. Upsert Follow-Ups into public.crm_follow_ups
    if (params.followUps && params.followUps.length > 0) {
      const followUpRows = params.followUps.map((f) => ({
        id: f.id,
        lead_id: f.leadId,
        lead_name: f.customerName,
        agent_id: f.agentId,
        scheduled_date: f.scheduledDate,
        scheduled_time: f.scheduledTime,
        type: f.type,
        status: f.status,
        notes: f.discussionNotes || '',
        next_follow_up_date: f.nextFollowUpDate || null,
      }));
      await supabase.from('crm_follow_ups').upsert(followUpRows, { onConflict: 'id' });
    }

    // 6. Upsert Site Visits into public.crm_site_visits
    if (params.siteVisits && params.siteVisits.length > 0) {
      const visitRows = params.siteVisits.map((sv) => ({
        id: sv.id,
        lead_id: sv.leadId,
        customer_name: sv.customerName,
        customer_phone: sv.customerPhone || '',
        project_id: sv.projectId || null,
        project_name: sv.projectName,
        agent_id: sv.agentId,
        visit_date: sv.visitDate,
        visit_time: sv.visitTime,
        status: sv.status,
        notes: sv.notes || '',
        feedback: sv.customerFeedback || '',
      }));
      await supabase.from('crm_site_visits').upsert(visitRows, { onConflict: 'id' });
    }

    // 7. Upsert Tasks into public.crm_tasks
    if (params.tasks && params.tasks.length > 0) {
      const taskRows = params.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        assigned_agent_id: t.assignedAgentId,
        related_lead_id: t.relatedLeadId || null,
        due_date: t.dueDate,
        priority: t.priority,
        status: t.status,
      }));
      await supabase.from('crm_tasks').upsert(taskRows, { onConflict: 'id' });
    }

    // 8. Upsert Activities into public.crm_lead_activities
    if (params.activities && params.activities.length > 0) {
      const activityRows = params.activities.map((act) => ({
        id: act.id,
        lead_id: act.leadId,
        activity_type: act.activityType,
        description: act.description,
        performed_by: act.actorName,
        activity_date: act.date,
        activity_time: act.time,
      }));
      await supabase.from('crm_lead_activities').upsert(activityRows, { onConflict: 'id' });
    }

    // 9. Upsert Assignment History into public.crm_assignment_logs
    if (params.assignments && params.assignments.length > 0) {
      const assignmentRows = params.assignments.map((asg) => ({
        id: asg.id,
        lead_id: asg.leadId,
        lead_name: asg.leadName,
        previous_agent_id: asg.previousAgentId || null,
        new_agent_id: asg.newAgentId,
        assigned_by: `${asg.assignedByName} (${asg.assignedByRole})`,
        notes: asg.notes || '',
      }));
      await supabase.from('crm_assignment_logs').upsert(assignmentRows, { onConflict: 'id' });
    }

    // 10. Always Upsert Sole Super Admin (malik59223@gmail.com) + Registered Users into public.users, public.crm_users & public.profiles
    const baseSuperAdminRow = {
      uid: 'usr-super-admin-malik',
      email: 'malik59223@gmail.com',
      name: 'Malik (Super Admin)',
      role: 'Super Admin',
      agent_id: 'SUPER-ADMIN',
      phone: '+92 300 8400111',
      specialization: 'Sole Super Admin & Owner',
      account_status: 'Active',
    };

    const dynamicUserRows = (params.users || []).map((u) => ({
      uid: u.uid,
      email: u.email.toLowerCase().trim(),
      name: u.name,
      role:
        u.email.toLowerCase().trim() === 'malik59223@gmail.com'
          ? 'Super Admin'
          : u.role,
      agent_id:
        u.email.toLowerCase().trim() === 'malik59223@gmail.com'
          ? 'SUPER-ADMIN'
          : u.agentId || null,
      phone: u.phone || '',
      specialization: u.specialization || '',
      account_status: u.accountStatus || 'Active',
    }));

    const hasMalikInDynamic = dynamicUserRows.some(
      (r) => r.email === 'malik59223@gmail.com'
    );
    const allUserRows = hasMalikInDynamic
      ? dynamicUserRows
      : [baseSuperAdminRow, ...dynamicUserRows];

    await supabase.from('users').upsert(allUserRows, { onConflict: 'email' });
    await supabase.from('crm_users').upsert(allUserRows, { onConflict: 'email' });
    await supabase.from('profiles').upsert(allUserRows, { onConflict: 'email' });
  } catch (err) {
    console.warn('Supabase background table sync warning:', err);
  }
}

/**
 * Registers or signs in the user in Supabase Auth & public.users table when Supabase is configured.
 */
export async function syncUserAuthToSupabase(input: {
  uid?: string;
  email: string;
  password?: string;
  name: string;
  role: string;
  agentId?: string;
  phone?: string;
}) {
  if (!supabase) return;
  const cleanEmail = input.email.toLowerCase().trim();
  const enforcedRole =
    cleanEmail === 'malik59223@gmail.com' ? 'Super Admin' : input.role;

  try {
    if (input.password && input.password.length >= 6) {
      await supabase.auth.signUp({
        email: cleanEmail,
        password: input.password,
        options: {
          data: {
            full_name: input.name,
            role: enforcedRole,
            agent_id: input.agentId || '',
          },
        },
      });
    }

    const row = {
      uid: input.uid || `usr-${Date.now()}`,
      email: cleanEmail,
      name: input.name,
      role: enforcedRole,
      agent_id: input.agentId || null,
      phone: input.phone || '',
      account_status: 'Active',
    };
    await supabase.from('users').upsert([row], { onConflict: 'email' });
    await supabase.from('crm_users').upsert([row], { onConflict: 'email' });
  } catch (err) {
    console.warn('Supabase user auth sync warning:', err);
  }
}

/**
 * Loads registered users and CRM leads/agents from Supabase tables when deployed on Vercel
 */
export async function fetchUsersFromSupabase(): Promise<CRMUserAccount[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error || !Array.isArray(data) || data.length === 0) return null;
    return data.map((r: any) => ({
      uid: r.uid || `usr-${r.id || Date.now()}`,
      email: String(r.email || '').toLowerCase().trim(),
      name: r.name || String(r.email || '').split('@')[0],
      role:
        String(r.email || '').toLowerCase().trim() === 'malik59223@gmail.com'
          ? 'Super Admin'
          : r.role || 'Sales Agent',
      agentId: r.agent_id || '',
      phone: r.phone || '+92 300 0000000',
      specialization: r.specialization || 'Real Estate Consultant',
      accountStatus: r.account_status || 'Active',
      loginPassword: r.password_hash || undefined,
    }));
  } catch {
    return null;
  }
}

export async function fetchLeadsAndAgentsFromSupabase(): Promise<{
  leads?: any[];
  agents?: any[];
} | null> {
  if (!supabase) return null;
  try {
    const [leadsRes, agentsRes] = await Promise.all([
      supabase.from('crm_leads').select('*'),
      supabase.from('crm_agents').select('*'),
    ]);
    return {
      leads: Array.isArray(leadsRes.data) && leadsRes.data.length > 0 ? leadsRes.data : undefined,
      agents: Array.isArray(agentsRes.data) && agentsRes.data.length > 0 ? agentsRes.data : undefined,
    };
  } catch {
    return null;
  }
}


