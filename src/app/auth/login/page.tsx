'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { Landmark, Shield, MapPin, Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/workspace');
      router.refresh();
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row w-full min-h-[calc(100vh-3.5rem)]">
      
      {/* ── Left Panel (Branding) ── */}
      <div className="w-full md:w-[60%] bg-primary flex flex-col justify-between p-8 md:p-16 lg:p-24 text-primary-foreground relative overflow-hidden">
        
        {/* Top Header / Branding */}
        <div className="relative z-10 flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 w-fit text-sm font-medium border border-white/20 mb-4">
            <Shield className="h-4 w-4" />
            <span>Secure Access Gateway</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            भू-सेतु / BhuSetu
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 mt-2 max-w-md font-medium">
            Secure access for authorised government personnel.
          </p>
        </div>

        {/* Abstract Illustration */}
        <div className="relative z-10 flex-1 flex items-center justify-center py-12 md:py-0 min-h-[250px]">
          <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
            {/* Center Lock */}
            <div className="absolute z-20 bg-primary border-8 border-primary-foreground/10 p-6 rounded-full shadow-2xl backdrop-blur-sm">
              <Lock className="h-16 w-16 text-primary-foreground" strokeWidth={1.5} />
            </div>
            
            {/* Orbiting / Surrounding Icons */}
            <div className="absolute top-4 right-8 z-10 bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/20">
              <MapPin className="h-8 w-8 text-white" />
            </div>
            <div className="absolute bottom-8 left-4 z-10 bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/20">
              <Landmark className="h-8 w-8 text-white" />
            </div>

            {/* Decorative Rings */}
            <div className="absolute inset-0 border-2 border-white/10 rounded-full" />
            <div className="absolute inset-4 border border-white/5 rounded-full border-dashed" />
            <div className="absolute inset-[-2rem] border border-white/5 rounded-full" />
          </div>
        </div>

        <div className="relative z-10 text-sm text-primary-foreground/60 mt-auto">
          Ministry of Rural Development, Government of India
        </div>

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
          style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '40px 40px' }} 
        />
      </div>

      {/* ── Right Panel (Form) ── */}
      <div className="w-full md:w-[40%] bg-card flex flex-col justify-center items-center p-8 md:p-12 lg:p-16">
        <div className="w-full max-w-sm space-y-8">
          
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 bg-primary/5 rounded-full flex items-center justify-center mb-6 border border-border">
              <Landmark className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Authority Login
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Enter your official credentials to access the workspace.
            </p>
          </div>
          
          <form className="mt-8 space-y-5" onSubmit={handleLogin}>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email-address" className="text-sm font-semibold text-foreground">
                  Official Email Address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full h-11 rounded-md border-0 py-2 px-3 text-foreground ring-1 ring-inset ring-border focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm bg-background shadow-sm transition-shadow"
                  placeholder="name@gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-semibold text-foreground">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full h-11 rounded-md border-0 py-2 px-3 text-foreground ring-1 ring-inset ring-border focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm bg-background shadow-sm transition-shadow"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 text-center font-medium">
                {error}
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold shadow-sm"
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              </Button>
            </div>
            
            <div className="text-center pt-6 border-t border-border mt-8">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                <ArrowRight className="h-4 w-4 rotate-180" />
                Return to Home
              </Link>
            </div>
            
          </form>
        </div>
      </div>
      
    </div>
  );
}
