import { Button } from '@/components/ui/button';
import { Map, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] text-center px-4">
      <div className="max-w-3xl space-y-8">
        <div className="flex justify-center mb-8">
          <div className="rounded-full bg-primary/10 p-6">
            <Map className="h-16 w-16 text-primary" />
          </div>
        </div>
        
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground">
          BhuSetu
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
          National Land Acquisition and Monitoring System.
          A unified platform for transparent, efficient, and auditable land acquisition workflows.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link href="/auth/login">
            <Button size="lg" className="gap-2">
              Authority Login <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/public-search">
            <Button variant="outline" size="lg">
              Public Land Search
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
