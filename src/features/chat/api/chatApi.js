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

const processSseBlock = (block, onSources) => {
    if (!block || !block.trim()) return null;

    const lines = block.split('\n');
    let isSourcesEvent = false;
    const dataLines = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === 'event: sources') {
            isSourcesEvent = true;
            continue;
        }

        if (line.startsWith('data:')) {
            let value = line.slice(5);
            if (value.startsWith(' ')) {
                value = value.slice(1);
            }
            dataLines.push(value);
        }
    }

    if (isSourcesEvent) {
        try {
            const rawJson = dataLines.join('\n');
            const parsedSources = JSON.parse(rawJson);
            if (Array.isArray(parsedSources)) {
                onSources?.(parsedSources);
                return { type: 'sources', sources: parsedSources };
            }
        } catch (e) {
            console.warn('Failed parsing sources event payload:', e);
        }
        return { type: 'sources', sources: [] };
    }

    if (dataLines.length > 0) {
        return { type: 'token', text: dataLines.join('\n') };
    }

    return null;
};

const API_BASE = '';

/**
 * Sends a chat message with optional attachments and streams token chunks from backend SSE response.
 *
 * @param {{message: string, attachments?: Array<any>, conversationId?: string | null, onToken?: (token: string, fullText: string) => void, onSources?: (sources: Array<any>) => void}} params
 * @returns {Promise<{conversationId: string | null, conversationTitle: string | null, reply: string, sources: Array<any>}>}
 */
export const sendMessageApi = async ({ message, attachments = [], conversationId, taggedPaperId, taggedPaperTitle, isRagEnabled = true, onToken, onSources }) => {
    const response = await fetch(`${API_BASE}/api/conversation`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message, attachments, conversationId, taggedPaperId, taggedPaperTitle, isRagEnabled }),
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
            sources: [],
        };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullReply = '';
    let retrievedSources = [];

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
            const result = processSseBlock(chunk, onSources);
            if (!result) continue;

            if (result.type === 'sources') {
                retrievedSources = result.sources;
            } else if (result.type === 'token') {
                fullReply += result.text;
                onToken?.(result.text, fullReply);
            }
        }
    }

    if (buffer) {
        const result = processSseBlock(buffer, onSources);
        if (result?.type === 'sources') {
            retrievedSources = result.sources;
        } else if (result?.type === 'token') {
            fullReply += result.text;
            onToken?.(result.text, fullReply);
        }
    }

    return {
        conversationId: nextConversationId,
        conversationTitle,
        reply: fullReply,
        sources: retrievedSources,
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
