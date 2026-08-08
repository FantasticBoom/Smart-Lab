import apiClient from './apiClient';

export interface LabCategory {
  id: string;
  name: string;
  slug: string;
}

export const getLabCategories = async (): Promise<LabCategory[]> => {
  const response = await apiClient.get('/lab-categories/');
  return response.data;
};

export const createLabCategory = async (data: Omit<LabCategory, 'id'>): Promise<LabCategory> => {
  const response = await apiClient.post('/lab-categories/', data);
  return response.data;
};

export const updateLabCategory = async (id: string, data: Partial<LabCategory>): Promise<LabCategory> => {
  const response = await apiClient.put(`/lab-categories/${id}`, data);
  return response.data;
};

export const deleteLabCategory = async (id: string): Promise<void> => {
  await apiClient.delete(`/lab-categories/${id}`);
};
