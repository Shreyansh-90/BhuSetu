'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

export default function MfaEnrollmentPage() {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function setupMfa() {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) {
        setError(error.message);
        return;
      }

      setFactorId(data.id);
      setQrCodeUrl(data.totp.qr_code);
    }
    setupMfa();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      setError(challenge.error.message);
      setLoading(false);
      return;
    }

    const verify = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: verifyCode,
    });

    if (verify.error) {
      setError(verify.error.message);
      setLoading(false);
    } else {
      router.push('/workspace');
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Set up Two-Factor Authentication</h1>
          <p className="text-sm text-muted-foreground">
            This workspace requires MFA. Please scan the QR code with your authenticator app and enter the code below.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20 text-center">
            {error}
          </div>
        )}

        {qrCodeUrl ? (
          <div className="flex justify-center p-4 bg-white rounded-md border shadow-sm">
            {/* Using an img tag since the QR code is returned as an SVG string from Supabase */}
            <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
          </div>
        ) : (
          <div className="flex justify-center p-8">
            <p className="text-sm text-muted-foreground">Generating QR code...</p>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="code" className="text-sm font-medium">Authenticator Code</label>
            <input
              id="code"
              type="text"
              required
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm text-center tracking-widest"
              placeholder="123456"
              maxLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !factorId}>
            {loading ? 'Verifying...' : 'Complete Setup'}
          </Button>
        </form>
      </div>
    </div>
  );
}
