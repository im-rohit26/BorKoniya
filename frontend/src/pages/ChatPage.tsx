import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Send,
  MessageSquare,
  ShieldAlert,
  Ban,
  Check,
  CheckCheck,
  ArrowLeft,
  Search,
  Sparkles,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  getConversations,
  getMessages,
  sendMessage,
  blockProfile,
  markConversationRead,
  getBlockedProfiles,
} from '../lib/interactionApi';
import type {
  ConversationSummary,
  MessageItem,
} from '../lib/interactionApi';
import { supabase } from '../lib/supabase';
import { ProtectedPhoto } from '../components/security/ProtectedPhoto';
import { ScreenCaptureProtection } from '../components/security/ScreenCaptureProtection';
import { ReportProfileModal } from '../components/safety/ReportProfileModal';
import { Header } from '../components/common/Header';
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal';

import { masterDataApi } from '../lib/masterDataApi';

export const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId || null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Safety Modal
  const [reportModalData, setReportModalData] = useState<{ id: string; name: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const [blockedProfileIds, setBlockedProfileIds] = useState<string[]>([]);

  // Sync route param with active conversation
  useEffect(() => {
    if (conversationId) {
      setActiveConvId(conversationId);
    }
  }, [conversationId]);

  // Load blocked profile IDs to enforce safety
  useEffect(() => {
    getBlockedProfiles()
      .then((blocked: any[]) => {
        if (Array.isArray(blocked)) {
          setBlockedProfileIds(
            blocked.map((b) => b.blocked_profile_id || b.id || '').filter(Boolean)
          );
        }
      })
      .catch(() => {});
  }, []);

  // 1. Load Conversations
  const fetchConversations = async () => {
    setIsLoadingConvs(true);
    try {
      const convs = await getConversations();
      setConversations(convs);
      if (!activeConvId && convs.length > 0) {
        setActiveConvId(convs[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoadingConvs(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    masterDataApi.getIcebreakers().then(setIcebreakers).catch(() => {
      setIcebreakers([
        'নমস্কার! আপনার প্রোফাইল দেখে ভালো লাগলো।',
        'Hello! Would love to know more about you.',
      ]);
    });
  }, []);

  // 2. Load Messages when active conversation changes
  useEffect(() => {
    if (!activeConvId) return;

    let isMounted = true;
    const fetchChatMessages = async (silent = false) => {
      if (!silent) setIsLoadingMessages(true);
      setErrorBanner(null);
      try {
        const msgs = await getMessages(activeConvId);
        if (isMounted) {
          setMessages(msgs);
          setTimeout(scrollToBottom, 100);
          markConversationRead(activeConvId).catch(() => {});
        }
      } catch (err: any) {
        if (isMounted && !silent) {
          setErrorBanner(err.message || 'Unable to load message history.');
        }
      } finally {
        if (isMounted && !silent) setIsLoadingMessages(false);
      }
    };

    fetchChatMessages();
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    // Supabase Realtime Channel
    let channel: any = null;
    try {
      channel = supabase
        .channel(`chat_${activeConvId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${activeConvId}`,
          },
          () => {
            fetchChatMessages(true);
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            setWsConnected(true);
          }
        });
    } catch (e) {
      console.warn('Realtime channel error:', e);
    }

    if (!wsConnected) {
      pollInterval = setInterval(() => fetchChatMessages(true), 5000);
    }

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [activeConvId, wsConnected]);

  // 3. Send message handler
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activeConvId || isSending || isBlocked || !canChat) return;

    setIsSending(true);
    setErrorBanner(null);
    try {
      const newMsg = await sendMessage(activeConvId, text);
      setMessages((prev) => [...prev, newMsg]);
      setInputText('');
      setTimeout(scrollToBottom, 50);

      // Refresh conversations list to update snippet & timestamp
      fetchConversations();
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleBlockMember = async (profileId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to block ${name}? They will no longer be able to message you.`)) return;
    try {
      await blockProfile(profileId);
      setBlockedProfileIds((prev) => [...prev, profileId]);
      alert(`${name} has been blocked.`);
      setActiveConvId(null);
      await fetchConversations();
    } catch (err: any) {
      alert(err.message || 'Failed to block user');
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const isBlocked = activeConv
    ? blockedProfileIds.includes(activeConv.other_profile.profile_id)
    : false;
  const canChat = activeConv ? activeConv.can_chat !== false : true;

  const filteredConversations = conversations.filter((c) =>
    `${c.other_profile.first_name} ${c.other_profile.last_name || ''}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header
        onOpenLanguageModal={() => setLangModalOpen(true)}
        onOpenRegister={() => {}}
      />

      <LanguageSelectorModal
        isOpen={langModalOpen}
        onClose={() => setLangModalOpen(false)}
      />

      {/* Global anti-screenshot & shortcut shield */}
      <ScreenCaptureProtection />

      {/* Report Modal */}
      {reportModalData && (
        <ReportProfileModal
          isOpen={!!reportModalData}
          onClose={() => setReportModalData(null)}
          profileId={reportModalData.id}
          profileName={reportModalData.name}
        />
      )}

      <div className={`flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 md:p-6 flex ${!activeConvId ? 'pb-24 md:pb-6' : ''}`}>
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200/80 overflow-hidden flex-1 flex flex-col md:flex-row h-[82vh]">
          {/* LEFT COLUMN: Conversations List */}
          <div
            className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col bg-slate-50/50 ${
              activeConvId ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Conversations Header */}
            <div className="p-4 border-b border-gray-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-crimson-50 text-crimson-700 rounded-xl">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h2 className="font-serif font-bold text-navy-950 text-lg">Family Messages</h2>
                </div>
                <button
                  onClick={fetchConversations}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  title="Refresh conversations"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingConvs ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 bg-gray-100 border border-transparent rounded-xl focus:bg-white focus:border-crimson-700 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {isLoadingConvs ? (
                <div className="p-8 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-crimson-700 mx-auto" />
                  <p className="text-xs text-gray-400">Loading conversations...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 bg-crimson-50 text-crimson-700 rounded-full flex items-center justify-center mx-auto">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-gray-700">No Conversations Yet</p>
                  <p className="text-xs text-gray-500">
                    Express interest to compatible members or upgrade to BorKonya Premium to chat directly.
                  </p>
                  <button
                    onClick={() => navigate('/interests')}
                    className="text-xs font-bold text-crimson-700 hover:underline inline-block pt-1"
                  >
                    View Accepted Interests &rarr;
                  </button>
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isActive = c.id === activeConvId;
                  const name = `${c.other_profile.first_name} ${c.other_profile.last_name}`;

                  return (
                    <div
                      key={c.id}
                      onClick={() => setActiveConvId(c.id)}
                      className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-crimson-50/80 border-r-4 border-crimson-700'
                          : 'hover:bg-gray-100/60'
                      }`}
                    >
                      {/* Avatar with dynamic watermark & anti-screenshot shield */}
                      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-gray-200 shadow-sm bg-gray-100">
                        <ProtectedPhoto
                          photoUrl={c.other_profile.photo_url}
                          altText={name}
                          profileId={c.other_profile.profile_id}
                          className="w-full h-full object-cover"
                        />
                        {c.other_profile.is_online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                        )}
                      </div>

                      {/* Snippet */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-navy-950 font-serif truncate">{name}</h4>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {c.last_message_time ? 'Active' : ''}
                          </span>
                        </div>
                        <p className="text-xs text-crimson-900/80 font-medium truncate">
                          {c.other_profile.community} • {c.other_profile.current_city}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {c.last_message || 'Start your conversation...'}
                        </p>
                      </div>

                      {/* Unread badge */}
                      {c.unread_count > 0 && (
                        <div className="w-5 h-5 bg-crimson-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {c.unread_count}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Active Chat Panel */}
          {activeConv ? (
            <div
              className={`flex-1 flex flex-col bg-white ${
                !activeConvId ? 'hidden md:flex' : 'flex'
              }`}
            >
              {/* Active Chat Header */}
              <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm z-10">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveConvId(null)}
                    className="md:hidden p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-gray-200 shadow-sm">
                    <ProtectedPhoto
                      photoUrl={activeConv.other_profile.photo_url}
                      altText={`${activeConv.other_profile.first_name} ${activeConv.other_profile.last_name}`}
                      profileId={activeConv.other_profile.profile_id}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-navy-950 font-serif text-sm sm:text-base">
                        {activeConv.other_profile.first_name} {activeConv.other_profile.last_name}
                      </h3>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <p className="text-xs text-slate-500">
                      {activeConv.other_profile.community} • {activeConv.other_profile.occupation}
                    </p>
                  </div>
                </div>

                {/* Safety & Profile Menu */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => navigate(`/profile/${activeConv.other_profile.profile_id}`)}
                    className="p-2 text-slate-600 hover:text-crimson-700 hover:bg-crimson-50 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1"
                    title="View Full Profile"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="hidden sm:inline">Profile</span>
                  </button>

                  <button
                    onClick={() =>
                      setReportModalData({
                        id: activeConv.other_profile.profile_id,
                        name: `${activeConv.other_profile.first_name} ${activeConv.other_profile.last_name}`,
                      })
                    }
                    className="p-2 text-slate-400 hover:text-crimson-700 hover:bg-crimson-50 rounded-xl transition-colors text-xs flex items-center gap-1"
                    title="Report profile"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span className="hidden lg:inline">Report</span>
                  </button>

                  <button
                    onClick={() =>
                      handleBlockMember(
                        activeConv.other_profile.profile_id,
                        `${activeConv.other_profile.first_name} ${activeConv.other_profile.last_name}`
                      )
                    }
                    className="p-2 text-slate-400 hover:text-navy-950 hover:bg-gray-100 rounded-xl transition-colors text-xs flex items-center gap-1"
                    title="Block member"
                  >
                    <Ban className="w-4 h-4" />
                    <span className="hidden lg:inline">Block</span>
                  </button>
                </div>
              </div>

              {/* Error Banner */}
              {errorBanner && (
                <div className="bg-crimson-50 border-b border-crimson-200 px-4 py-2 text-xs text-crimson-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorBanner}</span>
                  </div>
                  <button
                    onClick={() => setErrorBanner(null)}
                    className="text-crimson-700 font-bold hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Messages Body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gradient-to-b from-slate-50 to-white">
                <div className="text-center my-2">
                  <span className="px-3 py-1 bg-navy-50/80 border border-navy-200 text-navy-900 text-[11px] font-medium rounded-full shadow-xs">
                    🔒 Protected Matrimonial Conversation • Screenshots & Downloads Restricted
                  </span>
                </div>

                {isLoadingMessages ? (
                  <div className="py-12 text-center text-xs text-gray-400">Loading chat history...</div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 bg-crimson-50 text-crimson-700 rounded-full flex items-center justify-center mx-auto">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-navy-950 font-serif">Start the Matrimonial Dialogue</p>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      Send a warm and respectful introductory greeting to {activeConv.other_profile.first_name} and their family.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.is_mine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3.5 shadow-sm text-sm ${
                          m.is_mine
                            ? 'bg-crimson-700 text-white rounded-br-sm'
                            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                            m.is_mine ? 'text-crimson-100' : 'text-gray-400'
                          }`}
                        >
                          <span>
                            {new Date(m.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {m.is_mine && (
                            m.is_read ? (
                              <CheckCheck className="w-3.5 h-3.5 text-crimson-200" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Matrimonial Icebreaker Suggestions */}
              <div className="px-4 py-2 border-t border-gray-100 bg-slate-50 flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1 whitespace-nowrap">
                  <Sparkles className="w-3 h-3 text-crimson-700" />
                  Quick Greet:
                </span>
                {icebreakers.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="px-3 py-1 bg-white hover:bg-crimson-50 hover:text-crimson-700 border border-gray-200 hover:border-crimson-200 rounded-full text-xs text-gray-700 whitespace-nowrap transition-colors shadow-2xs"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Blocked or Entitlement Alert Banner */}
              {isBlocked && (
                <div className="bg-slate-100 border-t border-slate-200 px-4 py-3 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
                  <Ban className="w-4 h-4 text-slate-500" />
                  <span>Communication is disabled because this member has been blocked.</span>
                </div>
              )}
              {!canChat && !isBlocked && (
                <div className="bg-navy-50 border-t border-navy-200 px-4 py-3 text-xs text-navy-950 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-crimson-700 flex-shrink-0" />
                    <span>Direct chat is locked. Chat unlocks when mutual interest is accepted, or upgrade to Premium.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/subscription')}
                    className="px-3 py-1 bg-crimson-700 hover:bg-crimson-800 text-white font-semibold rounded-lg text-xs flex-shrink-0 transition-colors shadow-xs"
                  >
                    Upgrade Now
                  </button>
                </div>
              )}

              {/* Input Area */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 sm:p-4 border-t border-gray-200 bg-white flex items-center gap-3"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isBlocked || !canChat}
                  placeholder={
                    isBlocked
                      ? 'Messaging disabled (blocked member)'
                      : !canChat
                      ? 'Chat unlocks on accepted interest or Premium upgrade'
                      : `Write a respectful message to ${activeConv.other_profile.first_name}...`
                  }
                  className="flex-1 text-sm px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:border-crimson-700 focus:outline-none transition-all shadow-inner disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending || isBlocked || !canChat}
                  className="px-5 py-3 bg-crimson-700 hover:bg-crimson-800 disabled:opacity-40 text-white font-semibold rounded-2xl shadow-md transition-all flex items-center gap-2 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          ) : (
            /* Empty State when no conversation is selected */
            <div className="hidden md:flex flex-1 items-center justify-center bg-slate-50 p-8 text-center">
              <div className="max-w-md space-y-4">
                <div className="w-16 h-16 rounded-full bg-crimson-50 text-crimson-700 flex items-center justify-center mx-auto shadow-inner">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold font-serif text-navy-950">
                  Select a Conversation
                </h3>
                <p className="text-sm text-gray-500">
                  Choose a member from your conversation list on the left to start or continue your matrimonial discussion.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
