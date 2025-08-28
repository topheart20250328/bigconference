// Minimal Supabase client (browser) without bundlers.
// We use the official ESM from CDN.

export async function getSupabase() {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return null;
  if (!window.supabase) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.type = 'module';
      s.src = 'https://esm.sh/@supabase/supabase-js@2?bundle';
      s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  // global supabase is exposed as a module namespace; import dynamically
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2?bundle');
  return createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}
