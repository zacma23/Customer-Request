import { createClient } from "@supabase/supabase-js";

// ============================================================================
// 1. Paste your Supabase Project URL here:
//    IMPORTANT: Use ONLY the base URL — do NOT add /rest/v1/ or any path.
//    The SDK adds the correct paths (/auth/v1, /rest/v1, etc.) automatically.
// ============================================================================
const SUPABASE_URL = "https://xrjbyebmgtzyqzmkyyfq.supabase.co";

// ============================================================================
// 2. Paste your Supabase Anon / Public Key here:
//    Find it in: Supabase Dashboard → Settings → API → "anon public" key.
//    It's a long JWT string starting with "eyJ..."
// ============================================================================
const SUPABASE_PUBLIC_KEY = "sb_publishable_E1M0aDxlxHy-_jw1CxFaMg_CV5zqBi4";

// ============================================================================
// 3. Exported Supabase Client Instance
// ============================================================================
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

// ============================================================================
// 4. Google OAuth Login Helper Function
// ============================================================================
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  });
  if (error) throw error;
  return data;
};
