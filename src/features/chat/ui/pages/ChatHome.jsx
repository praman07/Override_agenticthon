'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import useAuth from '../../../auth/hooks/useAuth.js';
import useChat from '../../hooks/useChat.js';
import 'highlight.js/styles/github-dark.css';

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const getAttachmentType = (file) => {
  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name)) {
    return 'image';
  }
  return 'document';
};

const ChatHome = () => {
  const [ message, setMessage ] = useState('');
  const [ attachments, setAttachments ] = useState([]);
  const [ isReadingFiles, setIsReadingFiles ] = useState(false);
  const [ fileError, setFileError ] = useState(null);
  const [ copiedId, setCopiedId ] = useState(null);
  const [ playingMsgId, setPlayingMsgId ] = useState(null);
  const [ isListening, setIsListening ] = useState(false);
  const [ audioLevels, setAudioLevels ] = useState(Array(35).fill(12));
  const [ isUserScrolledUp, setIsUserScrolledUp ] = useState(false);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const voiceTranscriptRef = useRef('');
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const animFrameRef = useRef(null);

  const { user } = useAuth();
  const { messages, isSending, error, send, clearError, selectedConversationId } = useChat();

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    // Considered scrolled up if more than 80px from bottom
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 80;
    setIsUserScrolledUp(isScrolledUp);
  };

  const scrollToBottom = () => {
    setIsUserScrolledUp(false);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isUserScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ messages, isSending, isUserScrolledUp ]);

  useEffect(() => {
    if (messageInputRef.current) {
      messageInputRef.current.style.height = 'auto';
      messageInputRef.current.style.height = `${Math.min(messageInputRef.current.scrollHeight, 240)}px`;
    }
  }, [ message ]);

  const stopAudioVisualizer = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevels(Array(35).fill(12));
  };

  const startAudioVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVisualizer = () => {
        analyser.getByteFrequencyData(dataArray);
        const levels = [];
        const numBars = 35;
        const step = Math.floor(dataArray.length / numBars) || 1;
        for (let i = 0; i < numBars; i++) {
          const val = dataArray[ i * step ] || 0;
          const heightPct = Math.max(12, Math.min(100, Math.round((val / 255) * 100)));
          levels.push(heightPct);
        }
        setAudioLevels(levels);
        animFrameRef.current = requestAnimationFrame(updateVisualizer);
      };

      updateVisualizer();
    } catch (err) {
      console.error('Error starting audio visualizer:', err);
    }
  };

  const stopListening = () => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    stopAudioVisualizer();
    setIsListening(false);
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice-to-text is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    voiceTranscriptRef.current = '';
    shouldListenRef.current = true;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      startAudioVisualizer();
    };

    recognition.onresult = (event) => {
      let transcriptStr = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcriptStr += event.results[ i ][ 0 ].transcript;
      }
      if (transcriptStr) {
        voiceTranscriptRef.current += (voiceTranscriptRef.current ? ' ' : '') + transcriptStr;
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        stopListening();
      }
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch (e) {
          stopListening();
        }
      } else {
        stopListening();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const confirmListening = () => {
    const finalVoiceText = voiceTranscriptRef.current.trim();
    stopListening();
    if (finalVoiceText) {
      setMessage((prev) => (prev ? `${prev} ${finalVoiceText}` : finalVoiceText));
    }
  };

  const cancelListening = () => {
    voiceTranscriptRef.current = '';
    stopListening();
  };

  const toggleListening = () => {
    if (isListening) {
      confirmListening();
    } else {
      startListening();
    }
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      stopAudioVisualizer();
    };
  }, [ selectedConversationId ]);

  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleTTS = (text, msgId) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-Speech is not supported in this browser.');
      return;
    }

    if (playingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setPlayingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean markdown tags for natural speech output
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/[*_#`~]/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.onend = () => setPlayingMsgId(null);
    utterance.onerror = () => setPlayingMsgId(null);

    setPlayingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleRecallUserMessage = (chatMessage) => {
    setMessage(chatMessage.content || '');
    if (chatMessage.attachments && chatMessage.attachments.length > 0) {
      setAttachments([ ...chatMessage.attachments ]);
    } else {
      setAttachments([]);
    }
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 50);
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setFileError(null);
    setIsReadingFiles(true);

    const newAttachments = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`File "${file.name}" exceeds the 10MB limit.`);
        setIsReadingFiles(false);
        return;
      }

      const type = getAttachmentType(file);

      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          type,
          name: file.name,
          mimeType: file.type || (type === 'image' ? 'image/png' : 'application/pdf'),
          url: dataUrl,
        });
      } catch (err) {
        setFileError(err.message);
        setIsReadingFiles(false);
        return;
      }
    }

    setAttachments((prev) => [ ...prev, ...newAttachments ]);
    setIsReadingFiles(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if ((!message.trim() && attachments.length === 0) || isSending || isReadingFiles) {
      return;
    }

    clearError();
    setFileError(null);

    const messageToSend = message;
    const attachmentsToSend = [ ...attachments ];

    setMessage('');
    setAttachments([]);

    scrollToBottom();
    await send(messageToSend, attachmentsToSend);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="relative flex h-screen w-full flex-col">
      {!hasMessages ? (
        <div className="mx-auto mt-24 w-full max-w-4xl px-4 text-center md:mt-32">
          <h2 className="text-4xl font-medium tracking-tight text-zinc-100 md:text-5xl">What&apos;s on your mind today?</h2>
          <p className="mt-3 text-sm text-zinc-500">Signed in as {user?.email}</p>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-4xl flex-1 min-h-0 flex-col px-4 pb-36 pt-2">
        {hasMessages ? (
          <div ref={chatContainerRef} onScroll={handleScroll} className="chat-scrollbar flex-1 space-y-6 overflow-y-auto pr-2">
            {messages.map((chatMessage) => (
              <div key={chatMessage.id}>
                {chatMessage.author === 'user' ? (
                  <div className="group ml-auto flex w-fit max-w-[85%] sm:max-w-2xl flex-col items-end gap-2">
                    {/* Render attachments as separate cards above the text prompt */}
                    {chatMessage.attachments && chatMessage.attachments.length > 0 ? (
                      <div className="flex flex-wrap justify-end gap-2 max-w-full">
                        {chatMessage.attachments.map((att, idx) => (
                          <div key={idx} className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-md">
                            {att.type === 'image' ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={att.url}
                                alt={att.name || 'Attached image'}
                                className="max-h-64 max-w-full rounded-2xl object-contain block"
                              />
                            ) : (
                              <div className="flex items-center gap-2 px-3.5 py-2.5 text-xs text-zinc-200 font-medium">
                                <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="truncate max-w-[200px]">{att.name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* Distinct prompt text bubble */}
                    {chatMessage.content ? (
                      <div className="rounded-3xl bg-zinc-800 text-zinc-100 px-5 py-3 text-sm shadow-sm border border-zinc-700/60 break-words whitespace-pre-wrap max-w-full overflow-hidden leading-relaxed">
                        {chatMessage.content}
                      </div>
                    ) : null}

                    {/* Reverse arrow button to recall prompt & attachments */}
                    <div className="mt-1 flex items-center justify-end px-2">
                      <button
                        type="button"
                        onClick={() => handleRecallUserMessage(chatMessage)}
                        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 border border-transparent hover:border-zinc-700/50"
                        title="Recall message & attachments into text field"
                        aria-label="Recall message"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        <span>Recall</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group space-y-2">
                    <div className="markdown-content max-w-3xl text-[15px] leading-7 text-zinc-100">
                      {chatMessage.content ? (
                        <ReactMarkdown remarkPlugins={[ remarkGfm ]} rehypePlugins={[ rehypeHighlight ]}>
                          {chatMessage.content}
                        </ReactMarkdown>
                      ) : (isSending ? 'Thinking...' : '')}
                    </div>

                    {/* Copy & TTS AI Message Controls */}
                    {chatMessage.content ? (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(chatMessage.content, chatMessage.id)}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 border border-transparent hover:border-zinc-700/50"
                          title="Copy message text"
                          aria-label="Copy AI message"
                        >
                          {copiedId === chatMessage.id ? (
                            <>
                              <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="font-medium text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTTS(chatMessage.content, chatMessage.id)}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 border border-transparent hover:border-zinc-700/50"
                          title={playingMsgId === chatMessage.id ? 'Stop reading' : 'Read aloud'}
                          aria-label="Read message aloud"
                        >
                          {playingMsgId === chatMessage.id ? (
                            <>
                              <svg className="h-3.5 w-3.5 animate-pulse text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                              </svg>
                              <span className="font-medium text-indigo-400">Stop</span>
                            </>
                          ) : (
                            <>
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              </svg>
                              <span>Read aloud</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/95 to-transparent pb-5 pt-16">
        {/* Floating Scroll to Bottom Arrow Button */}
        {isUserScrolledUp ? (
          <button
            type="button"
            onClick={scrollToBottom}
            className="pointer-events-auto absolute -top-5 left-1/2 -translate-x-1/2 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-800/90 text-zinc-300 shadow-xl backdrop-blur transition-all duration-200 hover:scale-105 hover:bg-zinc-700 hover:text-white active:scale-95"
            title="Scroll to bottom"
            aria-label="Scroll to bottom"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        ) : null}
        <div className="pointer-events-auto mx-auto w-full max-w-4xl px-4">
          {error || fileError ? (
            <p className="mb-2 text-sm text-rose-400">{error || fileError}</p>
          ) : null}

          {/* Form container */}
          <div className="rounded-[30px] border border-white/10 bg-[#2a2a2b] p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">

            {/* Attachment preview tray */}
            {attachments.length > 0 ? (
              <div className="flex flex-wrap gap-2 px-3 pt-1 pb-2 border-b border-white/10 mb-2">
                {attachments.map((att, index) => (
                  <div
                    key={index}
                    className="relative flex items-center gap-2 rounded-xl bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 border border-white/10 group"
                  >
                    {att.type === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={att.url} alt={att.name} className="h-6 w-6 rounded object-cover" />
                    ) : (
                      <span>📄</span>
                    )}
                    <span className="max-w-[150px] truncate">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(index)}
                      className="ml-1 text-zinc-400 hover:text-rose-400 focus:outline-none"
                      aria-label="Remove attachment"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {isListening ? (
              /* ChatGPT iOS/macOS Voice Mode Waveform Capsule Bar */
              <div className="flex items-center justify-between px-2 h-11 w-full">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_MIME_TYPES.join(',')}
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSending || isReadingFiles}
                  className="grid h-8 w-8 place-items-center text-zinc-400 hover:text-zinc-200 text-xl font-light focus:outline-none"
                  aria-label="Add attachment"
                  title="Attach Image, PDF, DOCX, or PPTX"
                >
                  +
                </button>

                {/* Live Animated Audio Waveform Stream */}
                <div className="flex-1 flex items-center justify-center gap-[2.5px] h-8 px-4 overflow-hidden">
                  {audioLevels.map((level, idx) => (
                    <div
                      key={idx}
                      className="w-[3px] rounded-full bg-zinc-300 transition-all duration-75 ease-out"
                      style={{ height: `${Math.max(10, level)}%` }}
                    />
                  ))}
                </div>

                {/* Action Controls: Cancel (✕) and Done/Transcribe (✓) */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelListening}
                    className="grid h-8 w-8 place-items-center text-zinc-400 hover:text-zinc-100 transition focus:outline-none"
                    aria-label="Cancel voice recording"
                    title="Cancel voice recording"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={confirmListening}
                    className="grid h-9 w-9 place-items-center rounded-full border border-white/80 text-white hover:bg-white hover:text-zinc-900 transition focus:outline-none"
                    aria-label="Transcribe into chat"
                    title="Transcribe into chat"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              /* Standard Auto-expanding Multi-line Text Input Form */
              <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_MIME_TYPES.join(',')}
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {/* Auto-expanding Textarea */}
                <textarea
                  ref={messageInputRef}
                  rows={1}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!isSending && !isReadingFiles && (message.trim() || attachments.length > 0)) {
                        handleSubmit(e);
                      }
                    }
                  }}
                  placeholder={isReadingFiles ? 'Reading file...' : 'Ask anything...'}
                  className="w-full bg-transparent text-[16px] leading-relaxed text-zinc-100 placeholder:text-zinc-500 outline-none resize-none overflow-y-auto min-h-[42px] max-h-60 px-2 py-1 font-normal custom-scrollbar"
                  disabled={isSending || isReadingFiles}
                />

                {/* Bottom Action Controls Bar */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending || isReadingFiles}
                    className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-zinc-200 disabled:opacity-40 text-xl font-light"
                    aria-label="Add attachment"
                    title="Attach Image, PDF, DOCX, or PPTX"
                  >
                    +
                  </button>

                  <div className="flex items-center gap-2.5">
                    {/* Voice-to-Text Microphone Button */}
                    <button
                      type="button"
                      onClick={toggleListening}
                      disabled={isSending || isReadingFiles}
                      className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-zinc-200 transition disabled:opacity-40"
                      aria-label="Start voice input"
                      title="Voice input (Speech to Text)"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>

                    {/* Orange Circular Send Button */}
                    <button
                      type="submit"
                      disabled={isSending || isReadingFiles || (!message.trim() && attachments.length === 0)}
                      className="grid h-8 w-8 place-items-center rounded-full bg-[#d95d28] text-white transition hover:bg-[#e86730] disabled:cursor-not-allowed disabled:opacity-30 shadow-sm"
                      aria-label="Send message"
                      title="Send message"
                    >
                      <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          <div className="mt-2 px-2 text-xs text-zinc-500 flex justify-between">
            <span>{selectedConversationId ? `Conversation ID: ${selectedConversationId}` : 'New chat starts with your first message.'}</span>
            <span>Supports Images, PDF, DOCX, PPTX</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatHome;
