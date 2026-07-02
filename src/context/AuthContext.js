import React, { createContext, useState, useCallback } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authError, setAuthError] = useState(null); // null, 401, 403

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const setUnauthorized = useCallback(() => {
    setAuthError(401);
  }, []);

  const setForbidden = useCallback(() => {
    setAuthError(403);
  }, []);

  const value = {
    authError,
    setAuthError,
    clearAuthError,
    setUnauthorized,
    setForbidden,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
