import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { loginApi, logoutApi, meApi, registerApi, switchAccountApi, googleLoginApi } from '../api/authApi.js';

// Local storage helpers for multi-account management
const ACCOUNTS_STORAGE_KEY = 'override_saved_accounts';
const ACTIVE_TOKEN_KEY = 'override_active_token';

export const getActiveToken = () => {
    try {
        const token = localStorage.getItem(ACTIVE_TOKEN_KEY);
        if (token) return token;
        const saved = getSavedAccounts();
        return saved[0]?.token || null;
    } catch {
        return null;
    }
};

export const setActiveToken = (token) => {
    try {
        if (token) {
            localStorage.setItem(ACTIVE_TOKEN_KEY, token);
        } else {
            localStorage.removeItem(ACTIVE_TOKEN_KEY);
        }
    } catch (e) {
        console.error('Failed to set active token in localStorage', e);
    }
};

export const clearActiveToken = () => setActiveToken(null);

export const getSavedAccounts = () => {
    try {
        const data = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

const storeAccountInStorage = (user, token) => {
    if (!user || !token) return;
    try {
        setActiveToken(token);
        const existing = getSavedAccounts();
        const updated = existing.filter((acc) => acc.user.id !== user.id && acc.user.email !== user.email);
        updated.unshift({ user, token, lastActive: Date.now() });
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error('Failed to store account in localStorage', e);
    }
};

export const removeAccountFromStorage = (userId) => {
    try {
        const existing = getSavedAccounts();
        const updated = existing.filter((acc) => acc.user.id !== userId);
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));
        if (updated.length > 0) {
            setActiveToken(updated[0].token);
        } else {
            clearActiveToken();
        }
        return updated;
    } catch {
        clearActiveToken();
        return [];
    }
};

const initialState = {
    user: null,
    loading: false,
    error: null,
    isAuthenticated: false,
    isAuthChecked: false,
    isAddingAccount: false,
    savedAccounts: getSavedAccounts(),
};

export const registerUser = createAsyncThunk('auth/registerUser', async (payload) => {
    return registerApi(payload);
});

export const loginUser = createAsyncThunk('auth/loginUser', async (payload) => {
    return loginApi(payload);
});

export const switchUserAccount = createAsyncThunk('auth/switchUserAccount', async (token) => {
    return switchAccountApi(token);
});

export const fetchMe = createAsyncThunk('auth/fetchMe', async () => {
    return meApi();
});

export const googleLoginUser = createAsyncThunk('auth/googleLoginUser', async (credential) => {
    return googleLoginApi({ credential });
});

export const logoutUser = createAsyncThunk('auth/logoutUser', async (_, { dispatch, getState }) => {
    const currentState = getState().auth;
    const currentId = currentState.user?.id;
    const remainingAccounts = removeAccountFromStorage(currentId);

    try {
        await logoutApi();
    } catch (e) {
        console.error('Logout API call error:', e);
    }

    if (remainingAccounts.length > 0) {
        const nextAccount = remainingAccounts[0];
        const switchResult = await dispatch(switchUserAccount(nextAccount.token));
        if (switchUserAccount.fulfilled.match(switchResult)) {
            return { switchedToNext: true, user: switchResult.payload.user, remainingAccounts };
        }
    }

    return { switchedToNext: false, remainingAccounts: [] };
});

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearAuthError: (state) => {
            state.error = null;
        },
        prepareAddAccount: (state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.isAddingAccount = true;
        },
        cancelAddAccount: (state) => {
            state.isAddingAccount = false;
            const saved = getSavedAccounts();
            if (saved.length > 0) {
                state.user = saved[0].user;
                state.isAuthenticated = true;
                state.isAuthChecked = true;
                setActiveToken(saved[0].token);
            }
        },
        removeSavedAccount: (state, action) => {
            const userId = action.payload;
            state.savedAccounts = removeAccountFromStorage(userId);
        },
        refreshSavedAccounts: (state) => {
            state.savedAccounts = getSavedAccounts();
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(registerUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.isAuthenticated = true;
                state.isAuthChecked = true;
                state.isAddingAccount = false;
                storeAccountInStorage(action.payload.user, action.payload.token);
                state.savedAccounts = getSavedAccounts();
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
                state.isAuthChecked = true;
            })
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.isAuthenticated = true;
                state.isAuthChecked = true;
                state.isAddingAccount = false;
                storeAccountInStorage(action.payload.user, action.payload.token);
                state.savedAccounts = getSavedAccounts();
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
                state.isAuthChecked = true;
            })
            .addCase(switchUserAccount.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(switchUserAccount.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.isAuthenticated = true;
                state.isAuthChecked = true;
                storeAccountInStorage(action.payload.user, action.payload.token);
                state.savedAccounts = getSavedAccounts();
            })
            .addCase(switchUserAccount.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(fetchMe.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMe.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.isAuthenticated = true;
                state.isAuthChecked = true;
            })
            .addCase(fetchMe.rejected, (state) => {
                state.loading = false;
                state.user = null;
                state.isAuthenticated = false;
                state.isAuthChecked = true;
            })
            .addCase(logoutUser.fulfilled, (state, action) => {
                const { switchedToNext, remainingAccounts } = action.payload || {};
                state.savedAccounts = remainingAccounts || getSavedAccounts();

                if (!switchedToNext) {
                    state.user = null;
                    state.isAuthenticated = false;
                    state.isAuthChecked = true;
                }
            })
            .addCase(googleLoginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(googleLoginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.isAuthenticated = true;
                state.isAuthChecked = true;
                state.isAddingAccount = false;
                storeAccountInStorage(action.payload.user, action.payload.token);
                state.savedAccounts = getSavedAccounts();
            })
            .addCase(googleLoginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
                state.isAuthChecked = true;
            });
    },
});

export const { clearAuthError, prepareAddAccount, cancelAddAccount, removeSavedAccount, refreshSavedAccounts } = authSlice.actions;

export default authSlice.reducer;
