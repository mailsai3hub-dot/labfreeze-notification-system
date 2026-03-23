import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// ================= 1. FIREBASE CONFIG =================

const FIREBASE_DATABASE_ID = 'ai-studio-a5c3223e-5fa3-407f-b8e3-1b9d0e6a0130';

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('❌ CRITICAL ERROR: FIREBASE_SERVICE_ACCOUNT is missing!');
  process.exit(1);
}

let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
} catch (err) {
  console.error('❌ CRITICAL ERROR: Failed to parse FIREBASE_SERVICE_ACCOUNT JSON');
  console.error(err.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore(admin.app(), FIREBASE_DATABASE_ID);

// ================= 2. SERVICES CONFIG =================

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

// ================= 3. DEBUG =================

console.log('🚀 LabFreeze Notification Engine is LIVE');
console.log('TWILIO_SID exists:', !!process.env.TWILIO_SID);
console.log('TWILIO_TOKEN exists:', !!process.env.TWILIO_TOKEN);
console.log('FIREBASE_SERVICE_ACCOUNT exists:', !!process.env.FIREBASE_SERVICE_ACCOUNT);

// ================= 4. SEND FUNCTION =================

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

// ================= 5. FIRESTORE CHECK =================

async function checkAndSendSchedules() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`🔍 Checking schedules for: ${today}`);

  try {
    const snapshot = await db
      .collection('schedules')
      .where('date', '==', today)
      .get();

    if (snapshot.empty) {
      console.log('ℹ️ No schedules for today.');
      return;
    }

    for (const doc of snapshot.docs) {
      const schedule = doc.data();

      if (!schedule.sent) {
        const success = await triggerNotification(schedule);

        if (success) {
          await db.collection('schedules').doc(doc.id).update({
            sent: true
          });
          console.log(`✅ Marked as sent: ${doc.id}`);
        } else {
          console.log(`⚠️ Sending failed for: ${doc.id}`);
        }
      }
    }
  } catch (err) {
    console.error('❌ Firestore Error:', err.message);
  }
}

// ================= 6. RUN NOW + CRON =================

checkAndSendSchedules();

cron.schedule('0 * * * *', () => {
  console.log('⏰ Running scheduled check...');
  checkAndSendSchedules();
});