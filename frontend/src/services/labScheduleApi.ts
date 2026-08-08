import apiClient from './apiClient';

export interface LabSchedule {
  id: string;
  lab_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject: string;
  lecturer: string;
}

export interface LabWithScheduleCount {
  id: string;
  name: string;
  location: string;
  type_slug: string;
  schedule_count: number;
}

export const getLabsWithSchedules = async (): Promise<LabWithScheduleCount[]> => {
  const response = await apiClient.get('/schedules/labs');
  return response.data;
};

export const getLabSchedules = async (labId: string): Promise<LabSchedule[]> => {
  const response = await apiClient.get(`/schedules/labs/${labId}`);
  return response.data;
};

export const getAllSchedules = async (): Promise<LabSchedule[]> => {
  const response = await apiClient.get('/schedules/all');
  return response.data;
};

export const createLabSchedule = async (data: Omit<LabSchedule, 'id'>): Promise<LabSchedule> => {
  const response = await apiClient.post('/schedules/', data);
  return response.data;
};

export const updateLabSchedule = async (id: string, data: Partial<LabSchedule>): Promise<LabSchedule> => {
  const response = await apiClient.put(`/schedules/${id}`, data);
  return response.data;
};

export const deleteLabSchedule = async (id: string): Promise<void> => {
  await apiClient.delete(`/schedules/${id}`);
};

export const uploadLabSchedule = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await apiClient.post('/schedules/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
