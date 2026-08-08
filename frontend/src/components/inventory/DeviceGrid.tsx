import React from 'react';
import { Monitor } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Device {
  id: string;
  code: string;
  condition: string;
  ip_address?: string | null;
}

interface DeviceGridProps {
  devices: Device[];
  selectedDeviceId: string | null;
  onSelectDevice: (id: string) => void;
}

export const DeviceGrid: React.FC<DeviceGridProps> = ({ devices, selectedDeviceId, onSelectDevice }) => {
  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <Monitor className="w-12 h-12 mb-4 text-slate-300" />
        <p>Belum ada perangkat di laboratorium ini.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {devices.map((device) => {
        const isSelected = selectedDeviceId === device.id;
        const condition = device.condition || '';
        const hasIssue = condition.toLowerCase() !== 'baik' && condition.toLowerCase() !== 'good';

        return (
          <button
            key={device.id}
            onClick={() => onSelectDevice(device.id)}
            className={cn(
              "relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 group text-left w-full h-full aspect-square",
              isSelected 
                ? "border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20" 
                : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm hover:bg-slate-50"
            )}
          >
            {/* Status Indicators */}
            <div className="absolute top-3 right-3 flex flex-col gap-1.5">
              {hasIssue && (
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" title="Perlu perbaikan" />
              )}
            </div>

            {/* Icon */}
            <div className={cn(
              "p-3 rounded-full mb-3 transition-colors",
              isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500 group-hover:text-blue-500"
            )}>
              <Monitor className="w-8 h-8" strokeWidth={1.5} />
            </div>

            {/* Text */}
            <h3 className={cn(
              "font-bold text-sm tracking-wide text-center",
              isSelected ? "text-blue-700" : "text-slate-700"
            )}>
              {device.code}
            </h3>
            <p className={cn(
              "text-[10px] font-mono mt-1 text-center truncate w-full px-2",
              isSelected ? "text-blue-500/80" : "text-slate-400"
            )}>
              {device.ip_address || '---'}
            </p>
          </button>
        );
      })}
    </div>
  );
};
