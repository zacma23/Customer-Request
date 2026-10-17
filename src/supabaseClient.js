import { createClient } from "@supabase/supabase-js";

// ============================================================================
// 1. Paste your Supabase Project URL here:
// ============================================================================
const SUPABASE_URL = "https://xrjbyebmgtzyqzmkyyfq.supabase.co";

// ============================================================================
// 2. Paste your Supabase Anon / Public Key here:
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
