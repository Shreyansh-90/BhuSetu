'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Map, Layers, CheckCircle2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#64748b'];

export default function NationalDashboardData() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/v1/metrics/national');
        const json = await res.json();
        
        if (res.ok && json.success) {
          setData(json.data);
        } else {
          setError(json.error?.message || 'Failed to fetch national metrics.');
        }
      } catch (err) {
        setError('Network error while fetching metrics.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 w-full" role="status" aria-live="polite">
        <div className="animate-pulse flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-medium">Aggregating national data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center h-64 border rounded-xl bg-destructive/10 text-destructive">
        <h2 className="text-lg font-bold tracking-tight">Access Denied / Error</h2>
        <p className="text-sm mt-2">{error || 'Unknown error occurred.'}</p>
      </div>
    );
  }

  const { overview, byStatus, byState } = data;
  
  // Format total area (Sqm to Hectares)
  const totalHectares = (overview.totalAreaSqm / 10000).toFixed(2);
  const approvedCount = byStatus.find((s: any) => s.status === 'approved')?.count || 0;

  // Format Recharts Data
  const pieData = byStatus.map((s: any) => ({
    name: s.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    value: s.count
  }));

  const barData = byState.map((s: any) => ({
    name: s.stateCode,
    Projects: s.count
  })).sort((a: any, b: any) => b.Projects - a.Projects);

  return (
    <div className="space-y-8">
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Total Active Projects
            </CardTitle>
            <Layers className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold">{overview.totalProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all jurisdictions</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Total Area Encompassed
            </CardTitle>
            <Map className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold">{totalHectares} <span className="text-lg font-medium text-muted-foreground">Ha</span></div>
            <p className="text-xs text-muted-foreground mt-1">Estimated required land</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-l-4 border-l-success sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Approved Projects
            </CardTitle>
            <CheckCircle2 className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold">{approvedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready for notification phase</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>State-wise Distribution</CardTitle>
            <CardDescription>Number of active projects by State/UT.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor' }} className="text-muted-foreground" angle={-45} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor' }} className="text-muted-foreground" />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                  />
                  <Bar dataKey="Projects" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Lifecycle Status Breakdown</CardTitle>
            <CardDescription>Proportion of projects in each workflow phase.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
