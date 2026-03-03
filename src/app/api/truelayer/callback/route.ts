import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/truelayer';
import { saveTrueLayerConnection, importFromTrueLayer } from '@/db/mutations/truelayer';
import { getCurrentUserId } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  if (error || !code) {
    const msg = error ?? 'Missing authorization code';
    return NextResponse.redirect(
      `${siteUrl}/dashboard/accounts?truelayer_error=${encodeURIComponent(msg)}`,
    );
  }

  try {
    const userId = await getCurrentUserId();
    const tokens = await exchangeCode(code);

    await saveTrueLayerConnection(userId, tokens);

    // Auto-import accounts & transactions immediately after connecting
    try {
      await importFromTrueLayer();
    } catch {
      // Non-critical: user can manually import later
    }

    return NextResponse.redirect(
      `${siteUrl}/dashboard/accounts?truelayer_connected=true`,
    );
  } catch (err) {
    logger.error('truelayer.callback', 'OAuth callback failed', err);
    return NextResponse.redirect(
      `${siteUrl}/dashboard/accounts?truelayer_error=${encodeURIComponent('Failed to connect bank. Please try again.')}`,
    );
  }
}
