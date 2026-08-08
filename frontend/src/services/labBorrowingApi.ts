import apiClient from './apiClient';

export interface LabBorrowingMember {
  npm: string;
  name: string;
}

export interface LabBorrowingForm {
  user_npm: string;
  user_name: string;
  user_email: string;
  num_people: number;
  lab_type: string;
  lab_name: string;
  start_datetime: string;
  end_datetime: string;
  purpose: string;
  is_urgent: boolean;
  members: LabBorrowingMember[];
}

export const submitLabBorrowing = async (data: LabBorrowingForm) => {
  const response = await apiClient.post('/lab-borrowings/', data);
  return response.data;
};

export const getPublicLabs = async (type?: string) => {
  const params = type ? { type } : {};
  const response = await apiClient.get('/lab-borrowings/public/labs', { params });
  return response.data;
};

export const getLabBorrowings = async (status?: string) => {
  const params = status ? { status } : {};
  const response = await apiClient.get('/lab-borrowings/', { params });
  return response.data;
};

export const updateLabBorrowingStatus = async (id: string, status: 'approved' | 'rejected') => {
  const response = await apiClient.put(`/lab-borrowings/${id}/status`, { status });
  return response.data;
};

export const verifyBooking = async (bookingId: string) => {
  const response = await apiClient.get(`/lab-borrowings/verify/${bookingId}`);
  return response.data;
};
