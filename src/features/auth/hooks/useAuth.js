import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    cancelAddAccount,
    clearAuthError,
    fetchMe,
    loginUser,
    googleLoginUser,
    logoutUser,
    prepareAddAccount,
    refreshSavedAccounts,
    registerUser,
    removeSavedAccount,
    switchUserAccount,
} from '../state/authSlice.js';

const useAuth = () => {
    const dispatch = useDispatch();
    const { user, loading, error, isAuthenticated, isAuthChecked, isAddingAccount, savedAccounts } = useSelector((state) => state.auth);

    const register = useCallback((credentials) => dispatch(registerUser(credentials)), [dispatch]);

    const login = useCallback((credentials) => dispatch(loginUser(credentials)), [dispatch]);

    const googleLogin = useCallback((credential) => dispatch(googleLoginUser(credential)), [dispatch]);

    const switchAccount = useCallback((token) => dispatch(switchUserAccount(token)), [dispatch]);

    const me = useCallback(() => dispatch(fetchMe()), [dispatch]);

    const logout = useCallback(() => dispatch(logoutUser()), [dispatch]);

    const clearError = useCallback(() => dispatch(clearAuthError()), [dispatch]);

    const startAddAccount = useCallback(() => dispatch(prepareAddAccount()), [dispatch]);

    const cancelAccountAdd = useCallback(() => dispatch(cancelAddAccount()), [dispatch]);

    const removeAccount = useCallback((userId) => dispatch(removeSavedAccount(userId)), [dispatch]);

    const reloadAccounts = useCallback(() => dispatch(refreshSavedAccounts()), [dispatch]);

    return {
        user,
        loading,
        error,
        isAuthenticated,
        isAuthChecked,
        isAddingAccount,
        savedAccounts,
        register,
        login,
        googleLogin,
        switchAccount,
        me,
        logout,
        clearError,
        prepareAddAccount: startAddAccount,
        cancelAddAccount: cancelAccountAdd,
        removeAccount,
        reloadAccounts,
    };
};

export default useAuth;
