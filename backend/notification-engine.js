import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// ================= 1. FIREBASE CONFIG (إصدار الحماية القصوى) =================

let serviceAccount;

try {
  // المحاولة الأولى: قراءة الـ JSON كاملاً إذا كان التنسيق صحيحاً
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const cleanedJson = process.env.FIREBASE_SERVICE_ACCOUNT.trim().replace(/^['"]|['"]$/g, '');
    serviceAccount = JSON.parse(cleanedJson);
    
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
  }
} catch (e) {
  console.log("⚠️ JSON parsing skipped or failed, using manual environment keys.");
}

// الخطة البديلة (Fallback): بناء البيانات من المفاتيح المنفصلة (حل مشكلة Authenticated)
if (!serviceAccount || !serviceAccount.private_key) {
  serviceAccount = {
    projectId: "labfreeze-web-manager-2026",
    clientEmail: "firebase-adminsdk-fbsvc@labfreeze-web-manager-2026.iam.gserviceaccount.com",
    // السطر السحري: تنظيف المفتاح الخاص من أي علامات اقتباس أو مسافات
    privateKey: process.env.FIREBASE_PRIVATE_KEY 
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^['"]|['"]$/g, '').trim() 
      : undefined
  };
}

// التحقق النهائي قبل التشغيل
if (!serviceAccount.privateKey && !serviceAccount.private_key) {
  console.error("❌ CRITICAL ERROR: Firebase Private Key is missing!");
  process.exit(1);
}

// الـ Database ID الخاص بمشروعك
const FIREBASE_DATABASE_ID = 'ai-studio-a5c3223e-5fa3-407f-b8e3-1b9d0e6a0130';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore(admin.app(), FIREBASE_DATABASE_ID);

// ================= 2. إعدادات الخدمات (Email & WhatsApp) =================

const transporter = process.env.EMAIL_USER && process.env.EMAIL_PASS
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    })
  : null;

const client = process.env.TWILIO_SID && process.env.TWILIO_TOKEN 
  ? twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN) 
  : null;

// ================= 3. وظيفة الإرسال =================

async function triggerNotification(schedule) {
  const message = `تذكير جرد مختبر: ${schedule.message || 'موعد الجرد الدوري'}`;
  let sent = false;

  // إرسال WhatsApp
  if ((schedule.type === 'WhatsApp' || schedule.type === 'Both') && client) {
    try {
      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${schedule.staffPhone}`,
        body: message
      });
      console.log(`📱 WhatsApp sent to ${schedule.staffPhone}`);
      sent = true;
    } catch (err) { console.error('❌ WhatsApp Error:', err.message); }
  }

  // إرسال Email
  if ((schedule.type === 'Email' || schedule.type === 'Both') && transporter) {
    try {
      await transporter.sendMail({
        from: `"LabFreeze System" <${process.env.EMAIL_USER}>`,
        to: schedule.staffEmail,
        subject: 'تنبيه جرد الثلاجة',
        text: message
      });
      console.log(`📧 Email sent to ${schedule.staffEmail}`);
      sent = true;
    } catch (err) { console.error('❌ Email Error:', err.message); }
  }
  return sent;
}

// ================= 4. فحص قاعدة البيانات =================

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
        }
      }
    }
  } catch (err) {
    console.error('❌ Firestore Error:', err.message);
  }
}

// تشغيل فوري + جدولة كل ساعة
console.log("🚀 LabFreeze Notification Engine is LIVE");
checkAndSendSchedules();

cron.schedule('0 * * * *', () => {
  checkAndSendSchedules();
});