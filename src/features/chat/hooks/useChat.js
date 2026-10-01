import { useDispatch, useSelector } from 'react-redux';
import {
    clearChatError,
    fetchConversations,
    fetchSingleConversation,
    resetChat,
    selectConversation,
    sendMessage,
    renameConversation,
    togglePinConversation,
    deleteConversation,
    startNewChat,
} from '../state/chatSlice.js';

const useChat = () => {
    const dispatch = useDispatch();
    const chatState = useSelector((state) => state.chat);

    return {
        ...chatState,
        loadConversations: () => dispatch(fetchConversations()),
        chooseConversation: (conversationId) => {
            dispatch(selectConversation(conversationId));
            dispatch(fetchSingleConversation(conversationId));
        },
        send: (message, attachments = [], taggedDoc = null, isRagEnabled = true) => dispatch(sendMessage({ message, attachments, taggedDoc, isRagEnabled })),
        clearError: () => dispatch(clearChatError()),
        startNewChat: () => dispatch(startNewChat()),
        reset: () => dispatch(resetChat()),
        rename: (id, title) => dispatch(renameConversation({ id, title })),
        togglePin: (id) => dispatch(togglePinConversation(id)),
        remove: (id) => dispatch(deleteConversation(id)),
    };
};

export default useChat;
