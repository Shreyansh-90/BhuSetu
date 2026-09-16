'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  Landmark, 
  Map as MapIcon, 
  ShieldCheck, 
  Activity, 
  GitCommit, 
  Languages, 
  Search, 
  MapPin, 
  Layers 
} from 'lucide-react';
import Link from 'next/link';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

// Simple counter component using Framer Motion
function AnimatedCounter({ from, to, suffix = "" }: { from: number; to: number; suffix?: string }) {
  const count = useMotionValue(from);
  const rounded = useTransform(count, (latest) => {
    return Math.round(latest).toLocaleString() + suffix;
  });

  useEffect(() => {
    const controls = animate(count, to, { 
      duration: 2.5, 
      ease: "easeOut",
      delay: 0.2 // slight delay for viewport entry if we had intersection observer, but fine on load
    });
    return controls.stop;
  }, [count, to]);

  return <motion.span>{rounded}</motion.span>;
}

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      
      {/* ── U3.1 Hero Section ── */}
      <section className="relative w-full bg-background overflow-hidden border-b">
        {/* Subtle background pattern (cadastral/dot grid) */}
        <div 
          className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, black 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />
        
        <div className="container max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24 relative z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
          
          {/* Left Column (60%) */}
          <div className="flex-1 lg:max-w-[60%] flex flex-col items-center text-center lg:items-start lg:text-left space-y-8">
            
            {/* Government Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-semibold shadow-sm">
              <Landmark className="h-4 w-4" />
              <span>भारत सरकार | Government of India</span>
            </div>

            {/* Title Block */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground flex flex-col gap-2">
                <span className="text-primary font-sans">भू-सेतु</span>
                <span>BhuSetu</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground font-medium max-w-2xl leading-relaxed">
                National Land Acquisition & Monitoring System
              </p>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed mt-4">
                A unified platform for transparent, efficient, and auditable land acquisition workflows across all authorities.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-4">
              <Link href="/auth/login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-14 px-8 text-base font-semibold shadow-md gap-2">
                  Authority Login <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/public-search" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full h-14 px-8 text-base font-semibold border-accent text-accent hover:bg-accent hover:text-accent-foreground shadow-sm gap-2">
                  <Search className="h-5 w-5" /> Public Land Search
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column (40%) - Stylized Illustration */}
          <div className="flex-1 w-full max-w-md lg:max-w-full relative h-[400px] flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Central Map Icon */}
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute z-20 bg-card p-8 rounded-full shadow-2xl border-4 border-background"
              >
                <MapIcon className="h-24 w-24 text-primary" strokeWidth={1.5} />
              </motion.div>

              {/* Orbiting / Floating Elements */}
              <motion.div 
                animate={{ y: [0, -15, 0] }} 
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute z-30 top-12 right-12 lg:right-24 bg-card p-4 rounded-2xl shadow-xl border border-muted flex items-center gap-3"
              >
                <div className="bg-success/20 p-2 rounded-lg text-success"><ShieldCheck className="h-6 w-6" /></div>
                <div className="flex flex-col"><span className="text-xs font-bold">Verified</span><span className="text-[10px] text-muted-foreground">Title Clear</span></div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 15, 0] }} 
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute z-30 bottom-16 left-8 lg:left-12 bg-card p-4 rounded-2xl shadow-xl border border-muted flex items-center gap-3"
              >
                <div className="bg-accent/20 p-2 rounded-lg text-accent"><Activity className="h-6 w-6" /></div>
                <div className="flex flex-col"><span className="text-xs font-bold">Workflow</span><span className="text-[10px] text-muted-foreground">In Progress</span></div>
              </motion.div>
              
              <motion.div 
                animate={{ y: [0, -10, 0] }} 
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute z-10 bottom-24 right-4 lg:right-16 bg-primary/5 p-4 rounded-full shadow-inner"
              >
                <Layers className="h-12 w-12 text-primary/40" />
              </motion.div>

              {/* Decorative concentric circles */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[280px] h-[280px] rounded-full border border-primary/10 border-dashed animate-[spin_60s_linear_infinite]" />
                <div className="absolute w-[380px] h-[380px] rounded-full border border-primary/5 animate-[spin_40s_linear_infinite_reverse]" />
              </div>
            </div>
          </div>
          
        </div>
      </section>

      {/* ── U3.2 Features Section ── */}
      <section className="w-full bg-muted/30 py-16 md:py-24 border-b">
        <div className="container max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Core Capabilities</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Designed for scale, security, and transparency across all levels of government.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="flex flex-col items-center text-center p-6 bg-card rounded-2xl shadow-sm border hover:shadow-md transition-shadow">
              <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-6">
                <GitCommit className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold mb-3">Transparent Workflows</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Clear, step-by-step tracking of acquisition processes from initial proposal to final possession.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center text-center p-6 bg-card rounded-2xl shadow-sm border hover:shadow-md transition-shadow">
              <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-6">
                <Activity className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold mb-3">Real-time Tracking</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Live monitoring dashboards for officials to track project timelines, bottlenecks, and fund utilization.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center text-center p-6 bg-card rounded-2xl shadow-sm border hover:shadow-md transition-shadow">
              <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-6">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold mb-3">Secure & Auditable</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Role-based access control with complete audit trails for every approval and document modification.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="flex flex-col items-center text-center p-6 bg-card rounded-2xl shadow-sm border hover:shadow-md transition-shadow">
              <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-6">
                <Languages className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold mb-3">Bilingual Support</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Native support for English and Hindi interfaces to ensure accessibility for district and rural users.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── U3.3 Statistics Bar ── */}
      <section className="w-full bg-primary py-12 text-primary-foreground border-y-4 border-accent">
        <div className="container max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-primary-foreground/20 text-center">
            
            <div className="flex flex-col items-center justify-center pt-4 md:pt-0">
              <div className="text-4xl md:text-5xl font-extrabold text-accent mb-2">
                <AnimatedCounter from={0} to={1245} />
              </div>
              <div className="text-sm md:text-base font-medium opacity-90 tracking-wide uppercase">
                Projects Active
              </div>
            </div>

            <div className="flex flex-col items-center justify-center pt-8 md:pt-0">
              <div className="text-4xl md:text-5xl font-extrabold text-accent mb-2">
                <AnimatedCounter from={0} to={730} />
              </div>
              <div className="text-sm md:text-base font-medium opacity-90 tracking-wide uppercase">
                Districts Covered
              </div>
            </div>

            <div className="flex flex-col items-center justify-center pt-8 md:pt-0">
              <div className="text-4xl md:text-5xl font-extrabold text-accent mb-2">
                <AnimatedCounter from={0} to={5.2} suffix="M" />
              </div>
              <div className="text-sm md:text-base font-medium opacity-90 tracking-wide uppercase">
                Hectares Managed
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
