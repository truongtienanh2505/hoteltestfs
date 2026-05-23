import axiosClient from './axiosClient';

export const dashboardPeriodApi = {
  getCurrentDashboard: (params) => {
    return axiosClient.get('/dashboard-periods/current', { params });
  },
  getDashboardByPeriod: (roleName, periodType, periodKey) => {
    return axiosClient.get(`/dashboard-periods/${roleName}/${periodType}/${periodKey}`);
  },
  getHistory: (roleName, periodType, params) => {
    return axiosClient.get(`/dashboard-periods/${roleName}/${periodType}/history`, { params });
  },
  rebuildDashboard: (data) => {
    return axiosClient.post('/dashboard-periods/rebuild', data);
  },
  rebuildCurrent: () => {
    return axiosClient.post('/dashboard-periods/rebuild-current');
  }
};
