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

  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

  return serviceAccount;
}

let serviceAccount;

try {
  serviceAccount = loadServiceAccountFromBase64();
  console.log('✅ Firebase loaded');
} catch (err) {
  console.error('❌ Firebase Error:', err.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore();

// ================= SERVICES =================

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

  // WhatsApp
  if (
    (schedule.type === 'WhatsApp' || schedule.type === 'Both') &&
    client &&
    schedule.staff_phone
  ) {
    try {
      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${schedule.staff_phone}`,
        body: message
      });
      console.log(`📱 WhatsApp sent to ${schedule.staff_phone}`);
      sent = true;
    } catch (err) {
      console.error('❌ WhatsApp Error:', err.message);
    }
  }

  // Email
  if (
    (schedule.type === 'Email' || schedule.type === 'Both') &&
    transporter &&
    schedule.staff_email
  ) {
    try {
      await transporter.sendMail({
        from: `"LabFreeze System" <${process.env.EMAIL_USER}>`,
        to: schedule.staff_email,
        subject: 'تنبيه جرد الثلاجة',
        text: message
      });
      console.log(`📧 Email sent to ${schedule.staff_email}`);
      sent = true;
    } catch (err) {
      console.error('❌ Email Error:', err.message);
    }
  }

  return sent;
}

// ================= MAIN =================

async function checkAndSendSchedules() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`🔍 Checking schedules for: ${today}`);

  try {
    const snapshot = await db
      .collection('inventory_schedules') // ✅ مهم جدًا
      .where('date', '==', today)
      .get();

    if (snapshot.empty) {
      console.log('ℹ️ No schedules for today.');
      return;
    }

    for (const doc of snapshot.docs) {
      const schedule = doc.data();

      // ✅ بدل sent
      if (schedule.status !== 'sent') {
        const success = await triggerNotification(schedule);

        if (success) {
          await db
            .collection('inventory_schedules')
            .doc(doc.id)
            .update({ status: 'sent' });

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

checkAndSendSchedules();

cron.schedule('0 * * * *', () => {
  console.log('⏰ Running scheduled check...');
  checkAndSendSchedules();
});