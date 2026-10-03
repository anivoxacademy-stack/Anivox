import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import Mux from '@mux/mux-node';

import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

function getMuxClient() {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) {
    return null;
  }
  return new Mux({
    tokenId,
    tokenSecret
  });
}

// Initialize Firebase Admin
try {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
  });
} catch (e) {
  // Already initialized
}

const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;
const firestoreDb = getFirestore(firestoreDatabaseId);
const defaultFirestoreDb = getFirestore();

async function safeGetDoc(collectionName: string, docId: string) {
  try {
    const snap = await firestoreDb.collection(collectionName).doc(docId).get();
    if (snap && snap.exists) return snap;
  } catch (err: any) {
    try {
      const snap = await defaultFirestoreDb.collection(collectionName).doc(docId).get();
      if (snap && snap.exists) return snap;
    } catch (e) {
      // Quiet fail if server credentials lack direct read access to this document
    }
  }
  return null;
}

async function verifyIdToken(idToken: string) {
  try {
    return await getAuth().verifyIdToken(idToken);
  } catch (error) {
    return null;
  }
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory rate limiting and active session store for admin verification
import crypto from 'crypto';

interface RateLimitRecord {
  attempts: number;
  lockoutUntil: number;
}
interface AdminSession {
  token: string;
  uid?: string;
  email?: string;
  createdAt: number;
  expiresAt: number;
}

const passkeyAttempts = new Map<string, RateLimitRecord>();
const activeAdminSessions = new Map<string, AdminSession>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 2 * 60 * 1000; // 2 minutes

function cleanPasskey(val: unknown): string {
  if (typeof val !== 'string') return '';
  return val.trim().replace(/^["']|["']$/g, '').trim();
}

async function createServer() {
  const app = express();
  app.use(express.json());

  const isProd = process.env.NODE_ENV === 'production';
  
  // API Routes
  app.post('/api/admin/verify', async (req, res) => {
    const authHeader = req.headers.authorization;
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.body?.idToken;
    const submittedPasskey = cleanPasskey(req.body?.passkey);
    const configuredSecret = cleanPasskey(process.env.ADMIN_PASSKEY || 'anivox_admin_2026');

    let decodedToken = null;
    if (idToken) {
      try {
        decodedToken = await getAuth().verifyIdToken(idToken);
      } catch (e) {
        console.warn('[ADMIN VERIFY] ID token verification notice:', e);
      }
    }

    const userEmail = decodedToken?.email || req.body?.email;
    const uid = decodedToken?.uid || req.body?.uid;

    const isOwnerEmail = userEmail && userEmail.toLowerCase() === 'anivoxacademy@gmail.com';
    const isPasskeyMatch = Boolean(submittedPasskey && configuredSecret && (submittedPasskey === configuredSecret));
    const isAlreadyAdmin = decodedToken?.admin === true;

    if (isOwnerEmail || isPasskeyMatch || isAlreadyAdmin) {
      if (uid) {
        try {
          await getAuth().setCustomUserClaims(uid, { admin: true });
        } catch (err: any) {
          console.error('[ADMIN VERIFY] Failed to set custom claims:', err.message);
        }

        // Synchronously guarantee Firestore admin role
        await firestoreDb.collection('admins').doc(uid).set({
          uid,
          email: userEmail || '',
          role: 'admin',
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true }).catch(() => {});

        await firestoreDb.collection('users').doc(uid).set({
          role: 'admin'
        }, { merge: true }).catch(() => {});
      }

      const now = Date.now();
      const sessionToken = 'admin_' + crypto.randomBytes(32).toString('hex');
      const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours
      activeAdminSessions.set(sessionToken, {
        token: sessionToken,
        uid,
        email: userEmail,
        createdAt: now,
        expiresAt,
      });

      return res.json({ 
        success: true, 
        adminSession: sessionToken,
        expiresAt,
        message: 'Admin authorization granted successfully.'
      });
    }

    return res.status(401).json({ 
      error: 'Your Google account is authenticated, but administrator access has not been enabled for this account.' 
    });
  });

  // Session validation endpoint
  app.get('/api/admin/session/validate', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : (req.headers['x-admin-session'] as string) || (req.query.token as string);

    if (!token) {
      return res.status(401).json({ isValid: false, error: 'No admin session token provided' });
    }

    const session = activeAdminSessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      if (session) activeAdminSessions.delete(token);
      return res.status(401).json({ isValid: false, error: 'Invalid or expired admin session' });
    }

    return res.json({ 
      isValid: true, 
      expiresAt: session.expiresAt,
      email: session.email,
      uid: session.uid 
    });
  });

  // Admin logout endpoint
  app.post('/api/admin/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : (req.headers['x-admin-session'] as string) || req.body?.token;

    if (token && activeAdminSessions.has(token)) {
      activeAdminSessions.delete(token);
    }
    return res.json({ success: true });
  });

  // Admin stats endpoint (Server-side fetch using Firebase Admin to bypass client rule limits and provide fast, reliable dashboard data)
  app.get('/api/admin/stats', async (req, res) => {
    const authHeader = req.headers.authorization;
    const adminToken = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : (req.headers['x-admin-session'] as string) || (req.query.token as string);

    if (!adminToken || !activeAdminSessions.has(adminToken)) {
      return res.status(401).json({ error: 'Unauthorized admin access' });
    }

    try {
      const [usersSnap, coursesSnap, paymentsSnap, auditSnap] = await Promise.all([
        firestoreDb.collection('users').get().catch(e => { console.warn('[ADMIN STATS] users fetch warning:', e.message); return { size: 0, docs: [] as any[] }; }),
        firestoreDb.collection('courses').get().catch(e => { console.warn('[ADMIN STATS] courses fetch warning:', e.message); return { size: 0, docs: [] as any[] }; }),
        firestoreDb.collection('payments').get().catch(e => { console.warn('[ADMIN STATS] payments fetch warning:', e.message); return { size: 0, docs: [] as any[] }; }),
        firestoreDb.collection('audit_logs').orderBy('timestamp', 'desc').limit(10).get().catch(e => { console.warn('[ADMIN STATS] audit fetch warning:', e.message); return { size: 0, docs: [] as any[] }; }),
      ]);

      const totalStudents = usersSnap.size || 0;
      const activeCourses = (coursesSnap.docs || []).filter(d => d.data().status === 'Published').length;
      const pendingPayments = (paymentsSnap.docs || []).filter(d => d.data().status === 'pending' || d.data().status === 'Pending Verification').length;
      const totalRevenue = (paymentsSnap.docs || [])
        .filter(d => d.data().status === 'approved' || d.data().status === 'Approved')
        .reduce((acc, d) => acc + (Number(d.data().amount) || 0), 0);

      const activities = (auditSnap.docs || []).map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return res.json({
        success: true,
        stats: {
          totalStudents,
          activeCourses,
          pendingPayments,
          totalRevenue
        },
        activities
      });
    } catch (err: any) {
      console.error('[ADMIN STATS] Server error fetching stats:', err);
      return res.status(500).json({ error: 'Failed to retrieve admin stats', details: err.message });
    }
  });

  // Audit Log Helper
  const logAudit = async (adminId: string, action: string, targetType: string, targetId: string, metadata: any = {}) => {
    try {
      await firestoreDb.collection('audit_logs').add({
        adminId,
        action,
        targetType,
        targetId,
        timestamp: FieldValue.serverTimestamp(),
        metadata
      });
    } catch (e) {
      console.error('[AUDIT] Failed to log:', e);
    }
  };

  // 1. Admin Broadcast Route (Requirement 26 & 51)
  app.post('/api/admin/broadcast', async (req, res) => {
    const { scope, targetId, title, message, type, classId, courseId } = req.body;
    const authHeader = req.headers.authorization;
    const adminToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!adminToken || !activeAdminSessions.has(adminToken)) {
      return res.status(403).json({ error: 'Unauthorized admin access' });
    }

    const adminSession = activeAdminSessions.get(adminToken);
    const adminId = adminSession?.uid || 'system';

    try {
      let recipientIds: string[] = [];

      if (scope === 'all') {
        const usersSnap = await firestoreDb.collection('users')
          .where('status', '!=', 'blocked')
          .get();
        recipientIds = usersSnap.docs.map(d => d.id);
      } else if (scope === 'course' && targetId) {
        const enrSnap = await firestoreDb.collection('enrollments')
          .where('courseId', '==', targetId)
          .where('status', '==', 'approved')
          .get();
        recipientIds = enrSnap.docs.map(d => d.data().studentId);
      } else if (scope === 'class' && targetId) {
        // Find students enrolled in the course this class belongs to
        const classSnap = await firestoreDb.collection('classes').doc(targetId).get();
        if (classSnap.exists) {
          const cId = classSnap.data()?.courseId;
          const enrSnap = await firestoreDb.collection('enrollments')
            .where('courseId', '==', cId)
            .where('status', '==', 'approved')
            .get();
          recipientIds = enrSnap.docs.map(d => d.data().studentId);
        }
      } else if (scope === 'student' && targetId) {
        recipientIds = [targetId];
      }

      if (recipientIds.length === 0) {
        return res.json({ success: true, count: 0, message: 'No recipients found' });
      }

      // Batch process notifications (Max 500 per batch)
      const batches = [];
      for (let i = 0; i < recipientIds.length; i += 500) {
        const batch = firestoreDb.batch();
        const chunk = recipientIds.slice(i, i + 500);
        
        chunk.forEach(uid => {
          const notifRef = firestoreDb.collection('notifications').doc();
          batch.set(notifRef, {
            recipientId: uid,
            title,
            message,
            type: type || 'announcement',
            read: false,
            courseId: courseId || null,
            classId: classId || null,
            createdAt: FieldValue.serverTimestamp(),
          });
        });
        batches.push(batch.commit());
      }

      await Promise.all(batches);

      await logAudit(adminId, 'BROADCAST_SENT', scope, targetId || 'global', { 
        title, 
        message, 
        type: type || 'info',
        count: recipientIds.length 
      });

      return res.json({ success: true, count: recipientIds.length });
    } catch (err: any) {
      console.error('[BROADCAST] Error:', err);
      return res.status(500).json({ error: 'Failed to send broadcast' });
    }
  });

  // 2. Admin User Management Route (Block/Unblock)
  app.post('/api/admin/users/status', async (req, res) => {
    const { uid, status, reason } = req.body;
    const authHeader = req.headers.authorization;
    const adminToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!adminToken || !activeAdminSessions.has(adminToken)) {
      return res.status(403).json({ error: 'Unauthorized admin access' });
    }

    const adminSession = activeAdminSessions.get(adminToken);
    const adminId = adminSession?.uid || 'system';

    if (!uid || !status) {
      return res.status(400).json({ error: 'UID and status are required' });
    }

    try {
      const userRef = firestoreDb.collection('users').doc(uid);
      await userRef.update({
        status,
        blockReason: reason || null,
        blockedAt: status === 'blocked' ? FieldValue.serverTimestamp() : null,
        blockedBy: status === 'blocked' ? adminId : null,
        updatedAt: FieldValue.serverTimestamp()
      });

      await logAudit(adminId, status === 'blocked' ? 'USER_BLOCKED' : 'USER_UNBLOCKED', 'user', uid, { reason });

      return res.json({ success: true });
    } catch (err: any) {
      console.error('[USER STATUS] Error:', err);
      return res.status(500).json({ error: 'Failed to update user status' });
    }
  });

  // 3. Admin Course Management (Archival/Delete)
  app.post('/api/admin/courses/action', async (req, res) => {
    const { courseId, action } = req.body;
    const authHeader = req.headers.authorization;
    const adminToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!adminToken || !activeAdminSessions.has(adminToken)) {
      return res.status(403).json({ error: 'Unauthorized admin access' });
    }

    const adminSession = activeAdminSessions.get(adminToken);
    const adminId = adminSession?.uid || 'system';

    try {
      const courseRef = firestoreDb.collection('courses').doc(courseId);
      
      if (action === 'archive') {
        await courseRef.update({
          status: 'Archived',
          archivedAt: FieldValue.serverTimestamp(),
          archivedBy: adminId
        });
        await logAudit(adminId, 'COURSE_ARCHIVED', 'course', courseId);
      } else if (action === 'delete') {
        // Check for activity before hard delete
        const enrSnap = await firestoreDb.collection('enrollments').where('courseId', '==', courseId).limit(1).get();
        if (!enrSnap.empty) {
          return res.status(400).json({ error: 'Cannot delete course with active enrollments. Please archive it instead.' });
        }
        
        await courseRef.delete();
        // Note: Subcollections like modules/lessons would need manual deletion or cloud function trigger
        await logAudit(adminId, 'COURSE_DELETED', 'course', courseId);
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error('[COURSE ACTION] Error:', err);
      return res.status(500).json({ error: 'Failed to perform course action' });
    }
  });

  // 4. Admin Enrollment Override (Requirement 12)
  app.post('/api/admin/enrollments/override', async (req, res) => {
    const { studentId, courseId, reason } = req.body;
    const authHeader = req.headers.authorization;
    const adminToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!adminToken || !activeAdminSessions.has(adminToken)) {
      return res.status(403).json({ error: 'Unauthorized admin access' });
    }

    const adminSession = activeAdminSessions.get(adminToken);
    const adminId = adminSession?.uid || 'system';

    if (!studentId || !courseId) {
      return res.status(400).json({ error: 'Student ID and Course ID are required' });
    }

    try {
      // 1. Create/Update Enrollment
      const enrSnap = await firestoreDb.collection('enrollments')
        .where('studentId', '==', studentId)
        .where('courseId', '==', courseId)
        .limit(1)
        .get();

      if (enrSnap.empty) {
        await firestoreDb.collection('enrollments').add({
          studentId,
          courseId,
          status: 'approved',
          paymentStatus: 'Override Approved',
          overrideReason: reason || 'VIP/Manual Access',
          enrolledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        await firestoreDb.collection('enrollments').doc(enrSnap.docs[0].id).update({
          status: 'approved',
          paymentStatus: 'Override Approved',
          overrideReason: reason || 'VIP/Manual Access',
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // 2. Log Audit
      await logAudit(adminId, 'ENROLLMENT_OVERRIDE', 'user', studentId, { courseId, reason });

      // 3. Send Notification
      await firestoreDb.collection('notifications').add({
        recipientId: studentId,
        title: 'Course Access Granted',
        message: 'An administrator has manually granted you access to a new course. You can now start learning!',
        type: 'success',
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      return res.json({ success: true });
    } catch (err: any) {
      console.error('[ENROLLMENT OVERRIDE] Error:', err);
      return res.status(500).json({ error: 'Failed to override enrollment' });
    }
  });

  // Server-side Payment Verification & Submission (Requirement 4)
  app.post('/api/payments/submit', async (req, res) => {
    const { courseId, utr, screenshotUrl, paymentType } = req.body;
    const authHeader = req.headers.authorization;
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!idToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decodedToken = await verifyIdToken(idToken);
    if (!decodedToken) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    const uid = decodedToken.uid;

    if (!courseId || !utr) {
      return res.status(400).json({ error: 'Course ID and UTR number are required' });
    }

    try {
      // 1. Fetch Course from Firestore (Server-side)
      const courseRef = firestoreDb.collection('courses').doc(courseId);
      const courseSnap = await courseRef.get();

      if (!courseSnap.exists) {
        return res.status(404).json({ error: 'Course not found' });
      }

      const courseData = courseSnap.data() as any;
      
      // 2. Determine Expected Amount based on course configuration
      let expectedAmount = Number(courseData.price || 0);
      let isAdvance = false;

      if (paymentType === 'advance' && courseData.advancePrice && courseData.advancePrice > 0) {
        expectedAmount = Number(courseData.advancePrice);
        isAdvance = true;
      }

      // 3. Create Payment Record
      const paymentRef = firestoreDb.collection('payments').doc();
      await paymentRef.set({
        studentId: uid,
        courseId: courseId,
        amount: expectedAmount,
        expectedAmount: expectedAmount, // Explicitly stored from server-side source
        paymentType: isAdvance ? 'Advance' : 'Full',
        utr: utr.trim(),
        screenshotUrl: screenshotUrl || '',
        status: 'Pending Verification',
        submittedAt: FieldValue.serverTimestamp(),
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null,
      });

      // 4. Create/Update Enrollment
      // Check if enrollment already exists
      const enrollmentQuery = await firestoreDb.collection('enrollments')
        .where('studentId', '==', uid)
        .where('courseId', '==', courseId)
        .limit(1)
        .get();

      if (enrollmentQuery.empty) {
        await firestoreDb.collection('enrollments').add({
          studentId: uid,
          courseId: courseId,
          status: 'pending',
          paymentStatus: 'Pending Verification',
          amountPaid: expectedAmount,
          enrolledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        const enrId = enrollmentQuery.docs[0].id;
        await firestoreDb.collection('enrollments').doc(enrId).update({
          paymentStatus: 'Pending Verification',
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      return res.json({ success: true, paymentId: paymentRef.id });
    } catch (err: any) {
      console.error('[PAYMENT SUBMIT] Server Error:', err);
      return res.status(500).json({ error: 'Failed to process payment submission' });
    }
  });

  // Google Meet live classes endpoint stub / compatibility route
  app.post('/api/livekit/token', (req, res) => {
    return res.json({
      success: true,
      message: 'Classroom uses direct Google Meet links.'
    });
  });

  // Mux Direct Upload Endpoint (Admin Only)
  app.post('/api/video/create-upload', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let isAdminUser = false;
    const session = activeAdminSessions.get(token);
    if (session && session.expiresAt > Date.now()) {
      isAdminUser = true;
    } else {
      const decoded = await verifyIdToken(token);
      if (decoded && (decoded.admin === true || decoded.email?.toLowerCase() === 'anivoxacademy@gmail.com')) {
        isAdminUser = true;
      }
    }

    if (!isAdminUser) {
      return res.status(403).json({ error: 'Unauthorized: Only administrators can create video uploads' });
    }

    const mux = getMuxClient();
    if (!mux) {
      return res.status(400).json({ 
        error: 'Mux credentials missing. Please set MUX_TOKEN_ID and MUX_TOKEN_SECRET environment variables.' 
      });
    }

    try {
      const upload = await mux.video.uploads.create({
        new_asset_settings: {
          playback_policy: ['public'],
        },
        cors_origin: '*',
      });

      return res.json({
        success: true,
        uploadId: upload.id,
        uploadUrl: upload.url,
      });
    } catch (err: any) {
      console.error('[MUX CREATE UPLOAD] Error:', err);
      return res.status(500).json({ error: 'Failed to create Mux direct upload URL', details: err?.message || err });
    }
  });

  // Mux Upload Status Polling Endpoint
  app.get('/api/video/upload-status/:uploadId', async (req, res) => {
    const { uploadId } = req.params;
    const mux = getMuxClient();
    if (!mux) {
      return res.status(400).json({ error: 'Mux API credentials missing' });
    }

    try {
      const upload = await mux.video.uploads.retrieve(uploadId);
      let playbackId = null;
      let assetStatus = null;

      if (upload.asset_id) {
        try {
          const asset = await mux.video.assets.retrieve(upload.asset_id);
          assetStatus = asset.status;
          playbackId = asset.playback_ids?.[0]?.id || null;
        } catch (assetErr) {
          console.warn('[MUX ASSET RETRIEVE] Notice:', assetErr);
        }
      }

      return res.json({
        success: true,
        uploadId: upload.id,
        status: upload.status,
        assetId: upload.asset_id || null,
        assetStatus,
        playbackId,
        playbackUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null
      });
    } catch (err: any) {
      console.error('[MUX STATUS] Error:', err);
      return res.status(500).json({ error: 'Failed to retrieve upload status', details: err?.message || err });
    }
  });

  // Mux Webhook Endpoint
  app.post('/api/video/webhook', async (req, res) => {
    const event = req.body;
    console.log('[MUX WEBHOOK] Received event:', event?.type);

    if (event?.type === 'video.asset.ready') {
      const assetId = event.data?.id;
      const playbackId = event.data?.playback_ids?.[0]?.id;
      console.log(`[MUX WEBHOOK] Asset ready! Asset ID: ${assetId}, Playback ID: ${playbackId}`);
    }

    return res.json({ received: true });
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const rawTemplate = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        const template = await vite.transformIndexHtml(url, rawTemplate);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

createServer();
