import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { 
    fetchConversationsApi, 
    fetchSingleConversationApi,
    sendMessageApi, 
    renameConversationApi, 
    togglePinConversationApi, 
    deleteConversationApi 
} from '../api/chatApi.js';

const initialState = {
    conversations: [],
    selectedConversationId: null,
    messages: [],
    isLoadingConversations: false,
    isSending: false,
    error: null,
};

const syncCurrentMessagesToSelectedConversation = (state) => {
    if (!state.selectedConversationId) {
        return;
    }

    const conversation = state.conversations.find((item) => item.id === state.selectedConversationId);
    if (!conversation) {
        return;
    }

    conversation.messages = state.messages;
    conversation.updatedAt = new Date().toISOString();
};

const removePendingAssistantMessage = (state) => {
    const lastMessage = state.messages[ state.messages.length - 1 ];

    if (lastMessage?.author === 'ai' && !lastMessage.content) {
        state.messages.pop();
    }
};

export const fetchConversations = createAsyncThunk('chat/fetchConversations', async (_, { rejectWithValue }) => {
    try {
        const response = await fetchConversationsApi();
        return response.conversations || [];
    } catch (error) {
        return rejectWithValue(error.message || 'Unable to load conversations');
    }
});

export const fetchSingleConversation = createAsyncThunk('chat/fetchSingleConversation', async (id, { rejectWithValue }) => {
    try {
        const response = await fetchSingleConversationApi(id);
        return response.conversation;
    } catch (error) {
        return rejectWithValue(error.message || 'Unable to load conversation details');
    }
});

export const renameConversation = createAsyncThunk(
    'chat/renameConversation',
    async ({ id, title }, { rejectWithValue }) => {
        try {
            const response = await renameConversationApi(id, title);
            return response.conversation;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to rename conversation');
        }
    }
);

export const togglePinConversation = createAsyncThunk(
    'chat/togglePinConversation',
    async (id, { rejectWithValue }) => {
        try {
            const response = await togglePinConversationApi(id);
            return response.conversation;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to pin/unpin conversation');
        }
    }
);

export const deleteConversation = createAsyncThunk(
    'chat/deleteConversation',
    async (id, { rejectWithValue }) => {
        try {
            await deleteConversationApi(id);
            return id;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to delete conversation');
        }
    }
);

export const sendMessage = createAsyncThunk(
    'chat/sendMessage',
    async ({ message = '', attachments = [], taggedDoc = null, isRagEnabled = true }, { dispatch, getState, rejectWithValue }) => {
        const trimmedMessage = message.trim();

        if (!trimmedMessage && attachments.length === 0) {
            return rejectWithValue('Please enter a message or attach a file');
        }

        const previousConversationId = getState().chat.selectedConversationId;

        dispatch(appendUserMessage({ message: trimmedMessage, attachments, taggedDoc }));
        dispatch(startAssistantMessage());

        try {
            const { conversationId, conversationTitle, sources } = await sendMessageApi({
                message: trimmedMessage,
                attachments,
                conversationId: previousConversationId,
                taggedPaperId: taggedDoc?.id,
                taggedPaperTitle: taggedDoc?.title,
                isRagEnabled,
                onSources: (retrievedSources) => {
                    dispatch(setAssistantSources(retrievedSources));
                },
                onToken: (token) => {
                    dispatch(appendAssistantToken(token));
                },
            });

            return {
                conversationId,
                conversationTitle,
                previousConversationId,
                sources,
            };
        } catch (error) {
            return rejectWithValue(error.message || 'Unable to send message');
        }
    },
);

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        appendUserMessage: (state, action) => {
            const { message, attachments = [], taggedDoc = null } = action.payload || {};
            state.messages.push({
                id: `user-${Date.now()}`,
                author: 'user',
                content: message || '',
                attachments,
                taggedDoc,
            });

            syncCurrentMessagesToSelectedConversation(state);
        },
        startAssistantMessage: (state) => {
            state.messages.push({
                id: `ai-${Date.now()}`,
                author: 'ai',
                content: '',
                sources: [],
            });

            syncCurrentMessagesToSelectedConversation(state);
        },
        setAssistantSources: (state, action) => {
            const lastMessage = state.messages[ state.messages.length - 1 ];
            if (lastMessage && lastMessage.author === 'ai') {
                lastMessage.sources = action.payload || [];
                syncCurrentMessagesToSelectedConversation(state);
            }
        },
        appendAssistantToken: (state, action) => {
            const lastMessage = state.messages[ state.messages.length - 1 ];

            if (lastMessage?.author === 'ai') {
                lastMessage.content += action.payload;
                syncCurrentMessagesToSelectedConversation(state);
                return;
            }

            state.messages.push({
                id: `ai-${Date.now()}`,
                author: 'ai',
                content: action.payload,
                sources: [],
            });

            syncCurrentMessagesToSelectedConversation(state);
        },
        selectConversation: (state, action) => {
            const selectedConversationId = action.payload;
            state.selectedConversationId = selectedConversationId;

            if (selectedConversationId) {
                sessionStorage.setItem('active_conversation_id', selectedConversationId);
            } else {
                sessionStorage.removeItem('active_conversation_id');
            }

            const conversation = state.conversations.find((item) => item.id === selectedConversationId);
            state.messages = conversation ? [ ...conversation.messages ] : [];

            // If selected conversation is not pinned, move it to the top of recent chats
            if (conversation && !conversation.isPinned) {
                conversation.updatedAt = new Date().toISOString();
                const pinned = state.conversations.filter((c) => Boolean(c.isPinned));
                const nonPinned = state.conversations.filter((c) => !c.isPinned && c.id !== selectedConversationId);
                state.conversations = [...pinned, conversation, ...nonPinned];
            }
        },
        clearChatError: (state) => {
            state.error = null;
        },
        startNewChat: (state) => {
            state.selectedConversationId = null;
            sessionStorage.removeItem('active_conversation_id');
            state.messages = [];
            state.error = null;
        },
        resetChat: (state) => {
            state.conversations = [];
            state.selectedConversationId = null;
            sessionStorage.removeItem('active_conversation_id');
            state.messages = [];
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchConversations.pending, (state) => {
                state.isLoadingConversations = true;
                state.error = null;
            })
            .addCase(fetchConversations.fulfilled, (state, action) => {
                state.isLoadingConversations = false;
                state.conversations = action.payload || [];

                // Restore active chat if page refreshed or previously selected
                const savedActiveId = sessionStorage.getItem('active_conversation_id') || state.selectedConversationId;
                if (savedActiveId && state.conversations.length > 0) {
                    const matched = state.conversations.find((c) => c.id === savedActiveId);
                    if (matched) {
                        state.selectedConversationId = matched.id;
                        state.messages = [ ...(matched.messages || []) ];
                    }
                }
            })
            .addCase(fetchConversations.rejected, (state, action) => {
                state.isLoadingConversations = false;
                state.error = action.payload || action.error.message;
            })
            .addCase(fetchSingleConversation.fulfilled, (state, action) => {
                const fetchedConv = action.payload;
                if (!fetchedConv) return;
                state.selectedConversationId = fetchedConv.id;
                state.messages = [ ...(fetchedConv.messages || []) ];
                const index = state.conversations.findIndex((c) => c.id === fetchedConv.id);
                if (index !== -1) {
                    const updated = {
                        ...state.conversations[index],
                        messages: [ ...(fetchedConv.messages || []) ],
                        updatedAt: fetchedConv.updatedAt || new Date().toISOString(),
                    };
                    if (!updated.isPinned) {
                        const pinned = state.conversations.filter((c) => Boolean(c.isPinned));
                        const nonPinned = state.conversations.filter((c) => !c.isPinned && c.id !== fetchedConv.id);
                        state.conversations = [...pinned, updated, ...nonPinned];
                    } else {
                        state.conversations[index] = updated;
                    }
                }
            })
            .addCase(renameConversation.fulfilled, (state, action) => {
                const updated = action.payload;
                const conversation = state.conversations.find((item) => item.id === updated.id);
                if (conversation) {
                    conversation.title = updated.title;
                }
            })
            .addCase(togglePinConversation.fulfilled, (state, action) => {
                const updated = action.payload;
                const conversation = state.conversations.find((item) => item.id === updated.id);
                if (conversation) {
                    conversation.isPinned = updated.isPinned;
                    state.conversations.sort((a, b) => {
                        if (Boolean(a.isPinned) === Boolean(b.isPinned)) {
                            return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
                        }
                        return a.isPinned ? -1 : 1;
                    });
                }
            })
            .addCase(deleteConversation.fulfilled, (state, action) => {
                const deletedId = action.payload;
                state.conversations = state.conversations.filter((item) => item.id !== deletedId);
                if (state.selectedConversationId === deletedId) {
                    const nextSelected = state.conversations[0];
                    state.selectedConversationId = nextSelected ? nextSelected.id : null;
                    state.messages = nextSelected ? [ ...(nextSelected.messages || []) ] : [];
                }
            })
            .addCase(sendMessage.pending, (state) => {
                state.isSending = true;
                state.error = null;
            })
            .addCase(sendMessage.fulfilled, (state, action) => {
                state.isSending = false;

                const { conversationId, conversationTitle, previousConversationId, sources } = action.payload || {};

                const lastMessage = state.messages[ state.messages.length - 1 ];
                if (lastMessage && lastMessage.author === 'ai' && sources && sources.length > 0) {
                    lastMessage.sources = sources;
                }

                if (!conversationId) {
                    return;
                }

                if (!previousConversationId) {
                    state.selectedConversationId = conversationId;
                    state.conversations.unshift({
                        id: conversationId,
                        title: conversationTitle || 'New chat',
                        messages: [ ...state.messages ],
                        updatedAt: new Date().toISOString(),
                    });
                    return;
                }

                const existingConversation = state.conversations.find((item) => item.id === conversationId);
                if (existingConversation) {
                    existingConversation.messages = [ ...state.messages ];
                    existingConversation.updatedAt = new Date().toISOString();

                    if (conversationTitle) {
                        existingConversation.title = conversationTitle;
                    }

                    state.conversations = [
                        existingConversation,
                        ...state.conversations.filter((item) => item.id !== conversationId),
                    ];
                    return;
                }

                state.conversations.unshift({
                    id: conversationId,
                    title: conversationTitle || 'New chat',
                    messages: [ ...state.messages ],
                    updatedAt: new Date().toISOString(),
                });
            })
            .addCase(sendMessage.rejected, (state, action) => {
                state.isSending = false;
                state.error = action.payload || action.error.message;
                removePendingAssistantMessage(state);
            });
    },
});

export const {
    appendUserMessage,
    startAssistantMessage,
    setAssistantSources,
    appendAssistantToken,
    selectConversation,
    clearChatError,
    startNewChat,
    resetChat,
} = chatSlice.actions;

export default chatSlice.reducer;
