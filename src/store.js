import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/auth/state/authSlice.js';
import chatReducer from '@/features/chat/state/chatSlice.js';

const store = configureStore({
    reducer: {
        auth: authReducer,
        chat: chatReducer,
    },
});

export default store;
