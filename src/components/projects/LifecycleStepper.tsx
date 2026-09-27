import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';

const STAGES = [
  { id: 'draft', label: 'Draft' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'under_scrutiny', label: 'SIA & Scrutiny' },
  { id: 'approved', label: 'Sec 19 Approved' },
  { id: 'notification_issued', label: 'Notified' },
  { id: 'award_declared', label: 'Award Declared' },
  { id: 'possession_taken', label: 'Possession' }
];

export function LifecycleStepper({ currentStatus, activeTask }: { currentStatus: string, activeTask?: any }) {
  const currentIndex = STAGES.findIndex(s => s.id === currentStatus);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="w-full py-2 overflow-x-auto hide-scrollbar">
      <div className="flex items-center min-w-[800px] justify-between relative px-2">
        {/* Background Line */}
        <div className="absolute left-[5%] right-[5%] top-1/2 -translate-y-1/2 h-0.5 bg-muted"></div>
        {/* Active Line */}
        <div 
          className="absolute left-[5%] top-1/2 -translate-y-1/2 h-0.5 bg-primary transition-all duration-700" 
          style={{ width: `${(safeIndex / (STAGES.length - 1)) * 90}%` }}
        ></div>

        {STAGES.map((stage, idx) => {
          const isCompleted = idx < safeIndex;
          const isCurrent = idx === safeIndex;
          const isPendingTask = isCurrent && activeTask?.status === 'pending';
          const hasClarification = isCurrent && activeTask?.status === 'clarification_requested';

          let Icon = Circle;
          let iconColor = 'text-muted-foreground bg-card';
          let borderColor = 'border-muted';

          if (isCompleted) {
            Icon = CheckCircle2;
            iconColor = 'text-primary bg-card';
            borderColor = 'border-primary';
          } else if (isCurrent) {
            if (hasClarification) {
              Icon = AlertCircle;
              iconColor = 'text-amber-500 bg-amber-50';
              borderColor = 'border-amber-500';
            } else if (isPendingTask) {
              Icon = Loader2;
              iconColor = 'text-primary bg-card animate-spin';
              borderColor = 'border-primary';
            } else {
              Icon = Circle;
              iconColor = 'text-primary bg-card fill-primary';
              borderColor = 'border-primary';
            }
          }

          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center gap-2 w-24">
              <div className={`rounded-full border-2 ${borderColor} p-1 bg-card transition-all duration-300 ${isCurrent ? 'ring-4 ring-primary/20 scale-110' : ''}`}>
                <Icon className={`w-5 h-5 ${iconColor} ${isCurrent && !hasClarification && !isPendingTask ? 'fill-primary' : ''}`} />
              </div>
              <div className="text-center">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isCurrent || isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {stage.label}
                </span>
                {isCurrent && activeTask && (
                  <div className="mt-1 flex justify-center">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border ${hasClarification ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-primary/10 text-primary border-primary/20'}`}>
                      {hasClarification ? 'Blocked' : 'Action Required'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
