import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { notification } from '../utils/antdGlobal';
import { useAuthStore } from '../store/authStore';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5080/api').replace(/\/api\/?$/, '');

export const useSignalR = () => {
  const [connection, setConnection] = useState(null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      setConnection(null);
      return undefined;
    }

    let isDisposed = false;
    let hubConnection = null;

    const startConnection = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${API_ROOT}/notificationHub`, {
          accessTokenFactory: () => localStorage.getItem('token') || '',
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      hubConnection.on('PermissionsUpdated', async () => {
        const token = localStorage.getItem('token');
        const refreshToken = localStorage.getItem('refreshToken');
        if (token && refreshToken) {
          try {
             // Dùng fetch thay vì axiosClient để tránh vòng lặp interceptor nếu bị 401
             const res = await fetch(`${API_ROOT}/auth/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: token, refreshToken })
             });
             const data = await res.json();
             if (data.success) {
                useAuthStore.getState().login(
                  data.data.user,
                  data.data.accessToken,
                  data.data.refreshToken,
                  data.data.permissions
                );
                notification.info({
                   message: 'Cập nhật hệ thống',
                   description: 'Quyền hạn của bạn vừa được cập nhật, hệ thống đã đồng bộ thành công!',
                   placement: 'topRight'
                });
             }
          } catch (e) {
             console.error('Failed to silently refresh permissions:', e);
          }
        }
      });

      hubConnection.on('ReceiveNotification', (data) => {
        const title = data?.title || data?.Title || 'Thông báo mới';
        const content = data?.content || data?.Content || data?.message || data?.Message || '';
        const type = (data?.type || data?.Type || 'info').toLowerCase();
        const safeType = ['success', 'info', 'warning', 'error'].includes(type) ? type : 'info';
        const action = data?.action || data?.Action;
        const refId = data?.referenceId || data?.ReferenceId;

        if (action === 'REDIRECT_TO_REVIEW' && refId) {
          notification[safeType]({
            message: title,
            description: content,
            placement: 'topRight',
            duration: 0,
            btn: (
              <Button type="primary" size="small" onClick={() => {
                notification.destroy();
                navigate(`/booking/${refId}/review`);
              }}>
                Đánh giá ngay
              </Button>
            ),
          });
          return;
        }

        notification[safeType]({
          message: title, 
          description: content,
          placement: 'topRight',
          duration: 5,
        });
      });

      hubConnection.onreconnecting(() => {
        console.warn('SignalR đang reconnect...');
      });

      hubConnection.onreconnected(() => {
        console.log('SignalR reconnect thành công.');
      });

      hubConnection.onclose((error) => {
        if (error) {
          console.warn('SignalR đã đóng kết nối:', error.message || error);
        }
        if (!isDisposed) {
          setConnection(null);
        }
      });

      try {
        await hubConnection.start();
        if (!isDisposed) {
          console.log('🟢 Đã kết nối SignalR thành công!');
          setConnection(hubConnection);
        }
      } catch (err) {
        console.warn('SignalR hiện chưa khả dụng:', err?.message || err);
        if (!isDisposed) {
          setConnection(null);
        }
      }
    };

    startConnection();

    return () => {
      isDisposed = true;
      if (hubConnection) {
        hubConnection.off('ReceiveNotification');
        hubConnection.stop().catch(() => {});
      }
      setConnection(null);
    };
  }, [isAuthenticated]);

  return { connection };
};

export default useSignalR;