import { Router, Request, Response } from 'express';
import { findAll, findOne, insert, update, increment, logActivity, notify } from '../schools/store.js';
import { getDb } from '../db.js';
import {
  makeId, type PaymentDoc, type ProjectDoc, type DocumentDoc, type ClientDoc, type MessageDoc, stageIndex,
} from '../schools/types.js';
import { paystackSignature, constantTimeEqual } from '../marketplace/types.js';
import { verifyPaystack } from '../marketplace/payment.js';
import { sendTelegramText } from '../services/telegram.js';

const router = Router();
const WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET || '';

async function finalizePayment(payment: PaymentDoc, eventId?: string, gatewayResponse?: string): Promise<PaymentDoc | null> {
  if (payment.status === 'success') return payment;
  const now = new Date().toISOString();
  const db = getDb();
  if (!db) return null;
  const claimed = await db.collection('sc_payments').findOneAndUpdate(
    { id: payment.id, status: { $ne: 'success' } } as any,
    {
      $set: {
        status: 'success',
        paidAt: now,
        gatewayResponse,
        webhookEventId: eventId,
        receiptNumber: `RCPT-${payment.reference.slice(-8)}`,
        updatedAt: now,
      },
    },
    { returnDocument: 'after' },
  );
  if (!claimed) return payment;
  const { _id, ...updatedRest } = claimed as any;
  const updated = updatedRest as PaymentDoc;
  await increment('sc_projects', 'id', payment.projectId, 'totalPaid', payment.amount);
  const project = await findOne<ProjectDoc>('sc_projects', { id: payment.projectId });
  if (project) {
    const nextPaid = project.totalPaid;
    const desiredStage = payment.type === 'deposit' ? 'onboarding' : payment.type === 'final' ? 'deployment' : 'development';
    const stage = stageIndex(project.stage) < stageIndex(desiredStage) ? desiredStage : project.stage;
    await update<ProjectDoc>('sc_projects', 'id', project.id, {
      stage: nextPaid >= project.cost ? 'deployment' : stage,
      updatedAt: now,
    });
    const receipt: DocumentDoc = {
      id: makeId(), projectId: project.id, category: 'receipt',
      title: `Payment receipt ${payment.reference}`,
      content: [
        `Receipt: RCPT-${payment.reference.slice(-8)}`,
        `School: ${project.schoolName}`,
        `Payment: ${payment.description}`,
        `Amount: NGN ${payment.amount.toLocaleString()}`,
        `Reference: ${payment.reference}`,
        `Paystack reference: ${payment.paystackReference}`,
        `Date: ${now}`,
        `Status: PAID`,
      ].join('\n'),
      uploadedBy: 'system', clientVisible: true, createdAt: now,
    };
    await insert('sc_documents', receipt);
    const client = await findOne<ClientDoc>('sc_clients', { id: payment.clientId || project.clientId });
    if (client?.telegramChatId && client.telegramEnabled) {
      try { await sendTelegramText(client.telegramChatId, `Payment received: NGN ${payment.amount.toLocaleString()} · ${payment.reference}`); } catch {}
    }
    const receiptMessage: MessageDoc = {
      id: makeId(), projectId: project.id, senderId: 'paystack', senderName: 'Gtech admin',
      senderRole: 'admin', message: receipt.content || `Payment receipt ${payment.reference}`, read: false, channel: 'paystack', createdAt: now,
    };
    await insert('sc_messages', receiptMessage);
    await notify({ clientId: payment.clientId, projectId: project.id, audience: 'client', title: 'Payment received', message: `${payment.reference} · NGN ${payment.amount.toLocaleString()}`, type: 'payment' });
    await notify({ audience: 'admin', title: 'School payment received', message: `${project.schoolName} · NGN ${payment.amount.toLocaleString()}`, type: 'payment' });
    await logActivity({ clientId: payment.clientId, projectId: project.id, actor: 'paystack', action: 'payment.success', detail: payment.reference });
  }
  return updated;
}

router.post('/webhook', async (req: Request, res: Response) => {
  const body = (req as any).rawBody || JSON.stringify(req.body || {});
  const signature = String(req.headers['x-paystack-signature'] || '');
  if (!WEBHOOK_SECRET || !signature || !constantTimeEqual(signature, paystackSignature(WEBHOOK_SECRET, body))) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }
  const event = req.body || {};
  const eventId = String(event.id || event.data?.id || makeId());
  const existing = await findOne('sc_webhook_events', { id: eventId });
  if (existing) return res.json({ received: true, duplicate: true });
  await insert('sc_webhook_events', { id: eventId, event: event.event, reference: event.data?.reference, status: 'processed', createdAt: new Date().toISOString() });
  if (event.event !== 'charge.success') return res.json({ received: true, ignored: true });
  const paystackReference = event.data?.reference;
  if (!paystackReference) return res.json({ received: true, ignored: true });
  const payment = await findOne<PaymentDoc>('sc_payments', { paystackReference });
  if (!payment) return res.json({ received: true, ignored: true });
  const verification = await verifyPaystack(paystackReference);
  if (!verification.verified || verification.amount !== payment.amount) {
    await update('sc_webhook_events', 'id', eventId, { status: 'failed' });
    return res.status(400).json({ error: 'Payment verification mismatch' });
  }
  await finalizePayment(payment, eventId, verification.gatewayResponse);
  res.json({ received: true });
});

router.post('/verify', async (req: Request, res: Response) => {
  const reference = String(req.body.reference || '');
  if (!reference) return res.status(400).json({ error: 'Reference is required' });
  const payment = await findOne<PaymentDoc>('sc_payments', { reference })
    || await findOne<PaymentDoc>('sc_payments', { paystackReference: reference });
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (payment.status !== 'success') {
    const verification = await verifyPaystack(payment.paystackReference);
    if (!verification.verified || verification.amount !== payment.amount) {
      return res.json({ status: verification.status || 'pending', verified: false, amount: verification.amount });
    }
    await finalizePayment(payment, undefined, verification.gatewayResponse);
  }
  const project = await findOne<ProjectDoc>('sc_projects', { id: payment.projectId });
  const receipt = (await findAll<DocumentDoc>('sc_documents', { projectId: payment.projectId, category: 'receipt' }))
    .find((d) => d.title.includes(payment.reference));
  res.json({
    verified: true,
    status: 'success',
    payment: { reference: payment.reference, amount: payment.amount, type: payment.type, paidAt: payment.paidAt },
    project: project ? { reference: project.reference, schoolName: project.schoolName, stage: project.stage, totalPaid: project.totalPaid, cost: project.cost } : null,
    receipt: receipt?.content,
  });
});

export default router;
