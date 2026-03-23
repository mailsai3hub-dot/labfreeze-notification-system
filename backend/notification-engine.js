import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// ================= 1. FIREBASE CONFIG (Advanced Diagnosis) =================

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountRaw) {
  console.error('❌ ERROR: FIREBASE_SERVICE_ACCOUNT is missing!');
  process.exit(1);
}

let serviceAccount;
try {
  // تنظيف النص من المسافات أو علامات الاقتباس الخارجية
  const cleanedJson = serviceAccountRaw.trim().replace(/^'|'$/g, "").replace(/^"|"$/g, "");
  
  serviceAccount = JSON.parse(cleanedJson);

  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
  console.log('✅ Success: Firebase credentials parsed.');
} catch (err) {
  console.error('❌ CRITICAL: JSON Parse Failed!');
  console.error('Error Message:', err.message);
  // سيطبع أول 15 حرف للتأكد من بداية الملف (بدون كشف بيانات حساسة)
  console.log('Data starts with:', serviceAccountRaw.substring(0, 15));
  process.exit(1);
}

const FIREBASE_DATABASE_ID = 'ai-studio-a5c3223e-5fa3-407f-b8e3-1b9d0e6a0130';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore(admin.app(), FIREBASE_DATABASE_ID);

// ================= 2. NOTIFICATION LOGIC =================

async function checkAndSendSchedules() {
  const todayStr = new Date().toISOString().split('T')[0];
  console.log(`🔍 Scanning Firestore for date: ${todayStr}`);

  try {
    const snapshot = await db.collection('schedules').get();
    console.log(`📊 Total records found: ${snapshot.size}`);

    for (const doc of snapshot.docs) {
      const schedule = doc.data();
      console.log(`Processing: ${doc.id} - Date: ${schedule.date}`);
      // هنا تضع منطق إرسال الواتساب أو الإيميل كما فعلنا سابقاً
    }
  } catch (err) {
    console.error('❌ Database Error:', err.message);
  }
}

// تشغيل فوري للتجربة
checkAndSendSchedules();

// جدولة كل ساعة
cron.schedule('0 * * * *', () => {
  checkAndSendSchedules();
});