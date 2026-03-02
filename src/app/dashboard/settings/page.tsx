import { getCurrentUserId } from "@/lib/auth";
import { getUserBaseCurrency } from "@/db/queries/onboarding";
import { createClient } from "@/lib/supabase/server";
import { SUPPORTED_BASE_CURRENCIES } from "@/lib/currency";
import { SettingsClient } from "@/components/SettingsClient";

export default async function SettingsPage() {
  const userId = await getCurrentUserId();
  const supabase = await createClient();

  const [baseCurrency, { data }] = await Promise.all([
    getUserBaseCurrency(userId),
    supabase.auth.getUser(),
  ]);

  const user = data.user;
  const displayName =
    user?.user_metadata?.display_name ??
    user?.user_metadata?.full_name ??
    "";
  const email = user?.email ?? "";

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6 md:p-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your profile, preferences, and data.
        </p>
      </div>

      <SettingsClient
        displayName={displayName}
        email={email}
        baseCurrency={baseCurrency}
        supportedCurrencies={SUPPORTED_BASE_CURRENCIES}
      />
    </div>
  );
}
