import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full bg-[#0F1729] text-white border-t border-primary/20 mt-auto">
      <div className="container max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          
          <div className="flex flex-col gap-4 lg:col-span-2">
            <h3 className="font-bold text-lg md:text-xl">भू-सेतु / BhuSetu</h3>
            <p className="text-sm text-gray-300 leading-relaxed max-w-md">
              National Land Acquisition and Monitoring System. A unified platform for transparent, efficient, and auditable land acquisition workflows.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="font-semibold text-gray-100">Quick Links</h4>
            <nav className="flex flex-col gap-2 text-sm text-gray-300">
              <Link href="#" className="hover:text-white transition-colors w-fit">Terms of Use</Link>
              <Link href="#" className="hover:text-white transition-colors w-fit">Privacy Policy</Link>
              <Link href="#" className="hover:text-white transition-colors w-fit">Accessibility Statement</Link>
              <Link href="#" className="hover:text-white transition-colors w-fit">Help & Support</Link>
            </nav>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="font-semibold text-gray-100">Authority</h4>
            <div className="text-sm text-gray-300 flex flex-col gap-2">
              <p>Ministry of Rural Development</p>
              <p>Government of India</p>
            </div>
          </div>
          
        </div>

        <div className="pt-8 border-t border-gray-700/50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400">
          <p>
            Designed and Developed by <span className="font-medium text-gray-300">National Informatics Centre</span>
          </p>
          <p>
            &copy; {currentYear} BhuSetu v1.0
          </p>
        </div>
      </div>
    </footer>
  );
}
