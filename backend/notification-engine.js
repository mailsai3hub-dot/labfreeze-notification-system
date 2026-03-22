import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// ================= CONFIG =================

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
const TWILIO_WHATSAPP_NUMBER =
  process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

// Firebase ENV
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY =
  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const FIREBASE_DATABASE_ID =
  'ai-studio-a5c3223e-5fa3-407f-b8e3-1b9d0e6a0130';

// ================= INIT FIREBASE =================

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY
    })
  });
}

const db = getFirestore(admin.app(), FIREBASE_DATABASE_ID);

// ================= INIT SERVICES =================

const transporter =
  EMAIL_USER && EMAIL_PASS
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: EMAIL_USER, pass: EMAIL_PASS }
      })
    : null;

const client =
  TWILIO_SID && TWILIO_TOKEN
    ? twilio(TWILIO_SID, TWILIO_TOKEN)
    : null;

// ================= DEBUG =================

console.log('File started ✅');
console.log('TWILIO_SID exists:', !!TWILIO_SID);
console.log('TWILIO_TOKEN exists:', !!TWILIO_TOKEN);
console.log('Firebase project exists:', !!FIREBASE_PROJECT_ID);

// ================= HELPERS =================

function isValidDateString(dateStr) {
  return typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

// ================= SEND FUNCTION =================

export async function triggerNotification(
  schedule,
  isAdvanceReminder = false
) {
  const timeLabel = isAdvanceReminder
    ? 'تذكير مبكر: الجرد غداً'
    : 'تذكير نهائي: الجرد اليوم';

  const fullMessage = `${timeLabel}\n${schedule.message || ''}`;

  let whatsappSent = false;
  let emailSent = false;

  // WhatsApp
  if (
    (schedule.type === 'WhatsApp' || schedule.type === 'Both') &&
    schedule.staffPhone &&
    client
  ) {
    try {
      const msg = await client.messages.create({
        from: TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${schedule.staffPhone}`,
        body: fullMessage
      });

      console.log('WhatsApp sent:', msg.sid);
      whatsappSent = true;
    } catch (err) {
      console.error('WhatsApp Error:', err.message);
    }
  }

  // Email
  if (
    (schedule.type === 'Email' || schedule.type === 'Both') &&
    schedule.staffEmail &&
    transporter
  ) {
    try {
      await transporter.sendMail({
        from: `"LabFreeze System" <${EMAIL_USER}>`,
        to: schedule.staffEmail,
        subject: `تنبيه جرد الثلاجة - ${schedule.date || 'بدون تاريخ'}`,
        text: fullMessage
      });

      console.log('Email sent');
      emailSent = true;
    } catch (err) {
      console.error('Email Error:', err.message);
    }
  }

  if (schedule.type === 'WhatsApp') {
    return whatsappSent;
  }

  if (schedule.type === 'Email') {
    return emailSent;
  }

  if (schedule.type === 'Both') {
    return whatsappSent || emailSent;
  }

  return false;
}

// ================= MAIN LOGIC =================

async function checkAndSendSchedules() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  console.log(`Checking schedules for ${todayStr} and ${tomorrowStr}...`);

  try {
    const snapshot = await db.collection('schedules').get();

    if (snapshot.empty) {
      console.log('No schedules found.');
      return;
    }

    for (const doc of snapshot.docs) {
      const schedule = doc.data();
      const docRef = db.collection('schedules').doc(doc.id);

      const scheduleDate = schedule.date;
      const sendAdvanceReminder = schedule.sendAdvanceReminder ?? false;
      const sendSameDayReminder = schedule.sendSameDayReminder ?? false;

      let advanceReminderSent = schedule.advanceReminderSent ?? false;
      let sameDayReminderSent = schedule.sameDayReminderSent ?? false;

      const lastAdvanceReminderForDate =
        schedule.lastAdvanceReminderForDate ?? null;
      const lastSameDayReminderForDate =
        schedule.lastSameDayReminderForDate ?? null;

      if (!isValidDateString(scheduleDate)) {
        console.log(`Skipping doc ${doc.id}: invalid date format.`);
        continue;
      }

      // ================= RESET FLAGS IF DATE CHANGED =================
      const updatesToReset = {};

      if (
        advanceReminderSent &&
        lastAdvanceReminderForDate &&
        lastAdvanceReminderForDate !== scheduleDate
      ) {
        updatesToReset.advanceReminderSent = false;
        updatesToReset.advanceReminderSentAt = null;
        updatesToReset.lastAdvanceReminderForDate = null;
        advanceReminderSent = false;
      }

      if (
        sameDayReminderSent &&
        lastSameDayReminderForDate &&
        lastSameDayReminderForDate !== scheduleDate
      ) {
        updatesToReset.sameDayReminderSent = false;
        updatesToReset.sameDayReminderSentAt = null;
        updatesToReset.lastSameDayReminderForDate = null;
        sameDayReminderSent = false;
      }

      if (Object.keys(updatesToReset).length > 0) {
        await docRef.update(updatesToReset);
        console.log(`Reminder flags reset for doc ${doc.id} because date changed.`);
      }

      // ================= 24 HOURS REMINDER =================
      if (
        scheduleDate === tomorrowStr &&
        sendAdvanceReminder &&
        !advanceReminderSent
      ) {
        console.log(`Sending advance reminder for doc ${doc.id}`);

        const sent = await triggerNotification(schedule, true);

        if (sent) {
          await docRef.update({
            advanceReminderSent: true,
            advanceReminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
            lastAdvanceReminderForDate: scheduleDate
          });

          console.log(`Advance reminder marked as sent for doc ${doc.id}`);
        } else {
          console.log(`Advance reminder failed for doc ${doc.id}`);
        }
      }

      // ================= SAME DAY REMINDER =================
      if (
        scheduleDate === todayStr &&
        sendSameDayReminder &&
        !sameDayReminderSent
      ) {
        console.log(`Sending same-day reminder for doc ${doc.id}`);

        const sent = await triggerNotification(schedule, false);

        if (sent) {
          await docRef.update({
            sameDayReminderSent: true,
            sameDayReminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
            lastSameDayReminderForDate: scheduleDate
          });

          console.log(`Same-day reminder marked as sent for doc ${doc.id}`);
        } else {
          console.log(`Same-day reminder failed for doc ${doc.id}`);
        }
      }
    }
  } catch (err) {
    console.error('Firestore Error:', err.message);
  }
}

// ================= RUN ON STARTUP =================

checkAndSendSchedules();

// ================= CRON =================

// كل ساعة
cron.schedule('0 * * * *', () => {
  console.log('Running scheduled check...');
  checkAndSendSchedules();
});