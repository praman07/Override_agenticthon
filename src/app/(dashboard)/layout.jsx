'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useAuth from '@/features/auth/hooks/useAuth.js';
import useChat from '@/features/chat/hooks/useChat.js';
import ConfirmModal from '@/features/chat/ui/components/ConfirmModal.jsx';
import SwitchAccountModal from '@/features/auth/ui/components/SwitchAccountModal.jsx';
import ProtectedRoute from '@/features/auth/ui/components/ProtectedRoute.jsx';

const SidebarChatItem = ({ conversation, isSelected, onSelect, onRename, onTogglePin, onDelete }) => {
  const [ isEditing, setIsEditing ] = useState(false);
  const [ editTitle, setEditTitle ] = useState(conversation.title || '');
  const [ showDeleteConfirm, setShowDeleteConfirm ] = useState(false);

  const handleStartEditing = (e) => {
    e.stopPropagation();
    setEditTitle(conversation.title || '');
    setIsEditing(true);
  };

  const handleSaveRename = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (editTitle.trim()) {
      onRename(conversation.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSaveRename} className="flex items-center gap-1 px-2 py-1.5">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full rounded border border-white/20 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-white/30"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsEditing(false);
              setEditTitle(conversation.title || '');
            }
          }}
        />
        <button
          type="submit"
          className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
          title="Save"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setEditTitle(conversation.title || '');
          }}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
          title="Cancel"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </form>
    );
  }

  return (
    <>
      <div
        onClick={() => onSelect(conversation.id)}
        className={`group relative flex items-center justify-between rounded-lg px-3 py-2 text-sm transition cursor-pointer select-none ${
          isSelected ? 'bg-zinc-700/70 text-zinc-100' : 'text-zinc-300 hover:bg-zinc-800/80'
        }`}
        title={conversation.title}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {conversation.isPinned ? (
            <svg className="h-3.5 w-3.5 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 24 24" title="Pinned chat">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
          ) : null}
          <span className="truncate">{conversation.title || 'Untitled chat'}</span>
        </div>

        <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(conversation.id);
            }}
            className={`rounded p-1 text-xs transition hover:bg-zinc-800 ${
              conversation.isPinned ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-400 hover:text-zinc-100'
            }`}
            title={conversation.isPinned ? 'Unpin chat' : 'Pin chat'}
          >
            <svg className="h-3.5 w-3.5" fill={conversation.isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleStartEditing}
            className="rounded p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
            title="Rename chat"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className="rounded p-1 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition"
            title="Delete chat"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Conversation"
        message="Are you sure you want to delete this chat? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDelete(conversation.id);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};

export default function ChatLayout({ children }) {
  const [ isSidebarOpen, setIsSidebarOpen ] = useState(true);
  const [ isLogoutModalOpen, setIsLogoutModalOpen ] = useState(false);
  const [ isSwitchModalOpen, setIsSwitchModalOpen ] = useState(false);
  const [ notification, setNotification ] = useState(null);

  const { user, logout } = useAuth();
  const {
    conversations,
    selectedConversationId,
    isLoadingConversations,
    loadConversations,
    chooseConversation,
    startNewChat,
    reset,
    rename,
    togglePin,
    remove,
  } = useChat();

  const userId = user?.id || user?._id;

  useEffect(() => {
    if (userId) {
      loadConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ userId ]);

  const handleLogoutConfirm = async () => {
    setIsLogoutModalOpen(false);
    const terminatedEmail = user?.email || user?.name || 'current account';
    const logoutResult = await logout();

    if (logoutResult.payload?.switchedToNext && logoutResult.payload?.user) {
      const activeUser = logoutResult.payload.user;
      const activeEmail = activeUser.email || activeUser.name;
      setNotification({
        title: 'Logged Out',
        message: `Signed out of ${terminatedEmail}. Switched to ${activeEmail}.`,
      });
      setTimeout(() => setNotification(null), 5000);
    }
    reset();
  };

  return (
    <ProtectedRoute requireAuth={true}>
      <main className="h-screen bg-black text-zinc-100">
        <div className="flex h-full w-full overflow-hidden">
          {/* Sidebar */}
          {isSidebarOpen ? (
            <aside className="flex w-[260px] shrink-0 flex-col border-r border-white/10 bg-[#0f0f10]">
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <Link href="/chat" className="text-2xl font-semibold tracking-tight text-zinc-100">
                  Override AI
                </Link>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                  title="Close sidebar"
                  aria-label="Close sidebar"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
              </div>

              <div className="p-3 space-y-2">
                <button
                  type="button"
                  onClick={() => startNewChat()}
                  className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-zinc-900 px-3.5 py-2.5 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800"
                >
                  <span>New chat</span>
                  <span className="text-base text-zinc-400">+</span>
                </button>

                <Link
                  href="/research"
                  className="flex w-full items-center justify-between rounded-xl border border-amber-500/20 bg-amber-950/20 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-950/40 transition group"
                >
                  <div className="flex items-center gap-2">
                    <span>🔬</span>
                    <span>Research Assistant</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                    RAG
                  </span>
                </Link>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-1 space-y-4 chat-scrollbar">
                {isLoadingConversations ? (
                  <div className="px-2 py-4 text-xs text-zinc-400">Loading conversations...</div>
                ) : conversations.length === 0 ? (
                  <div className="px-2 py-4 text-xs text-zinc-400">No previous chats</div>
                ) : (
                  <>
                    {conversations.filter((c) => Boolean(c.isPinned)).length > 0 ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                          </svg>
                          <span>Pinned chats ({conversations.filter((c) => Boolean(c.isPinned)).length})</span>
                        </div>

                        {conversations
                          .filter((c) => Boolean(c.isPinned))
                          .map((item) => (
                            <SidebarChatItem
                              key={item.id}
                              conversation={item}
                              isSelected={selectedConversationId === item.id}
                              onSelect={chooseConversation}
                              onRename={rename}
                              onTogglePin={togglePin}
                              onDelete={remove}
                            />
                          ))}
                      </div>
                    ) : null}

                    <div className="space-y-1">
                      <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Recent chats
                      </p>

                      {conversations.filter((c) => !c.isPinned).length > 0 ? (
                        conversations
                          .filter((c) => !c.isPinned)
                          .map((item) => (
                            <SidebarChatItem
                              key={item.id}
                              conversation={item}
                              isSelected={selectedConversationId === item.id}
                              onSelect={chooseConversation}
                              onRename={rename}
                              onTogglePin={togglePin}
                              onDelete={remove}
                            />
                          ))
                      ) : (
                        <div className="px-2 py-2 text-xs text-zinc-500 italic">No recent chats</div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Sidebar User Footer */}
              <div className="border-t border-white/10 p-3 space-y-2">
                {user ? (
                  <div className="flex items-center gap-3 px-2 py-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-200 uppercase">
                      {(user.name || user.email || 'U').slice(0, 2)}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate text-xs font-semibold text-zinc-200">
                        {user.name || user.email?.split('@')[0]}
                      </span>
                      <span className="truncate text-[11px] text-zinc-400">{user.email}</span>
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsSwitchModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 py-1.5 text-xs text-zinc-200 transition hover:bg-zinc-700"
                  >
                    <svg className="h-3.5 w-3.5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span>Switch</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsLogoutModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 py-1.5 text-xs text-zinc-200 transition hover:bg-zinc-700"
                  >
                    <svg className="h-3.5 w-3.5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            </aside>
          ) : null}

          {/* Top Navbar / Floating Open Sidebar Button */}
          <section className="flex flex-1 flex-col overflow-hidden relative">
            {!isSidebarOpen ? (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/90 px-3 py-2 text-xs font-medium text-zinc-200 backdrop-blur transition hover:bg-zinc-800"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
                <span>Show sidebar</span>
              </button>
            ) : null}

            <div className="flex-1 overflow-hidden">
              {children}
            </div>
          </section>
        </div>

        {/* Technical Session Notification Toast */}
        {notification && (
          <div className="fixed top-5 right-5 z-50 flex items-start gap-3 rounded-xl border border-zinc-700 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-md max-w-md animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-300">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 space-y-0.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">{notification.title}</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">{notification.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-zinc-500 hover:text-zinc-300 transition"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <ConfirmModal
          isOpen={isLogoutModalOpen}
          title="Log out"
          message="Are you sure you want to log out?"
          confirmText="Log out"
          cancelText="Cancel"
          variant="default"
          onConfirm={handleLogoutConfirm}
          onCancel={() => setIsLogoutModalOpen(false)}
        />

        <SwitchAccountModal
          isOpen={isSwitchModalOpen}
          onClose={() => setIsSwitchModalOpen(false)}
          onNotify={(notif) => {
            setNotification(notif);
            setTimeout(() => setNotification(null), 5000);
          }}
        />
      </main>
    </ProtectedRoute>
  );
}
