import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
);

export const handler: Handler = async (event) => {
  const { slug, userId } = JSON.parse(event.body || '{}');
  const ip = event.headers['x-nf-client-connection-ip'] || 'unknown';

  try {
    // 1. التأكد من وجود العرض
    const { data: offer, error: offerErr } = await supabase
      .from('offers')
      .select('*')
      .eq('slug', slug)
      .eq('active', true)
      .single();

    if (offerErr || !offer) return { statusCode: 404, body: 'Offer not found' };

    // 2. التحقق من سجل الـ 24 ساعة (لازم يكون هنا بعد جلب الـ offer.id)
    // تعديل الخطوة رقم 2 في ملف generate-token.ts

// التحقق من وجود السجل بغض النظر عن وقته
const { data: recentClaim } = await supabase
  .from('claim_history')
  .select('id')
  .eq('user_id', userId)
  .eq('offer_id', offer.id)
  .maybeSingle(); // استخدام maybeSingle بدلاً من single لتجنب أخطاء 406

if (recentClaim) {
  return { 
    statusCode: 403, 
    // تأكد من إرسالها كـ JSON ليتمكن الفرونت إند من قراءتها
    body: JSON.stringify({ body: 'لقد أتممت هذا العرض بالفعل، سيظهر لك مجدداً فور جهوزيته' }) 
  };
}

    // 3. بقية كود توليد التوكن...
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await supabase.from('offer_tokens').insert({
      offer_id: offer.id,
      user_id: userId,
      token_hash: tokenHash,
      ip_hash: ipHash,
      expires_at: new Date(Date.now() + 10 * 60000).toISOString()
    });

    return { statusCode: 200, body: JSON.stringify({ token }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};