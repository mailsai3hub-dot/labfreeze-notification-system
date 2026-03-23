import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// ================= 1. FIREBASE CONFIG (الحل الجذري) =================

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountRaw) {
  console.error('❌ Error: FIREBASE_SERVICE_ACCOUNT secret is missing!');
  process.exit(1);
}

let serviceAccount;
try {
  // تحويل النص القادم من GitHub Secrets إلى كائن JSON
  serviceAccount = JSON.parse(serviceAccountRaw);

  // تأمين معالجة السطور الجديدة في المفتاح الخاص (Private Key)
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
} catch (err) {
  console.error('❌ Error parsing Service Account JSON:', err.message);
  process.exit(1);
}

// تحديد الـ Database ID الخاص بك
const FIREBASE_DATABASE_ID = 'ai-studio-a5c3223e-5fa3-407f-b8e3-1b9d0e6a0130';

// عمل Initialize لـ Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore(admin.app(), FIREBASE_DATABASE_ID);

// ================= 2. OTHER SERVICES CONFIG =================

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

const transporter = EMAIL_USER && EMAIL_PASS
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: EMAIL_USER, pass: EMAIL_PASS }
    })
  : null;

const client = TWILIO_SID && TWILIO_TOKEN ? twilio(TWILIO_SID, TWILIO_TOKEN) : null;

// ================= 3. DEBUG & HELPERS =================

console.log('🚀 Notification Engine Started');
console.log('✅ Twilio Status:', !!client ? 'Ready' : 'Not Configured');
console.log('✅ Firebase Status: Connected to', serviceAccount.project_id);

function isValidDateString(dateStr) {
  return typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

// ================= 4. NOTIFICATION LOGIC =================

export async function triggerNotification(schedule, isAdvanceReminder = false) {
  const timeLabel = isAdvanceReminder ? 'تذكير مبكر: الجرد غداً' : 'تذكير نهائي: الجرد اليوم';
  const fullMessage = `${timeLabel}\n${schedule.message || ''}`;

  let whatsappSent = false;
  let emailSent = false;

  // WhatsApp
  if ((schedule.type === 'WhatsApp' || schedule.type === 'Both') && schedule.staffPhone && client) {
    try {
      const msg = await client.messages.create({
        from: TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${schedule.staffPhone}`,
        body: fullMessage
      });
      console.log(`📱 WhatsApp sent to ${schedule.staffPhone}: ${msg.sid}`);
      whatsappSent = true;
    } catch (err) {
      console.error('❌ WhatsApp Error:', err.message);
    }
  }

  // Email
  if ((schedule.type === 'Email' || schedule.type === 'Both') && schedule.staffEmail && transporter) {
    try {
      await transporter.sendMail({
        from: `"LabFreeze System" <${EMAIL_USER}>`,
        to: schedule.staffEmail,
        subject: `تنبيه جرد الثلاجة - ${schedule.date || 'بدون تاريخ'}`,
        text: fullMessage
      });
      console.log(`📧 Email sent to ${schedule.staffEmail}`);
      emailSent = true;
    } catch (err) {
      console.error('❌ Email Error:', err.message);
    }
  }

  return schedule.type === 'Both' ? (whatsappSent || emailSent) : (whatsappSent || emailSent);
}

// ================= 5. MAIN CHECKER =================

async function checkAndSendSchedules() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  console.log(`🔍 Checking schedules for [Today: ${todayStr}] [Tomorrow: ${tomorrowStr}]`);

  try {
    const snapshot = await db.collection('schedules').get();
    if (snapshot.empty) {
      console.log('ℹ️ No schedules found in database.');
      return;
    }

    for (const doc of snapshot.docs) {
      const schedule = doc.data();
      const docRef = db.collection('schedules').doc(doc.id);
      const scheduleDate = schedule.date;

      if (!isValidDateString(scheduleDate)) continue;

      // 24 HOURS REMINDER
      if (scheduleDate === tomorrowStr && schedule.sendAdvanceReminder && !schedule.advanceReminderSent) {
        const sent = await triggerNotification(schedule, true);
        if (sent) {
          await docRef.update({
            advanceReminderSent: true,
            advanceReminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
            lastAdvanceReminderForDate: scheduleDate
          });
        }
      }

      // SAME DAY REMINDER
      if (scheduleDate === todayStr && schedule.sendSameDayReminder && !schedule.sameDayReminderSent) {
        const sent = await triggerNotification(schedule, false);
        if (sent) {
          await docRef.update({
            sameDayReminderSent: true,
            sameDayReminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
            lastSameDayReminderForDate: scheduleDate
          });
        }
      }
    }
  } catch (err) {
    console.error('❌ Firestore Error:', err.message);
  }
}

// ================= 6. EXECUTION =================

checkAndSendSchedules();

cron.schedule('0 * * * *', () => {
  console.log('⏰ Running scheduled check...');
  checkAndSendSchedules();
});