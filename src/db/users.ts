import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  users,
  crmAgents,
  crmProjects,
  crmLeads,
  crmCustomers,
  crmFollowUps,
  crmSiteVisits,
  crmTasks,
  crmStateStore,
} from './schema.ts';
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
} from '../data/demoData.ts';

export const PRIMARY_SUPER_ADMIN_EMAIL = 'malik59223@gmail.com';

export async function hasSuperAdminInDb(): Promise<boolean> {
  try {
    const all = await db.select().from(users);
    return all.some(
      (u) =>
        u.role === 'Super Admin' ||
        (u.email || '').toLowerCase().trim() === PRIMARY_SUPER_ADMIN_EMAIL
    );
  } catch (error) {
    console.error('Database query failed in hasSuperAdminInDb:', error);
    return false;
  }
}

export async function syncRegisteredUsersIntoSnapshot(snapshot: any): Promise<any> {
  if (!snapshot) return snapshot;
  try {
    const allUsers = await db.select().from(users);
    const currentAgents: any[] = Array.isArray(snapshot.agents) ? [...snapshot.agents] : [];
    let snapshotModified = false;

    // Step 0: Any agent added from the Dashboard (Sales Team) with an email that is not yet in `users`
    // is automatically registered in `users` with a role and login password so they can log in immediately
    for (const ag of currentAgents) {
      if (!ag || !ag.id) continue;
      const agEmail = String(ag.email || '').toLowerCase().trim();
      if (!agEmail || agEmail === PRIMARY_SUPER_ADMIN_EMAIL) continue;

      const existingUser = allUsers.find(
        (u) =>
          (u.email || '').toLowerCase().trim() === agEmail ||
          (u.agentId && u.agentId === ag.id)
      );

      const isCustomAgent =
        !agEmail.endsWith('@crestlinerealty.pk') ||
        Boolean(ag.loginPassword) ||
        Boolean(ag.systemRole);

      if (!existingUser && isCustomAgent) {
        const resolvedRole =
          ag.systemRole && ag.systemRole !== 'Super Admin'
            ? ag.systemRole
            : ag.roleTitle?.toLowerCase().includes('manager')
            ? 'Sales Manager'
            : ag.roleTitle?.toLowerCase().includes('admin')
            ? 'Admin'
            : 'Sales Agent';
        const resolvedPassword = ag.loginPassword ? String(ag.loginPassword).trim() : '123456';
        const newUid = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

        const inserted = await db
          .insert(users)
          .values({
            uid: newUid,
            email: agEmail,
            name: ag.name || agEmail.split('@')[0],
            passwordHash: resolvedPassword,
            role: resolvedRole,
            agentId: ag.id,
            phone: ag.phone || '+92 300 0000000',
            specialization: ag.specialization || 'Real Estate Consultant',
            accountStatus: ag.accountStatus || 'Active',
          })
          .returning();

        if (inserted[0]) {
          allUsers.push(inserted[0]);
        }
      }
    }

    for (const u of allUsers) {
      const cleanEmail = (u.email || '').toLowerCase().trim();

      // Strictly enforce malik59223@gmail.com as the ONLY Super Admin
      if (cleanEmail === PRIMARY_SUPER_ADMIN_EMAIL && u.role !== 'Super Admin') {
        await db
          .update(users)
          .set({ role: 'Super Admin' })
          .where(eq(users.uid, u.uid));
        u.role = 'Super Admin';
      } else if (cleanEmail !== PRIMARY_SUPER_ADMIN_EMAIL && u.role === 'Super Admin') {
        await db
          .update(users)
          .set({ role: 'Sales Agent' })
          .where(eq(users.uid, u.uid));
        u.role = 'Sales Agent';
      }

      if (u.role === 'Super Admin') {
        if (snapshot.settings && snapshot.settings.currentUserProfile) {
          if (
            snapshot.settings.currentUserProfile.email !== PRIMARY_SUPER_ADMIN_EMAIL ||
            snapshot.settings.currentUserProfile.title !== 'Super Admin (Sole Owner)'
          ) {
            snapshot.settings.currentUserProfile = {
              name: u.name || 'Malik (Super Admin)',
              email: PRIMARY_SUPER_ADMIN_EMAIL,
              phone: u.phone || snapshot.settings.currentUserProfile.phone || '+92 300 8400111',
              title: 'Super Admin (Sole Owner)',
            };
            snapshotModified = true;
          }
        }
        continue;
      }

      let targetAgentId = u.agentId || '';

      // Find existing agent by ID or email
      let matchedAgent = currentAgents.find(
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
        await db
          .update(users)
          .set({ agentId: targetAgentId })
          .where(eq(users.uid, u.uid));
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
          systemRole: u.role,
          loginPassword: u.passwordHash || '123456',
          avatarUrl: '',
          initials,
          phone: u.phone || '+92 300 0000000',
          email: cleanEmail,
          joiningDate: '2026-11-11',
          accountStatus: (u.accountStatus as 'Active' | 'Inactive') || 'Active',
          specialization: u.specialization || `${roleBadgeTitle} (${cleanEmail})`,
        });
        snapshotModified = true;
      } else {
        // If agent's password or role was updated in Sales Team modal, sync to users table
        const updatedDbFields: Record<string, any> = {};
        if (
          matchedAgent.loginPassword &&
          matchedAgent.loginPassword !== u.passwordHash
        ) {
          updatedDbFields.passwordHash = String(matchedAgent.loginPassword).trim();
          u.passwordHash = updatedDbFields.passwordHash;
        }
        if (
          matchedAgent.systemRole &&
          matchedAgent.systemRole !== 'Super Admin' &&
          matchedAgent.systemRole !== u.role
        ) {
          updatedDbFields.role = matchedAgent.systemRole;
          u.role = matchedAgent.systemRole;
        }
        if (Object.keys(updatedDbFields).length > 0) {
          await db
            .update(users)
            .set(updatedDbFields)
            .where(eq(users.uid, u.uid));
        }

        const effectiveRoleTitle =
          u.role === 'Sales Manager'
            ? 'Sales Manager'
            : u.role === 'Admin'
            ? 'CRM Admin'
            : 'Sales Agent';

        if (
          matchedAgent.name !== cleanName ||
          matchedAgent.email !== cleanEmail ||
          matchedAgent.roleTitle !== effectiveRoleTitle ||
          matchedAgent.systemRole !== u.role ||
          matchedAgent.loginPassword !== (u.passwordHash || '123456')
        ) {
          matchedAgent.name = cleanName;
          matchedAgent.email = cleanEmail;
          matchedAgent.roleTitle = effectiveRoleTitle;
          matchedAgent.systemRole = u.role;
          matchedAgent.loginPassword = u.passwordHash || '123456';
          snapshotModified = true;
        }
      }

      // Ensure if user "ali" (alimalik59223@gmail.com) exists and LD-1021 was unassigned, link it to ali's agentId
      if (cleanEmail === 'alimalik59223@gmail.com' && Array.isArray(snapshot.leads)) {
        for (const ld of snapshot.leads) {
          if (ld.id === 'LD-1021' && !ld.assignedAgentId) {
            ld.assignedAgentId = targetAgentId;
            snapshotModified = true;
          }
        }
      }
    }

    // Remove duplicate demo agent AGT-07 ("Ali Raza") if real user "ali" (alimalik59223@gmail.com) is registered
    const hasRealAli = allUsers.some(
      (u) => (u.email || '').toLowerCase().trim() === 'alimalik59223@gmail.com'
    );
    if (hasRealAli) {
      const idx07 = currentAgents.findIndex(
        (a) => a.id === 'AGT-07' && String(a.email || '').includes('crestlinerealty.pk')
      );
      if (idx07 !== -1) {
        currentAgents.splice(idx07, 1);
        snapshotModified = true;
      }
      if (Array.isArray(snapshot.leads)) {
        for (const ld of snapshot.leads) {
          if (ld.assignedAgentId === 'AGT-07' && (ld.id === 'LD-1017' || ld.id === 'LD-1018')) {
            ld.assignedAgentId = 'AGT-01';
            snapshotModified = true;
          }
        }
      }
    }

    // Remove duplicate demo agent AGT-02 ("Hamza Sikandar") if real user "hamza" (hamza112233@gmail.com) is registered
    const hasRealHamza = allUsers.some(
      (u) => (u.email || '').toLowerCase().trim() === 'hamza112233@gmail.com'
    );
    if (hasRealHamza) {
      const idx02 = currentAgents.findIndex(
        (a) => a.id === 'AGT-02' && String(a.email || '').includes('crestlinerealty.pk')
      );
      if (idx02 !== -1) {
        currentAgents.splice(idx02, 1);
        snapshotModified = true;
      }
      if (Array.isArray(snapshot.leads)) {
        for (const ld of snapshot.leads) {
          if (
            ld.assignedAgentId === 'AGT-02' &&
            ['LD-1004', 'LD-1006', 'LD-1010', 'LD-1015'].includes(ld.id)
          ) {
            ld.assignedAgentId = 'AGT-01';
            snapshotModified = true;
          }
        }
      }
    }

    // Migrate any legacy 'Referral' -> 'Lead Reference' and 'Walk-in Customers' -> 'Direct Office Inquiry'
    if (Array.isArray(snapshot.leads)) {
      for (const ld of snapshot.leads) {
        if (ld.source === 'Referral') {
          ld.source = 'Lead Reference';
          if (!ld.leadReference) {
            ld.leadReference = ld.id === 'LD-1021' ? 'Partner Company — Sent by Malik' : 'Al-Haram Builders — Ch. Tariq';
          }
          snapshotModified = true;
        } else if (ld.source === 'Walk-in Customers') {
          ld.source = 'Direct Office Inquiry';
          snapshotModified = true;
        }
      }
    }

    if (snapshot.settings && Array.isArray(snapshot.settings.customLeadSources)) {
      for (const cs of snapshot.settings.customLeadSources) {
        if (cs.name === 'Referral') {
          cs.name = 'Lead Reference';
          snapshotModified = true;
        } else if (cs.name === 'Walk-in Customers') {
          cs.name = 'Direct Office Inquiry';
          snapshotModified = true;
        }
      }
    }

    // Deduplicate agents by ID and lowercase email to prevent duplicate React keys
    const seenAgentIds = new Set<string>();
    const seenAgentEmails = new Set<string>();
    const dedupedAgents: any[] = [];
    for (const ag of currentAgents) {
      if (!ag || !ag.id) continue;
      const agId = String(ag.id).trim();
      const agEmail = String(ag.email || '').toLowerCase().trim();
      if (seenAgentIds.has(agId) || (agEmail && seenAgentEmails.has(agEmail))) {
        snapshotModified = true;
        continue;
      }
      seenAgentIds.add(agId);
      if (agEmail) seenAgentEmails.add(agEmail);
      dedupedAgents.push(ag);
    }

    // Put registered users' agent profiles first at the top of the dropdown list
    const registeredAgentIds = new Set(
      allUsers.filter((u) => u.role !== 'Super Admin' && u.agentId).map((u) => u.agentId)
    );
    dedupedAgents.sort((a, b) => {
      const aReg = registeredAgentIds.has(a.id) ? 0 : 1;
      const bReg = registeredAgentIds.has(b.id) ? 0 : 1;
      if (aReg !== bReg) return aReg - bReg;
      return String(a.id).localeCompare(String(b.id));
    });

    snapshot.agents = dedupedAgents;

    if (snapshotModified) {
      await db
        .insert(crmStateStore)
        .values({
          key: 'main_crm_snapshot',
          payloadJson: JSON.stringify(snapshot),
        })
        .onConflictDoUpdate({
          target: crmStateStore.key,
          set: {
            payloadJson: JSON.stringify(snapshot),
          },
        });
    }
  } catch (err) {
    console.warn('Warning in syncRegisteredUsersIntoSnapshot:', err);
  }
  return snapshot;
}

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  try {
    const cleanEmail = email.toLowerCase().trim();
    const existingByEmail = await findUserByEmail(cleanEmail);
    if (existingByEmail) {
      return existingByEmail;
    }

    const superAdminExists = await hasSuperAdminInDb();
    const assignedRole = !superAdminExists ? 'Super Admin' : 'Sales Agent';
    let assignedAgentId = '';

    if (assignedRole !== 'Super Admin') {
      const snapshot = await loadCrmSnapshotFromDb();
      const maxNum = (snapshot?.agents || []).reduce((max: number, a: any) => {
        const num = parseInt(String(a.id || '').replace('AGT-', ''), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 8);
      const nextIdx = maxNum + 1;
      assignedAgentId = nextIdx < 10 ? `AGT-0${nextIdx}` : `AGT-${nextIdx}`;
      if (snapshot) {
        const cleanName = displayName || cleanEmail.split('@')[0];
        const parts = String(cleanName).trim().split(' ');
        const initials =
          parts.length >= 2
            ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
            : String(cleanName).slice(0, 2).toUpperCase();

        snapshot.agents = [
          {
            id: assignedAgentId,
            name: cleanName,
            roleTitle: assignedRole,
            avatarUrl: '',
            initials,
            phone: '+92 300 0000000',
            email: cleanEmail,
            joiningDate: '2026-11-11',
            accountStatus: 'Active' as const,
            specialization: 'Residential & Commercial Properties',
          },
          ...(snapshot.agents || []),
        ];
        await saveCrmSnapshotToDb(snapshot);
      }
    }

    const result = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        name: displayName || cleanEmail.split('@')[0],
        role: assignedRole,
        agentId: assignedAgentId,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: cleanEmail,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function syncRelationalTablesFromSnapshot(snapshot: any) {
  try {
    // 1. Sync Agents
    if (Array.isArray(snapshot.agents)) {
      for (const ag of snapshot.agents) {
        await db
          .insert(crmAgents)
          .values({
            id: ag.id,
            name: ag.name,
            email: ag.email || '',
            phone: ag.phone || '',
            roleTitle: ag.roleTitle || 'Sales Executive',
            avatarUrl: ag.avatarUrl || '',
            initials: ag.initials || 'AG',
            joiningDate: ag.joiningDate || '2026-01-01',
            accountStatus: ag.accountStatus || 'Active',
            specialization: ag.specialization || 'Real Estate Consultant',
          })
          .onConflictDoUpdate({
            target: crmAgents.id,
            set: {
              name: ag.name,
              email: ag.email || '',
              phone: ag.phone || '',
              roleTitle: ag.roleTitle || 'Sales Executive',
              avatarUrl: ag.avatarUrl || '',
              accountStatus: ag.accountStatus || 'Active',
              specialization: ag.specialization || 'Real Estate Consultant',
            },
          });
      }
    }

    // 2. Sync Projects
    if (Array.isArray(snapshot.projects)) {
      for (const prj of snapshot.projects) {
        await db
          .insert(crmProjects)
          .values({
            id: prj.id,
            name: prj.name,
            developerName: prj.developerName || '',
            location: prj.location || '',
            city: prj.city || 'Lahore',
            propertyType: prj.propertyType || 'Residential Plots',
            availableUnits: Number(prj.availableUnits) || 0,
            totalUnits: Number(prj.totalUnits) || 0,
            minPrice: Number(prj.minPrice) || 0,
            maxPrice: Number(prj.maxPrice) || 0,
            priceRangeLabel: prj.priceRangeLabel || '',
            description: prj.description || '',
            imageUrl: prj.imageUrl || '',
            status: prj.status || 'Active',
          })
          .onConflictDoUpdate({
            target: crmProjects.id,
            set: {
              name: prj.name,
              developerName: prj.developerName || '',
              location: prj.location || '',
              availableUnits: Number(prj.availableUnits) || 0,
              totalUnits: Number(prj.totalUnits) || 0,
              minPrice: Number(prj.minPrice) || 0,
              maxPrice: Number(prj.maxPrice) || 0,
              priceRangeLabel: prj.priceRangeLabel || '',
              imageUrl: prj.imageUrl || '',
              status: prj.status || 'Active',
            },
          });
      }
    }

    // 3. Sync Leads
    if (Array.isArray(snapshot.leads)) {
      for (const lead of snapshot.leads) {
        await db
          .insert(crmLeads)
          .values({
            id: lead.id,
            customerName: lead.customerName,
            phone: lead.phone,
            whatsapp: lead.whatsapp || '',
            email: lead.email || '',
            city: lead.city || 'Lahore',
            area: lead.area || '',
            interestedProjectId: lead.interestedProjectId || '',
            interestedProperty: lead.interestedProperty || '',
            propertyType: lead.propertyType || 'Residential Plots',
            propertySize: lead.propertySize || '10 Marla',
            minBudget: Number(lead.minBudget) || 0,
            maxBudget: Number(lead.maxBudget) || 0,
            purchasePurpose: lead.purchasePurpose || 'Investment',
            source: lead.source || 'Direct Office Inquiry',
            status: lead.status || 'New',
            priority: lead.priority || 'Medium',
            assignedAgentId: lead.assignedAgentId || null,
            lastFollowUpDate: lead.lastFollowUpDate || null,
            nextFollowUpDate: lead.nextFollowUpDate || null,
            notes: lead.notes || '',
            createdAt: lead.createdAt || '2026-11-10',
            propertyImageUrl: lead.propertyImageUrl || '',
          })
          .onConflictDoUpdate({
            target: crmLeads.id,
            set: {
              customerName: lead.customerName,
              phone: lead.phone,
              whatsapp: lead.whatsapp || '',
              email: lead.email || '',
              status: lead.status || 'New',
              priority: lead.priority || 'Medium',
              assignedAgentId: lead.assignedAgentId || null,
              lastFollowUpDate: lead.lastFollowUpDate || null,
              nextFollowUpDate: lead.nextFollowUpDate || null,
              notes: lead.notes || '',
              propertyImageUrl: lead.propertyImageUrl || '',
            },
          });
      }
    }

    // 4. Sync Customers & Property Bookings
    if (Array.isArray(snapshot.customers)) {
      for (const cus of snapshot.customers) {
        await db
          .insert(crmCustomers)
          .values({
            id: cus.id,
            leadId: cus.leadId || null,
            customerName: cus.customerName,
            fatherOrSpouseName: cus.fatherOrSpouseName || '',
            cnic: cus.cnic || '',
            phone: cus.phone || '',
            whatsapp: cus.whatsapp || '',
            email: cus.email || '',
            address: cus.address || '',
            city: cus.city || 'Lahore',
            nomineeName: cus.nomineeName || '',
            nomineeRelation: cus.nomineeRelation || '',
            nomineeCnic: cus.nomineeCnic || '',
            projectId: cus.projectId || '',
            projectName: cus.projectName || '',
            propertyType: cus.propertyType || 'Residential Plots',
            unitNumber: cus.unitNumber || '',
            propertySize: cus.propertySize || '10 Marla',
            propertyImageUrl: cus.propertyImageUrl || '',
            salesAgentId: cus.salesAgentId || '',
            salesAgentName: cus.salesAgentName || '',
            bookingDate: cus.bookingDate || '2026-11-10',
            dealStage: cus.dealStage || 'Booking Confirmed',
            paymentPlanType: cus.paymentPlanType || 'Installment Plan',
            totalDealAmount: Number(cus.totalDealAmount) || 0,
            tokenAmount: Number(cus.tokenAmount) || 0,
            downPaymentAmount: Number(cus.downPaymentAmount) || 0,
            paidAmount: Number(cus.paidAmount) || 0,
            remainingAmount: Number(cus.remainingAmount) || 0,
            totalInstallments: Number(cus.totalInstallments) || 1,
            installmentFrequency: cus.installmentFrequency || 'Quarterly',
            nextDueDate: cus.nextDueDate || null,
            nextInstallmentAmount: Number(cus.nextInstallmentAmount) || 0,
            notes: cus.notes || '',
          })
          .onConflictDoUpdate({
            target: crmCustomers.id,
            set: {
              customerName: cus.customerName,
              dealStage: cus.dealStage || 'Booking Confirmed',
              paidAmount: Number(cus.paidAmount) || 0,
              remainingAmount: Number(cus.remainingAmount) || 0,
              nextDueDate: cus.nextDueDate || null,
              propertyImageUrl: cus.propertyImageUrl || '',
              notes: cus.notes || '',
            },
          });
      }
    }

    // 5. Sync Follow-ups
    if (Array.isArray(snapshot.followUps)) {
      for (const fup of snapshot.followUps) {
        await db
          .insert(crmFollowUps)
          .values({
            id: fup.id,
            leadId: fup.leadId,
            customerName: fup.customerName,
            agentId: fup.agentId,
            agentName: fup.agentName || '',
            scheduledDate: fup.scheduledDate,
            scheduledTime: fup.scheduledTime || '11:00',
            type: fup.type || 'Phone Call',
            discussionNotes: fup.discussionNotes || '',
            nextFollowUpDate: fup.nextFollowUpDate || null,
            status: fup.status || 'Pending',
            createdAt: fup.createdAt || '2026-11-10',
          })
          .onConflictDoUpdate({
            target: crmFollowUps.id,
            set: {
              scheduledDate: fup.scheduledDate,
              scheduledTime: fup.scheduledTime || '11:00',
              discussionNotes: fup.discussionNotes || '',
              nextFollowUpDate: fup.nextFollowUpDate || null,
              status: fup.status || 'Pending',
            },
          });
      }
    }

    // 6. Sync Site Visits
    if (Array.isArray(snapshot.siteVisits)) {
      for (const sv of snapshot.siteVisits) {
        await db
          .insert(crmSiteVisits)
          .values({
            id: sv.id,
            leadId: sv.leadId,
            customerName: sv.customerName,
            projectId: sv.projectId || '',
            projectName: sv.projectName || '',
            agentId: sv.agentId,
            agentName: sv.agentName || '',
            visitDate: sv.visitDate,
            visitTime: sv.visitTime || '14:00',
            status: sv.status || 'Scheduled',
            notes: sv.notes || '',
            customerFeedback: sv.customerFeedback || '',
          })
          .onConflictDoUpdate({
            target: crmSiteVisits.id,
            set: {
              visitDate: sv.visitDate,
              visitTime: sv.visitTime || '14:00',
              status: sv.status || 'Scheduled',
              notes: sv.notes || '',
              customerFeedback: sv.customerFeedback || '',
            },
          });
      }
    }

    // 7. Sync Tasks
    if (Array.isArray(snapshot.tasks)) {
      for (const tsk of snapshot.tasks) {
        await db
          .insert(crmTasks)
          .values({
            id: tsk.id,
            title: tsk.title,
            description: tsk.description || '',
            assignedAgentId: tsk.assignedAgentId,
            assignedAgentName: tsk.assignedAgentName || '',
            relatedLeadId: tsk.relatedLeadId || null,
            dueDate: tsk.dueDate,
            priority: tsk.priority || 'Medium',
            status: tsk.status || 'Pending',
            createdAt: tsk.createdAt || '2026-11-10',
          })
          .onConflictDoUpdate({
            target: crmTasks.id,
            set: {
              title: tsk.title,
              description: tsk.description || '',
              dueDate: tsk.dueDate,
              priority: tsk.priority || 'Medium',
              status: tsk.status || 'Pending',
            },
          });
      }
    }
  } catch (error) {
    console.warn('Relational table sync warning:', error);
  }
}

export async function ensureSeedUsersAndData() {
  try {
    const existingState = await db
      .select()
      .from(crmStateStore)
      .where(eq(crmStateStore.key, 'main_crm_snapshot'));

    if (existingState.length === 0) {
      const initialSnapshot = {
        leads: INITIAL_LEADS,
        customers: INITIAL_CUSTOMERS,
        agents: INITIAL_AGENTS,
        followUps: INITIAL_FOLLOWUPS,
        activities: INITIAL_ACTIVITIES,
        assignments: INITIAL_ASSIGNMENTS,
        projects: INITIAL_PROJECTS,
        siteVisits: INITIAL_SITE_VISITS,
        tasks: INITIAL_TASKS,
        notifications: INITIAL_NOTIFICATIONS,
        settings: INITIAL_SETTINGS,
      };

      await db
        .insert(crmStateStore)
        .values({
          key: 'main_crm_snapshot',
          payloadJson: JSON.stringify(initialSnapshot),
        })
        .onConflictDoNothing({ target: crmStateStore.key });

      syncRelationalTablesFromSnapshot(initialSnapshot).catch(() => {});
    }
  } catch (error) {
    console.error('Database seed check failed:', error);
    throw new Error('Database initialization failed. Please try again later.', {
      cause: error,
    });
  }
}

export async function getAllUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error('Database query failed in getAllUsers:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function findUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in findUserByUid:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function findUserByEmail(email: string) {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in findUserByEmail:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function registerCrmUserAccount(input: {
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  agentId: string;
  phone: string;
  specialization: string;
}) {
  try {
    const uid = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const cleanEmail = input.email.toLowerCase().trim();
    const result = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        name: input.name.trim(),
        passwordHash: input.passwordHash,
        role: input.role,
        agentId: input.agentId,
        phone: input.phone.trim(),
        specialization: input.specialization.trim() || 'Real Estate Sales Consultant',
        accountStatus: 'Active',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: cleanEmail,
          name: input.name.trim(),
          role: input.role,
          agentId: input.agentId,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in registerCrmUserAccount:', error);
    throw new Error('Failed to create user account in database.', { cause: error });
  }
}

export async function updateCrmUserRoleAndAgent(
  uid: string,
  updates: {
    role?: string;
    agentId?: string;
    accountStatus?: string;
    name?: string;
    password?: string;
    email?: string;
    phone?: string;
  }
) {
  try {
    const targetUser = await findUserByUid(uid);
    if (!targetUser) return null;

    // Enforce single Super Admin rule:
    // Cannot demote the sole Super Admin, and cannot promote another user to Super Admin if one already exists
    const allUsers = await getAllUsers();
    const existingSuperAdmin = allUsers.find((u) => u.role === 'Super Admin');

    const dbUpdates: Record<string, any> = {};
    if (updates.role) dbUpdates.role = updates.role;
    if (updates.agentId !== undefined) dbUpdates.agentId = updates.agentId;
    if (updates.accountStatus) dbUpdates.accountStatus = updates.accountStatus;
    if (updates.name) dbUpdates.name = updates.name.trim();
    if (updates.email) dbUpdates.email = updates.email.toLowerCase().trim();
    if (updates.phone) dbUpdates.phone = updates.phone.trim();
    if (updates.password && updates.password.trim()) {
      dbUpdates.passwordHash = updates.password.trim();
    }

    if (
      dbUpdates.role === 'Super Admin' &&
      existingSuperAdmin &&
      existingSuperAdmin.uid !== uid
    ) {
      throw new Error(
        'Only one Super Admin is allowed in the system. You can assign Admin, Sales Manager, or Sales Agent.'
      );
    }
    if (
      targetUser.role === 'Super Admin' &&
      dbUpdates.role &&
      dbUpdates.role !== 'Super Admin'
    ) {
      throw new Error('The primary Super Admin account role cannot be downgraded.');
    }

    const result = await db
      .update(users)
      .set(dbUpdates)
      .where(eq(users.uid, uid))
      .returning();

    // Update the matching agent inside crm_state_store so syncRegisteredUsersIntoSnapshot sees the latest role & password
    const rows = await db
      .select()
      .from(crmStateStore)
      .where(eq(crmStateStore.key, 'main_crm_snapshot'));
    if (rows.length > 0) {
      const parsed = JSON.parse(rows[0].payloadJson);
      if (Array.isArray(parsed.agents)) {
        const targetAgId = dbUpdates.agentId || targetUser.agentId;
        const targetEmail = (dbUpdates.email || targetUser.email || '').toLowerCase().trim();
        for (const ag of parsed.agents) {
          if (
            (targetAgId && ag.id === targetAgId) ||
            (targetEmail && String(ag.email || '').toLowerCase().trim() === targetEmail)
          ) {
            if (dbUpdates.role) ag.systemRole = dbUpdates.role;
            if (dbUpdates.passwordHash) ag.loginPassword = dbUpdates.passwordHash;
            if (dbUpdates.name) ag.name = dbUpdates.name;
            if (dbUpdates.email) ag.email = dbUpdates.email;
            if (dbUpdates.accountStatus) ag.accountStatus = dbUpdates.accountStatus;
          }
        }
      }
      await syncRegisteredUsersIntoSnapshot(parsed);
    }

    const refreshed = await findUserByUid(uid);
    return refreshed || result[0] || null;
  } catch (error) {
    console.error('Database query failed in updateCrmUserRoleAndAgent:', error);
    throw error;
  }
}

export async function loadCrmSnapshotFromDb() {
  try {
    await ensureSeedUsersAndData();
    const rows = await db
      .select()
      .from(crmStateStore)
      .where(eq(crmStateStore.key, 'main_crm_snapshot'));
    if (rows.length > 0) {
      const parsed = JSON.parse(rows[0].payloadJson);
      return await syncRegisteredUsersIntoSnapshot(parsed);
    }
    return null;
  } catch (error) {
    console.error('Database query failed in loadCrmSnapshotFromDb:', error);
    throw new Error('Failed to load CRM snapshot from database.', { cause: error });
  }
}

export async function saveCrmSnapshotToDb(snapshot: any) {
  try {
    const syncedSnapshot = await syncRegisteredUsersIntoSnapshot(snapshot);
    await db
      .insert(crmStateStore)
      .values({
        key: 'main_crm_snapshot',
        payloadJson: JSON.stringify(syncedSnapshot),
      })
      .onConflictDoUpdate({
        target: crmStateStore.key,
        set: {
          payloadJson: JSON.stringify(syncedSnapshot),
        },
      });

    syncRelationalTablesFromSnapshot(syncedSnapshot).catch(() => {});
  } catch (error) {
    console.error('Database query failed in saveCrmSnapshotToDb:', error);
    throw new Error('Failed to persist CRM state to database.', { cause: error });
  }
}
