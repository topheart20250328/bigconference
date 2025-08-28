// Deno Edge Function: 清除排行榜（需要管理密鑰）
// 部署後請在 Function 環境變數設定：
// - ADMIN_TOKEN: 你自訂的一組密鑰
// - SUPABASE_URL: 自動帶入（平台預設）
// - SUPABASE_SERVICE_ROLE_KEY: 服務金鑰（只設在伺服器，不要放在前端）

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ClearPayload {
  resetAll?: boolean; // 若為 true，會同時刷新 config.quiz_reset_at
}

export const handler = async (req: Request): Promise<Response> => {
  try {
    const adminToken = Deno.env.get('ADMIN_TOKEN') || '';
    const provided = req.headers.get('x-admin-token') || '';
    if (!adminToken || provided !== adminToken) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
    }

    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) {
      return new Response(JSON.stringify({ error: 'missing server env' }), { status: 500, headers: { 'content-type': 'application/json' } });
    }

    const supabase = createClient(url, serviceKey);

    let resetAll = false;
    try {
      const body = (await req.json().catch(() => ({}))) as ClearPayload;
      resetAll = !!body.resetAll;
    } catch {}

    // 刪除全部 leaderboard 紀錄
    const { error: delErr } = await supabase.from('leaderboard').delete().neq('id', 0);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), { status: 500, headers: { 'content-type': 'application/json' } });
    }

    // 若要求同步重置，更新 config.quiz_reset_at
    if (resetAll) {
      const nowIso = new Date().toISOString();
      const { error: upErr } = await supabase
        .from('config')
        .upsert({ key: 'quiz_reset_at', value: nowIso }, { onConflict: 'key' });
      if (upErr) {
        // 不致命，回傳警告即可
        return new Response(JSON.stringify({ ok: true, warn: 'cleared, but reset flag failed', detail: upErr.message }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
};

// Deno 入口
export default { fetch: handler };
