import { getActiveToken } from '../../auth/state/authSlice.js';

const getAuthHeaders = () => {
    const activeToken = getActiveToken();
    return {
        'Content-Type': 'application/json',
        ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
    };
};

const parseErrorResponse = async (response) => {
    try {
        const data = await response.json();
        return data?.message || 'Failed to send message';
    } catch {
        return 'Failed to send message';
    }
};

const parseJsonResponse = async (response) => {
    const isJson = response.headers.get('content-type')?.includes('application/json');
    let data = null;

    if (isJson) {
        try {
            data = await response.json();
        } catch {
            data = null;
        }
    }

    if (!response.ok) {
        const textError = !isJson ? await response.text().catch(() => '') : null;
        throw new Error(data?.message || textError || `Request failed (${response.status})`);
    }

    return data;
};

const readSseChunk = (chunk) => {
    const lines = chunk.split('\n');
    const dataLines = [];

    for (const line of lines) {
        if (!line.startsWith('data:')) {
            continue;
        }

        let value = line.slice(5);
        if (value.startsWith(' ')) {
            value = value.slice(1);
        }

        dataLines.push(value);
    }

    return dataLines.join('\n');
};

const API_BASE = '';

/**
 * Sends a chat message with optional attachments and streams token chunks from backend SSE response.
 *
 * @param {{message: string, attachments?: Array<any>, conversationId?: string | null, onToken?: (token: string, fullText: string) => void}} params
 * @returns {Promise<{conversationId: string | null, conversationTitle: string | null, reply: string}>}
 */
export const sendMessageApi = async ({ message, attachments = [], conversationId, onToken }) => {
    const response = await fetch(`${API_BASE}/api/conversation`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message, attachments, conversationId }),
    });

    if (!response.ok) {
        throw new Error(await parseErrorResponse(response));
    }

    const nextConversationId = response.headers.get('x-conversation-id') || conversationId || null;
    const conversationTitle = response.headers.get('x-conversation-title') || null;

    if (!response.body) {
        return {
            conversationId: nextConversationId,
            conversationTitle,
            reply: '',
        };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullReply = '';

    while (true) {
        const { done, value } = await reader.read();

        if (done) {
            buffer += decoder.decode();
            break;
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() || '';

        for (const chunk of chunks) {
            const token = readSseChunk(chunk);

            if (!token) {
                continue;
            }

            fullReply += token;
            onToken?.(token, fullReply);
        }
    }

    if (buffer) {
        const token = readSseChunk(buffer);

        if (token) {
            fullReply += token;
            onToken?.(token, fullReply);
        }
    }

    return {
        conversationId: nextConversationId,
        conversationTitle,
        reply: fullReply,
    };
};

/**
 * Fetches all conversations and their messages for the authenticated user.
 *
 * @returns {Promise<{conversations: Array<any>}>}
 */
export const fetchConversationsApi = async () => {
    const response = await fetch(`${API_BASE}/api/conversation`, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
    });

    return parseJsonResponse(response);
};

export const fetchSingleConversationApi = async (id) => {
    const response = await fetch(`${API_BASE}/api/conversation/${id}`, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
    });

    return parseJsonResponse(response);
};

export const renameConversationApi = async (id, title) => {
    const response = await fetch(`${API_BASE}/api/conversation/${id}/rename`, {
        method: 'PATCH',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title }),
    });

    return parseJsonResponse(response);
};

export const togglePinConversationApi = async (id) => {
    const response = await fetch(`${API_BASE}/api/conversation/${id}/pin`, {
        method: 'PATCH',
        credentials: 'include',
        headers: getAuthHeaders(),
    });

    return parseJsonResponse(response);
};

export const deleteConversationApi = async (id) => {
    const response = await fetch(`${API_BASE}/api/conversation/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders(),
    });

    return parseJsonResponse(response);
};
