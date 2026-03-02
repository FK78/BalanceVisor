import { createClient } from "@/lib/supabase/server";

export async function getCurrentUserId(): Promise<string> {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User not authenticated");
  }

  return user.id;
}

export async function getCurrentUserEmail(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("User email not available");
  return user.email;
}
