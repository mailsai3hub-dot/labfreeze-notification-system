import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config();

console.log('START');
console.log('cwd:', process.cwd());
console.log('SID exists:', !!process.env.TWILIO_SID);
console.log('TOKEN exists:', !!process.env.TWILIO_TOKEN);
console.log('FROM:', process.env.TWILIO_WHATSAPP_NUMBER);

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

try {
  const message = await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
    to: 'whatsapp:+201122099926',
    body: 'تجربة مباشرة من الكود'
  });

  console.log('SENT OK:', message.sid);
} catch (err) {
  console.error('ERROR MESSAGE:', err.message);
  console.error('ERROR CODE:', err.code);
  console.error(err);
}