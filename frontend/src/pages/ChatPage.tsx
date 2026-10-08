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
  MoreVertical,
  Smile,
  Paperclip,
  User,
  ShieldCheck,
  X,
  Reply,
  Copy,
  Forward,
  Star,
  CheckSquare,
  Trash2,
  Plus,
  Phone,
  Video,
  MapPin,
  Mic,
  SlidersHorizontal,
  UserPlus,
  ChevronRight,
  Bell,
  Eraser,
  MessageCircleOff,
  ChevronDown,
  Unlock,
  Image as ImageIcon,
  FileText,
  Download,
  Loader2,
} from 'lucide-react';
import {
  getConversations,
  getMessages,
  sendMessage,
  forwardMessages,
  deleteMessage,
  batchDeleteMessages,
  deleteConversationForMe,
  clearConversation,
  blockProfile,
  unblockProfile,
  markConversationRead,
  getBlockedProfiles,
  uploadChatAttachment,
} from '../lib/interactionApi';
import type { ConversationSummary, MessageItem } from '../lib/interactionApi';
import { BACKEND_ROOT_URL } from '../lib/config';
import { supabase } from '../lib/supabase';
import { ProtectedPhoto } from '../components/security/ProtectedPhoto';
import { ScreenCaptureProtection } from '../components/security/ScreenCaptureProtection';
import { ReportProfileModal } from '../components/safety/ReportProfileModal';
import { Header } from '../components/common/Header';
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal';
import { masterDataApi } from '../lib/masterDataApi';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../hooks/useCall';
import { PhoneMissed, PhoneCall } from 'lucide-react';

/*
  THEME (BorKonya reference design)
  blue (sent)    #0a56e0 -> #0a3fc0
  red (accent)   #e0102f  (hover #c70a27)
  pink tint      #fde8ee
  navy text      #0b2a5b
  muted text     #6b7a99
  page bg        #eef3fb
  online green   #16a34a
*/

// Horizontal scroller without visible scrollbar
const NO_SCROLLBAR = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

// White round icon button used in chat header
const ROUND_BTN =
  'w-10 h-10 rounded-full bg-white text-[#0b2a5b] shadow-md shadow-[#0b2a5b]/10 hover:text-[#e0102f] transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold flex-shrink-0';

const BLUE_BUBBLE = 'bg-gradient-to-br from-[#0a56e0] to-[#0a3fc0] text-white shadow-md shadow-[#0b4fd8]/25';

export const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { startVoiceCall: initiateVoiceCall, startVideoCall: initiateVideoCall, callState } = useCall();
  const [langModalOpen, setLangModalOpen] = useState(false);
  const wsConnectedRef = useRef(false);
  const currentChannelRef = useRef<any>(null);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId || null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'favourites'>('all');
  const [favouriteConvIds, setFavouriteConvIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('borkoniya_fav_convs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [reportModalData, setReportModalData] = useState<{ id: string; name: string } | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Message Actions & Multi-selection State
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [actionMenuMsg, setActionMenuMsg] = useState<{
    msg: MessageItem;
    position: { top: number; right?: number; left?: number; isMine: boolean };
  } | null>(null);
  const [reactions, setReactions] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('borkoniya_chat_reactions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Forward Modal State
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [messagesToForward, setMessagesToForward] = useState<MessageItem[]>([]);
  const [targetForwardConvIds, setTargetForwardConvIds] = useState<string[]>([]);
  const [forwardSearch, setForwardSearch] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);

  // Attachment State
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') => {
    const file = e.target.files?.[0];
    if (!file || !activeConvId) return;

    if (type === 'image') {
      if (file.size > 15 * 1024 * 1024) {
        alert('Image must be less than 15 MB before compression.');
        return;
      }
    } else {
      if (file.size > 10 * 1024 * 1024) {
        alert('Document must be less than 10 MB.');
        return;
      }
    }

    setIsUploadingAttachment(true);
    setShowAttachmentMenu(false);
    try {
      const uploadRes = await uploadChatAttachment(activeConvId, file, type);
      const sentMsg = await sendMessage(activeConvId, uploadRes.original_filename || file.name, {
        mediaUrl: uploadRes.media_url,
        messageType: uploadRes.message_type,
      });
      setMessages((prev) => [...prev, sentMsg]);
      setTimeout(scrollToBottom, 100);
      fetchConversations(true);
      currentChannelRef.current?.send({
        type: 'broadcast',
        event: 'new_message',
        payload: { conversation_id: activeConvId, message_id: sentMsg.id },
      });
    } catch (err: any) {
      alert(err.message || 'Failed to upload attachment.');
    } finally {
      setIsUploadingAttachment(false);
      if (e.target) e.target.value = '';
    }
  };

  const [blockedProfileIds, setBlockedProfileIds] = useState<string[]>([]);

  // Close message action popup and attachment menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenuMsg(null);
      }
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(e.target as Node)) {
        setShowAttachmentMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close 3-dot menus when clicking outside
  useEffect(() => {
    const handleMenuClickOutside = (e: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) {
        setChatMenuOpen(false);
      }
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setHeaderMenuOpen(false);
      }
    };
    if (chatMenuOpen || headerMenuOpen) {
      document.addEventListener('mousedown', handleMenuClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleMenuClickOutside);
    };
  }, [chatMenuOpen, headerMenuOpen]);

  const toggleFavourite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavouriteConvIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('borkoniya_fav_convs', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    if (conversationId) setActiveConvId(conversationId);
  }, [conversationId]);

  useEffect(() => {
    getBlockedProfiles()
      .then((blocked: any[]) => {
        if (Array.isArray(blocked)) {
          setBlockedProfileIds(blocked.map((b) => b.blocked_profile_id || b.id || '').filter(Boolean));
        }
      })
      .catch(() => {});
  }, []);

  const fetchConversations = async (silent = false) => {
    if (!silent) setIsLoadingConvs(true);
    try {
      const convs = await getConversations();
      setConversations(convs);
      if (!activeConvId && convs.length > 0 && window.innerWidth >= 768) {
        setActiveConvId(convs[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      if (!silent) setIsLoadingConvs(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    masterDataApi
      .getIcebreakers()
      .then(setIcebreakers)
      .catch(() => {
        setIcebreakers([
          'নমস্কার! আপনার পরিচয় জানতে চাই।',
          'Hello! Would love to know more about you.',
          'আশা করি আপনি ভালো আছেন!',
        ]);
      });

    // Background poll for conversations list so unread counts/snippets stay fresh
    const convPoll = setInterval(() => {
      fetchConversations(true);
    }, 8000);

    return () => clearInterval(convPoll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Presence channel to broadcast and track real active online users
  useEffect(() => {
    const presenceChannel = supabase.channel('online_users', {
      config: { presence: { key: currentUser?.profile_id || currentUser?.user_id || 'anonymous' } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const activeIds = new Set<string>();
        Object.keys(state).forEach((key) => {
          activeIds.add(key);
          const presences = state[key] as any[];
          presences?.forEach((p) => {
            if (p.profile_id) activeIds.add(p.profile_id);
            if (p.user_id) activeIds.add(p.user_id);
          });
        });
        setOnlineUserIds(activeIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            profile_id: currentUser?.profile_id,
            user_id: currentUser?.user_id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [currentUser?.profile_id, currentUser?.user_id]);

  // Load messages + realtime
  useEffect(() => {
    if (!activeConvId) return;

    let isMounted = true;
    wsConnectedRef.current = false;
    // Reset selection and reply on chat switch
    setSelectedMessageIds([]);
    setIsSelectMode(false);
    setReplyingTo(null);
    setActionMenuMsg(null);

    const fetchChatMessages = async (silent = false) => {
      if (!silent) setIsLoadingMessages(true);
      setErrorBanner(null);
      try {
        const msgs = await getMessages(activeConvId);
        if (isMounted) {
          setMessages(msgs);
          if (!silent || isNearBottomRef.current) {
            setTimeout(scrollToBottom, 60);
          } else {
            setHasNewMessagesBelow(true);
          }
          markConversationRead(activeConvId).catch(() => {});
        }
      } catch (err: any) {
        if (isMounted && !silent) setErrorBanner(err.message || 'Unable to load message history.');
      } finally {
        if (isMounted && !silent) setIsLoadingMessages(false);
      }
    };

    fetchChatMessages();

    let channel: any = null;
    try {
      channel = supabase
        .channel(`chat_${activeConvId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${activeConvId}`,
          },
          () => {
            fetchChatMessages(true);
            fetchConversations(true);
          }
        )
        .on('broadcast', { event: 'new_message' }, () => {
          fetchChatMessages(true);
          fetchConversations(true);
        })
        .subscribe((status: string) => {
          wsConnectedRef.current = status === 'SUBSCRIBED';
        });

      currentChannelRef.current = channel;
    } catch (e) {
      console.warn('Realtime channel error:', e);
    }

    // Unconditional silent poll every 2.5 seconds to guarantee zero missed messages
    const pollInterval = setInterval(() => {
      fetchChatMessages(true);
    }, 2500);

    const handleCallEnded = () => {
      fetchChatMessages(true);
      fetchConversations(true);
    };
    window.addEventListener('borkonya:call-ended', handleCallEnded);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      window.removeEventListener('borkonya:call-ended', handleCallEnded);
      if (channel) {
        supabase.removeChannel(channel);
        if (currentChannelRef.current === channel) {
          currentChannelRef.current = null;
        }
      }
    };
  }, [activeConvId]);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const isBlocked = activeConv ? blockedProfileIds.includes(activeConv.other_profile.profile_id) : false;
  const canChat = activeConv ? activeConv.can_chat !== false : true;

  const startVoiceCall = () => {
    if (!activeConv) return;
    if (isBlocked) {
      setErrorBanner('Calling is disabled because this member is blocked.');
      return;
    }
    if (!canChat) {
      setErrorBanner('Voice & Video calls unlock on accepted interest or BorKonya Premium membership.');
      return;
    }
    const p = activeConv.other_profile;
    initiateVoiceCall(
      {
        profile_id: p.profile_id,
        first_name: p.first_name,
        last_name: p.last_name,
        full_name: `${p.first_name} ${p.last_name || ''}`.trim(),
        photo_url: p.photo_url,
        gender: p.gender,
        conversation_id: activeConv.id,
      },
      activeConv.id
    );
  };

  const startVideoCall = () => {
    if (!activeConv) return;
    if (isBlocked) {
      setErrorBanner('Calling is disabled because this member is blocked.');
      return;
    }
    if (!canChat) {
      setErrorBanner('Voice & Video calls unlock on accepted interest or BorKonya Premium membership.');
      return;
    }
    const p = activeConv.other_profile;
    initiateVideoCall(
      {
        profile_id: p.profile_id,
        first_name: p.first_name,
        last_name: p.last_name,
        full_name: `${p.first_name} ${p.last_name || ''}`.trim(),
        photo_url: p.photo_url,
        gender: p.gender,
        conversation_id: activeConv.id,
      },
      activeConv.id
    );
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activeConvId || isSending || isBlocked || !canChat) return;

    setIsSending(true);
    setErrorBanner(null);
    try {
      const newMsg = await sendMessage(activeConvId, text, {
        replyToMessageId: replyingTo ? replyingTo.id : undefined,
      });
      setMessages((prev) => [...prev, newMsg]);
      setInputText('');
      setReplyingTo(null);
      setShowEmojiPicker(false);
      setTimeout(scrollToBottom, 50);
      fetchConversations(true);
      currentChannelRef.current?.send({
        type: 'broadcast',
        event: 'new_message',
        payload: { conversation_id: activeConvId, message_id: newMsg.id },
      });
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
      await fetchConversations();
    } catch (err: any) {
      alert(err.message || 'Failed to block user');
    }
  };

  const handleUnblockMember = async (profileId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to unblock ${name}?`)) return;
    try {
      await unblockProfile(profileId);
      setBlockedProfileIds((prev) => prev.filter((id) => id !== profileId));
      alert(`${name} has been unblocked.`);
      await fetchConversations();
    } catch (err: any) {
      alert(err.message || 'Failed to unblock user');
    }
  };

  // Reactions
  const handleReactToMessage = (messageId: string, emoji: string) => {
    setReactions((prev) => {
      const updated = { ...prev, [messageId]: prev[messageId] === emoji ? '' : emoji };
      try {
        localStorage.setItem('borkoniya_chat_reactions', JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
    setActionMenuMsg(null);
  };

  // Reply
  const handleInitiateReply = (msg: MessageItem) => {
    setReplyingTo(msg);
    setActionMenuMsg(null);
    inputRef.current?.focus();
  };

  // Copy message
  const handleCopyMessage = (msg: MessageItem) => {
    navigator.clipboard?.writeText(msg.content);
    setActionMenuMsg(null);
  };

  // Forward single message
  const handleInitiateForwardSingle = (msg: MessageItem) => {
    setMessagesToForward([msg]);
    setTargetForwardConvIds([]);
    setForwardModalOpen(true);
    setActionMenuMsg(null);
  };

  // Forward selected multiple messages
  const handleInitiateForwardMultiple = () => {
    const toForward = messages.filter((m) => selectedMessageIds.includes(m.id));
    if (toForward.length === 0) return;
    setMessagesToForward(toForward);
    setTargetForwardConvIds([]);
    setForwardModalOpen(true);
  };

  // Perform Forward
  const handleExecuteForward = async () => {
    if (targetForwardConvIds.length === 0 || messagesToForward.length === 0 || isForwarding) return;
    setIsForwarding(true);
    try {
      await forwardMessages(
        messagesToForward.map((m) => m.id),
        targetForwardConvIds
      );
      setForwardModalOpen(false);
      setMessagesToForward([]);
      setTargetForwardConvIds([]);
      setSelectedMessageIds([]);
      setIsSelectMode(false);
      fetchConversations();
      // If active conversation was one of the targets, reload its messages
      if (activeConvId && targetForwardConvIds.includes(activeConvId)) {
        const refreshed = await getMessages(activeConvId);
        setMessages(refreshed);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to forward message(s)');
    } finally {
      setIsForwarding(false);
    }
  };

  // Delete Confirmation Modal State
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    msg: MessageItem;
    deleteType: 'for_me' | 'for_everyone';
  } | null>(null);

  // Conversation Clear / Delete Modal State
  const [convActionConfirm, setConvActionConfirm] = useState<'delete_chat' | 'clear_chat' | null>(null);

  // New message indicator & unread scroll state
  const [hasNewMessagesBelow, setHasNewMessagesBelow] = useState(false);
  const isNearBottomRef = useRef(true);

  // Check scroll position to determine whether to auto-scroll or show indicator
  const handleScrollChat = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const threshold = 120;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < threshold;
    isNearBottomRef.current = nearBottom;
    if (nearBottom) {
      setHasNewMessagesBelow(false);
    }
  };

  // Delete message execution
  const handleExecuteDelete = async () => {
    if (!deleteConfirmState || !activeConvId) return;
    const { msg, deleteType } = deleteConfirmState;
    try {
      await deleteMessage(activeConvId, msg.id, deleteType);
      if (deleteType === 'for_everyone') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? { ...m, deleted_for_everyone: true, content: 'This message was deleted' }
              : m
          )
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      }
      setDeleteConfirmState(null);
      fetchConversations();
    } catch (err: any) {
      alert(err.message || 'Failed to delete message');
    }
  };

  // Delete Conversation for me
  const handleExecuteDeleteConversation = async () => {
    if (!activeConvId) return;
    try {
      await deleteConversationForMe(activeConvId);
      setConvActionConfirm(null);
      setActiveConvId(null);
      await fetchConversations();
    } catch (err: any) {
      alert(err.message || 'Failed to delete conversation');
    }
  };

  // Clear Conversation messages for me
  const handleExecuteClearConversation = async () => {
    if (!activeConvId) return;
    try {
      await clearConversation(activeConvId);
      setConvActionConfirm(null);
      setMessages([]);
      await fetchConversations();
    } catch (err: any) {
      alert(err.message || 'Failed to clear conversation');
    }
  };

  // Bulk Delete
  const handleExecuteBatchDelete = async () => {
    if (selectedMessageIds.length === 0) return;
    const mySelected = messages.filter((m) => selectedMessageIds.includes(m.id));
    if (mySelected.length === 0) return;
    if (!window.confirm(`Delete ${mySelected.length} selected message(s) for you?`)) return;

    try {
      await batchDeleteMessages(mySelected.map((m) => m.id));
      setMessages((prev) => prev.filter((m) => !mySelected.some((del) => del.id === m.id)));
      setSelectedMessageIds([]);
      setIsSelectMode(false);
      fetchConversations();
    } catch (err: any) {
      alert(err.message || 'Failed to delete messages');
    }
  };

  // Selection toggle
  const toggleSelectMessage = (id: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Robust Viewport collision calculation for 3-dot message menu
  const handleOpenActionMenu = (e: React.MouseEvent | React.TouchEvent, msg: MessageItem) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const isMine = msg.is_mine;

    const menuEstimatedHeight = 290;
    const menuEstimatedWidth = 220;
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;

    // Reposition upward automatically if not enough space below
    let top: number;
    if (spaceBelow < menuEstimatedHeight && spaceAbove > menuEstimatedHeight) {
      top = Math.max(12, rect.top - menuEstimatedHeight);
    } else {
      top = Math.min(viewportH - menuEstimatedHeight - 12, rect.bottom + 6);
      if (top < 12) top = 12;
    }

    // Reposition horizontal left/right to prevent screen boundary cutoff
    let left: number | undefined;
    let right: number | undefined;

    if (isMine) {
      const naturalRight = viewportW - rect.right;
      if (naturalRight + menuEstimatedWidth > viewportW) {
        right = 12;
      } else {
        right = Math.max(12, naturalRight);
      }
    } else {
      const naturalLeft = rect.left;
      if (naturalLeft + menuEstimatedWidth > viewportW) {
        left = Math.max(12, viewportW - menuEstimatedWidth - 12);
      } else {
        left = Math.max(12, naturalLeft);
      }
    }

    setActionMenuMsg({
      msg,
      position: { top, left, right, isMine },
    });
  };

  // Mobile long press support
  const touchTimerRef = useRef<any>(null);
  const handleTouchStart = (e: React.TouchEvent, msg: MessageItem) => {
    touchTimerRef.current = setTimeout(() => {
      handleOpenActionMenu(e, msg);
    }, 500);
  };
  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const nameMatch = `${c.other_profile.first_name} ${c.other_profile.last_name || ''}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    if (!nameMatch) return false;
    if (activeFilter === 'unread') return c.unread_count > 0;
    if (activeFilter === 'favourites') return favouriteConvIds.includes(c.id);
    return true;
  });

  const forwardAvailableConversations = conversations.filter((c) => {
    const name = `${c.other_profile.first_name} ${c.other_profile.last_name || ''}`.toLowerCase();
    return name.includes(forwardSearch.toLowerCase());
  });

  const totalUnreadCount = conversations.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);

  // Robust date parser ensuring UTC dates without 'Z' are parsed correctly in local timezone
  const parseDateTime = (dateStr?: string | Date | null): Date | null => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
    const s = String(dateStr).trim();
    if (!s) return null;
    // If string has 'T' or space separator and no timezone offset or Z, treat as UTC
    if (!s.endsWith('Z') && !/[+-]\d{2}(:?\d{2})?$/.test(s)) {
      const utcIso = s.includes(' ') ? s.replace(' ', 'T') + 'Z' : s + 'Z';
      const d = new Date(utcIso);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatMessageTime = (dateStr?: string | Date | null) => {
    const date = parseDateTime(dateStr);
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatTimeSnippet = (dateStr?: string | Date | null) => {
    const date = parseDateTime(dateStr);
    if (!date) return '';
    try {
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      }
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Date chip label shown between messages of different days
  const formatDateChip = (dateStr?: string | Date | null) => {
    const date = parseDateTime(dateStr);
    if (!date) return 'Today';
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const EMOJIS = ['🙏', '😊', '💐', '❤️', '👍', '🌺', '✨', '🤝', 'শুভকামনা'];
  const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // Mobile: show either list OR chat. Desktop (md+): show both.
  const showChatOnMobile = !!activeConvId;

  return (
    <div className="h-[100dvh] w-full max-w-full flex flex-col bg-[#eef3fb] overflow-hidden">
      <div className="flex-shrink-0">
        <Header onOpenLanguageModal={() => setLangModalOpen(true)} onOpenRegister={() => {}} />
      </div>

      <LanguageSelectorModal isOpen={langModalOpen} onClose={() => setLangModalOpen(false)} />
      <ScreenCaptureProtection />

      {reportModalData && (
        <ReportProfileModal
          isOpen={!!reportModalData}
          onClose={() => setReportModalData(null)}
          profileId={reportModalData.id}
          profileName={reportModalData.name}
        />
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {deleteConfirmState && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#0b2a5b]/45 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-[#e3e9f5] overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-[#fde8ee] flex items-center justify-center mx-auto mb-4 text-[#e0102f]">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="font-bold text-[#0b2a5b] text-lg mb-2">
              {deleteConfirmState.deleteType === 'for_everyone'
                ? 'Delete for everyone?'
                : 'Delete for me?'}
            </h3>

            <p className="text-xs text-[#6b7a99] leading-relaxed mb-6">
              {deleteConfirmState.deleteType === 'for_everyone' ? (
                <>
                  This message will be deleted for everyone in this chat.{' '}
                  <span className="font-semibold text-[#e0102f]">
                    You can delete messages for everyone within 24 hours of sending.
                  </span>
                </>
              ) : (
                'This message will be removed from your chat history only. The other participant will still see it.'
              )}
            </p>

            <div className="flex items-center gap-3 justify-center">
              <button
                type="button"
                onClick={() => setDeleteConfirmState(null)}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-[#0b2a5b] bg-[#f1f4fb] hover:bg-[#e4ebf8] rounded-full transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-[#e0102f] hover:bg-[#c70a27] rounded-full transition-colors shadow-md shadow-[#e0102f]/25"
              >
                {deleteConfirmState.deleteType === 'for_everyone' ? 'Delete for everyone' : 'Delete for me'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CONVERSATION ACTION CONFIRMATION MODAL ================= */}
      {convActionConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#0b2a5b]/45 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-[#e3e9f5] overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-[#fde8ee] flex items-center justify-center mx-auto mb-4 text-[#e0102f]">
              {convActionConfirm === 'delete_chat' ? <MessageCircleOff className="w-7 h-7" /> : <Eraser className="w-7 h-7" />}
            </div>

            <h3 className="font-bold text-[#0b2a5b] text-lg mb-2">
              {convActionConfirm === 'delete_chat' ? 'Delete chat for me?' : 'Clear all messages?'}
            </h3>

            <p className="text-xs text-[#6b7a99] leading-relaxed mb-6">
              {convActionConfirm === 'delete_chat'
                ? 'This conversation will disappear from your chat list. The other participant will still have the conversation.'
                : 'All messages in this chat will be cleared for you. The other participant will still keep their message history.'}
            </p>

            <div className="flex items-center gap-3 justify-center">
              <button
                type="button"
                onClick={() => setConvActionConfirm(null)}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-[#0b2a5b] bg-[#f1f4fb] hover:bg-[#e4ebf8] rounded-full transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={convActionConfirm === 'delete_chat' ? handleExecuteDeleteConversation : handleExecuteClearConversation}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-[#e0102f] hover:bg-[#c70a27] rounded-full transition-colors shadow-md shadow-[#e0102f]/25"
              >
                {convActionConfirm === 'delete_chat' ? 'Delete chat' : 'Clear chat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= FORWARD MODAL ================= */}
      {forwardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b2a5b]/40 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-[#e3e9f5] flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-[#e3e9f5] flex items-center justify-between bg-[#f6f9ff]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#fde8ee] flex items-center justify-center">
                  <Forward className="w-4 h-4 text-[#e0102f]" />
                </div>
                <h3 className="font-bold text-[#0b2a5b] text-base">Forward message</h3>
              </div>
              <button
                onClick={() => setForwardModalOpen(false)}
                className="p-1.5 text-[#6b7a99] hover:text-[#e0102f] hover:bg-[#fde8ee] rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Message Preview */}
            <div className="px-4 py-3 bg-[#f4f7fd] border-b border-[#e3e9f5] text-xs text-[#6b7a99]">
              <span className="font-semibold text-[#0b2a5b]">Preview ({messagesToForward.length} msg):</span>
              <p className="mt-1 italic line-clamp-2 bg-white p-2 rounded-xl border border-[#e3e9f5]">
                {messagesToForward[0]?.content}
                {messagesToForward.length > 1 && ` (+${messagesToForward.length - 1} more)`}
              </p>
            </div>

            {/* Search chats */}
            <div className="p-3 border-b border-[#eef2fa]">
              <div className="flex items-center bg-[#f1f4fb] rounded-full px-4 py-2">
                <Search className="w-4 h-4 text-[#6b7a99] mr-2 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search chat or contact..."
                  value={forwardSearch}
                  onChange={(e) => setForwardSearch(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#0b2a5b] placeholder-[#8a96b0] focus:outline-none"
                />
              </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#eef2fa] p-2">
              {forwardAvailableConversations.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#6b7a99]">No active conversations found.</div>
              ) : (
                forwardAvailableConversations.map((c) => {
                  const isChecked = targetForwardConvIds.includes(c.id);
                  const name = `${c.other_profile.first_name} ${c.other_profile.last_name || ''}`.trim();
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setTargetForwardConvIds((prev) =>
                          prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                        );
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-colors ${
                        isChecked ? 'bg-[#fde8ee]' : 'hover:bg-[#f6f9ff]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-sm flex-shrink-0">
                          <ProtectedPhoto
                            photoUrl={c.other_profile.photo_url}
                            gender={c.other_profile.gender}
                            altText={name}
                            profileId={c.other_profile.profile_id}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 truncate">
                          <p className="text-sm font-semibold text-[#0b2a5b] truncate">{name}</p>
                          <p className="text-xs text-[#6b7a99] truncate">{c.other_profile.community || 'Member'}</p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors flex-shrink-0 ${
                          isChecked ? 'bg-[#e0102f] border-[#e0102f] text-white' : 'border-[#cfd6e6] bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[#e3e9f5] bg-[#f6f9ff] flex items-center justify-between">
              <span className="text-xs text-[#6b7a99]">
                {targetForwardConvIds.length} recipient{targetForwardConvIds.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForwardModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-[#0b2a5b] hover:bg-[#e9eff9] rounded-full transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteForward}
                  disabled={targetForwardConvIds.length === 0 || isForwarding}
                  className="px-5 py-1.5 bg-[#e0102f] hover:bg-[#c70a27] disabled:opacity-50 text-white font-semibold text-xs rounded-full transition-colors flex items-center gap-1.5 shadow-md shadow-[#e0102f]/25"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isForwarding ? 'Forwarding...' : 'Forward'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="flex-1 min-h-0 min-w-0 w-full max-w-[1920px] 2xl:max-w-[2400px] mx-auto p-0 sm:p-2 lg:p-4 flex overflow-hidden">
        <div className="w-full h-full min-w-0 bg-white sm:rounded-3xl shadow-xl shadow-[#0b2a5b]/5 border-0 sm:border border-[#e3e9f5] flex overflow-hidden">
          {/* ================= LEFT: CONVERSATION LIST ================= */}
          <aside
            className={`${
              showChatOnMobile ? 'hidden md:flex' : 'flex'
            } w-full md:w-[320px] lg:w-[370px] xl:w-[410px] 2xl:w-[460px] md:flex-shrink-0 min-w-0 min-h-0 border-r border-[#e3e9f5] flex-col bg-white/90`}
          >
            {/* Brand + New Match */}
            <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3 flex-shrink-0">
              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold tracking-tight truncate">
                  <span className="text-[#0b2a5b]">Bor</span>
                  <span className="text-[#e0102f]">Konya</span>
                </h1>
                <p className="text-[10px] text-[#6b7a99] -mt-0.5 truncate">Amar Parampara Amar Sathi</p>
              </div>
              <button
                onClick={() => navigate('/matches')}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-br from-[#0a56e0] to-[#0a3fc0] text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-[#0b4fd8]/30 flex-shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>New Match</span>
              </button>
            </div>

            {/* Search + filter menu */}
            <div className="px-3 pb-2 flex-shrink-0 relative">
              <div className="flex items-center bg-white rounded-full px-4 py-3 shadow-sm border border-[#e3e9f5] focus-within:ring-2 focus-within:ring-[#0b4fd8]/20 transition-all">
                <Search className="w-4 h-4 text-[#0b2a5b] flex-shrink-0 mr-2.5" />
                <input
                  type="text"
                  placeholder="Search or start a new chat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-w-0 bg-transparent text-base sm:text-sm text-[#0b2a5b] placeholder-[#8a96b0] focus:outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-1 text-[#8a96b0] hover:text-[#e0102f]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
                  className="ml-2 text-[#0b2a5b] hover:text-[#e0102f] flex-shrink-0"
                  title="Menu"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>

              {headerMenuOpen && (
                <div ref={headerMenuRef} className="absolute right-3 top-full mt-1 w-52 max-w-[80vw] bg-white rounded-2xl shadow-xl border border-[#e3e9f5] py-1.5 z-50 text-sm">
                  <button
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      fetchConversations();
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#f6f9ff] text-[#0b2a5b] flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 text-[#e0102f] ${isLoadingConvs ? 'animate-spin' : ''}`} />
                    Refresh chats
                  </button>
                  <button
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      navigate('/interests');
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#f6f9ff] text-[#0b2a5b] flex items-center gap-2"
                  >
                    <User className="w-4 h-4 text-[#e0102f]" />
                    Accepted Interests
                  </button>
                  <button
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      navigate('/subscription');
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#f6f9ff] text-[#0b2a5b] flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#e0102f]" />
                    Premium Plans
                  </button>
                </div>
              )}
            </div>

            {/* Filter pills */}
            <div className={`px-3 py-2 flex items-center gap-2 overflow-x-auto text-xs flex-shrink-0 ${NO_SCROLLBAR}`}>
              {(['all', 'unread', 'favourites'] as const).map((f) => {
                const Icon = f === 'all' ? MessageSquare : f === 'unread' ? Bell : Star;
                const active = activeFilter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`px-4 py-2 rounded-full font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                      active
                        ? 'bg-[#e0102f] text-white shadow-md shadow-[#e0102f]/30'
                        : 'bg-white text-[#0b2a5b] border border-[#e3e9f5] shadow-sm hover:bg-[#f4f7fd]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'Favourites'}</span>
                    {f === 'unread' && totalUnreadCount > 0 && (
                      <span
                        className={`min-w-4 h-4 px-1 text-[10px] rounded-full flex items-center justify-center font-bold ${
                          active ? 'bg-white text-[#e0102f]' : 'bg-[#e0102f] text-white'
                        }`}
                      >
                        {totalUnreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
              <button
                onClick={() => navigate('/interests')}
                className="px-4 py-2 rounded-full font-semibold flex items-center gap-1.5 flex-shrink-0 bg-white text-[#0b2a5b] border border-[#e3e9f5] shadow-sm hover:bg-[#f4f7fd]"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Requests</span>
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden divide-y divide-[#eef2fa] mt-1">
              {isLoadingConvs ? (
                <div className="p-8 text-center space-y-3">
                  <RefreshCw className="w-7 h-7 animate-spin text-[#e0102f] mx-auto" />
                  <p className="text-xs text-[#6b7a99] font-medium">Loading chats...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-14 h-14 bg-[#fde8ee] text-[#e0102f] rounded-full flex items-center justify-center mx-auto">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-[#0b2a5b]">
                    {searchQuery ? 'No chats found' : 'No Conversations Yet'}
                  </h3>
                  <p className="text-xs text-[#6b7a99] max-w-xs mx-auto">
                    {searchQuery
                      ? 'Try searching with a different name.'
                      : 'Connect with matched members through accepted interests or start direct conversations.'}
                  </p>
                  <button
                    onClick={() => navigate('/matches')}
                    className="inline-block text-xs font-bold text-[#e0102f] hover:text-[#c70a27] hover:underline pt-2"
                  >
                    Browse Compatible Matches &rarr;
                  </button>
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isActive = c.id === activeConvId;
                  const name = `${c.other_profile.first_name} ${c.other_profile.last_name || ''}`.trim();
                  const isOtherOnline = onlineUserIds.has(c.other_profile.profile_id) || !!c.other_profile.is_online;
                  const isFav = favouriteConvIds.includes(c.id);

                  return (
                    <div
                      key={c.id}
                      onClick={() => setActiveConvId(c.id)}
                      className={`px-4 py-3.5 flex items-center gap-3 cursor-pointer transition-colors relative group select-none border-l-4 ${
                        isActive ? 'bg-[#fde8ee] border-[#e0102f]' : 'border-transparent hover:bg-[#f6f9ff]'
                      }`}
                    >
                      <div className="relative w-12 h-12 flex-shrink-0">
                        <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-md">
                          <ProtectedPhoto
                            photoUrl={c.other_profile.photo_url}
                            gender={c.other_profile.gender}
                            altText={name}
                            profileId={c.other_profile.profile_id}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {isOtherOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#16a34a] border-2 border-white rounded-full" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-[#0b2a5b] truncate min-w-0">{name}</h4>
                          <span className="text-[11px] flex-shrink-0 text-[#8a96b0]">
                            {formatTimeSnippet(c.last_message_time || c.created_at)}
                          </span>
                        </div>

                        <p className="text-xs mt-0.5 flex items-center gap-1">
                          {isOtherOnline ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
                              <span className="text-[#16a34a] font-medium">Online</span>
                            </>
                          ) : (
                            <span className="text-[#8a96b0]">Offline</span>
                          )}
                        </p>

                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p
                            className={`text-xs truncate min-w-0 flex-1 ${
                              c.unread_count > 0 ? 'text-[#0b2a5b] font-semibold' : 'text-[#6b7a99]'
                            }`}
                          >
                            {c.last_message ||
                              `${c.other_profile.community || 'Matrimonial Match'} • ${c.other_profile.current_city || 'BorKonya'}`}
                          </p>

                          {c.unread_count > 0 ? (
                            <span className="min-w-[22px] h-[22px] px-1.5 bg-[#e0102f] text-white rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                              {c.unread_count}
                            </span>
                          ) : (
                            <button
                              onClick={(e) => toggleFavourite(c.id, e)}
                              className={`p-1 text-lg leading-none flex-shrink-0 transition-colors hover:text-[#f5b301] ${
                                isFav ? 'text-[#f5b301]' : 'text-[#d6dcea] md:opacity-0 md:group-hover:opacity-100'
                              }`}
                              title={isFav ? 'Remove favourite' : 'Star chat'}
                            >
                              ★
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* ================= RIGHT: CHAT WINDOW ================= */}
          {activeConv ? (
            <section className="flex-1 min-w-0 min-h-0 flex flex-col relative overflow-hidden bg-gradient-to-br from-[#f3f6fd] via-[#fbf1f6] to-[#fde4ec]">
              {/* Theme romantic wallpaper background (couple at bottom-left, ribbon heart top-right) */}
              <div
                className="absolute inset-0 bg-no-repeat pointer-events-none select-none z-0"
                style={{
                  backgroundImage: `url('/chat-couple-bg.png')`,
                  backgroundPosition: 'left bottom',
                  backgroundSize: 'cover',
                  opacity: 0.95,
                }}
              />

              {/* Gentle overlay to keep messages readable while showing full theme illustration */}
              <div className="absolute inset-0 bg-white/20 pointer-events-none z-0" />

              {/* Chat header or Multi-select Action Bar */}
              {isSelectMode ? (
                <div className="px-3 sm:px-5 py-3 bg-white/90 backdrop-blur border-b border-[#e3e9f5] flex items-center justify-between gap-2 z-20 flex-shrink-0 animate-in fade-in duration-100">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setIsSelectMode(false);
                        setSelectedMessageIds([]);
                      }}
                      className={ROUND_BTN}
                      title="Cancel selection"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-bold text-[#0b2a5b]">{selectedMessageIds.length} selected</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleInitiateForwardMultiple}
                      disabled={selectedMessageIds.length === 0}
                      className="px-4 py-2.5 rounded-full bg-white text-[#0b4fd8] shadow-md hover:bg-[#f4f7fd] disabled:opacity-40 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                      title="Forward selected"
                    >
                      <Forward className="w-4 h-4" />
                      <span className="hidden sm:inline">Forward</span>
                    </button>

                    <button
                      onClick={handleExecuteBatchDelete}
                      disabled={selectedMessageIds.length === 0}
                      className="px-4 py-2.5 rounded-full bg-[#e0102f] text-white hover:bg-[#c70a27] disabled:opacity-40 transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-md shadow-[#e0102f]/25"
                      title="Delete selected"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-3 sm:px-5 bg-white/80 backdrop-blur border-b border-[#e3e9f5] flex items-center justify-between gap-2 z-20 flex-shrink-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => setActiveConvId(null)}
                      className="md:hidden p-2 text-[#0b2a5b] hover:text-[#e0102f] hover:bg-[#fde8ee] rounded-full flex-shrink-0"
                      title="Back to chats"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div
                      onClick={() => navigate(`/profile/${activeConv.other_profile.profile_id}`)}
                      className="relative w-12 h-12 flex-shrink-0 cursor-pointer"
                    >
                      <div className="w-full h-full rounded-full overflow-hidden border-2 border-white shadow-md">
                        <ProtectedPhoto
                          photoUrl={activeConv.other_profile.photo_url}
                          gender={activeConv.other_profile.gender}
                          altText={`${activeConv.other_profile.first_name} ${activeConv.other_profile.last_name}`}
                          profileId={activeConv.other_profile.profile_id}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div
                      onClick={() => navigate(`/profile/${activeConv.other_profile.profile_id}`)}
                      className="min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-[#0b2a5b] text-base leading-tight truncate">
                          {activeConv.other_profile.first_name} {activeConv.other_profile.last_name}
                        </h2>
                        {onlineUserIds.has(activeConv.other_profile.profile_id) || activeConv.other_profile.is_online ? (
                          <span className="flex items-center gap-1 text-xs text-[#16a34a] font-medium flex-shrink-0">
                            <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
                            Online
                          </span>
                        ) : (
                          <span className="text-xs text-[#8a96b0] font-medium flex-shrink-0">
                            Offline
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6b7a99] truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-[#e0102f] flex-shrink-0" />
                        <span className="truncate">
                          {activeConv.other_profile.current_city || 'India'}&nbsp;&nbsp;|&nbsp;&nbsp;
                          {activeConv.other_profile.community || 'Member'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    <button
                      className={ROUND_BTN}
                      title={favouriteConvIds.includes(activeConv.id) ? 'Remove favourite' : 'Add to favourites'}
                      onClick={(e) => toggleFavourite(activeConv.id, e)}
                    >
                      <Star
                        className={`w-5 h-5 text-[#e0102f] ${
                          favouriteConvIds.includes(activeConv.id) ? 'fill-[#e0102f]' : ''
                        }`}
                      />
                    </button>

                    <button
                      className={`${ROUND_BTN} !text-[#0b4fd8] ${
                        callState !== 'IDLE' ? 'opacity-50 pointer-events-none' : ''
                      }`}
                      title="Voice call"
                      onClick={startVoiceCall}
                    >
                      <Phone className="w-5 h-5" />
                    </button>

                    <button
                      className={`${ROUND_BTN} !text-[#0b4fd8] ${
                        callState !== 'IDLE' ? 'opacity-50 pointer-events-none' : ''
                      }`}
                      title="Video call"
                      onClick={startVideoCall}
                    >
                      <Video className="w-5 h-5" />
                    </button>

                    <div className="relative" ref={chatMenuRef}>
                      <button onClick={() => setChatMenuOpen(!chatMenuOpen)} className={ROUND_BTN} title="More options">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      {chatMenuOpen && (
                        <div className="absolute right-0 mt-2 w-52 max-w-[80vw] bg-white rounded-2xl shadow-xl border border-[#e3e9f5] py-1.5 z-50 text-sm">
                          <button
                            onClick={() => {
                              setChatMenuOpen(false);
                              navigate(`/profile/${activeConv.other_profile.profile_id}`);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-[#f6f9ff] text-[#0b2a5b] flex items-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View Full Profile
                          </button>
                          <button
                            onClick={() => {
                              setChatMenuOpen(false);
                              setIsSelectMode(true);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-[#f6f9ff] text-[#0b2a5b] flex items-center gap-2"
                          >
                            <CheckSquare className="w-4 h-4" />
                            Select Messages
                          </button>
                          <button
                            onClick={() => {
                              setChatMenuOpen(false);
                              setReportModalData({
                                id: activeConv.other_profile.profile_id,
                                name: `${activeConv.other_profile.first_name} ${activeConv.other_profile.last_name}`,
                              });
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-[#f6f9ff] text-[#e0102f] flex items-center gap-2"
                          >
                            <ShieldAlert className="w-4 h-4" />
                            Report Profile
                          </button>
                          <button
                            onClick={() => {
                              setChatMenuOpen(false);
                              setConvActionConfirm('clear_chat');
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-[#f6f9ff] text-[#0b2a5b] flex items-center gap-2 border-t border-[#eef2fa]"
                          >
                            <Eraser className="w-4 h-4 text-[#0b4fd8]" />
                            Clear Chat
                          </button>
                          <button
                            onClick={() => {
                              setChatMenuOpen(false);
                              setConvActionConfirm('delete_chat');
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-[#fff0f1] text-[#e0102f] flex items-center gap-2"
                          >
                            <MessageCircleOff className="w-4 h-4" />
                            Delete Chat for Me
                          </button>
                          {isBlocked ? (
                            <button
                              onClick={() => {
                                setChatMenuOpen(false);
                                handleUnblockMember(
                                  activeConv.other_profile.profile_id,
                                  `${activeConv.other_profile.first_name} ${activeConv.other_profile.last_name}`
                                );
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-[#ecfdf5] text-[#16a34a] flex items-center gap-2 border-t border-[#eef2fa] font-medium"
                            >
                              <Unlock className="w-4 h-4 text-[#16a34a]" />
                              Unblock User
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setChatMenuOpen(false);
                                handleBlockMember(
                                  activeConv.other_profile.profile_id,
                                  `${activeConv.other_profile.first_name} ${activeConv.other_profile.last_name}`
                                );
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-[#f6f9ff] text-[#0b2a5b] flex items-center gap-2 border-t border-[#eef2fa]"
                            >
                              <Ban className="w-4 h-4" />
                              Block User
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Security notice */}
              <div className="relative z-10 flex justify-center px-3 pt-2 flex-shrink-0">
                <span className="inline-block max-w-full px-3.5 py-1 bg-white/80 border border-[#f3c4ca] text-[#7a1020] text-[10px] sm:text-[11px] font-medium rounded-full shadow-sm text-center leading-snug">
                  🔒 Messages are end-to-end encrypted & protected. Screenshots restricted.
                </span>
              </div>

              {errorBanner && (
                <div className="bg-[#fff4f5] border-b border-[#f3c4ca] px-3 sm:px-4 py-2 text-xs text-[#9b0016] flex items-center justify-between gap-2 z-10 flex-shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#e0102f]" />
                    <span className="break-words min-w-0">{errorBanner}</span>
                  </div>
                  <button
                    onClick={() => setErrorBanner(null)}
                    className="text-[#9b0016] font-bold hover:underline flex-shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* ================= FLOATING ACTION POPUP ================= */}
              {actionMenuMsg && (
                <div
                  ref={actionMenuRef}
                  style={{
                    position: 'fixed',
                    top: actionMenuMsg.position.top,
                    left: actionMenuMsg.position.left,
                    right: actionMenuMsg.position.right,
                    zIndex: 9999,
                  }}
                  className="w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-[#e3e9f5] py-1.5 animate-in fade-in zoom-in-95 duration-100 select-none"
                >
                  {/* Top Emoji Reaction Bar */}
                  <div className="px-3 py-2 border-b border-[#eef2fa] flex items-center justify-between gap-1 bg-[#fdf3f6] rounded-t-2xl">
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReactToMessage(actionMenuMsg.msg.id, emoji)}
                        className="text-lg p-1 hover:scale-125 transition-transform active:scale-95"
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      onClick={() => handleReactToMessage(actionMenuMsg.msg.id, '❤️')}
                      className="p-1 text-[#8a96b0] hover:text-[#e0102f]"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Context Menu Action Items */}
                  <div className="py-1 text-sm text-[#0b2a5b]">
                    <button
                      onClick={() => handleInitiateReply(actionMenuMsg.msg)}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#f6f9ff] flex items-center gap-3 transition-colors"
                    >
                      <Reply className="w-4 h-4 text-[#0b4fd8]" />
                      <span>Reply</span>
                    </button>

                    <button
                      onClick={() => handleInitiateForwardSingle(actionMenuMsg.msg)}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#f6f9ff] flex items-center gap-3 transition-colors"
                    >
                      <Forward className="w-4 h-4 text-[#0b4fd8]" />
                      <span>Forward</span>
                    </button>

                    <button
                      onClick={() => handleCopyMessage(actionMenuMsg.msg)}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#f6f9ff] flex items-center gap-3 transition-colors"
                    >
                      <Copy className="w-4 h-4 text-[#0b4fd8]" />
                      <span>Copy</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsSelectMode(true);
                        setSelectedMessageIds([actionMenuMsg.msg.id]);
                        setActionMenuMsg(null);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#f6f9ff] flex items-center gap-3 transition-colors border-t border-[#eef2fa]"
                    >
                      <CheckSquare className="w-4 h-4 text-[#0b4fd8]" />
                      <span>Select</span>
                    </button>

                    {/* Delete for me */}
                    <button
                      onClick={() => {
                        const targetMsg = actionMenuMsg.msg;
                        setActionMenuMsg(null);
                        setDeleteConfirmState({ msg: targetMsg, deleteType: 'for_me' });
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#fff0f1] text-[#e0102f] flex items-center gap-3 transition-colors border-t border-[#eef2fa]"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete for me</span>
                    </button>

                    {/* Delete for everyone (Only for sender within 24 hours) */}
                    {actionMenuMsg.msg.is_mine &&
                      !actionMenuMsg.msg.deleted_for_everyone &&
                      actionMenuMsg.msg.can_delete_for_everyone !== false && (
                        <button
                          onClick={() => {
                            const targetMsg = actionMenuMsg.msg;
                            setActionMenuMsg(null);
                            setDeleteConfirmState({ msg: targetMsg, deleteType: 'for_everyone' });
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-[#fff0f1] text-[#c70a27] font-medium flex items-center gap-3 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-[#e0102f]" />
                          <span>Delete for everyone</span>
                        </button>
                      )}

                    {/* Cancel button */}
                    <button
                      onClick={() => setActionMenuMsg(null)}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#f6f9ff] text-[#6b7a99] flex items-center gap-3 transition-colors border-t border-[#eef2fa] text-xs font-semibold"
                    >
                      <X className="w-4 h-4 text-[#8a96b0]" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Messages Container */}
              <div
                ref={chatContainerRef}
                onScroll={handleScrollChat}
                className="flex-1 min-h-0 px-3 py-3 sm:px-6 sm:py-4 overflow-y-auto overflow-x-hidden space-y-3 z-10"
              >
                {isLoadingMessages ? (
                  <div className="py-16 text-center text-xs text-[#6b7a99] font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#e0102f] mx-auto mb-2" />
                    Loading conversation...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-14 h-14 bg-white text-[#e0102f] rounded-full flex items-center justify-center mx-auto shadow-md border border-[#fbd5d9]">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-[#0b2a5b] font-serif">Start Matrimonial Dialogue</h3>
                    <p className="text-xs text-[#6b7a99] max-w-sm mx-auto leading-relaxed px-2">
                      Send a respectful introductory greeting to {activeConv.other_profile.first_name} and their family.
                    </p>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const timeString = formatMessageTime(m.created_at);
                    const isSelected = selectedMessageIds.includes(m.id);
                    const userReaction = reactions[m.id];
                    const prev = idx > 0 ? messages[idx - 1] : null;
                    const curDate = parseDateTime(m.created_at);
                    const prevDate = prev ? parseDateTime(prev.created_at) : null;
                    const showDateChip =
                      !prevDate || !curDate || prevDate.toDateString() !== curDate.toDateString();
                    const isFwdMine = !!m.is_forwarded && m.is_mine;
                    const onBlue = m.is_mine && !isFwdMine;

                    return (
                      <React.Fragment key={m.id}>
                        {showDateChip && (
                          <div className="flex justify-center py-1">
                            <span className="inline-flex px-5 py-1.5 bg-white/80 border border-[#e3e9f5] text-[#0b2a5b] text-xs font-semibold rounded-full shadow-sm">
                              {formatDateChip(m.created_at)}
                            </span>
                          </div>
                        )}

                        <div
                          id={`msg-${m.id}`}
                          onClick={() => {
                            if (isSelectMode) toggleSelectMessage(m.id);
                          }}
                          onTouchStart={(e) => handleTouchStart(e, m)}
                          onTouchEnd={handleTouchEnd}
                          onTouchMove={handleTouchEnd}
                          className={`flex w-full items-end gap-2 group transition-colors rounded-2xl px-1 py-0.5 ${
                            isSelected ? 'bg-[#fde8ee]/80 ring-2 ring-[#e0102f]/40' : ''
                          } ${m.is_mine ? 'justify-end' : 'justify-start'}`}
                        >
                          {/* Select checkbox if select mode */}
                          {isSelectMode && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectMessage(m.id);
                              }}
                              className={`w-5 h-5 mb-2 rounded-full border flex items-center justify-center cursor-pointer transition-colors flex-shrink-0 ${
                                isSelected ? 'bg-[#e0102f] border-[#e0102f] text-white' : 'border-[#cfd6e6] bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          )}

                          {/* Other person's avatar (left) */}
                          {!m.is_mine && (
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md flex-shrink-0 mb-0.5">
                              <ProtectedPhoto
                                photoUrl={activeConv.other_profile.photo_url}
                                gender={activeConv.other_profile.gender}
                                altText={activeConv.other_profile.first_name}
                                profileId={activeConv.other_profile.profile_id}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          <div
                            className={`relative min-w-0 max-w-[85%] sm:max-w-[70%] lg:max-w-[60%] 2xl:max-w-[50%] rounded-3xl px-4 py-2.5 text-sm select-text transition-all ${
                              m.deleted_for_everyone
                                ? 'bg-[#f4f6fa] border border-[#d9e2ec] text-[#8292a8] italic rounded-3xl shadow-none'
                                : isFwdMine
                                ? 'bg-[#fde4ec] text-[#0b2a5b] rounded-br-lg shadow-sm'
                                : m.is_mine
                                ? `${BLUE_BUBBLE} rounded-br-lg`
                                : 'bg-white text-[#0b2a5b] rounded-bl-lg shadow-md shadow-[#0b2a5b]/5'
                            }`}
                          >
                            {/* Forwarded Header Indicator */}
                            {m.is_forwarded && !m.deleted_for_everyone && (
                              <div className="flex items-center gap-1 text-[11px] font-medium italic mb-1 text-[#e0102f]">
                                <Forward className="w-3.5 h-3.5" />
                                <span>Forwarded</span>
                              </div>
                            )}

                            {/* Replied-To Quote Box */}
                            {m.reply_to && !m.deleted_for_everyone && (
                              <div
                                onClick={() => {
                                  const targetEl = document.getElementById(`msg-${m.reply_to?.id}`);
                                  if (targetEl) {
                                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    targetEl.classList.add('ring-2', 'ring-[#e0102f]');
                                    setTimeout(() => targetEl.classList.remove('ring-2', 'ring-[#e0102f]'), 1500);
                                  }
                                }}
                                className={`mb-1.5 rounded-xl border-l-4 p-2 text-xs cursor-pointer transition-colors ${
                                  onBlue
                                    ? 'border-white/70 bg-black/15 hover:bg-black/20'
                                    : 'border-[#e0102f] bg-[#fdf3f6] hover:bg-[#fde8ee]'
                                }`}
                              >
                                <p
                                  className={`font-semibold text-[11px] truncate ${
                                    onBlue ? 'text-white' : 'text-[#e0102f]'
                                  }`}
                                >
                                  {m.reply_to.sender_name}
                                </p>
                                <p
                                  className={`text-[11px] line-clamp-1 italic ${
                                    onBlue ? 'text-white/85' : 'text-[#6b7a99]'
                                  }`}
                                >
                                  {m.reply_to.content}
                                </p>
                              </div>
                            )}

                            {/* Message Content */}
                            {m.deleted_for_everyone ? (
                              <div className="flex items-center gap-2 text-xs text-[#8a96b0] italic py-0.5">
                                <Ban className="w-3.5 h-3.5 text-[#a4b1c7]" />
                                <span>This message was deleted</span>
                              </div>
                            ) : m.message_type === 'call_voice' || m.message_type === 'call_video' ? (
                              (() => {
                                const isVideoCall = m.message_type === 'call_video';
                                const isMissed = m.content.toLowerCase().includes('missed');
                                const parts = m.content.split('•').map((s) => s.trim());
                                const titleLabel = parts[0] || (isVideoCall ? 'Video call' : 'Voice call');
                                const durationLabel = parts[1] || '';

                                return (
                                  <div className="flex items-center gap-3 py-1 min-w-[180px]">
                                    <div
                                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        isMissed
                                          ? 'bg-[#fde8ee] text-[#e0102f]'
                                          : onBlue
                                          ? 'bg-white/20 text-white'
                                          : 'bg-[#eef3fb] text-[#0a56e0]'
                                      }`}
                                    >
                                      {isMissed ? (
                                        <PhoneMissed className="w-5 h-5" />
                                      ) : isVideoCall ? (
                                        <Video className="w-5 h-5" />
                                      ) : (
                                        <PhoneCall className="w-5 h-5" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className={`text-sm font-bold leading-snug ${
                                          isMissed && !onBlue ? 'text-[#e0102f]' : ''
                                        }`}
                                      >
                                        {isMissed
                                          ? isVideoCall
                                            ? '🔴 Missed video call'
                                            : '📞 Missed voice call'
                                          : isVideoCall
                                          ? '🎥 Video call'
                                          : `📞 ${titleLabel}`}
                                      </p>
                                      <p
                                        className={`text-xs mt-0.5 ${
                                          onBlue ? 'text-white/80' : 'text-[#6b7a99]'
                                        }`}
                                      >
                                        {isMissed
                                          ? `${formatDateChip(m.created_at)}, ${timeString}`
                                          : durationLabel || 'Completed'}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isVideoCall) startVideoCall();
                                        else startVoiceCall();
                                      }}
                                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex-shrink-0 ${
                                        onBlue
                                          ? 'bg-white text-[#0a56e0] hover:bg-white/90'
                                          : 'bg-[#fde8ee] text-[#e0102f] hover:bg-[#fbd5df]'
                                      }`}
                                      title={isVideoCall ? 'Video call again' : 'Voice call again'}
                                    >
                                      Call
                                    </button>
                                  </div>
                                );
                              })()
                            ) : (
                              <>
                                {m.media_url && (m.message_type === 'image' || /\.(jpe?g|png|webp|gif)$/i.test(m.media_url)) ? (
                                  <div className="mb-2 rounded-2xl overflow-hidden max-w-xs sm:max-w-sm border border-black/10 bg-black/5 shadow-xs">
                                    <img
                                      src={m.media_url.startsWith('http') ? m.media_url : `${BACKEND_ROOT_URL}${m.media_url}`}
                                      alt="Attachment"
                                      className="max-h-72 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                      onClick={() => window.open(m.media_url?.startsWith('http') ? m.media_url : `${BACKEND_ROOT_URL}${m.media_url}`, '_blank')}
                                    />
                                  </div>
                                ) : m.media_url ? (
                                  <div className="mb-2">
                                    <a
                                      href={m.media_url.startsWith('http') ? m.media_url : `${BACKEND_ROOT_URL}${m.media_url}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
                                        onBlue
                                          ? 'bg-white/15 border-white/30 text-white hover:bg-white/25'
                                          : 'bg-slate-50 border-slate-200 text-[#0b2a5b] hover:bg-slate-100'
                                      }`}
                                    >
                                      <FileText className="w-6 h-6 flex-shrink-0 text-crimson-600" />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold truncate">{m.content || 'Document'}</p>
                                        <span className="text-[10px] opacity-80">Click to view/download</span>
                                      </div>
                                      <Download className="w-4 h-4 flex-shrink-0 opacity-80" />
                                    </a>
                                  </div>
                                ) : null}
                                {(!m.media_url || (m.content && !m.content.includes('/') && m.content !== m.media_url.split('/').pop())) && (
                                  <p className="whitespace-pre-wrap leading-relaxed text-[14px] [overflow-wrap:anywhere]">
                                    {m.content}
                                  </p>
                                )}
                              </>
                            )}

                            {/* Time & Read Receipts */}
                            <div className="flex items-center justify-end gap-1 mt-1 select-none">
                              <span
                                className={`text-[10px] ${
                                  m.deleted_for_everyone
                                    ? 'text-[#a4b1c7]'
                                    : onBlue
                                    ? 'text-white/80'
                                    : 'text-[#8a96b0]'
                                }`}
                              >
                                {timeString}
                              </span>
                              {m.is_mine &&
                                !m.deleted_for_everyone &&
                                (m.is_read ? (
                                  <span title="Seen" className="inline-flex">
                                    <CheckCheck className="w-3.5 h-3.5 text-[#22c55e] stroke-[2.5]" />
                                  </span>
                                ) : (
                                  <span title="Delivered" className="inline-flex">
                                    <Check className={`w-3.5 h-3.5 ${isFwdMine ? 'text-[#0b4fd8]/70' : 'text-white/70'}`} />
                                  </span>
                                ))}
                            </div>

                            {/* Reaction Badge */}
                            {userReaction && !m.deleted_for_everyone && (
                              <div className="absolute -bottom-3 left-3 bg-white rounded-full w-6 h-6 shadow-md border border-[#e3e9f5] text-xs flex items-center justify-center">
                                <span>{userReaction}</span>
                              </div>
                            )}

                            {/* Hover/Tap Trigger for Floating Context Menu */}
                            {!isSelectMode && !m.deleted_for_everyone && (
                              <button
                                onClick={(e) => handleOpenActionMenu(e, m)}
                                className="absolute top-1.5 right-1.5 p-1 bg-white/90 hover:bg-white rounded-full shadow-sm text-[#6b7a99] hover:text-[#e0102f] opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Message actions"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* My avatar (right) */}
                          {m.is_mine && (
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md flex-shrink-0 mb-0.5">
                              <ProtectedPhoto
                                photoUrl={currentUser?.photo_url || undefined}
                                gender={currentUser?.gender}
                                altText={currentUser?.first_name || 'My Photo'}
                                profileId={currentUser?.profile_id || 'ME'}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Floating "New Messages" / Scroll to bottom chip */}
              {hasNewMessagesBelow && (
                <div className="absolute bottom-24 right-6 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <button
                    onClick={() => {
                      scrollToBottom();
                      setHasNewMessagesBelow(false);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#0b2a5b] text-white rounded-full shadow-xl hover:bg-[#081e42] transition-colors text-xs font-semibold"
                  >
                    <ChevronDown className="w-4 h-4 text-[#e0102f]" />
                    <span>New messages</span>
                  </button>
                </div>
              )}

              {/* Quick replies */}
              {canChat && !isBlocked && icebreakers.length > 0 && (
                <div className="px-4 py-3 bg-white/85 backdrop-blur border-t border-[#e3e9f5] flex items-center gap-2 z-10 flex-shrink-0">
                  <span className="text-xs font-semibold text-[#6b7a99] flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-[#e0102f]" />
                    <span className="hidden sm:inline">Quick replies:</span>
                  </span>
                  <div ref={quickRef} className={`flex items-center gap-2 overflow-x-auto flex-1 min-w-0 ${NO_SCROLLBAR}`}>
                    {icebreakers.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(prompt)}
                        className="flex-shrink-0 px-4 py-1.5 bg-white border border-[#f3a6b6] text-[#0b4fd8] rounded-full text-xs font-medium whitespace-nowrap hover:bg-[#fde8ee] transition-colors shadow-sm"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => quickRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
                    className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-[#0b2a5b] flex-shrink-0 hover:text-[#e0102f]"
                    title="More replies"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {isBlocked && (
                <div className="bg-[#fff0f1] border-t border-[#f3c4ca] px-4 py-2.5 text-center text-xs text-[#9b0016] flex flex-wrap items-center justify-center gap-2.5 z-10 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Ban className="w-4 h-4 text-[#e0102f] flex-shrink-0" />
                    <span>Communication is disabled because this member has been blocked.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleUnblockMember(
                        activeConv.other_profile.profile_id,
                        `${activeConv.other_profile.first_name} ${activeConv.other_profile.last_name}`
                      )
                    }
                    className="px-3 py-1 bg-white hover:bg-[#ecfdf5] text-[#16a34a] border border-[#16a34a]/30 font-semibold rounded-full text-xs transition-colors shadow-sm inline-flex items-center gap-1"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    Unblock Now
                  </button>
                </div>
              )}
              {!canChat && !isBlocked && (
                <div className="bg-[#f3f6fd] border-t border-[#dbe3f5] px-3 sm:px-4 py-3 text-xs text-[#0b2a5b] flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 z-10 flex-shrink-0">
                  <div className="flex items-start sm:items-center gap-2 min-w-0">
                    <AlertCircle className="w-4 h-4 text-[#e0102f] flex-shrink-0" />
                    <span>Direct chat unlocks on accepted interest or BorKonya Premium membership.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/subscription')}
                    className="px-4 py-1.5 bg-[#e0102f] hover:bg-[#c70a27] text-white font-semibold rounded-full text-xs flex-shrink-0 transition-colors shadow-md shadow-[#e0102f]/25"
                  >
                    Upgrade Now
                  </button>
                </div>
              )}

              {/* Replied Message Preview Bar above composer */}
              {replyingTo && (
                <div className="px-4 py-2 bg-[#fdf3f6] border-t border-[#f3d5db] flex items-center justify-between gap-2 z-10 flex-shrink-0 animate-in slide-in-from-bottom-2 duration-100">
                  <div className="border-l-4 border-[#e0102f] pl-2.5 min-w-0">
                    <p className="text-xs font-bold text-[#e0102f]">
                      Replying to {replyingTo.is_mine ? 'yourself' : replyingTo.sender_name}
                    </p>
                    <p className="text-xs text-[#6b7a99] truncate">{replyingTo.content}</p>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-1 text-[#8a96b0] hover:text-[#e0102f] rounded-full hover:bg-[#fde8ee] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {showEmojiPicker && (
                <div className="p-2 bg-white border-t border-[#e3e9f5] flex items-center gap-1 flex-wrap z-20 flex-shrink-0">
                  {EMOJIS.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setInputText((prev) => prev + emoji);
                        inputRef.current?.focus();
                      }}
                      className="text-lg p-1.5 hover:bg-[#fde8ee] rounded-xl transition-transform active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Input bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="px-3 pt-3 sm:px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white/90 backdrop-blur border-t border-[#e3e9f5] flex items-center gap-2.5 z-10 flex-shrink-0"
              >
                <div className="flex items-center gap-0.5 bg-[#f1f4fb] rounded-full p-1 flex-shrink-0 relative">
                  {/* Hidden inputs for Image and Document */}
                  <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'image')}
                  />
                  <input
                    type="file"
                    ref={docInputRef}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'document')}
                  />

                  {/* Attachment Popover Button */}
                  <div className="relative" ref={attachmentMenuRef}>
                    <button
                      type="button"
                      disabled={isBlocked || !canChat || isUploadingAttachment}
                      onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                      className={`p-2 rounded-full transition-colors ${
                        showAttachmentMenu
                          ? 'bg-white text-[#e0102f] shadow-xs'
                          : 'text-[#0b4fd8] hover:bg-white'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                      title="Attach Photo or Document"
                    >
                      {isUploadingAttachment ? (
                        <Loader2 className="w-5 h-5 animate-spin text-[#e0102f]" />
                      ) : (
                        <Paperclip className="w-5 h-5" />
                      )}
                    </button>

                    {showAttachmentMenu && (
                      <div className="absolute bottom-full mb-3 left-0 w-64 bg-white rounded-2xl shadow-xl border border-[#e3e9f5] p-2 z-50 animate-in fade-in zoom-in-95">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachmentMenu(false);
                            imageInputRef.current?.click();
                          }}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#f6f9ff] text-left transition-colors group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-crimson-50 text-crimson-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-navy-950">Photos & Images</p>
                            <p className="text-[10px] text-slate-500">Auto-compressed to ≤ 1 MB</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachmentMenu(false);
                            docInputRef.current?.click();
                          }}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#f6f9ff] text-left transition-colors group mt-1"
                        >
                          <div className="w-10 h-10 rounded-xl bg-navy-50 text-navy-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-navy-950">Documents</p>
                            <p className="text-[10px] text-slate-500">PDF, DOC, XLS up to 10 MB</p>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-2 rounded-full transition-colors ${
                      showEmojiPicker ? 'bg-white text-[#e0102f]' : 'text-[#0b4fd8] hover:bg-white'
                    }`}
                    title="Insert emoji"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 min-w-0 bg-white rounded-full px-5 py-3 flex items-center gap-2 border-2 border-[#f3a6b6] focus-within:border-[#e0102f] transition-colors shadow-sm">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={isBlocked || !canChat}
                    placeholder={
                      isBlocked
                        ? 'Messaging disabled (blocked member)'
                        : !canChat
                        ? 'Chat unlocks on accepted interest or Premium'
                        : 'Type a message...'
                    }
                    className="w-full min-w-0 text-base sm:text-sm text-[#0b2a5b] placeholder-[#8a96b0] focus:outline-none bg-transparent disabled:cursor-not-allowed truncate"
                  />
                  <Mic className="w-5 h-5 text-[#0b2a5b] flex-shrink-0" />
                </div>

                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending || isBlocked || !canChat}
                  className={`w-14 h-14 rounded-full transition-all flex items-center justify-center flex-shrink-0 ${
                    inputText.trim() && !isBlocked && canChat
                      ? 'bg-gradient-to-br from-[#f0213f] to-[#c70a27] text-white shadow-lg shadow-[#e0102f]/40 hover:scale-105'
                      : 'bg-[#e4e8f3] text-[#a3adc4] cursor-not-allowed'
                  }`}
                  title="Send message"
                >
                  <Send className="w-5 h-5 -ml-0.5" />
                </button>
              </form>
            </section>
          ) : (
            <div className="hidden md:flex flex-1 min-w-0 flex-col items-center justify-center bg-gradient-to-br from-[#f3f6fd] via-[#fbf1f6] to-[#fde4ec] p-8 text-center border-b-[6px] border-[#e0102f]">
              <div className="max-w-md space-y-4">
                <div className="w-20 h-20 rounded-full bg-white text-[#e0102f] flex items-center justify-center mx-auto shadow-md border border-[#fbd5d9]">
                  <MessageSquare className="w-10 h-10" />
                </div>
                <h2 className="text-xl lg:text-2xl font-extrabold text-[#0b2a5b] tracking-tight">
                  BorKonya Family Messenger
                </h2>
                <p className="text-sm text-[#6b7a99] leading-relaxed">
                  Send and receive messages with prospective brides, grooms, and their verified families in real time.
                </p>
                <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-[#8a96b0]">
                  <ShieldCheck className="w-4 h-4 text-[#e0102f]" />
                  <span>End-to-end encrypted matrimonial privacy</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};