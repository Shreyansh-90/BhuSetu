import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-3rem)]">
      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-sm w-full space-y-10">
          {/* Brand */}
          <div className="space-y-3">
            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Government of India
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">BhuSetu</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              National land acquisition and management platform. Coordinating
              ministries, state authorities, and district offices for transparent,
              auditable workflows.
            </p>
          </div>

          {/* Divider */}
          <div className="h-px w-10 bg-border" />

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <Link href="/auth/login" className="w-full">
              <Button className="w-full" size="default">
                Authority Login
              </Button>
            </Link>
            <Link href="/public-search" className="w-full">
              <Button variant="outline" className="w-full" size="default">
                Public Land Search
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="border-t py-4 px-6">
        <p className="text-xs text-center text-muted-foreground">
          Access restricted to authorised government personnel and acquiring authorities.
        </p>
      </div>
    </div>
  );
}
