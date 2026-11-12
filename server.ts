import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  ensureSeedUsersAndData,
  findUserByEmail,
  findUserByUid,
  getAllUsers,
  getOrCreateUser,
  hasSuperAdminInDb,
  loadCrmSnapshotFromDb,
  registerCrmUserAccount,
  saveCrmSnapshotToDb,
  updateCrmUserRoleAndAgent,
} from './src/db/users.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // 0. Public Auth Setup Status: Check if the sole Super Admin has been registered yet
  app.get('/api/auth/setup-status', async (_req, res) => {
    try {
      await ensureSeedUsersAndData();
      const allUsers = await getAllUsers();
      const superAdmin = allUsers.find((u) => u.role === 'Super Admin');
      res.json({
        hasSuperAdmin: Boolean(superAdmin),
        superAdminEmail: superAdmin ? superAdmin.email : null,
        totalUsers: allUsers.length,
      });
    } catch (error: any) {
      console.error('Setup status check failed:', error);
      res.status(500).json({ error: 'Failed to check setup status' });
    }
  });

  // 1. Public Auth Route: Email / Password Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      await ensureSeedUsersAndData();
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }
      const cleanEmail = String(email).toLowerCase().trim();
      const cleanPassword = String(password).trim();

      // Sync any dashboard-added agents into users table first
      const snapshot = await loadCrmSnapshotFromDb();
      let user = await findUserByEmail(cleanEmail);

      // If agent exists in snapshot.agents but not yet in users table, register them automatically
      if (!user && snapshot && Array.isArray(snapshot.agents)) {
        const matchedAgent = snapshot.agents.find(
          (a: any) => String(a.email || '').toLowerCase().trim() === cleanEmail
        );
        if (matchedAgent) {
          const resolvedRole =
            matchedAgent.systemRole && matchedAgent.systemRole !== 'Super Admin'
              ? matchedAgent.systemRole
              : 'Sales Agent';
          user = await registerCrmUserAccount({
            name: matchedAgent.name || cleanEmail.split('@')[0],
            email: cleanEmail,
            passwordHash: matchedAgent.loginPassword || cleanPassword,
            role: resolvedRole,
            agentId: matchedAgent.id,
            phone: matchedAgent.phone || '+92 300 0000000',
            specialization: matchedAgent.specialization || 'Real Estate Consultant',
          });
        }
      }

      if (!user) {
        return res.status(401).json({
          error:
            'No account found with this email. Please Sign Up or ask Super Admin to add your email.',
        });
      }

      // If a non-Super-Admin agent was added from the dashboard with a default placeholder password ('agent123' / '123456')
      // and logs in with their chosen password, adopt their password automatically so they aren't locked out
      const isDefaultPlaceholderPassword =
        user.role !== 'Super Admin' &&
        (!user.passwordHash ||
          user.passwordHash === 'agent123' ||
          user.passwordHash === '123456');

      if (user.passwordHash !== cleanPassword) {
        if (isDefaultPlaceholderPassword) {
          const updated = await updateCrmUserRoleAndAgent(user.uid, {
            password: cleanPassword,
          });
          if (updated) user = updated;
        } else {
          return res.status(401).json({
            error: 'Incorrect password for this email. Please check your password or ask Super Admin.',
          });
        }
      }

      if (user.accountStatus === 'Inactive') {
        return res.status(403).json({ error: 'This account is currently inactive.' });
      }

      await loadCrmSnapshotFromDb();
      const refreshedUser = (await findUserByUid(user.uid)) || user;
      const { passwordHash, ...safeUser } = refreshedUser;
      res.json({
        user: { ...safeUser, loginPassword: passwordHash || cleanPassword },
        token: `crm-uid:${refreshedUser.uid}`,
      });
    } catch (error: any) {
      console.error('Login failed:', error);
      res.status(500).json({ error: error.message || 'Authentication failed' });
    }
  });

  // 2. Public Auth Route: Sign Up New CRM User (or Activate Password for Dashboard-Added Agent)
  app.post('/api/auth/signup', async (req, res) => {
    try {
      await ensureSeedUsersAndData();
      const { name, email, password, role, phone, specialization, createdBySuperAdmin } =
        req.body;
      if (!name || !email || !password) {
        return res
          .status(400)
          .json({ error: 'Name, email, and password are required.' });
      }

      const cleanSignupEmail = String(email).toLowerCase().trim();
      const cleanPassword = String(password).trim();
      const snapshot = await loadCrmSnapshotFromDb();
      const existing = await findUserByEmail(cleanSignupEmail);

      // If email was already added from the Dashboard (Sales Team / Roles) as a non-Super-Admin,
      // allow Sign Up to update/set their password & details instead of throwing "already exists" error!
      if (existing) {
        if (existing.role === 'Super Admin' && !createdBySuperAdmin) {
          return res.status(409).json({
            error: 'Super Admin account is already registered. Please use the Login tab.',
          });
        }
        const nextRole =
          createdBySuperAdmin && role && role !== 'Super Admin'
            ? role
            : existing.role || 'Sales Agent';
        const updatedUser = await updateCrmUserRoleAndAgent(existing.uid, {
          name: String(name).trim(),
          password: cleanPassword,
          role: nextRole,
          phone: phone ? String(phone).trim() : existing.phone,
        });
        const finalUser = updatedUser || existing;
        const { passwordHash, ...safeUser } = finalUser;
        return res.json({
          user: { ...safeUser, loginPassword: passwordHash || cleanPassword },
          token: `crm-uid:${finalUser.uid}`,
        });
      }

      const superAdminExists = await hasSuperAdminInDb();

      let assignedRole: string;
      if (cleanSignupEmail === 'malik59223@gmail.com' || !superAdminExists) {
        assignedRole = 'Super Admin';
      } else if (createdBySuperAdmin && role && role !== 'Super Admin') {
        assignedRole = role;
      } else {
        assignedRole = 'Sales Agent';
      }

      let linkedAgentId = '';

      // Every non-Super-Admin user (Sales Agent, Sales Manager, Admin) gets a dedicated Agent ID in CRM
      if (assignedRole !== 'Super Admin' && snapshot) {
        const existingAgentByEmail = (snapshot.agents || []).find(
          (a: any) => String(a.email).toLowerCase().trim() === cleanSignupEmail
        );

        if (existingAgentByEmail) {
          linkedAgentId = existingAgentByEmail.id;
          existingAgentByEmail.name = String(name).trim();
          existingAgentByEmail.systemRole = assignedRole;
          existingAgentByEmail.roleTitle = assignedRole;
          existingAgentByEmail.loginPassword = cleanPassword;
          if (phone) existingAgentByEmail.phone = String(phone).trim();
        } else {
          const maxNum = (snapshot.agents || []).reduce((max: number, a: any) => {
            const num = parseInt(String(a.id || '').replace('AGT-', ''), 10);
            return !isNaN(num) && num > max ? num : max;
          }, 8);
          const nextIdx = maxNum + 1;
          linkedAgentId = nextIdx < 10 ? `AGT-0${nextIdx}` : `AGT-${nextIdx}`;
          const parts = String(name).trim().split(' ');
          const initials =
            parts.length >= 2
              ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
              : String(name).slice(0, 2).toUpperCase();

          const newAgentRecord = {
            id: linkedAgentId,
            name: String(name).trim(),
            roleTitle: assignedRole,
            systemRole: assignedRole,
            loginPassword: cleanPassword,
            avatarUrl: '',
            initials,
            phone: phone || '+92 300 0000000',
            email: cleanSignupEmail,
            joiningDate: '2026-11-11',
            accountStatus: 'Active' as const,
            specialization: specialization || `${assignedRole} (${cleanSignupEmail})`,
          };

          snapshot.agents = [newAgentRecord, ...(snapshot.agents || [])];
        }
      }

      const createdUser = await registerCrmUserAccount({
        name,
        email: cleanSignupEmail,
        passwordHash: cleanPassword,
        role: assignedRole,
        agentId: linkedAgentId,
        phone: phone || '+92 300 0000000',
        specialization:
          assignedRole === 'Super Admin'
            ? 'Executive Leadership & Full System Control'
            : specialization || 'Real Estate Consultant',
      });

      if (snapshot) {
        await saveCrmSnapshotToDb(snapshot);
      }

      const { passwordHash, ...safeUser } = createdUser;
      res.json({
        user: { ...safeUser, loginPassword: passwordHash || cleanPassword },
        token: `crm-uid:${createdUser.uid}`,
      });
    } catch (error: any) {
      console.error('Sign up failed:', error);
      res.status(500).json({ error: error.message || 'Sign up failed' });
    }
  });

  // 3. Protected Route: Sync Google Sign-In User with PostgreSQL users table
  app.post('/api/auth/google-sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureSeedUsersAndData();
      const uid = req.user?.uid;
      const email = req.user?.email || 'user@crestlinerealty.pk';
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized user' });
      }
      const dbUser = await getOrCreateUser(uid, email, req.body?.name);
      const { passwordHash, ...safeUser } = dbUser;
      res.json({ user: safeUser });
    } catch (error: any) {
      console.error('Google user sync failed:', error);
      res.status(500).json({ error: error.message || 'Failed to sync user' });
    }
  });

  // 4. Protected Route: Bootstrap CRM Data & Team Accounts
  app.get('/api/crm/bootstrap', requireAuth, async (req: AuthRequest, res) => {
    try {
      const snapshot = await loadCrmSnapshotFromDb();
      const allUsers = await getAllUsers();
      const currentUser = req.user?.uid ? await findUserByUid(req.user.uid) : null;

      const safeUsers = allUsers.map(({ passwordHash, ...rest }) => ({
        ...rest,
        loginPassword: passwordHash || '123456',
      }));

      res.json({
        snapshot,
        users: safeUsers,
        currentUser: currentUser
          ? (() => {
              const { passwordHash, ...safe } = currentUser;
              return { ...safe, loginPassword: passwordHash || '123456' };
            })()
          : null,
      });
    } catch (error: any) {
      console.error('Failed to bootstrap CRM:', error);
      res.status(500).json({ error: error.message || 'Failed to load CRM data' });
    }
  });

  // 5. Protected Route: Save / Sync CRM State to PostgreSQL
  app.post('/api/crm/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { snapshot } = req.body;
      if (!snapshot || !Array.isArray(snapshot.leads)) {
        return res.status(400).json({ error: 'Invalid CRM snapshot payload' });
      }
      await saveCrmSnapshotToDb(snapshot);
      const refreshedUsers = await getAllUsers();
      const safeUsers = refreshedUsers.map(({ passwordHash, ...rest }) => ({
        ...rest,
        loginPassword: passwordHash || '123456',
      }));
      res.json({ ok: true, users: safeUsers });
    } catch (error: any) {
      console.error('Failed to sync CRM snapshot:', error);
      res.status(500).json({ error: error.message || 'Failed to save CRM state' });
    }
  });

  // 6. Protected Route: Update User Role / Password / Linked Agent ID (Strictly Super Admin Only)
  app.patch('/api/crm/users/:uid', requireAuth, async (req: AuthRequest, res) => {
    try {
      const requester = req.user?.uid ? await findUserByUid(req.user.uid) : null;
      if (!requester || requester.role !== 'Super Admin') {
        return res.status(403).json({
          error: 'Only the Super Admin can assign or modify user roles.',
        });
      }

      const { uid } = req.params;
      const { role, agentId, accountStatus, name, password, email } = req.body;
      const updated = await updateCrmUserRoleAndAgent(uid, {
        role,
        agentId,
        accountStatus,
        name,
        password,
        email,
      });
      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }
      const { passwordHash, ...safeUser } = updated;
      res.json({ user: { ...safeUser, loginPassword: passwordHash || '123456' } });
    } catch (error: any) {
      console.error('Failed to update user role:', error);
      res.status(400).json({ error: error.message || 'Failed to update user role' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Crestline Realty CRM Server running on http://localhost:${PORT}`);
  });
}

startServer();
