import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// ================= 1. FIREBASE CONFIG (إصدار مضاد للأخطاء) =================

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountRaw) {
  console.error('❌ Error: FIREBASE_SERVICE_ACCOUNT secret is missing!');
  process.exit(1);
}

let serviceAccount;
try {
  // خطوة الحماية: تنظيف النص من أي علامات اقتباس مفردة أو مسافات قد تأتي من GitHub
  const cleanedJson = serviceAccountRaw.trim().replace(/^'|'$/g, '');
  
  // تحويل النص المُنظف إلى كائن JSON
  serviceAccount = JSON.parse(cleanedJson);

  // معالجة المفتاح الخاص لضمان قراءة السطور الجديدة (\n) بشكل صحيح
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
} catch (err) {
  console.error('❌ JSON Parse Error (Check your GitHub Secrets):', err.message);
  process.exit(1);
}

// الـ Database ID الخاص بمشروعك
const FIREBASE_DATABASE_ID = 'ai-studio-a5c3223e-5fa3-407f-b8e3-1b9d0e6a0130';

// تشغيل تطبيق Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore(admin.app(), FIREBASE_DATABASE_ID);

// ================= 2. إعدادات الخدمات الأخرى =================

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

console.log('🚀 Notification Engine Started Successfully');

// ================= 3. منطق الإشعارات =================

async function triggerNotification(schedule, isAdvanceReminder = false) {
  const timeLabel = isAdvanceReminder ? 'تذكير مبكر: الجرد غداً' : 'تذكير نهائي: الجرد اليوم';
  const fullMessage = `${timeLabel}\n${schedule.message || 'لا توجد ملاحظات إضافية'}`;

  let sentStatus = false;

  // إرسال WhatsApp عبر Twilio
  if ((schedule.type === 'WhatsApp' || schedule.type === 'Both') && schedule.staffPhone && client) {
    try {
      await client.messages.create({
        from: TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${schedule.staffPhone}`,
        body: fullMessage
      });
      console.log(`📱 WhatsApp sent to: ${schedule.staffPhone}`);
      sentStatus = true;
    } catch (err) { console.error('❌ WhatsApp Error:', err.message); }
  }

  // إرسال بريد إلكتروني عبر Nodemailer
  if ((schedule.type === 'Email' || schedule.type === 'Both') && schedule.staffEmail && transporter) {
    try {
      await transporter.sendMail({
        from: `"LabFreeze System" <${EMAIL_USER}>`,
        to: schedule.staffEmail,
        subject: `تنبيه جرد الثلاجة - ${schedule.date}`,
        text: fullMessage
      });
      console.log(`📧 Email sent to: ${schedule.staffEmail}`);
      sentStatus = true;
    } catch (err) { console.error('❌ Email Error:', err.message); }
  }
  return sentStatus;
}

// ================= 4. فحص المواعيد في Firestore =================

async function checkAndSendSchedules() {
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  console.log(`🔍 Checking Database... Today: ${todayStr} | Tomorrow: ${tomorrowStr}`);

  try {
    const snapshot = await db.collection('schedules').get();
    if (snapshot.empty) {
      console.log('ℹ️ No schedules found.');
      return;
    }

    for (const doc of snapshot.docs) {
      const schedule = doc.data();
      const docRef = db.collection('schedules').doc(doc.id);

      // 1. تذكير قبل الموعد بـ 24 ساعة
      if (schedule.date === tomorrowStr && schedule.sendAdvanceReminder && !schedule.advanceReminderSent) {
        const success = await triggerNotification(schedule, true);
        if (success) {
          await docRef.update({ 
            advanceReminderSent: true, 
            advanceReminderSentAt: admin.firestore.FieldValue.serverTimestamp() 
          });
        }
      }

      // 2. تذكير في نفس يوم الموعد
      if (schedule.date === todayStr && schedule.sendSameDayReminder && !schedule.sameDayReminderSent) {
        const success = await triggerNotification(schedule, false);
        if (success) {
          await docRef.update({ 
            sameDayReminderSent: true, 
            sameDayReminderSentAt: admin.firestore.FieldValue.serverTimestamp() 
          });
        }
      }
    }
  } catch (err) {
    console.error('❌ Firestore Error:', err.message);
  }
}

// ================= 5. التشغيل والجدولة =================

// تشغيل فحص فوري عند بدء تشغيل الملف
checkAndSendSchedules();

// جدولة التشغيل كل ساعة (الدقيقة 0)
cron.schedule('0 * * * *', () => {
  console.log('⏰ Hourly schedule check triggered...');
  checkAndSendSchedules();
});