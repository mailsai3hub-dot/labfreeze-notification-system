import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// ================= FIREBASE CONFIG =================

function parseServiceAccount(raw) {
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing');
  }

  let text = raw.trim();

  // لو secret متخزن كنص JSON عادي
  try {
    const obj = JSON.parse(text);
    if (obj.private_key) {
      obj.private_key = obj.private_key.replace(/\\n/g, '\n');
    }
    return obj;
  } catch (_) {}

  // لو secret متخزن كنص محاط بعلامات اقتباس
  try {
    const unwrapped = text.replace(/^['"]|['"]$/g, '');
    const obj = JSON.parse(unwrapped);
    if (obj.private_key) {
      obj.private_key = obj.private_key.replace(/\\n/g, '\n');
    }
    return obj;
  } catch (_) {}

  throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
}

let serviceAccount;

try {
  serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);

  if (typeof serviceAccount.project_id !== 'string' || !serviceAccount.project_id) {
    throw new Error('Missing project_id in FIREBASE_SERVICE_ACCOUNT');
  }

  if (typeof serviceAccount.client_email !== 'string' || !serviceAccount.client_email) {
    throw new Error('Missing client_email in FIREBASE_SERVICE_ACCOUNT');
  }

  if (typeof serviceAccount.private_key !== 'string' || !serviceAccount.private_key) {
    throw new Error('Missing private_key in FIREBASE_SERVICE_ACCOUNT');
  }
} catch (err) {
  console.error('❌ Firebase JSON Error:', err.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore();

// ================= EMAIL + WHATSAPP CONFIG =================

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
      }
    }
  } catch (err) {
    console.error('❌ Firestore Error:', err.message);
  }
}

console.log('🚀 LabFreeze Notification Engine is LIVE');
console.log('FIREBASE_SERVICE_ACCOUNT exists:', !!process.env.FIREBASE_SERVICE_ACCOUNT);

checkAndSendSchedules();

cron.schedule('0 * * * *', () => {
  console.log('⏰ Running scheduled check...');
  checkAndSendSchedules();
});