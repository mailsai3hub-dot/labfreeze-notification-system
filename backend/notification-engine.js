import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// ================= FIREBASE CONFIG =================

function loadServiceAccountFromBase64() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!raw) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_BASE64');
  }

  const jsonText = Buffer.from(raw, 'base64').toString('utf8');
  const serviceAccount = JSON.parse(jsonText);

  if (!serviceAccount.project_id || typeof serviceAccount.project_id !== 'string') {
    throw new Error('Missing project_id in service account JSON');
  }

  if (!serviceAccount.client_email || typeof serviceAccount.client_email !== 'string') {
    throw new Error('Missing client_email in service account JSON');
  }

  if (!serviceAccount.private_key || typeof serviceAccount.private_key !== 'string') {
    throw new Error('Missing private_key in service account JSON');
  }

  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  return serviceAccount;
}

let serviceAccount;

try {
  serviceAccount = loadServiceAccountFromBase64();
} catch (err) {
  console.error('❌ Firebase Config Error:', err.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore();

// ================= SERVICES CONFIG =================

const transporter =
  process.env.EMAIL_USER && process.env.EMAIL_PASS
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      })
    : null;

const client =
  process.env.TWILIO_SID && process.env.TWILIO_TOKEN
    ? twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN)
    : null;

// ================= SEND FUNCTION =================

async function triggerNotification(schedule) {
  const message = `تذكير جرد مختبر: ${schedule.message || 'موعد الجرد الدوري'}`;
  let sent = false;

  if (
    (schedule.type === 'WhatsApp' || schedule.type === 'Both') &&
    client &&
    schedule.staffPhone
  ) {
    try {
      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${schedule.staffPhone}`,
        body: message
      });
      console.log(`📱 WhatsApp sent to ${schedule.staffPhone}`);
      sent = true;
    } catch (err) {
      console.error('❌ WhatsApp Error:', err.message);
    }
  }

  if (
    (schedule.type === 'Email' || schedule.type === 'Both') &&
    transporter &&
    schedule.staffEmail
  ) {
    try {
      await transporter.sendMail({
        from: `"LabFreeze System" <${process.env.EMAIL_USER}>`,
        to: schedule.staffEmail,
        subject: 'تنبيه جرد الثلاجة',
        text: message
      });
      console.log(`📧 Email sent to ${schedule.staffEmail}`);
      sent = true;
    } catch (err) {
      console.error('❌ Email Error:', err.message);
    }
  }

  return sent;
}

// ================= CHECK SCHEDULES =================

async function checkAndSendSchedules() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`🔍 Checking schedules for: ${today}`);

  try {
    const snapshot = await db.collection('schedules').where('date', '==', today).get();

    if (snapshot.empty) {
      console.log('ℹ️ No schedules for today.');
      return;
    }

    for (const doc of snapshot.docs) {
      const schedule = doc.data();

      if (!schedule.sent) {
        const success = await triggerNotification(schedule);

        if (success) {
          await db.collection('schedules').doc(doc.id).update({ sent: true });
          console.log(`✅ Marked as sent: ${doc.id}`);
        }
      } else {
        console.log(`ℹ️ Already sent: ${doc.id}`);
      }
    }
  } catch (err) {
    console.error('❌ Firestore Error:', err.message);
  }
}

console.log('🚀 LabFreeze Notification Engine is LIVE');
console.log('FIREBASE_SERVICE_ACCOUNT_BASE64 exists:', !!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64);

checkAndSendSchedules();

cron.schedule('0 * * * *', () => {
  console.log('⏰ Running scheduled check...');
  checkAndSendSchedules();
});