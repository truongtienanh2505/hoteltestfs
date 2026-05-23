import axiosClient from './axiosClient';

const auditLogApi = {
  getAuditLogs: (params) => {
    return axiosClient.get('/AuditLogs', { params });
  },
  exportToExcel: (params) => {
    return axiosClient.get('/AuditLogs/export', {
      params,
      responseType: 'blob',
    });
  },
  purgeOldLogs: () => {
    return axiosClient.delete('/AuditLogs/purge');
  },
};

export default auditLogApi;
