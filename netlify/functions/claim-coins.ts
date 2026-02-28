
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// استخدام مفتاح الأدمن لضمان تخطي الـ RLS
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '' 
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { token, userId } = JSON.parse(event.body || '{}');
  if (!token || !userId) return { statusCode: 400, body: 'Missing token or userId' };

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    // 1. التحقق من التوكن
    const { data: tokenData, error: tokenErr } = await supabase
      .from('offer_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('user_id', userId)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenErr || !tokenData) return { statusCode: 400, body: 'Invalid or expired token' };

    // 2. جلب قيمة الكوينز من جدول العروض
    const { data: offerData, error: offerErr } = await supabase
      .from('offers')
      .select('id, coins_amount') // Select ID as well to use it for history
      .eq('id', tokenData.offer_id)
      .single();

    if (offerErr || !offerData) return { statusCode: 400, body: 'Offer details not found' };

    const coinsToGive = offerData.coins_amount || 0;

    // 3. تحديث التوكن كـ "مستخدم"
    await supabase.from('offer_tokens').update({ used: true }).eq('id', tokenData.id);

    // 4. تسجيل العملية في جدول claim_history لمنع التكرار مستقبلاً
// في خطوة تسجيل العملية رقم 4 في ملف claim-coins.ts
const { error: historyErr } = await supabase
  .from('claim_history')
  .insert({
    user_id: userId,
    offer_id: offerData.id,
    claimed_at: new Date().toISOString()
  });

if (historyErr) {
    // إذا فشل تسجيل السجل، نوقف العملية لضمان عدم تكرار المطالبة
    console.error("Critical: Failed to insert claim history:", historyErr);
    return { statusCode: 500, body: 'Database Error: Could not record claim' };
}

    // 5. تحديث رصيد المستخدم في جدول users
    const { data: userData, error: userErr } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();

    if (userErr) throw userErr;

    const newBalance = (userData?.balance || 0) + coinsToGive;

    const { error: updateErr } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId);

    if (updateErr) throw updateErr;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Success', 
        amount: coinsToGive, 
        newBalance: newBalance 
      }),
    };

  } catch (err: any) {
    console.error('Final Error:', err);
    return { statusCode: 500, body: err.message };
  }
};
