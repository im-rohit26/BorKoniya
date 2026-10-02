import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  MapPin,
  Briefcase,
  GraduationCap,
  Sparkles,
  RefreshCw,
  Ban,
} from 'lucide-react';
import {
  getReceivedInterests,
  getSentInterests,
  acceptInterest,
  declineInterest,
  cancelInterest,
  blockProfile,
  startOrGetConversation,
} from '../lib/interactionApi';
import type { InterestItem } from '../lib/interactionApi';
import { ProtectedPhoto } from '../components/security/ProtectedPhoto';
import { ScreenCaptureProtection } from '../components/security/ScreenCaptureProtection';
import { ReportProfileModal } from '../components/safety/ReportProfileModal';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal';

type TabType = 'RECEIVED' | 'SENT' | 'ACCEPTED' | 'DECLINED';

export const InterestsPage: React.FC = () => {
  const navigate = useNavigate();
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('RECEIVED');
  const [receivedList, setReceivedList] = useState<InterestItem[]>([]);
  const [sentList, setSentList] = useState<InterestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Safety Modal
  const [reportModalData, setReportModalData] = useState<{ id: string; name: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [received, sent] = await Promise.all([
        getReceivedInterests(),
        getSentInterests(),
      ]);
      setReceivedList(received);
      setSentList(sent);
    } catch (err) {
      console.error('Failed to load interests data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAccept = async (interestId: string, name: string) => {
    try {
      await acceptInterest(interestId);
      showToast(`Interest from ${name} accepted! You can now start chatting.`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to accept interest');
    }
  };

  const handleDecline = async (interestId: string) => {
    if (!window.confirm('Are you sure you want to decline this express interest?')) return;
    try {
      await declineInterest(interestId);
      showToast('Interest declined respectfully.');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to decline interest');
    }
  };

  const handleCancel = async (interestId: string) => {
    if (!window.confirm('Cancel this pending sent interest?')) return;
    try {
      await cancelInterest(interestId);
      showToast('Sent interest cancelled.');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel interest');
    }
  };

  const handleBlock = async (profileId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to block ${name}? They will no longer be able to contact you.`)) return;
    try {
      await blockProfile(profileId);
      showToast(`${name} has been blocked.`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to block profile');
    }
  };

  const handleStartMessage = async (profileId: string) => {
    try {
      const res = await startOrGetConversation(profileId);
      if (res?.conversation_id) {
        navigate(`/messages/${res.conversation_id}`);
      } else {
        navigate('/messages');
      }
    } catch (err: any) {
      alert(err.message || 'Unable to open conversation');
    }
  };

  // Filter lists based on tab
  const getDisplayedItems = () => {
    if (activeTab === 'RECEIVED') {
      return receivedList.filter((i) => i.status === 'SENT');
    }
    if (activeTab === 'SENT') {
      return sentList.filter((i) => i.status === 'SENT');
    }
    if (activeTab === 'ACCEPTED') {
      // Include accepted from either side
      const recAccepted = receivedList.filter((i) => i.status === 'ACCEPTED');
      const sentAccepted = sentList.filter((i) => i.status === 'ACCEPTED');
      return [...recAccepted, ...sentAccepted];
    }
    if (activeTab === 'DECLINED') {
      return receivedList.filter((i) => i.status === 'DECLINED' || i.status === 'CANCELLED');
    }
    return [];
  };

  const pendingReceivedCount = receivedList.filter((i) => i.status === 'SENT').length;
  const pendingSentCount = sentList.filter((i) => i.status === 'SENT').length;
  const acceptedCount =
    receivedList.filter((i) => i.status === 'ACCEPTED').length +
    sentList.filter((i) => i.status === 'ACCEPTED').length;

  const displayedItems = getDisplayedItems();

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbf9]">
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

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Report Modal */}
      {reportModalData && (
        <ReportProfileModal
          isOpen={!!reportModalData}
          onClose={() => setReportModalData(null)}
          profileId={reportModalData.id}
          profileName={reportModalData.name}
        />
      )}

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-12 w-full space-y-6">
        {/* Page Banner / Header */}
        <div className="bg-gradient-to-r from-crimson-800 via-crimson-700 to-navy-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-medium mb-2">
                <Heart className="w-3.5 h-3.5 fill-crimson-200 text-crimson-200" />
                <span>Express Interest Center</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold">
                Connect & Respond to Compatible Matches
              </h1>
              <p className="text-sm text-crimson-100 mt-1 max-w-xl">
                Express interest respectfully with verified Sadgope and Gowala community members. Mutual acceptance unlocks private in-app conversation.
              </p>
            </div>

            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 self-start md:self-auto px-4 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl text-sm font-medium transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Quick Counter Chips */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/20">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
              <span className="text-2xl font-bold">{pendingReceivedCount}</span>
              <p className="text-xs text-crimson-100">Pending Received</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
              <span className="text-2xl font-bold">{acceptedCount}</span>
              <p className="text-xs text-crimson-100">Mutual Connections</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
              <span className="text-2xl font-bold">{pendingSentCount}</span>
              <p className="text-xs text-crimson-100">Awaiting Response</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-white rounded-2xl p-1.5 shadow-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('RECEIVED')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'RECEIVED'
                ? 'bg-crimson-700 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Received Interests</span>
            {pendingReceivedCount > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'RECEIVED' ? 'bg-white text-crimson-700 font-bold' : 'bg-crimson-100 text-crimson-800 font-bold'
              }`}>
                {pendingReceivedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ACCEPTED')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'ACCEPTED'
                ? 'bg-crimson-700 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Connected & Accepted</span>
            {acceptedCount > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'ACCEPTED' ? 'bg-white text-crimson-700 font-bold' : 'bg-navy-100 text-navy-800 font-bold'
              }`}>
                {acceptedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('SENT')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'SENT'
                ? 'bg-crimson-700 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Sent Interests</span>
            {pendingSentCount > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'SENT' ? 'bg-white text-crimson-700 font-bold' : 'bg-gray-200 text-gray-700'
              }`}>
                {pendingSentCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('DECLINED')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'DECLINED'
                ? 'bg-crimson-700 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <XCircle className="w-4 h-4" />
            <span>Declined / Cancelled</span>
          </button>
        </div>

        {/* List Content */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-crimson-700 mx-auto" />
            <p className="text-sm text-gray-500 font-medium">Loading your matrimonial interests...</p>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/80 shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-full bg-crimson-50 text-crimson-700 flex items-center justify-center mx-auto">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-navy-950 font-serif">
              {activeTab === 'RECEIVED' && 'No Pending Interests Received'}
              {activeTab === 'SENT' && 'No Pending Sent Interests'}
              {activeTab === 'ACCEPTED' && 'No Mutual Connections Yet'}
              {activeTab === 'DECLINED' && 'No Declined Interests'}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              {activeTab === 'RECEIVED' && 'When verified members express interest in your profile, their requests will appear here for you to accept or decline.'}
              {activeTab === 'SENT' && 'Explore matches and express interest in profiles that align with your family traditions and preferences.'}
              {activeTab === 'ACCEPTED' && 'Once both parties accept interest, you will be able to message each other directly and view family contacts.'}
              {activeTab === 'DECLINED' && 'Any declined or cancelled requests are archived here.'}
            </p>
            <button
              onClick={() => navigate('/matches')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-crimson-700 hover:bg-crimson-800 text-white text-sm font-semibold rounded-xl shadow-md transition-all"
            >
              <span>Explore Verified Matches</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedItems.map((item) => {
              const p = item.profile;
              const formattedName = `${p.first_name} ${p.last_name || ''}`;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-5">
                    {/* Photo with dynamic protection & anti-screenshot watermark */}
                    <div className="w-28 h-36 sm:w-32 sm:h-40 flex-shrink-0 mx-auto sm:mx-0 rounded-2xl overflow-hidden shadow-inner border border-gray-200">
                      <ProtectedPhoto
                        photoUrl={p.photo_url}
                        altText={formattedName}
                        profileId={p.id}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Profile Details */}
                    <div className="flex-1 space-y-2.5 text-center sm:text-left">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <h3 className="text-lg font-bold text-navy-950 font-serif">{formattedName}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-crimson-50 text-crimson-700 text-xs font-semibold">
                          {p.age} yrs • {p.height_cm} cm
                        </span>
                        {item.status === 'ACCEPTED' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Connected
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 font-medium text-crimson-900">
                          <Sparkles className="w-3.5 h-3.5 text-crimson-700 flex-shrink-0" />
                          <span>{p.community} {p.sub_community ? `(${p.sub_community})` : ''}</span>
                        </div>
                        <div className="flex items-center justify-center sm:justify-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span>{p.current_city}, {p.current_state} {p.native_place ? `• Native: ${p.native_place}` : ''}</span>
                        </div>
                        <div className="flex items-center justify-center sm:justify-start gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span>{p.highest_qualification}</span>
                        </div>
                        <div className="flex items-center justify-center sm:justify-start gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span>{p.occupation} {p.company_name ? `at ${p.company_name}` : ''}</span>
                        </div>
                      </div>

                      {/* Contact Preview if Accepted */}
                      {item.status === 'ACCEPTED' && p.is_contact_revealed && (
                        <div className="mt-2 p-2 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-0.5">
                          <p className="font-semibold">Verified Family Contact:</p>
                          <p>Phone: {p.revealed_phone || p.contact_phone_masked}</p>
                          <p>Email: {p.revealed_email || p.contact_email_masked}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="bg-slate-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                    {/* Safety actions */}
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <button
                        onClick={() => setReportModalData({ id: p.id, name: formattedName })}
                        className="p-1.5 hover:text-crimson-700 hover:bg-crimson-50 rounded-lg transition-colors flex items-center gap-1"
                        title="Report this profile"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Report</span>
                      </button>
                      <button
                        onClick={() => handleBlock(p.id, formattedName)}
                        className="p-1.5 hover:text-navy-950 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1"
                        title="Block member"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Block</span>
                      </button>
                    </div>

                    {/* Primary Decisions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/profile/${p.id}`)}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-navy-950 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm"
                      >
                        Full Profile
                      </button>

                      {/* Received Pending */}
                      {activeTab === 'RECEIVED' && (
                        <>
                          <button
                            onClick={() => handleDecline(item.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-crimson-700 bg-white border border-gray-200 rounded-xl hover:bg-crimson-50"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleAccept(item.id, formattedName)}
                            className="px-4 py-1.5 text-xs font-semibold text-white bg-crimson-700 hover:bg-crimson-800 rounded-xl shadow-sm flex items-center gap-1.5"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Accept Interest
                          </button>
                        </>
                      )}

                      {/* Sent Pending */}
                      {activeTab === 'SENT' && (
                        <button
                          onClick={() => handleCancel(item.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-crimson-700 bg-white border border-gray-200 rounded-xl hover:bg-crimson-50"
                        >
                          Cancel Interest
                        </button>
                      )}

                      {/* Accepted */}
                      {item.status === 'ACCEPTED' && (
                        <button
                          onClick={() => handleStartMessage(p.id)}
                          className="px-4 py-1.5 text-xs font-semibold text-white bg-crimson-700 hover:bg-crimson-800 rounded-xl shadow-sm flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Message Member
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};
