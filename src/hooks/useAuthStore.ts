import { useAppDispatch, useAppSelector } from './useAppDispatch';
import { LoginCredentials, RegisterCredentials } from '@/types';
import {
  clearErrorMessage,
  onChecking,
  onLogin,
  onLogout,
  onLogoutCalendar,
} from '@/store';

export const useAuthStore = () => {
  const { status, user, errorMessage } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  const startLogin = async ({ email, password }: LoginCredentials) => {
    dispatch(onChecking());
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.ok) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', data.token);
          localStorage.setItem('token-init-date', new Date().getTime().toString());
        }
        dispatch(onLogin({ name: data.name, uid: data.uid, email }));
      } else {
        dispatch(onLogout(data.msg || 'Credenciales incorrectas'));
        setTimeout(() => {
          dispatch(clearErrorMessage());
        }, 10);
      }
    } catch (error) {
      dispatch(onLogout('Error de conexión'));
      setTimeout(() => {
        dispatch(clearErrorMessage());
      }, 10);
    }
  };

  const startRegister = async ({ email, password, name }: RegisterCredentials) => {
    dispatch(onChecking());
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (data.ok) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', data.token);
          localStorage.setItem('token-init-date', new Date().getTime().toString());
        }
        dispatch(onLogin({ name: data.name, uid: data.uid, email }));
      } else {
        dispatch(onLogout(data.msg || 'Error al registrar usuario'));
        setTimeout(() => {
          dispatch(clearErrorMessage());
        }, 10);
      }
    } catch (error) {
      dispatch(onLogout('Error de conexión'));
      setTimeout(() => {
        dispatch(clearErrorMessage());
      }, 10);
    }
  };

  const checkAuthToken = async () => {
    if (typeof window === 'undefined') return dispatch(onLogout());
    
    const token = localStorage.getItem('token');
    const tokenInitDate = localStorage.getItem('token-init-date');
    
    if (!token) return dispatch(onLogout());

    // Check if token is less than 6 days old (before 7 day expiration)
    if (tokenInitDate) {
      const now = new Date().getTime();
      const tokenAge = now - parseInt(tokenInitDate);
      const sixDaysInMs = 6 * 24 * 60 * 60 * 1000; // 6 days in milliseconds
      
      // If token is still fresh (less than 6 days), skip validation to improve performance
      if (tokenAge < sixDaysInMs) {
        // Token is still fresh, just validate locally stored user data
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            dispatch(onLogin(userData));
            return;
          } catch (e) {
            // If stored user data is corrupted, continue with server validation
          }
        }
      }
    }

    try {
      const response = await fetch('/api/auth/renew', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.ok) {
        const userData = { name: data.name, uid: data.uid, email: data.email };
        localStorage.setItem('token', data.token);
        localStorage.setItem('token-init-date', new Date().getTime().toString());
        localStorage.setItem('user', JSON.stringify(userData));
        dispatch(onLogin(userData));
      } else {
        localStorage.clear();
        dispatch(onLogout());
      }
    } catch (error) {
      // Only logout if response indicates unauthorized, not on network errors
      const response = (error as any)?.response;
      if (response?.status === 401) {
        localStorage.clear();
        dispatch(onLogout());
      }
      // For network errors, keep the user logged in with existing token
    }
  };

  const startLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    dispatch(onLogoutCalendar());
    dispatch(onLogout());
  };

  return {
    // Properties
    errorMessage,
    status,
    user,

    // Methods
    checkAuthToken,
    startLogin,
    startLogout,
    startRegister,
  };
};
