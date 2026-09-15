'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [factorId, setFactorId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Check MFA requirements
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
      setError('Failed to check MFA status.');
      setLoading(false);
      return;
    }

    const totpFactors = factorsData.totp || [];
    
    if (totpFactors.length > 0) {
      // User has MFA enrolled, challenge them
      setFactorId(totpFactors[0].id);
      setShowMfa(true);
      setLoading(false);
    } else {
      // MFA enforced for all users, redirect to enrollment if not enrolled
      router.push('/auth/mfa');
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
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
      code: totpCode,
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
      <div className="w-full max-w-xs space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{showMfa ? 'Two-Factor Authentication' : 'Sign in'}</h1>
          <p className="text-sm text-muted-foreground">BhuSetu Authority Workspace</p>
        </div>

        {/* Form */}
        {!showMfa ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="you@example.gov.in"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleMfaVerify} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="totp" className="text-sm font-medium">Authenticator Code</label>
              <input
                id="totp"
                name="totp"
                type="text"
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm tracking-widest text-center"
                placeholder="123456"
                maxLength={6}
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify'}
            </Button>
            
            <div className="text-center mt-4">
              <button 
                type="button" 
                onClick={() => setShowMfa(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to login
              </button>
            </div>
          </form>
        )}

        {/* Back link */}
        {!showMfa && (
          <div className="text-center">
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Back to home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
