import { create } from 'zustand';

export interface DeviceStatus {
  id: string;
  status?: 'online' | 'offline';
  lock_status?: 'unlocked' | 'pending' | 'locked';
  active_window?: string;
  open_windows?: string[];
}

interface DeviceState {
  devices: Record<string, DeviceStatus>;
  updateDevice: (device: DeviceStatus) => void;
  setDevices: (devices: DeviceStatus[]) => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  devices: {},
  updateDevice: (device) => set((state) => ({
    devices: {
      ...state.devices,
      [device.id]: {
        ...state.devices[device.id],
        ...device,
      }
    }
  })),
  setDevices: (devices) => set((state) => {
    const newDevices = { ...state.devices };
    devices.forEach(device => {
      newDevices[device.id] = { ...newDevices[device.id], ...device };
    });
    return { devices: newDevices };
  }),
}));
