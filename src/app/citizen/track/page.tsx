'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, CheckCircle2, AlertCircle, Globe } from 'lucide-react';

export default function CitizenTrackPage() {
  const [ulpin, setUlpin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  
  const [language, setLanguage] = useState('en');
  const [tDict, setTDict] = useState<Record<string, string>>({});

  const translate = (text: string) => tDict[text] || text;

  const handleLanguageChange = async (lang: string) => {
    setLanguage(lang);
    if (lang === 'en') {
      setTDict({});
      return;
    }
    
    // Batch translate UI strings via Bhashini API mock
    const stringsToTranslate = [
      'Citizen Land Tracking Portal',
      'Enter your 14-digit ULPIN (Bhu-Aadhaar) to check acquisition status, compensation, and R&R benefits.',
      'Enter 14-digit ULPIN',
      'Track',
      'Searching...',
      'Parcel Details',
      'Owner Name',
      'Survey No.',
      'Area',
      'Project Status',
      'Compensation Award',
      'Amount',
      'Status'
    ];

    try {
      const newDict: Record<string, string> = {};
      for (const text of stringsToTranslate) {
        const res = await fetch('/api/v1/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, targetLanguage: lang })
        });
        const json = await res.json();
        if (json.data?.translatedText) {
          newDict[text] = json.data.translatedText;
        }
      }
      setTDict(newDict);
    } catch (err) {
      console.error('Translation failed', err);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ulpin) return;
    
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/v1/citizen/track?ulpin=${encodeURIComponent(ulpin.toUpperCase())}`);
      const json = await res.json();
      
      if (res.ok) {
        setData(json.data);
      } else {
        setError(json.error?.message || "Failed to find parcel record.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 w-full relative">
      <div className="absolute top-4 right-4 flex gap-2">
        <Button variant={language === 'en' ? 'default' : 'outline'} size="sm" onClick={() => handleLanguageChange('en')}>English</Button>
        <Button variant={language === 'hi' ? 'default' : 'outline'} size="sm" onClick={() => handleLanguageChange('hi')}>हिंदी</Button>
        <Button variant={language === 'mr' ? 'default' : 'outline'} size="sm" onClick={() => handleLanguageChange('mr')}>मराठी</Button>
      </div>

      <div className="max-w-2xl w-full flex flex-col gap-8">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">{translate('Citizen Land Tracking Portal')}</h1>
          <p className="text-muted-foreground">{translate('Enter your 14-digit ULPIN (Bhu-Aadhaar) to check acquisition status, compensation, and R&R benefits.')}</p>
        </div>

        <Card className="shadow-lg border-primary/20">
          <CardContent className="p-6">
            <form onSubmit={handleTrack} className="flex gap-3">
              <Input 
                value={ulpin}
                onChange={(e) => setUlpin(e.target.value)}
                placeholder={translate('Enter 14-digit ULPIN')}
                className="font-mono text-lg h-12 flex-1"
                maxLength={14}
              />
              <Button type="submit" disabled={loading || !ulpin} className="h-12 px-8">
                {loading ? translate('Searching...') : <><Search className="mr-2 h-4 w-4" /> {translate('Track')}</>}
              </Button>
            </form>
            {error && (
              <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}
          </CardContent>
        </Card>

        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                <CardTitle className="text-lg">{translate('Parcel Details')}</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{translate('Owner Name')}</div>
                  <div className="font-medium text-lg">{data.parcel.ownerName || 'N/A'}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{translate('Survey No.')}</div>
                    <div className="font-medium">{data.parcel.surveyNumber || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{translate('Area')}</div>
                    <div className="font-medium">{data.parcel.areaSqm ? `${data.parcel.areaSqm} sq.m` : 'N/A'}</div>
                  </div>
                </div>
                <div className="pt-2 flex items-start gap-2 text-muted-foreground text-sm">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{data.parcel.village}, {data.parcel.tehsil}, District {data.parcel.district}, State {data.parcel.stateCode}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-6">
              <Card className="shadow-sm border-border/50">
                <CardHeader className="bg-muted/20 border-b border-border/50 pb-3">
                  <CardTitle className="text-base">{translate('Project Status')}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  <div className="font-medium">{data.project?.title || 'Unknown Project'}</div>
                  <Badge variant="outline" className="capitalize">{data.project?.status?.replace(/_/g, ' ') || 'Unknown'}</Badge>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/50">
                <CardHeader className="bg-muted/20 border-b border-border/50 pb-3">
                  <CardTitle className="text-base">{translate('Compensation Award')}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  {data.compensation ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{translate('Amount')}</span>
                        <span className="font-bold text-success text-lg">₹{data.compensation.totalAwardAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{translate('Status')}</span>
                        <Badge variant="secondary" className="capitalize">{data.compensation.status}</Badge>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">Compensation award not yet declared for this parcel.</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
