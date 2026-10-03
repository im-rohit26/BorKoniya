// import React, { useEffect, useState, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import {
//   Send,
//   MessageSquare,
//   ShieldAlert,
//   Ban,
//   Check,
//   CheckCheck,
//   ArrowLeft,
//   Search,
//   Sparkles,
//   ExternalLink,
//   RefreshCw,
//   AlertCircle,
//   MoreVertical,
//   Smile,
//   Paperclip,
//   User,
//   ShieldCheck,
//   X,
//   Reply,
//   Copy,
//   Forward,
//   Pin,
//   Bot,
//   Star,
//   CheckSquare,
//   Trash2,
//   ThumbsDown,
//   Plus,
// } from 'lucide-react';
// import {
//   getConversations,
//   getMessages,
//   sendMessage,
//   forwardMessages,
//   deleteMessage,
//   batchDeleteMessages,
//   blockProfile,
//   markConversationRead,
//   getBlockedProfiles,
// } from '../lib/interactionApi';
// import type { ConversationSummary, MessageItem } from '../lib/interactionApi';
// import { supabase } from '../lib/supabase';
// import { ProtectedPhoto } from '../components/security/ProtectedPhoto';
// import { ScreenCaptureProtection } from '../components/security/ScreenCaptureProtection';
// import { ReportProfileModal } from '../components/safety/ReportProfileModal';
// import { Header } from '../components/common/Header';
// import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal';
// import { masterDataApi } from '../lib/masterDataApi';

// // Horizontal scroller without visible scrollbar
// const NO_SCROLLBAR = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

// export const ChatPage: React.FC = () => {
//   const { conversationId } = useParams<{ conversationId?: string }>();
//   const navigate = useNavigate();
//   const [langModalOpen, setLangModalOpen] = useState(false);
//   const wsConnectedRef = useRef(false);
//   const [icebreakers, setIcebreakers] = useState<string[]>([]);

//   const [conversations, setConversations] = useState<ConversationSummary[]>([]);
//   const [activeConvId, setActiveConvId] = useState<string | null>(conversationId || null);
//   const [messages, setMessages] = useState<MessageItem[]>([]);
//   const [inputText, setInputText] = useState('');
//   const [isLoadingConvs, setIsLoadingConvs] = useState(true);
//   const [isLoadingMessages, setIsLoadingMessages] = useState(false);
//   const [isSending, setIsSending] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [errorBanner, setErrorBanner] = useState<string | null>(null);

//   const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'favourites'>('all');
//   const [favouriteConvIds, setFavouriteConvIds] = useState<string[]>(() => {
//     try {
//       const saved = localStorage.getItem('borkoniya_fav_convs');
//       return saved ? JSON.parse(saved) : [];
//     } catch {
//       return [];
//     }
//   });

//   const [reportModalData, setReportModalData] = useState<{ id: string; name: string } | null>(null);
//   const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
//   const [chatMenuOpen, setChatMenuOpen] = useState(false);
//   const [showEmojiPicker, setShowEmojiPicker] = useState(false);

//   // Message Actions & Multi-selection State
//   const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
//   const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
//   const [isSelectMode, setIsSelectMode] = useState(false);
//   const [actionMenuMsg, setActionMenuMsg] = useState<{
//     msg: MessageItem;
//     position: { top: number; right?: number; left?: number; isMine: boolean };
//   } | null>(null);
//   const [reactions, setReactions] = useState<Record<string, string>>(() => {
//     try {
//       const saved = localStorage.getItem('borkoniya_chat_reactions');
//       return saved ? JSON.parse(saved) : {};
//     } catch {
//       return {};
//     }
//   });

//   // Forward Modal State
//   const [forwardModalOpen, setForwardModalOpen] = useState(false);
//   const [messagesToForward, setMessagesToForward] = useState<MessageItem[]>([]);
//   const [targetForwardConvIds, setTargetForwardConvIds] = useState<string[]>([]);
//   const [forwardSearch, setForwardSearch] = useState('');
//   const [isForwarding, setIsForwarding] = useState(false);

//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const chatContainerRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLInputElement>(null);
//   const actionMenuRef = useRef<HTMLDivElement>(null);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
//   };

//   const [blockedProfileIds, setBlockedProfileIds] = useState<string[]>([]);

//   // Close message action popup when clicking outside
//   useEffect(() => {
//     const handleClickOutside = (e: MouseEvent) => {
//       if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
//         setActionMenuMsg(null);
//       }
//     };
//     if (actionMenuMsg) {
//       document.addEventListener('mousedown', handleClickOutside);
//     }
//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//     };
//   }, [actionMenuMsg]);

//   const toggleFavourite = (id: string, e: React.MouseEvent) => {
//     e.stopPropagation();
//     setFavouriteConvIds((prev) => {
//       const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
//       try {
//         localStorage.setItem('borkoniya_fav_convs', JSON.stringify(next));
//       } catch {
//         /* ignore */
//       }
//       return next;
//     });
//   };

//   useEffect(() => {
//     if (conversationId) setActiveConvId(conversationId);
//   }, [conversationId]);

//   useEffect(() => {
//     getBlockedProfiles()
//       .then((blocked: any[]) => {
//         if (Array.isArray(blocked)) {
//           setBlockedProfileIds(blocked.map((b) => b.blocked_profile_id || b.id || '').filter(Boolean));
//         }
//       })
//       .catch(() => {});
//   }, []);

//   const fetchConversations = async () => {
//     setIsLoadingConvs(true);
//     try {
//       const convs = await getConversations();
//       setConversations(convs);
//       if (!activeConvId && convs.length > 0 && window.innerWidth >= 768) {
//         setActiveConvId(convs[0].id);
//       }
//     } catch (err) {
//       console.error('Failed to load conversations:', err);
//     } finally {
//       setIsLoadingConvs(false);
//     }
//   };

//   useEffect(() => {
//     fetchConversations();
//     masterDataApi
//       .getIcebreakers()
//       .then(setIcebreakers)
//       .catch(() => {
//         setIcebreakers([
//           'নমস্কার! আপনার প্রোফাইল দেখে ভালো লাগলো।',
//           'Hello! Would love to know more about you.',
//           'আশা করি আপনি ভালো আছেন!',
//         ]);
//       });
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // Load messages + realtime
//   useEffect(() => {
//     if (!activeConvId) return;

//     let isMounted = true;
//     wsConnectedRef.current = false;
//     // Reset selection and reply on chat switch
//     setSelectedMessageIds([]);
//     setIsSelectMode(false);
//     setReplyingTo(null);
//     setActionMenuMsg(null);

//     const fetchChatMessages = async (silent = false) => {
//       if (!silent) setIsLoadingMessages(true);
//       setErrorBanner(null);
//       try {
//         const msgs = await getMessages(activeConvId);
//         if (isMounted) {
//           setMessages(msgs);
//           setTimeout(scrollToBottom, 100);
//           markConversationRead(activeConvId).catch(() => {});
//         }
//       } catch (err: any) {
//         if (isMounted && !silent) setErrorBanner(err.message || 'Unable to load message history.');
//       } finally {
//         if (isMounted && !silent) setIsLoadingMessages(false);
//       }
//     };

//     fetchChatMessages();

//     let channel: any = null;
//     try {
//       channel = supabase
//         .channel(`chat_${activeConvId}`)
//         .on(
//           'postgres_changes',
//           {
//             event: 'INSERT',
//             schema: 'public',
//             table: 'messages',
//             filter: `conversation_id=eq.${activeConvId}`,
//           },
//           () => fetchChatMessages(true)
//         )
//         .subscribe((status: string) => {
//           wsConnectedRef.current = status === 'SUBSCRIBED';
//         });
//     } catch (e) {
//       console.warn('Realtime channel error:', e);
//     }

//     // Fallback polling only while realtime is not connected
//     const pollInterval = setInterval(() => {
//       if (!wsConnectedRef.current) fetchChatMessages(true);
//     }, 4000);

//     return () => {
//       isMounted = false;
//       clearInterval(pollInterval);
//       if (channel) supabase.removeChannel(channel);
//     };
//   }, [activeConvId]);

//   const activeConv = conversations.find((c) => c.id === activeConvId);
//   const isBlocked = activeConv ? blockedProfileIds.includes(activeConv.other_profile.profile_id) : false;
//   const canChat = activeConv ? activeConv.can_chat !== false : true;

//   const handleSendMessage = async (textToSend?: string) => {
//     const text = (textToSend || inputText).trim();
//     if (!text || !activeConvId || isSending || isBlocked || !canChat) return;

//     setIsSending(true);
//     setErrorBanner(null);
//     try {
//       const newMsg = await sendMessage(activeConvId, text, {
//         replyToMessageId: replyingTo ? replyingTo.id : undefined,
//       });
//       setMessages((prev) => [...prev, newMsg]);
//       setInputText('');
//       setReplyingTo(null);
//       setShowEmojiPicker(false);
//       setTimeout(scrollToBottom, 50);
//       fetchConversations();
//     } catch (err: any) {
//       setErrorBanner(err.message || 'Failed to send message.');
//     } finally {
//       setIsSending(false);
//     }
//   };

//   const handleBlockMember = async (profileId: string, name: string) => {
//     if (!window.confirm(`Are you sure you want to block ${name}? They will no longer be able to message you.`)) return;
//     try {
//       await blockProfile(profileId);
//       setBlockedProfileIds((prev) => [...prev, profileId]);
//       alert(`${name} has been blocked.`);
//       setActiveConvId(null);
//       await fetchConversations();
//     } catch (err: any) {
//       alert(err.message || 'Failed to block user');
//     }
//   };

//   // Reactions
//   const handleReactToMessage = (messageId: string, emoji: string) => {
//     setReactions((prev) => {
//       const updated = { ...prev, [messageId]: prev[messageId] === emoji ? '' : emoji };
//       try {
//         localStorage.setItem('borkoniya_chat_reactions', JSON.stringify(updated));
//       } catch {
//         /* ignore */
//       }
//       return updated;
//     });
//     setActionMenuMsg(null);
//   };

//   // Reply
//   const handleInitiateReply = (msg: MessageItem) => {
//     setReplyingTo(msg);
//     setActionMenuMsg(null);
//     inputRef.current?.focus();
//   };

//   // Copy message
//   const handleCopyMessage = (msg: MessageItem) => {
//     navigator.clipboard?.writeText(msg.content);
//     setActionMenuMsg(null);
//   };

//   // Forward single message
//   const handleInitiateForwardSingle = (msg: MessageItem) => {
//     setMessagesToForward([msg]);
//     setTargetForwardConvIds([]);
//     setForwardModalOpen(true);
//     setActionMenuMsg(null);
//   };

//   // Forward selected multiple messages
//   const handleInitiateForwardMultiple = () => {
//     const toForward = messages.filter((m) => selectedMessageIds.includes(m.id));
//     if (toForward.length === 0) return;
//     setMessagesToForward(toForward);
//     setTargetForwardConvIds([]);
//     setForwardModalOpen(true);
//   };

//   // Perform Forward
//   const handleExecuteForward = async () => {
//     if (targetForwardConvIds.length === 0 || messagesToForward.length === 0 || isForwarding) return;
//     setIsForwarding(true);
//     try {
//       await forwardMessages(
//         messagesToForward.map((m) => m.id),
//         targetForwardConvIds
//       );
//       setForwardModalOpen(false);
//       setMessagesToForward([]);
//       setTargetForwardConvIds([]);
//       setSelectedMessageIds([]);
//       setIsSelectMode(false);
//       fetchConversations();
//       // If active conversation was one of the targets, reload its messages
//       if (activeConvId && targetForwardConvIds.includes(activeConvId)) {
//         const refreshed = await getMessages(activeConvId);
//         setMessages(refreshed);
//         setTimeout(scrollToBottom, 100);
//       }
//     } catch (err: any) {
//       alert(err.message || 'Failed to forward message(s)');
//     } finally {
//       setIsForwarding(false);
//     }
//   };

//   // Delete message
//   const handleDeleteSingle = async (msg: MessageItem) => {
//     if (!activeConvId) return;
//     if (!msg.is_mine) {
//       alert('You can only delete your own sent messages.');
//       setActionMenuMsg(null);
//       return;
//     }
//     if (!window.confirm('Delete this message?')) return;
//     try {
//       await deleteMessage(activeConvId, msg.id);
//       setMessages((prev) => prev.filter((m) => m.id !== msg.id));
//       setActionMenuMsg(null);
//       fetchConversations();
//     } catch (err: any) {
//       alert(err.message || 'Failed to delete message');
//     }
//   };

//   // Bulk Delete
//   const handleExecuteBatchDelete = async () => {
//     if (selectedMessageIds.length === 0) return;
//     // Check if user owns all selected messages
//     const mySelected = messages.filter((m) => selectedMessageIds.includes(m.id) && m.is_mine);
//     if (mySelected.length === 0) {
//       alert('You can only delete your own sent messages.');
//       return;
//     }
//     if (
//       !window.confirm(
//         `Delete ${mySelected.length} message(s)?${
//           mySelected.length < selectedMessageIds.length ? ' (Only your sent messages can be deleted)' : ''
//         }`
//       )
//     )
//       return;

//     try {
//       await batchDeleteMessages(mySelected.map((m) => m.id));
//       setMessages((prev) => prev.filter((m) => !mySelected.some((del) => del.id === m.id)));
//       setSelectedMessageIds([]);
//       setIsSelectMode(false);
//       fetchConversations();
//     } catch (err: any) {
//       alert(err.message || 'Failed to delete messages');
//     }
//   };

//   // Selection toggle
//   const toggleSelectMessage = (id: string) => {
//     setSelectedMessageIds((prev) =>
//       prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
//     );
//   };

//   const handleOpenActionMenu = (e: React.MouseEvent, msg: MessageItem) => {
//     e.stopPropagation();
//     const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
//     const isMine = msg.is_mine;

//     // Position relative to viewport or anchor
//     setActionMenuMsg({
//       msg,
//       position: {
//         top: Math.max(10, rect.top - 120),
//         right: isMine ? Math.max(16, window.innerWidth - rect.right) : undefined,
//         left: !isMine ? Math.max(16, rect.left) : undefined,
//         isMine,
//       },
//     });
//   };

//   const filteredConversations = conversations.filter((c) => {
//     const nameMatch = `${c.other_profile.first_name} ${c.other_profile.last_name || ''}`
//       .toLowerCase()
//       .includes(searchQuery.toLowerCase());
//     if (!nameMatch) return false;
//     if (activeFilter === 'unread') return c.unread_count > 0;
//     if (activeFilter === 'favourites') return favouriteConvIds.includes(c.id);
//     return true;
//   });

//   const forwardAvailableConversations = conversations.filter((c) => {
//     const name = `${c.other_profile.first_name} ${c.other_profile.last_name || ''}`.toLowerCase();
//     return name.includes(forwardSearch.toLowerCase());
//   });

//   const totalUnreadCount = conversations.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);

//   const formatTimeSnippet = (dateStr?: string) => {
//     if (!dateStr) return '';
//     try {
//       const date = new Date(dateStr);
//       const now = new Date();
//       if (date.toDateString() === now.toDateString()) {
//         return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
//       }
//       const yesterday = new Date();
//       yesterday.setDate(now.getDate() - 1);
//       if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
//       return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
//     } catch {
//       return '';
//     }
//   };

//   const EMOJIS = ['🙏', '😊', '💐', '❤️', '👍', '🌺', '✨', '🤝', 'শুভকামনা'];
//   const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

//   // Mobile: show either list OR chat. Desktop (md+): show both.
//   const showChatOnMobile = !!activeConvId;

//   return (
//     <div className="h-[100dvh] w-full max-w-full flex flex-col bg-[#f0f2f5] overflow-hidden">
//       <div className="flex-shrink-0">
//         <Header onOpenLanguageModal={() => setLangModalOpen(true)} onOpenRegister={() => {}} />
//       </div>

//       <LanguageSelectorModal isOpen={langModalOpen} onClose={() => setLangModalOpen(false)} />
//       <ScreenCaptureProtection />

//       {reportModalData && (
//         <ReportProfileModal
//           isOpen={!!reportModalData}
//           onClose={() => setReportModalData(null)}
//           profileId={reportModalData.id}
//           profileName={reportModalData.name}
//         />
//       )}

//       {/* ================= FORWARD MODAL ================= */}
//       {forwardModalOpen && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
//           <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
//             {/* Header */}
//             <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
//               <div className="flex items-center gap-2">
//                 <Forward className="w-5 h-5 text-emerald-600" />
//                 <h3 className="font-bold text-gray-900 text-base">Forward message</h3>
//               </div>
//               <button
//                 onClick={() => setForwardModalOpen(false)}
//                 className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-full transition-colors"
//               >
//                 <X className="w-5 h-5" />
//               </button>
//             </div>

//             {/* Message Preview */}
//             <div className="px-4 py-3 bg-[#f0f2f5] border-b border-gray-200/70 text-xs text-gray-600">
//               <span className="font-semibold text-gray-700">Preview ({messagesToForward.length} msg):</span>
//               <p className="mt-1 italic line-clamp-2 bg-white/80 p-2 rounded-lg border border-gray-200/80">
//                 {messagesToForward[0]?.content}
//                 {messagesToForward.length > 1 && ` (+${messagesToForward.length - 1} more)`}
//               </p>
//             </div>

//             {/* Search chats */}
//             <div className="p-3 border-b border-gray-100">
//               <div className="flex items-center bg-[#f0f2f5] rounded-xl px-3 py-1.5">
//                 <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
//                 <input
//                   type="text"
//                   placeholder="Search chat or contact..."
//                   value={forwardSearch}
//                   onChange={(e) => setForwardSearch(e.target.value)}
//                   className="w-full bg-transparent text-sm text-gray-800 focus:outline-none"
//                 />
//               </div>
//             </div>

//             {/* Chat List */}
//             <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2">
//               {forwardAvailableConversations.length === 0 ? (
//                 <div className="py-8 text-center text-xs text-gray-500">No active conversations found.</div>
//               ) : (
//                 forwardAvailableConversations.map((c) => {
//                   const isChecked = targetForwardConvIds.includes(c.id);
//                   const name = `${c.other_profile.first_name} ${c.other_profile.last_name || ''}`.trim();
//                   return (
//                     <div
//                       key={c.id}
//                       onClick={() => {
//                         setTargetForwardConvIds((prev) =>
//                           prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
//                         );
//                       }}
//                       className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
//                         isChecked ? 'bg-emerald-50' : 'hover:bg-gray-50'
//                       }`}
//                     >
//                       <div className="flex items-center gap-3 min-w-0">
//                         <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 border border-gray-100 flex-shrink-0">
//                           <ProtectedPhoto
//                             photoUrl={c.other_profile.photo_url}
//                             gender={c.other_profile.gender}
//                             altText={name}
//                             profileId={c.other_profile.profile_id}
//                             className="w-full h-full object-cover"
//                           />
//                         </div>
//                         <div className="min-w-0 truncate">
//                           <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
//                           <p className="text-xs text-gray-500 truncate">{c.other_profile.community || 'Member'}</p>
//                         </div>
//                       </div>
//                       <div
//                         className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors flex-shrink-0 ${
//                           isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 bg-white'
//                         }`}
//                       >
//                         {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
//                       </div>
//                     </div>
//                   );
//                 })
//               )}
//             </div>

//             {/* Footer */}
//             <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
//               <span className="text-xs text-gray-500">
//                 {targetForwardConvIds.length} recipient{targetForwardConvIds.length !== 1 ? 's' : ''} selected
//               </span>
//               <div className="flex items-center gap-2">
//                 <button
//                   type="button"
//                   onClick={() => setForwardModalOpen(false)}
//                   className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200/70 rounded-lg transition-colors"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="button"
//                   onClick={handleExecuteForward}
//                   disabled={targetForwardConvIds.length === 0 || isForwarding}
//                   className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
//                 >
//                   <Send className="w-3.5 h-3.5" />
//                   <span>{isForwarding ? 'Forwarding...' : 'Forward'}</span>
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* MAIN CONTAINER */}
//       <div className="flex-1 min-h-0 min-w-0 w-full max-w-[1920px] 2xl:max-w-[2400px] mx-auto p-0 sm:p-2 lg:p-4 flex overflow-hidden">
//         <div className="w-full h-full min-w-0 bg-white sm:rounded-2xl shadow-xl border-0 sm:border border-gray-200/90 flex overflow-hidden">
//           {/* ================= LEFT: CONVERSATION LIST ================= */}
//           <aside
//             className={`${
//               showChatOnMobile ? 'hidden md:flex' : 'flex'
//             } w-full md:w-[320px] lg:w-[370px] xl:w-[410px] 2xl:w-[460px] md:flex-shrink-0 min-w-0 min-h-0 border-r border-[#e9edef] flex-col bg-white`}
//           >
//             <div className="px-3 sm:px-4 py-3 bg-[#f0f2f5] flex items-center justify-between border-b border-[#e9edef] flex-shrink-0">
//               <div className="flex items-center gap-2 min-w-0">
//                 <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight truncate">Chats</h1>
//                 {totalUnreadCount > 0 && (
//                   <span className="px-2 py-0.5 bg-emerald-600 text-white text-xs font-semibold rounded-full">
//                     {totalUnreadCount}
//                   </span>
//                 )}
//               </div>

//               <div className="flex items-center gap-1 flex-shrink-0">
//                 <button
//                   onClick={fetchConversations}
//                   className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200/80 rounded-full transition-colors"
//                   title="Refresh chats"
//                 >
//                   <RefreshCw className={`w-5 h-5 ${isLoadingConvs ? 'animate-spin text-emerald-600' : ''}`} />
//                 </button>

//                 <div className="relative">
//                   <button
//                     onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
//                     className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200/80 rounded-full transition-colors"
//                     title="Menu"
//                   >
//                     <MoreVertical className="w-5 h-5" />
//                   </button>
//                   {headerMenuOpen && (
//                     <div className="absolute right-0 mt-1 w-48 max-w-[80vw] bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 text-sm">
//                       <button
//                         onClick={() => {
//                           setHeaderMenuOpen(false);
//                           navigate('/interests');
//                         }}
//                         className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
//                       >
//                         <User className="w-4 h-4 text-emerald-600" />
//                         Accepted Interests
//                       </button>
//                       <button
//                         onClick={() => {
//                           setHeaderMenuOpen(false);
//                           navigate('/subscription');
//                         }}
//                         className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
//                       >
//                         <ShieldCheck className="w-4 h-4 text-crimson-600" />
//                         Premium Plans
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>

//             <div className="p-2.5 bg-white border-b border-[#f0f2f5] flex-shrink-0">
//               <div className="relative flex items-center bg-[#f0f2f5] rounded-xl px-3 py-1.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/30 border border-transparent focus-within:border-emerald-500 transition-all">
//                 <Search className="w-4 h-4 text-gray-500 flex-shrink-0 mr-2.5" />
//                 <input
//                   type="text"
//                   placeholder="Search or start a new chat"
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                   className="w-full min-w-0 bg-transparent text-base sm:text-sm text-gray-800 placeholder-gray-500 focus:outline-none"
//                 />
//                 {searchQuery && (
//                   <button onClick={() => setSearchQuery('')} className="p-1 text-gray-400 hover:text-gray-600">
//                     <X className="w-3.5 h-3.5" />
//                   </button>
//                 )}
//               </div>
//             </div>

//             <div className={`px-3 py-2 flex items-center gap-2 bg-white border-b border-[#f0f2f5] overflow-x-auto text-xs flex-shrink-0 ${NO_SCROLLBAR}`}>
//               {(['all', 'unread', 'favourites'] as const).map((f) => (
//                 <button
//                   key={f}
//                   onClick={() => setActiveFilter(f)}
//                   className={`px-3 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 flex-shrink-0 ${
//                     activeFilter === f
//                       ? 'bg-emerald-100 text-emerald-800 font-semibold'
//                       : 'bg-[#f0f2f5] text-gray-600 hover:bg-gray-200'
//                   }`}
//                 >
//                   <span>{f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'Favourites'}</span>
//                   {f === 'unread' && totalUnreadCount > 0 && (
//                     <span className="min-w-4 h-4 px-1 text-[10px] bg-emerald-600 text-white rounded-full flex items-center justify-center">
//                       {totalUnreadCount}
//                     </span>
//                   )}
//                 </button>
//               ))}
//             </div>

//             <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden divide-y divide-[#f2f4f6]">
//               {isLoadingConvs ? (
//                 <div className="p-8 text-center space-y-3">
//                   <RefreshCw className="w-7 h-7 animate-spin text-emerald-600 mx-auto" />
//                   <p className="text-xs text-gray-500 font-medium">Loading chats...</p>
//                 </div>
//               ) : filteredConversations.length === 0 ? (
//                 <div className="p-8 text-center space-y-3">
//                   <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
//                     <MessageSquare className="w-7 h-7" />
//                   </div>
//                   <h3 className="text-sm font-bold text-gray-800">
//                     {searchQuery ? 'No chats found' : 'No Conversations Yet'}
//                   </h3>
//                   <p className="text-xs text-gray-500 max-w-xs mx-auto">
//                     {searchQuery
//                       ? 'Try searching with a different name.'
//                       : 'Connect with matched members through accepted interests or start direct conversations.'}
//                   </p>
//                   <button
//                     onClick={() => navigate('/matches')}
//                     className="inline-block text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline pt-2"
//                   >
//                     Browse Compatible Matches &rarr;
//                   </button>
//                 </div>
//               ) : (
//                 filteredConversations.map((c) => {
//                   const isActive = c.id === activeConvId;
//                   const name = `${c.other_profile.first_name} ${c.other_profile.last_name || ''}`.trim();
//                   const isFav = favouriteConvIds.includes(c.id);

//                   return (
//                     <div
//                       key={c.id}
//                       onClick={() => setActiveConvId(c.id)}
//                       className={`px-3 sm:px-3.5 py-3 flex items-center gap-3 cursor-pointer transition-colors relative group select-none ${
//                         isActive ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f8]'
//                       }`}
//                     >
//                       <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-200 border border-gray-100 shadow-2xs">
//                         <ProtectedPhoto
//                           photoUrl={c.other_profile.photo_url}
//                           gender={c.other_profile.gender}
//                           altText={name}
//                           profileId={c.other_profile.profile_id}
//                           className="w-full h-full object-cover"
//                         />
//                         {c.other_profile.is_online && (
//                           <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-2xs" />
//                         )}
//                       </div>

//                       <div className="flex-1 min-w-0">
//                         <div className="flex items-center justify-between gap-2 mb-0.5">
//                           <h4 className="text-sm font-semibold text-gray-900 truncate min-w-0">{name}</h4>
//                           <span
//                             className={`text-[11px] flex-shrink-0 ${
//                               c.unread_count > 0 ? 'text-emerald-600 font-semibold' : 'text-gray-400'
//                             }`}
//                           >
//                             {formatTimeSnippet(c.last_message_time || c.created_at)}
//                           </span>
//                         </div>

//                         <div className="flex items-center justify-between gap-2">
//                           <p
//                             className={`text-xs truncate min-w-0 flex-1 ${
//                               c.unread_count > 0 ? 'text-gray-900 font-semibold' : 'text-gray-500'
//                             }`}
//                           >
//                             {c.last_message ||
//                               `${c.other_profile.community || 'Matrimonial Match'} • ${c.other_profile.current_city || 'BorKonya'}`}
//                           </p>

//                           <div className="flex items-center gap-1 flex-shrink-0">
//                             {c.unread_count > 0 && (
//                               <span className="min-w-[18px] h-[18px] px-1 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
//                                 {c.unread_count}
//                               </span>
//                             )}
//                             {/* Always visible on touch, hover-only on desktop */}
//                             <button
//                               onClick={(e) => toggleFavourite(c.id, e)}
//                               className={`p-1 hover:text-amber-500 transition-colors ${
//                                 isFav ? 'text-amber-500' : 'text-gray-300 md:opacity-0 md:group-hover:opacity-100'
//                               }`}
//                               title={isFav ? 'Remove favourite' : 'Star chat'}
//                             >
//                               ★
//                             </button>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 })
//               )}
//             </div>
//           </aside>

//           {/* ================= RIGHT: CHAT WINDOW ================= */}
//           {activeConv ? (
//             <section className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#efeae2] relative overflow-hidden">
//               <div
//                 className="absolute inset-0 pointer-events-none opacity-[0.06] bg-repeat"
//                 style={{ backgroundImage: `radial-gradient(#000 1px, transparent 1px)`, backgroundSize: '20px 20px' }}
//               />

//               {/* Chat header or Multi-select Action Bar */}
//               {isSelectMode ? (
//                 <div className="px-3 sm:px-4 py-2.5 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between gap-2 z-20 shadow-xs flex-shrink-0 animate-in fade-in duration-100">
//                   <div className="flex items-center gap-3">
//                     <button
//                       onClick={() => {
//                         setIsSelectMode(false);
//                         setSelectedMessageIds([]);
//                       }}
//                       className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200/80 rounded-full transition-colors"
//                       title="Cancel selection"
//                     >
//                       <X className="w-5 h-5" />
//                     </button>
//                     <span className="text-sm font-bold text-gray-800">
//                       {selectedMessageIds.length} selected
//                     </span>
//                   </div>

//                   <div className="flex items-center gap-1.5">
//                     <button
//                       onClick={handleInitiateForwardMultiple}
//                       disabled={selectedMessageIds.length === 0}
//                       className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-200/80 rounded-full disabled:opacity-40 transition-colors flex items-center gap-1 text-xs font-semibold"
//                       title="Forward selected"
//                     >
//                       <Forward className="w-4 h-4 text-emerald-700" />
//                       <span className="hidden sm:inline">Forward</span>
//                     </button>

//                     <button
//                       onClick={handleExecuteBatchDelete}
//                       disabled={selectedMessageIds.length === 0}
//                       className="p-2 text-crimson-700 hover:text-crimson-800 hover:bg-rose-50 rounded-full disabled:opacity-40 transition-colors flex items-center gap-1 text-xs font-semibold"
//                       title="Delete selected"
//                     >
//                       <Trash2 className="w-4 h-4" />
//                       <span className="hidden sm:inline">Delete</span>
//                     </button>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="px-2 py-2 sm:px-4 sm:py-3 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between gap-2 z-20 shadow-2xs flex-shrink-0">
//                   <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
//                     <button
//                       onClick={() => setActiveConvId(null)}
//                       className="md:hidden p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200/80 rounded-full flex-shrink-0"
//                       title="Back to chats"
//                     >
//                       <ArrowLeft className="w-5 h-5" />
//                     </button>

//                     <div
//                       onClick={() => navigate(`/profile/${activeConv.other_profile.profile_id}`)}
//                       className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 cursor-pointer border border-gray-200 shadow-2xs"
//                     >
//                       <ProtectedPhoto
//                         photoUrl={activeConv.other_profile.photo_url}
//                         gender={activeConv.other_profile.gender}
//                         altText={`${activeConv.other_profile.first_name} ${activeConv.other_profile.last_name}`}
//                         profileId={activeConv.other_profile.profile_id}
//                         className="w-full h-full object-cover"
//                       />
//                       {activeConv.other_profile.is_online && (
//                         <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
//                       )}
//                     </div>

//                     <div
//                       onClick={() => navigate(`/profile/${activeConv.other_profile.profile_id}`)}
//                       className="min-w-0 flex-1 cursor-pointer"
//                     >
//                       <h2 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight truncate">
//                         {activeConv.other_profile.first_name} {activeConv.other_profile.last_name}
//                       </h2>
//                       <p className="text-[11px] sm:text-xs text-gray-500 truncate leading-tight mt-0.5">
//                         {activeConv.other_profile.is_online ? (
//                           <span className="text-emerald-700 font-medium">online</span>
//                         ) : (
//                           `last seen today • ${activeConv.other_profile.community || 'Member'}`
//                         )}
//                       </p>
//                     </div>
//                   </div>

//                   <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
//                     <button
//                       onClick={() => navigate(`/profile/${activeConv.other_profile.profile_id}`)}
//                       className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200/80 rounded-full transition-colors flex items-center gap-1 text-xs font-medium"
//                       title="View Member Profile"
//                     >
//                       <ExternalLink className="w-4 h-4 text-emerald-700" />
//                       <span className="hidden sm:inline text-gray-700">Profile</span>
//                     </button>

//                     <button
//                       onClick={() => setIsSelectMode(true)}
//                       className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200/80 rounded-full transition-colors flex items-center gap-1 text-xs font-medium"
//                       title="Select Messages"
//                     >
//                       <CheckSquare className="w-4 h-4 text-gray-600" />
//                       <span className="hidden sm:inline text-gray-700">Select</span>
//                     </button>

//                     <div className="relative">
//                       <button
//                         onClick={() => setChatMenuOpen(!chatMenuOpen)}
//                         className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200/80 rounded-full transition-colors"
//                         title="More options"
//                       >
//                         <MoreVertical className="w-5 h-5" />
//                       </button>
//                       {chatMenuOpen && (
//                         <div className="absolute right-0 mt-1 w-52 max-w-[80vw] bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 text-sm">
//                           <button
//                             onClick={() => {
//                               setChatMenuOpen(false);
//                               navigate(`/profile/${activeConv.other_profile.profile_id}`);
//                             }}
//                             className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
//                           >
//                             <User className="w-4 h-4" />
//                             View Full Profile
//                           </button>
//                           <button
//                             onClick={() => {
//                               setChatMenuOpen(false);
//                               setIsSelectMode(true);
//                             }}
//                             className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
//                           >
//                             <CheckSquare className="w-4 h-4" />
//                             Select Messages
//                           </button>
//                           <button
//                             onClick={() => {
//                               setChatMenuOpen(false);
//                               setReportModalData({
//                                 id: activeConv.other_profile.profile_id,
//                                 name: `${activeConv.other_profile.first_name} ${activeConv.other_profile.last_name}`,
//                               });
//                             }}
//                             className="w-full text-left px-4 py-2 hover:bg-gray-50 text-crimson-600 flex items-center gap-2"
//                           >
//                             <ShieldAlert className="w-4 h-4" />
//                             Report Profile
//                           </button>
//                           <button
//                             onClick={() => {
//                               setChatMenuOpen(false);
//                               handleBlockMember(
//                                 activeConv.other_profile.profile_id,
//                                 `${activeConv.other_profile.first_name} ${activeConv.other_profile.last_name}`
//                               );
//                             }}
//                             className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-800 flex items-center gap-2 border-t border-gray-100"
//                           >
//                             <Ban className="w-4 h-4" />
//                             Block User
//                           </button>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* Security notice */}
//               <div className="relative z-10 flex justify-center px-3 pt-2 flex-shrink-0">
//                 <span className="inline-block max-w-full px-3 py-1 bg-[#ffeecd]/90 border border-[#f5d990]/60 text-[#544320] text-[10px] sm:text-[11px] font-medium rounded-lg shadow-2xs text-center leading-snug">
//                   🔒 Messages are end-to-end encrypted & protected. Screenshots restricted.
//                 </span>
//               </div>

//               {errorBanner && (
//                 <div className="bg-amber-50 border-b border-amber-200 px-3 sm:px-4 py-2 text-xs text-amber-800 flex items-center justify-between gap-2 z-10 flex-shrink-0">
//                   <div className="flex items-center gap-2 min-w-0">
//                     <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
//                     <span className="break-words min-w-0">{errorBanner}</span>
//                   </div>
//                   <button onClick={() => setErrorBanner(null)} className="text-amber-800 font-bold hover:underline flex-shrink-0">
//                     Dismiss
//                   </button>
//                 </div>
//               )}

//               {/* ================= FLOATING ACTION POPUP (REFERENCE UI) ================= */}
//               {actionMenuMsg && (
//                 <div
//                   ref={actionMenuRef}
//                   style={{
//                     position: 'fixed',
//                     top: actionMenuMsg.position.top,
//                     left: actionMenuMsg.position.left,
//                     right: actionMenuMsg.position.right,
//                     zIndex: 9999,
//                   }}
//                   className="w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/90 py-1.5 animate-in fade-in zoom-in-95 duration-100 select-none"
//                 >
//                   {/* Top Emoji Reaction Bar */}
//                   <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between gap-1 bg-gray-50/60 rounded-t-2xl">
//                     {REACTION_EMOJIS.map((emoji) => (
//                       <button
//                         key={emoji}
//                         onClick={() => handleReactToMessage(actionMenuMsg.msg.id, emoji)}
//                         className="text-lg p-1 hover:scale-125 transition-transform active:scale-95"
//                       >
//                         {emoji}
//                       </button>
//                     ))}
//                     <button
//                       onClick={() => handleReactToMessage(actionMenuMsg.msg.id, '❤️')}
//                       className="p-1 text-gray-400 hover:text-gray-700"
//                     >
//                       <Plus className="w-4 h-4" />
//                     </button>
//                   </div>

//                   {/* Context Menu Action Items */}
//                   <div className="py-1 text-sm text-gray-700">
//                     <button
//                       onClick={() => handleInitiateReply(actionMenuMsg.msg)}
//                       className="w-full text-left px-3.5 py-2 hover:bg-gray-100/80 flex items-center gap-3 transition-colors"
//                     >
//                       <Reply className="w-4 h-4 text-gray-600" />
//                       <span>Reply</span>
//                     </button>

//                     <button
//                       onClick={() => handleCopyMessage(actionMenuMsg.msg)}
//                       className="w-full text-left px-3.5 py-2 hover:bg-gray-100/80 flex items-center gap-3 transition-colors"
//                     >
//                       <Copy className="w-4 h-4 text-gray-600" />
//                       <span>Copy</span>
//                     </button>

//                     <button
//                       onClick={() => handleInitiateForwardSingle(actionMenuMsg.msg)}
//                       className="w-full text-left px-3.5 py-2 hover:bg-gray-100/80 flex items-center gap-3 transition-colors"
//                     >
//                       <Forward className="w-4 h-4 text-gray-600" />
//                       <span>Forward</span>
//                     </button>

//                     <button
//                       onClick={() => {
//                         alert('Message pinned for quick reference.');
//                         setActionMenuMsg(null);
//                       }}
//                       className="w-full text-left px-3.5 py-2 hover:bg-gray-100/80 flex items-center gap-3 transition-colors"
//                     >
//                       <Pin className="w-4 h-4 text-gray-600" />
//                       <span>Pin</span>
//                     </button>

//                     <button
//                       onClick={() => {
//                         alert('AI Assistant insight: Respectful matrimonial message.');
//                         setActionMenuMsg(null);
//                       }}
//                       className="w-full text-left px-3.5 py-2 hover:bg-gray-100/80 flex items-center gap-3 transition-colors"
//                     >
//                       <Bot className="w-4 h-4 text-gray-600" />
//                       <span>Ask Meta AI</span>
//                     </button>

//                     <button
//                       onClick={() => {
//                         alert('Message starred.');
//                         setActionMenuMsg(null);
//                       }}
//                       className="w-full text-left px-3.5 py-2 hover:bg-gray-100/80 flex items-center gap-3 transition-colors"
//                     >
//                       <Star className="w-4 h-4 text-gray-600" />
//                       <span>Star</span>
//                     </button>

//                     <button
//                       onClick={() => {
//                         setIsSelectMode(true);
//                         setSelectedMessageIds([actionMenuMsg.msg.id]);
//                         setActionMenuMsg(null);
//                       }}
//                       className="w-full text-left px-3.5 py-2 hover:bg-gray-100/80 flex items-center gap-3 transition-colors border-t border-gray-100"
//                     >
//                       <CheckSquare className="w-4 h-4 text-gray-600" />
//                       <span>Select</span>
//                     </button>

//                     <button
//                       onClick={() => {
//                         setReportModalData({
//                           id: actionMenuMsg.msg.sender_profile_id,
//                           name: actionMenuMsg.msg.sender_name,
//                         });
//                         setActionMenuMsg(null);
//                       }}
//                       className="w-full text-left px-3.5 py-2 hover:bg-gray-100/80 flex items-center gap-3 transition-colors"
//                     >
//                       <ThumbsDown className="w-4 h-4 text-gray-600" />
//                       <span>Report</span>
//                     </button>

//                     {actionMenuMsg.msg.is_mine && (
//                       <button
//                         onClick={() => handleDeleteSingle(actionMenuMsg.msg)}
//                         className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-3 transition-colors border-t border-gray-100"
//                       >
//                         <Trash2 className="w-4 h-4" />
//                         <span>Delete</span>
//                       </button>
//                     )}
//                   </div>
//                 </div>
//               )}

//               {/* Messages Container */}
//               <div
//                 ref={chatContainerRef}
//                 className="flex-1 min-h-0 px-3 py-3 sm:px-5 sm:py-4 overflow-y-auto overflow-x-hidden space-y-2.5 z-10"
//               >
//                 {isLoadingMessages ? (
//                   <div className="py-16 text-center text-xs text-gray-500 font-medium">
//                     <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
//                     Loading conversation...
//                   </div>
//                 ) : messages.length === 0 ? (
//                   <div className="py-12 text-center space-y-3">
//                     <div className="w-14 h-14 bg-white text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md border border-gray-100">
//                       <Sparkles className="w-7 h-7" />
//                     </div>
//                     <h3 className="text-base font-bold text-gray-800 font-serif">Start Matrimonial Dialogue</h3>
//                     <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed px-2">
//                       Send a respectful introductory greeting to {activeConv.other_profile.first_name} and their family.
//                     </p>
//                   </div>
//                 ) : (
//                   messages.map((m) => {
//                     const timeString = new Date(m.created_at).toLocaleTimeString([], {
//                       hour: '2-digit',
//                       minute: '2-digit',
//                       hour12: false,
//                     });
//                     const isSelected = selectedMessageIds.includes(m.id);
//                     const userReaction = reactions[m.id];

//                     return (
//                       <div
//                         key={m.id}
//                         id={`msg-${m.id}`}
//                         onClick={() => {
//                           if (isSelectMode) toggleSelectMessage(m.id);
//                         }}
//                         className={`flex w-full items-center gap-2 group transition-colors rounded-xl px-1 py-0.5 ${
//                           isSelected ? 'bg-emerald-100/60 ring-2 ring-emerald-500/50' : ''
//                         } ${m.is_mine ? 'justify-end' : 'justify-start'}`}
//                       >
//                         {/* Select checkbox if select mode */}
//                         {isSelectMode && (
//                           <div
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               toggleSelectMessage(m.id);
//                             }}
//                             className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-colors flex-shrink-0 ${
//                               isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 bg-white'
//                             }`}
//                           >
//                             {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
//                           </div>
//                         )}

//                         <div
//                           className={`relative min-w-0 max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] 2xl:max-w-[55%] rounded-2xl px-3 py-2 shadow-xs text-sm select-text ${
//                             m.is_mine
//                               ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-xs'
//                               : 'bg-white text-gray-900 rounded-tl-xs border border-gray-100'
//                           }`}
//                         >
//                           {/* Forwarded Header Indicator */}
//                           {m.is_forwarded && (
//                             <div className="flex items-center gap-1 text-[11px] text-gray-500 italic mb-1">
//                               <Forward className="w-3 h-3 text-gray-400" />
//                               <span>Forwarded</span>
//                             </div>
//                           )}

//                           {/* Replied-To Quote Box */}
//                           {m.reply_to && (
//                             <div
//                               onClick={() => {
//                                 const targetEl = document.getElementById(`msg-${m.reply_to?.id}`);
//                                 if (targetEl) {
//                                   targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
//                                   targetEl.classList.add('ring-2', 'ring-emerald-400');
//                                   setTimeout(() => targetEl.classList.remove('ring-2', 'ring-emerald-400'), 1500);
//                                 }
//                               }}
//                               className="mb-1.5 rounded-lg border-l-4 border-emerald-600 bg-black/5 p-2 text-xs cursor-pointer hover:bg-black/10 transition-colors"
//                             >
//                               <p className="font-semibold text-emerald-800 text-[11px] truncate">
//                                 {m.reply_to.sender_name}
//                               </p>
//                               <p className="text-gray-600 text-[11px] line-clamp-1 italic">
//                                 {m.reply_to.content}
//                               </p>
//                             </div>
//                           )}

//                           {/* Message Content */}
//                           <p className="whitespace-pre-wrap leading-relaxed text-[14px] text-gray-800 [overflow-wrap:anywhere]">
//                             {m.content}
//                           </p>

//                           {/* Time & Read Receipts */}
//                           <div className="flex items-center justify-end gap-1 mt-1 select-none">
//                             <span className="text-[10px] text-gray-500 font-normal">{timeString}</span>
//                             {m.is_mine &&
//                               (m.is_read ? (
//                                 <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
//                               ) : (
//                                 <Check className="w-3.5 h-3.5 text-gray-400" />
//                               ))}
//                           </div>

//                           {/* Reaction Badge */}
//                           {userReaction && (
//                             <div className="absolute -bottom-2.5 right-2 bg-white rounded-full px-1.5 py-0.5 shadow-sm border border-gray-200 text-xs flex items-center">
//                               <span>{userReaction}</span>
//                             </div>
//                           )}

//                           {/* Hover Trigger for Floating Context Menu (WhatsApp Web Style) */}
//                           {!isSelectMode && (
//                             <button
//                               onClick={(e) => handleOpenActionMenu(e, m)}
//                               className="absolute top-1.5 right-1.5 p-1 bg-white/80 hover:bg-white rounded-full shadow-xs text-gray-500 hover:text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
//                               title="Message actions"
//                             >
//                               <MoreVertical className="w-3.5 h-3.5" />
//                             </button>
//                           )}
//                         </div>
//                       </div>
//                     );
//                   })
//                 )}
//                 <div ref={messagesEndRef} />
//               </div>

//               {/* Quick Icebreakers */}
//               {canChat && !isBlocked && icebreakers.length > 0 && (
//                 <div
//                   className={`px-3 py-1.5 bg-[#f0f2f5]/95 border-t border-[#e9edef] flex items-center gap-2 overflow-x-auto z-10 flex-shrink-0 ${NO_SCROLLBAR}`}
//                 >
//                   <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1 whitespace-nowrap flex-shrink-0">
//                     <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
//                     Quick:
//                   </span>
//                   {icebreakers.map((prompt, idx) => (
//                     <button
//                       key={idx}
//                       onClick={() => handleSendMessage(prompt)}
//                       className="flex-shrink-0 px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-800 border border-gray-200 hover:border-emerald-300 rounded-full text-xs text-gray-700 whitespace-nowrap transition-colors shadow-2xs"
//                     >
//                       {prompt}
//                     </button>
//                   ))}
//                 </div>
//               )}

//               {isBlocked && (
//                 <div className="bg-[#ffeef0] border-t border-crimson-200 px-4 py-3 text-center text-xs text-crimson-800 flex items-center justify-center gap-2 z-10 flex-shrink-0">
//                   <Ban className="w-4 h-4 text-crimson-600 flex-shrink-0" />
//                   <span>Communication is disabled because this member has been blocked.</span>
//                 </div>
//               )}
//               {!canChat && !isBlocked && (
//                 <div className="bg-[#f0f7ff] border-t border-sky-200 px-3 sm:px-4 py-3 text-xs text-navy-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 z-10 flex-shrink-0">
//                   <div className="flex items-start sm:items-center gap-2 min-w-0">
//                     <AlertCircle className="w-4 h-4 text-sky-700 flex-shrink-0" />
//                     <span>Direct chat unlocks on accepted interest or BorKonya Premium membership.</span>
//                   </div>
//                   <button
//                     type="button"
//                     onClick={() => navigate('/subscription')}
//                     className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs flex-shrink-0 transition-colors shadow-xs"
//                   >
//                     Upgrade Now
//                   </button>
//                 </div>
//               )}

//               {/* Replied Message Preview Bar above composer */}
//               {replyingTo && (
//                 <div className="px-4 py-2 bg-gray-100 border-t border-[#e9edef] flex items-center justify-between gap-2 z-10 flex-shrink-0 animate-in slide-in-from-bottom-2 duration-100">
//                   <div className="border-l-4 border-emerald-600 pl-2.5 min-w-0">
//                     <p className="text-xs font-bold text-emerald-800">
//                       Replying to {replyingTo.is_mine ? 'yourself' : replyingTo.sender_name}
//                     </p>
//                     <p className="text-xs text-gray-600 truncate">{replyingTo.content}</p>
//                   </div>
//                   <button
//                     onClick={() => setReplyingTo(null)}
//                     className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
//                   >
//                     <X className="w-4 h-4" />
//                   </button>
//                 </div>
//               )}

//               {showEmojiPicker && (
//                 <div className="p-2 bg-white border-t border-gray-200 flex items-center gap-1 flex-wrap z-20 flex-shrink-0">
//                   {EMOJIS.map((emoji, index) => (
//                     <button
//                       key={index}
//                       type="button"
//                       onClick={() => {
//                         setInputText((prev) => prev + emoji);
//                         inputRef.current?.focus();
//                       }}
//                       className="text-lg p-1.5 hover:bg-gray-100 rounded-lg transition-transform active:scale-95"
//                     >
//                       {emoji}
//                     </button>
//                   ))}
//                 </div>
//               )}

//               {/* Input bar */}
//               <form
//                 onSubmit={(e) => {
//                   e.preventDefault();
//                   handleSendMessage();
//                 }}
//                 className="px-2 pt-2 sm:px-3 sm:pt-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-[#f0f2f5] border-t border-[#e9edef] flex items-center gap-1 sm:gap-2 z-10 flex-shrink-0"
//               >
//                 <button
//                   type="button"
//                   onClick={() => setShowEmojiPicker(!showEmojiPicker)}
//                   className={`p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200/80 rounded-full transition-colors flex-shrink-0 ${
//                     showEmojiPicker ? 'text-emerald-600 bg-gray-200' : ''
//                   }`}
//                   title="Insert emoji"
//                 >
//                   <Smile className="w-5 h-5" />
//                 </button>

//                 <button
//                   type="button"
//                   onClick={() => alert('Photo & document sharing is secured under BorKonya family privacy settings.')}
//                   className="hidden xs:flex sm:flex p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200/80 rounded-full transition-colors flex-shrink-0"
//                   title="Attach file"
//                 >
//                   <Paperclip className="w-5 h-5" />
//                 </button>

//                 <div className="flex-1 min-w-0 bg-white rounded-xl px-3 py-2 flex items-center border border-transparent focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all shadow-2xs">
//                   <input
//                     ref={inputRef}
//                     type="text"
//                     value={inputText}
//                     onChange={(e) => setInputText(e.target.value)}
//                     disabled={isBlocked || !canChat}
//                     placeholder={
//                       isBlocked
//                         ? 'Messaging disabled (blocked member)'
//                         : !canChat
//                         ? 'Chat unlocks on accepted interest or Premium'
//                         : 'Type a message'
//                     }
//                     className="w-full min-w-0 text-base sm:text-sm text-gray-800 placeholder-gray-500 focus:outline-none disabled:bg-transparent disabled:cursor-not-allowed truncate"
//                   />
//                 </div>

//                 <button
//                   type="submit"
//                   disabled={!inputText.trim() || isSending || isBlocked || !canChat}
//                   className={`p-2.5 rounded-full shadow-sm transition-all flex items-center justify-center flex-shrink-0 ${
//                     inputText.trim() && !isBlocked && canChat
//                       ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
//                       : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
//                   }`}
//                   title="Send message"
//                 >
//                   <Send className="w-4 h-4 ml-0.5" />
//                 </button>
//               </form>
//             </section>
//           ) : (
//             <div className="hidden md:flex flex-1 min-w-0 flex-col items-center justify-center bg-[#f0f2f5] p-8 text-center border-b-[6px] border-emerald-600">
//               <div className="max-w-md space-y-4">
//                 <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm border border-emerald-100">
//                   <MessageSquare className="w-10 h-10" />
//                 </div>
//                 <h2 className="text-xl lg:text-2xl font-bold text-gray-800 tracking-tight">BorKonya Family Messenger</h2>
//                 <p className="text-sm text-gray-500 leading-relaxed">
//                   Send and receive messages with prospective brides, grooms, and their verified families in real time.
//                 </p>
//                 <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-gray-400">
//                   <ShieldCheck className="w-4 h-4 text-emerald-600" />
//                   <span>End-to-end encrypted matrimonial privacy</span>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };


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
  Pin,
  Bot,
  Star,
  CheckSquare,
  Trash2,
  ThumbsDown,
  Plus,
  CalendarDays,
} from 'lucide-react';
import {
  getConversations,
  getMessages,
  sendMessage,
  forwardMessages,
  deleteMessage,
  batchDeleteMessages,
  blockProfile,
  markConversationRead,
  getBlockedProfiles,
} from '../lib/interactionApi';
import type { ConversationSummary, MessageItem } from '../lib/interactionApi';
import { supabase } from '../lib/supabase';
import { ProtectedPhoto } from '../components/security/ProtectedPhoto';
import { ScreenCaptureProtection } from '../components/security/ScreenCaptureProtection';
import { ReportProfileModal } from '../components/safety/ReportProfileModal';
import { Header } from '../components/common/Header';
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal';
import { masterDataApi } from '../lib/masterDataApi';

/*
  THEME (from reference design)
  primary red   #d9001b   (hover #b80018)
  soft red tint #fdecee
  navy text     #0b2a5b
  muted text    #6b7a99
  page bg       #f6f7fb
*/

// Horizontal scroller without visible scrollbar
const NO_SCROLLBAR = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

// Round soft-red icon button used in headers
const ROUND_BTN =
  'p-2.5 rounded-full bg-[#fdecee] text-[#d9001b] hover:bg-[#fbd5d9] transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold flex-shrink-0';

export const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const [langModalOpen, setLangModalOpen] = useState(false);
  const wsConnectedRef = useRef(false);
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const [blockedProfileIds, setBlockedProfileIds] = useState<string[]>([]);

  // Close message action popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenuMsg(null);
      }
    };
    if (actionMenuMsg) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [actionMenuMsg]);

  const toggleFavourite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const fetchConversations = async () => {
    setIsLoadingConvs(true);
    try {
      const convs = await getConversations();
      setConversations(convs);
      if (!activeConvId && convs.length > 0 && window.innerWidth >= 768) {
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
    masterDataApi
      .getIcebreakers()
      .then(setIcebreakers)
      .catch(() => {
        setIcebreakers([
          'নমস্কার! আপনার প্রোফাইল দেখে ভালো লাগলো।',
          'Hello! Would love to know more about you.',
          'আশা করি আপনি ভালো আছেন!',
        ]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          setTimeout(scrollToBottom, 100);
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
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${activeConvId}`,
          },
          () => fetchChatMessages(true)
        )
        .subscribe((status: string) => {
          wsConnectedRef.current = status === 'SUBSCRIBED';
        });
    } catch (e) {
      console.warn('Realtime channel error:', e);
    }

    // Fallback polling only while realtime is not connected
    const pollInterval = setInterval(() => {
      if (!wsConnectedRef.current) fetchChatMessages(true);
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [activeConvId]);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const isBlocked = activeConv ? blockedProfileIds.includes(activeConv.other_profile.profile_id) : false;
  const canChat = activeConv ? activeConv.can_chat !== false : true;

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

  // Delete message
  const handleDeleteSingle = async (msg: MessageItem) => {
    if (!activeConvId) return;
    if (!msg.is_mine) {
      alert('You can only delete your own sent messages.');
      setActionMenuMsg(null);
      return;
    }
    if (!window.confirm('Delete this message?')) return;
    try {
      await deleteMessage(activeConvId, msg.id);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      setActionMenuMsg(null);
      fetchConversations();
    } catch (err: any) {
      alert(err.message || 'Failed to delete message');
    }
  };

  // Bulk Delete
  const handleExecuteBatchDelete = async () => {
    if (selectedMessageIds.length === 0) return;
    // Check if user owns all selected messages
    const mySelected = messages.filter((m) => selectedMessageIds.includes(m.id) && m.is_mine);
    if (mySelected.length === 0) {
      alert('You can only delete your own sent messages.');
      return;
    }
    if (
      !window.confirm(
        `Delete ${mySelected.length} message(s)?${
          mySelected.length < selectedMessageIds.length ? ' (Only your sent messages can be deleted)' : ''
        }`
      )
    )
      return;

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

  const handleOpenActionMenu = (e: React.MouseEvent, msg: MessageItem) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isMine = msg.is_mine;

    // Position relative to viewport or anchor
    setActionMenuMsg({
      msg,
      position: {
        top: Math.max(10, rect.top - 120),
        right: isMine ? Math.max(16, window.innerWidth - rect.right) : undefined,
        left: !isMine ? Math.max(16, rect.left) : undefined,
        isMine,
      },
    });
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

  const formatTimeSnippet = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
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
  const formatDateChip = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const full = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    if (date.toDateString() === now.toDateString()) return `Today, ${full}`;
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${full}`;
    return full;
  };

  const EMOJIS = ['🙏', '😊', '💐', '❤️', '👍', '🌺', '✨', '🤝', 'শুভকামনা'];
  const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // Mobile: show either list OR chat. Desktop (md+): show both.
  const showChatOnMobile = !!activeConvId;

  return (
    <div className="h-[100dvh] w-full max-w-full flex flex-col bg-[#f6f7fb] overflow-hidden">
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

      {/* ================= FORWARD MODAL ================= */}
      {forwardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b2a5b]/40 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-[#f3e3e5] flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-[#f3e3e5] flex items-center justify-between bg-[#fdf6f7]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#fdecee] flex items-center justify-center">
                  <Forward className="w-4 h-4 text-[#d9001b]" />
                </div>
                <h3 className="font-bold text-[#0b2a5b] text-base">Forward message</h3>
              </div>
              <button
                onClick={() => setForwardModalOpen(false)}
                className="p-1.5 text-[#6b7a99] hover:text-[#d9001b] hover:bg-[#fdecee] rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Message Preview */}
            <div className="px-4 py-3 bg-[#f6f7fb] border-b border-[#eceff6] text-xs text-[#6b7a99]">
              <span className="font-semibold text-[#0b2a5b]">Preview ({messagesToForward.length} msg):</span>
              <p className="mt-1 italic line-clamp-2 bg-white p-2 rounded-xl border border-[#eceff6]">
                {messagesToForward[0]?.content}
                {messagesToForward.length > 1 && ` (+${messagesToForward.length - 1} more)`}
              </p>
            </div>

            {/* Search chats */}
            <div className="p-3 border-b border-[#f3f4f8]">
              <div className="flex items-center bg-[#f0f2f8] rounded-full px-4 py-2">
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
            <div className="flex-1 overflow-y-auto divide-y divide-[#f3f4f8] p-2">
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
                        isChecked ? 'bg-[#fdecee]' : 'hover:bg-[#f6f7fb]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 border border-white shadow-sm flex-shrink-0">
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
                          isChecked ? 'bg-[#d9001b] border-[#d9001b] text-white' : 'border-[#cfd6e6] bg-white'
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
            <div className="p-3 border-t border-[#f3e3e5] bg-[#fdf6f7] flex items-center justify-between">
              <span className="text-xs text-[#6b7a99]">
                {targetForwardConvIds.length} recipient{targetForwardConvIds.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForwardModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-[#0b2a5b] hover:bg-[#fdecee] rounded-full transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteForward}
                  disabled={targetForwardConvIds.length === 0 || isForwarding}
                  className="px-5 py-1.5 bg-[#d9001b] hover:bg-[#b80018] disabled:opacity-50 text-white font-semibold text-xs rounded-full transition-colors flex items-center gap-1.5 shadow-md shadow-[#d9001b]/25"
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
        <div className="w-full h-full min-w-0 bg-white sm:rounded-3xl shadow-xl shadow-[#0b2a5b]/5 border-0 sm:border border-[#eceff6] flex overflow-hidden">
          {/* ================= LEFT: CONVERSATION LIST ================= */}
          <aside
            className={`${
              showChatOnMobile ? 'hidden md:flex' : 'flex'
            } w-full md:w-[320px] lg:w-[370px] xl:w-[410px] 2xl:w-[460px] md:flex-shrink-0 min-w-0 min-h-0 border-r border-[#eceff6] flex-col bg-white`}
          >
            <div className="px-4 py-4 bg-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-2xl font-extrabold text-[#0b2a5b] tracking-tight truncate">Chats</h1>
                {totalUnreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-[#d9001b] text-white text-xs font-bold rounded-full">
                    {totalUnreadCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={fetchConversations}
                  className="p-2 text-[#6b7a99] hover:text-[#d9001b] hover:bg-[#fdecee] rounded-full transition-colors"
                  title="Refresh chats"
                >
                  <RefreshCw className={`w-5 h-5 ${isLoadingConvs ? 'animate-spin text-[#d9001b]' : ''}`} />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
                    className="w-9 h-9 rounded-xl bg-[#d9001b] hover:bg-[#b80018] text-white flex items-center justify-center shadow-md shadow-[#d9001b]/30 transition-colors"
                    title="Menu"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {headerMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 max-w-[80vw] bg-white rounded-2xl shadow-xl border border-[#eceff6] py-1.5 z-50 text-sm">
                      <button
                        onClick={() => {
                          setHeaderMenuOpen(false);
                          navigate('/interests');
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#fdf6f7] text-[#0b2a5b] flex items-center gap-2"
                      >
                        <User className="w-4 h-4 text-[#d9001b]" />
                        Accepted Interests
                      </button>
                      <button
                        onClick={() => {
                          setHeaderMenuOpen(false);
                          navigate('/subscription');
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#fdf6f7] text-[#0b2a5b] flex items-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#d9001b]" />
                        Premium Plans
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="px-3 pb-2 bg-white flex-shrink-0">
              <div className="relative flex items-center bg-[#f0f2f8] rounded-full px-4 py-2.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#d9001b]/20 border border-transparent focus-within:border-[#d9001b]/60 transition-all">
                <Search className="w-4 h-4 text-[#0b2a5b] flex-shrink-0 mr-2.5" />
                <input
                  type="text"
                  placeholder="Search or start a new chat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-w-0 bg-transparent text-base sm:text-sm text-[#0b2a5b] placeholder-[#8a96b0] focus:outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-1 text-[#8a96b0] hover:text-[#d9001b]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter pills */}
            <div className={`px-3 py-2 flex items-center gap-2 bg-white overflow-x-auto text-xs flex-shrink-0 ${NO_SCROLLBAR}`}>
              {(['all', 'unread', 'favourites'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                    activeFilter === f
                      ? 'bg-[#d9001b] text-white shadow-md shadow-[#d9001b]/25'
                      : 'bg-[#f0f2f8] text-[#0b2a5b] hover:bg-[#e4e8f3]'
                  }`}
                >
                  <span>{f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'Favourites'}</span>
                  {f === 'unread' && totalUnreadCount > 0 && (
                    <span
                      className={`min-w-4 h-4 px-1 text-[10px] rounded-full flex items-center justify-center font-bold ${
                        activeFilter === f ? 'bg-white text-[#d9001b]' : 'bg-[#d9001b] text-white'
                      }`}
                    >
                      {totalUnreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden divide-y divide-[#f1f3f8] mt-1">
              {isLoadingConvs ? (
                <div className="p-8 text-center space-y-3">
                  <RefreshCw className="w-7 h-7 animate-spin text-[#d9001b] mx-auto" />
                  <p className="text-xs text-[#6b7a99] font-medium">Loading chats...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-14 h-14 bg-[#fdecee] text-[#d9001b] rounded-full flex items-center justify-center mx-auto">
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
                    className="inline-block text-xs font-bold text-[#d9001b] hover:text-[#b80018] hover:underline pt-2"
                  >
                    Browse Compatible Matches &rarr;
                  </button>
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isActive = c.id === activeConvId;
                  const name = `${c.other_profile.first_name} ${c.other_profile.last_name || ''}`.trim();
                  const isFav = favouriteConvIds.includes(c.id);

                  return (
                    <div
                      key={c.id}
                      onClick={() => setActiveConvId(c.id)}
                      className={`px-3 sm:px-4 py-3.5 flex items-center gap-3 cursor-pointer transition-colors relative group select-none ${
                        isActive
                          ? 'bg-gradient-to-r from-[#fdecee] via-[#fef5f6] to-white'
                          : 'hover:bg-[#fdf8f9]'
                      }`}
                    >
                      <div className="relative w-12 h-12 flex-shrink-0">
                        <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-sm">
                          <ProtectedPhoto
                            photoUrl={c.other_profile.photo_url}
                            gender={c.other_profile.gender}
                            altText={name}
                            profileId={c.other_profile.profile_id}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {c.other_profile.is_online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h4 className="text-sm font-bold text-[#0b2a5b] truncate min-w-0">{name}</h4>
                          <span
                            className={`text-[11px] flex-shrink-0 ${
                              c.unread_count > 0 ? 'text-[#0b2a5b] font-semibold' : 'text-[#8a96b0]'
                            }`}
                          >
                            {formatTimeSnippet(c.last_message_time || c.created_at)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-xs truncate min-w-0 flex-1 ${
                              c.unread_count > 0 ? 'text-[#0b2a5b] font-semibold' : 'text-[#6b7a99]'
                            }`}
                          >
                            {c.last_message ||
                              `${c.other_profile.community || 'Matrimonial Match'} • ${c.other_profile.current_city || 'BorKonya'}`}
                          </p>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {c.unread_count > 0 && (
                              <span className="min-w-[20px] h-5 px-1.5 bg-[#d9001b] text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                                {c.unread_count}
                              </span>
                            )}
                            {/* Always visible on touch, hover-only on desktop */}
                            <button
                              onClick={(e) => toggleFavourite(c.id, e)}
                              className={`p-1 hover:text-amber-500 transition-colors ${
                                isFav ? 'text-amber-500' : 'text-[#cfd6e6] md:opacity-0 md:group-hover:opacity-100'
                              }`}
                              title={isFav ? 'Remove favourite' : 'Star chat'}
                            >
                              ★
                            </button>
                          </div>
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
            <section className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#f7f8fc] relative overflow-hidden">
              {/* Soft decorative red glow (top-right) + subtle tint (bottom-left) */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 100% 0%, rgba(217,0,27,0.10) 0%, transparent 28%), radial-gradient(circle at 0% 100%, rgba(217,0,27,0.06) 0%, transparent 30%)',
                }}
              />

              {/* Chat header or Multi-select Action Bar */}
              {isSelectMode ? (
                <div className="px-3 sm:px-4 py-3 bg-white border-b border-[#eceff6] flex items-center justify-between gap-2 z-20 shadow-sm flex-shrink-0 animate-in fade-in duration-100">
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
                    <span className="text-sm font-bold text-[#0b2a5b]">
                      {selectedMessageIds.length} selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleInitiateForwardMultiple}
                      disabled={selectedMessageIds.length === 0}
                      className={`${ROUND_BTN} px-3.5 disabled:opacity-40`}
                      title="Forward selected"
                    >
                      <Forward className="w-4 h-4" />
                      <span className="hidden sm:inline">Forward</span>
                    </button>

                    <button
                      onClick={handleExecuteBatchDelete}
                      disabled={selectedMessageIds.length === 0}
                      className="px-3.5 py-2.5 rounded-full bg-[#d9001b] text-white hover:bg-[#b80018] disabled:opacity-40 transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-md shadow-[#d9001b]/25"
                      title="Delete selected"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-2 py-2.5 sm:px-4 sm:py-3 bg-white border-b border-[#eceff6] flex items-center justify-between gap-2 z-20 shadow-sm flex-shrink-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => setActiveConvId(null)}
                      className="md:hidden p-2 text-[#0b2a5b] hover:text-[#d9001b] hover:bg-[#fdecee] rounded-full flex-shrink-0"
                      title="Back to chats"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div
                      onClick={() => navigate(`/profile/${activeConv.other_profile.profile_id}`)}
                      className="relative w-11 h-11 flex-shrink-0 cursor-pointer"
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
                      {activeConv.other_profile.is_online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                      )}
                    </div>

                    <div
                      onClick={() => navigate(`/profile/${activeConv.other_profile.profile_id}`)}
                      className="min-w-0 flex-1 cursor-pointer"
                    >
                      <h2 className="font-bold text-[#0b2a5b] text-sm sm:text-base leading-tight truncate">
                        {activeConv.other_profile.first_name} {activeConv.other_profile.last_name}
                      </h2>
                      <p className="text-[11px] sm:text-xs text-[#6b7a99] truncate leading-tight mt-0.5">
                        {activeConv.other_profile.is_online ? (
                          <span className="text-emerald-600 font-medium">Online</span>
                        ) : (
                          `last seen today • ${activeConv.other_profile.community || 'Member'}`
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={() => navigate(`/profile/${activeConv.other_profile.profile_id}`)}
                      className={`${ROUND_BTN} sm:px-4`}
                      title="View Member Profile"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="hidden sm:inline">Profile</span>
                    </button>

                    <button
                      onClick={() => setIsSelectMode(true)}
                      className={`${ROUND_BTN} sm:px-4`}
                      title="Select Messages"
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span className="hidden sm:inline">Select</span>
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setChatMenuOpen(!chatMenuOpen)}
                        className={ROUND_BTN}
                        title="More options"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      {chatMenuOpen && (
                        <div className="absolute right-0 mt-2 w-52 max-w-[80vw] bg-white rounded-2xl shadow-xl border border-[#eceff6] py-1.5 z-50 text-sm">
                          <button
                            onClick={() => {
                              setChatMenuOpen(false);
                              navigate(`/profile/${activeConv.other_profile.profile_id}`);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-[#fdf6f7] text-[#0b2a5b] flex items-center gap-2"
                          >
                            <User className="w-4 h-4" />
                            View Full Profile
                          </button>
                          <button
                            onClick={() => {
                              setChatMenuOpen(false);
                              setIsSelectMode(true);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-[#fdf6f7] text-[#0b2a5b] flex items-center gap-2"
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
                            className="w-full text-left px-4 py-2.5 hover:bg-[#fdf6f7] text-[#d9001b] flex items-center gap-2"
                          >
                            <ShieldAlert className="w-4 h-4" />
                            Report Profile
                          </button>
                          <button
                            onClick={() => {
                              setChatMenuOpen(false);
                              handleBlockMember(
                                activeConv.other_profile.profile_id,
                                `${activeConv.other_profile.first_name} ${activeConv.other_profile.last_name}`
                              );
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-[#fdf6f7] text-[#0b2a5b] flex items-center gap-2 border-t border-[#f1f3f8]"
                          >
                            <Ban className="w-4 h-4" />
                            Block User
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Security notice */}
              <div className="relative z-10 flex justify-center px-3 pt-2 flex-shrink-0">
                <span className="inline-block max-w-full px-3.5 py-1 bg-white/90 border border-[#f3c4ca] text-[#7a1020] text-[10px] sm:text-[11px] font-medium rounded-full shadow-sm text-center leading-snug">
                  🔒 Messages are end-to-end encrypted & protected. Screenshots restricted.
                </span>
              </div>

              {errorBanner && (
                <div className="bg-[#fff4f5] border-b border-[#f3c4ca] px-3 sm:px-4 py-2 text-xs text-[#9b0016] flex items-center justify-between gap-2 z-10 flex-shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#d9001b]" />
                    <span className="break-words min-w-0">{errorBanner}</span>
                  </div>
                  <button onClick={() => setErrorBanner(null)} className="text-[#9b0016] font-bold hover:underline flex-shrink-0">
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
                  className="w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-[#eceff6] py-1.5 animate-in fade-in zoom-in-95 duration-100 select-none"
                >
                  {/* Top Emoji Reaction Bar */}
                  <div className="px-3 py-2 border-b border-[#f1f3f8] flex items-center justify-between gap-1 bg-[#fdf6f7] rounded-t-2xl">
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
                      className="p-1 text-[#8a96b0] hover:text-[#d9001b]"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Context Menu Action Items */}
                  <div className="py-1 text-sm text-[#0b2a5b]">
                    <button
                      onClick={() => handleInitiateReply(actionMenuMsg.msg)}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#fdf6f7] flex items-center gap-3 transition-colors"
                    >
                      <Reply className="w-4 h-4 text-[#d9001b]" />
                      <span>Reply</span>
                    </button>

                    <button
                      onClick={() => handleCopyMessage(actionMenuMsg.msg)}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#fdf6f7] flex items-center gap-3 transition-colors"
                    >
                      <Copy className="w-4 h-4 text-[#d9001b]" />
                      <span>Copy</span>
                    </button>

                    <button
                      onClick={() => handleInitiateForwardSingle(actionMenuMsg.msg)}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#fdf6f7] flex items-center gap-3 transition-colors"
                    >
                      <Forward className="w-4 h-4 text-[#d9001b]" />
                      <span>Forward</span>
                    </button>

                    <button
                      onClick={() => {
                        alert('Message pinned for quick reference.');
                        setActionMenuMsg(null);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#fdf6f7] flex items-center gap-3 transition-colors"
                    >
                      <Pin className="w-4 h-4 text-[#d9001b]" />
                      <span>Pin</span>
                    </button>

                    <button
                      onClick={() => {
                        alert('AI Assistant insight: Respectful matrimonial message.');
                        setActionMenuMsg(null);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#fdf6f7] flex items-center gap-3 transition-colors"
                    >
                      <Bot className="w-4 h-4 text-[#d9001b]" />
                      <span>Ask Meta AI</span>
                    </button>

                    <button
                      onClick={() => {
                        alert('Message starred.');
                        setActionMenuMsg(null);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#fdf6f7] flex items-center gap-3 transition-colors"
                    >
                      <Star className="w-4 h-4 text-[#d9001b]" />
                      <span>Star</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsSelectMode(true);
                        setSelectedMessageIds([actionMenuMsg.msg.id]);
                        setActionMenuMsg(null);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#fdf6f7] flex items-center gap-3 transition-colors border-t border-[#f1f3f8]"
                    >
                      <CheckSquare className="w-4 h-4 text-[#d9001b]" />
                      <span>Select</span>
                    </button>

                    <button
                      onClick={() => {
                        setReportModalData({
                          id: actionMenuMsg.msg.sender_profile_id,
                          name: actionMenuMsg.msg.sender_name,
                        });
                        setActionMenuMsg(null);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#fdf6f7] flex items-center gap-3 transition-colors"
                    >
                      <ThumbsDown className="w-4 h-4 text-[#d9001b]" />
                      <span>Report</span>
                    </button>

                    {actionMenuMsg.msg.is_mine && (
                      <button
                        onClick={() => handleDeleteSingle(actionMenuMsg.msg)}
                        className="w-full text-left px-3.5 py-2 hover:bg-[#fff0f1] text-[#d9001b] flex items-center gap-3 transition-colors border-t border-[#f1f3f8]"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Messages Container */}
              <div
                ref={chatContainerRef}
                className="flex-1 min-h-0 px-3 py-3 sm:px-6 sm:py-4 overflow-y-auto overflow-x-hidden space-y-3 z-10"
              >
                {isLoadingMessages ? (
                  <div className="py-16 text-center text-xs text-[#6b7a99] font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#d9001b] mx-auto mb-2" />
                    Loading conversation...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-14 h-14 bg-white text-[#d9001b] rounded-full flex items-center justify-center mx-auto shadow-md border border-[#fbd5d9]">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-[#0b2a5b] font-serif">Start Matrimonial Dialogue</h3>
                    <p className="text-xs text-[#6b7a99] max-w-sm mx-auto leading-relaxed px-2">
                      Send a respectful introductory greeting to {activeConv.other_profile.first_name} and their family.
                    </p>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const timeString = new Date(m.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    });
                    const isSelected = selectedMessageIds.includes(m.id);
                    const userReaction = reactions[m.id];
                    const prev = idx > 0 ? messages[idx - 1] : null;
                    const showDateChip =
                      !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();

                    return (
                      <React.Fragment key={m.id}>
                        {showDateChip && (
                          <div className="flex justify-center py-1">
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#e9edf7] text-[#0b2a5b] text-xs font-semibold rounded-full">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {formatDateChip(m.created_at)}
                            </span>
                          </div>
                        )}

                        <div
                          id={`msg-${m.id}`}
                          onClick={() => {
                            if (isSelectMode) toggleSelectMessage(m.id);
                          }}
                          className={`flex w-full items-end gap-2 group transition-colors rounded-2xl px-1 py-0.5 ${
                            isSelected ? 'bg-[#fdecee] ring-2 ring-[#d9001b]/40' : ''
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
                                isSelected ? 'bg-[#d9001b] border-[#d9001b] text-white' : 'border-[#cfd6e6] bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          )}

                          {/* Other person's avatar (left) */}
                          {!m.is_mine && (
                            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0 mb-0.5">
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
                            className={`relative min-w-0 max-w-[80%] sm:max-w-[70%] lg:max-w-[60%] 2xl:max-w-[50%] rounded-2xl px-3.5 py-2.5 shadow-sm text-sm select-text ${
                              m.is_mine
                                ? 'bg-[#d9001b] text-white rounded-br-md shadow-[#d9001b]/20'
                                : 'bg-white text-[#0b2a5b] rounded-bl-md border border-[#eceff6]'
                            }`}
                          >
                            {/* Forwarded Header Indicator */}
                            {m.is_forwarded && (
                              <div
                                className={`flex items-center gap-1 text-[11px] italic mb-1 ${
                                  m.is_mine ? 'text-white/80' : 'text-[#6b7a99]'
                                }`}
                              >
                                <Forward className="w-3 h-3" />
                                <span>Forwarded</span>
                              </div>
                            )}

                            {/* Replied-To Quote Box */}
                            {m.reply_to && (
                              <div
                                onClick={() => {
                                  const targetEl = document.getElementById(`msg-${m.reply_to?.id}`);
                                  if (targetEl) {
                                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    targetEl.classList.add('ring-2', 'ring-[#d9001b]');
                                    setTimeout(() => targetEl.classList.remove('ring-2', 'ring-[#d9001b]'), 1500);
                                  }
                                }}
                                className={`mb-1.5 rounded-xl border-l-4 p-2 text-xs cursor-pointer transition-colors ${
                                  m.is_mine
                                    ? 'border-white/70 bg-black/15 hover:bg-black/20'
                                    : 'border-[#d9001b] bg-[#fdf6f7] hover:bg-[#fdecee]'
                                }`}
                              >
                                <p
                                  className={`font-semibold text-[11px] truncate ${
                                    m.is_mine ? 'text-white' : 'text-[#d9001b]'
                                  }`}
                                >
                                  {m.reply_to.sender_name}
                                </p>
                                <p
                                  className={`text-[11px] line-clamp-1 italic ${
                                    m.is_mine ? 'text-white/85' : 'text-[#6b7a99]'
                                  }`}
                                >
                                  {m.reply_to.content}
                                </p>
                              </div>
                            )}

                            {/* Message Content */}
                            <p className="whitespace-pre-wrap leading-relaxed text-[14px] [overflow-wrap:anywhere]">
                              {m.content}
                            </p>

                            {/* Time & Read Receipts */}
                            <div className="flex items-center justify-end gap-1 mt-1 select-none">
                              <span
                                className={`text-[10px] font-normal ${
                                  m.is_mine ? 'text-white/75' : 'text-[#8a96b0]'
                                }`}
                              >
                                {timeString}
                              </span>
                              {m.is_mine &&
                                (m.is_read ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-white" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-white/70" />
                                ))}
                            </div>

                            {/* Reaction Badge */}
                            {userReaction && (
                              <div className="absolute -bottom-2.5 right-2 bg-white rounded-full px-1.5 py-0.5 shadow-md border border-[#eceff6] text-xs flex items-center">
                                <span>{userReaction}</span>
                              </div>
                            )}

                            {/* Hover Trigger for Floating Context Menu */}
                            {!isSelectMode && (
                              <button
                                onClick={(e) => handleOpenActionMenu(e, m)}
                                className="absolute top-1.5 right-1.5 p-1 bg-white/90 hover:bg-white rounded-full shadow-sm text-[#6b7a99] hover:text-[#d9001b] opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Message actions"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* My avatar (right) */}
                          {m.is_mine && (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-200 to-sky-400 border-2 border-white shadow-sm flex items-center justify-center flex-shrink-0 mb-0.5">
                              <User className="w-5 h-5 text-white" />
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Icebreakers */}
              {canChat && !isBlocked && icebreakers.length > 0 && (
                <div
                  className={`px-3 py-2 bg-white/80 border-t border-[#eceff6] flex items-center gap-2 overflow-x-auto z-10 flex-shrink-0 ${NO_SCROLLBAR}`}
                >
                  <span className="text-[11px] font-semibold text-[#6b7a99] flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-[#d9001b]" />
                    Quick:
                  </span>
                  {icebreakers.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="flex-shrink-0 px-3 py-1 bg-white hover:bg-[#fdecee] hover:text-[#d9001b] border border-[#e3e8f3] hover:border-[#f3b3ba] rounded-full text-xs text-[#0b2a5b] whitespace-nowrap transition-colors shadow-sm"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {isBlocked && (
                <div className="bg-[#fff0f1] border-t border-[#f3c4ca] px-4 py-3 text-center text-xs text-[#9b0016] flex items-center justify-center gap-2 z-10 flex-shrink-0">
                  <Ban className="w-4 h-4 text-[#d9001b] flex-shrink-0" />
                  <span>Communication is disabled because this member has been blocked.</span>
                </div>
              )}
              {!canChat && !isBlocked && (
                <div className="bg-[#f3f6fd] border-t border-[#dbe3f5] px-3 sm:px-4 py-3 text-xs text-[#0b2a5b] flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 z-10 flex-shrink-0">
                  <div className="flex items-start sm:items-center gap-2 min-w-0">
                    <AlertCircle className="w-4 h-4 text-[#d9001b] flex-shrink-0" />
                    <span>Direct chat unlocks on accepted interest or BorKonya Premium membership.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/subscription')}
                    className="px-4 py-1.5 bg-[#d9001b] hover:bg-[#b80018] text-white font-semibold rounded-full text-xs flex-shrink-0 transition-colors shadow-md shadow-[#d9001b]/25"
                  >
                    Upgrade Now
                  </button>
                </div>
              )}

              {/* Replied Message Preview Bar above composer */}
              {replyingTo && (
                <div className="px-4 py-2 bg-[#fdf6f7] border-t border-[#f3e3e5] flex items-center justify-between gap-2 z-10 flex-shrink-0 animate-in slide-in-from-bottom-2 duration-100">
                  <div className="border-l-4 border-[#d9001b] pl-2.5 min-w-0">
                    <p className="text-xs font-bold text-[#d9001b]">
                      Replying to {replyingTo.is_mine ? 'yourself' : replyingTo.sender_name}
                    </p>
                    <p className="text-xs text-[#6b7a99] truncate">{replyingTo.content}</p>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-1 text-[#8a96b0] hover:text-[#d9001b] rounded-full hover:bg-[#fdecee] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {showEmojiPicker && (
                <div className="p-2 bg-white border-t border-[#eceff6] flex items-center gap-1 flex-wrap z-20 flex-shrink-0">
                  {EMOJIS.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setInputText((prev) => prev + emoji);
                        inputRef.current?.focus();
                      }}
                      className="text-lg p-1.5 hover:bg-[#fdecee] rounded-xl transition-transform active:scale-95"
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
                className="px-2.5 pt-2.5 sm:px-4 sm:pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white border-t border-[#eceff6] flex items-center gap-1.5 sm:gap-2.5 z-10 flex-shrink-0"
              >
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                    showEmojiPicker
                      ? 'text-[#d9001b] bg-[#fdecee]'
                      : 'text-[#0b2a5b] hover:text-[#d9001b] hover:bg-[#fdecee]'
                  }`}
                  title="Insert emoji"
                >
                  <Smile className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={() => alert('Photo & document sharing is secured under BorKonya family privacy settings.')}
                  className="hidden xs:flex sm:flex p-2 text-[#0b2a5b] hover:text-[#d9001b] hover:bg-[#fdecee] rounded-full transition-colors flex-shrink-0"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <div className="flex-1 min-w-0 bg-white rounded-full px-4 py-2.5 flex items-center border border-[#f3b3ba] focus-within:border-[#d9001b] focus-within:ring-2 focus-within:ring-[#d9001b]/15 transition-all">
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
                    className="w-full min-w-0 text-base sm:text-sm text-[#0b2a5b] placeholder-[#8a96b0] focus:outline-none disabled:bg-transparent disabled:cursor-not-allowed truncate"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending || isBlocked || !canChat}
                  className={`w-11 h-11 rounded-full transition-all flex items-center justify-center flex-shrink-0 ${
                    inputText.trim() && !isBlocked && canChat
                      ? 'bg-[#d9001b] hover:bg-[#b80018] text-white shadow-lg shadow-[#d9001b]/30'
                      : 'bg-[#e4e8f3] text-[#a3adc4] cursor-not-allowed'
                  }`}
                  title="Send message"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </section>
          ) : (
            <div className="hidden md:flex flex-1 min-w-0 flex-col items-center justify-center bg-[#f7f8fc] p-8 text-center border-b-[6px] border-[#d9001b]">
              <div className="max-w-md space-y-4">
                <div className="w-20 h-20 rounded-full bg-[#fdecee] text-[#d9001b] flex items-center justify-center mx-auto shadow-sm border border-[#fbd5d9]">
                  <MessageSquare className="w-10 h-10" />
                </div>
                <h2 className="text-xl lg:text-2xl font-extrabold text-[#0b2a5b] tracking-tight">BorKonya Family Messenger</h2>
                <p className="text-sm text-[#6b7a99] leading-relaxed">
                  Send and receive messages with prospective brides, grooms, and their verified families in real time.
                </p>
                <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-[#8a96b0]">
                  <ShieldCheck className="w-4 h-4 text-[#d9001b]" />
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