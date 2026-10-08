import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  BookmarkX,
  Heart,
  Sparkles,
  MapPin,
  GraduationCap,
  Briefcase,
  ArrowRight,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import {
  getShortlist,
  removeFromShortlist,
  sendInterest,
  getSentInterestIds,
} from '../lib/interactionApi';
import type { ShortlistItem } from '../lib/interactionApi';
import { ProtectedPhoto } from '../components/security/ProtectedPhoto';
import { ScreenCaptureProtection } from '../components/security/ScreenCaptureProtection';
import { MatchScoreBadge } from '../components/cards/MatchScoreBadge';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';
import { LanguageSelectorModal } from '../components/common/LanguageSelectorModal';

export const ShortlistPage: React.FC = () => {
  const navigate = useNavigate();
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [shortlist, setShortlist] = useState<ShortlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sentInterests, setSentInterests] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [items, sentIds] = await Promise.all([
        getShortlist(),
        getSentInterestIds().catch(() => []),
      ]);
      setShortlist(items);
      setSentInterests(new Set(sentIds));
    } catch (err) {
      console.error('Failed to load shortlist:', err);
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

  const handleRemove = async (profileId: string, name: string) => {
    try {
      await removeFromShortlist(profileId);
      setShortlist((prev) => prev.filter((item) => item.target_profile_id !== profileId));
      showToast(`${name} removed from your shortlist.`);
    } catch (err: any) {
      alert(err.message || 'Failed to remove from shortlist');
    }
  };

  const handleSendInterest = async (profileId: string, name: string) => {
    try {
      await sendInterest(profileId);
      setSentInterests((prev) => new Set([...prev, profileId]));
      showToast(`Express Interest sent to ${name}!`);
    } catch (err: any) {
      alert(err.message || 'Failed to send interest');
    }
  };

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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 bg-emerald-700 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-12 w-full space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-crimson-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-navy-800">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-medium mb-2">
                <Bookmark className="w-3.5 h-3.5 fill-crimson-200 text-crimson-200" />
                <span>Saved & Shortlisted Profiles</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold">
                Your Saved Prospective Matches
              </h1>
              <p className="text-sm text-slate-200 mt-1 max-w-xl">
                Keep track of verified profiles you and your family are considering. Express interest or initiate conversation whenever you are ready.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-bold">
                {shortlist.length} Saved {shortlist.length === 1 ? 'Profile' : 'Profiles'}
              </span>
              <button
                onClick={loadData}
                className="p-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl transition-all"
                title="Refresh shortlist"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* List Content */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-crimson-700 mx-auto" />
            <p className="text-sm text-gray-500 font-medium">Loading your shortlisted profiles...</p>
          </div>
        ) : shortlist.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/80 shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-full bg-crimson-50 text-crimson-700 flex items-center justify-center mx-auto">
              <Bookmark className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-navy-950 font-serif">Your Shortlist is Empty</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              While exploring recommended matches or searching community candidates, click the bookmark icon on any profile to save it here for family discussion.
            </p>
            <button
              onClick={() => navigate('/matches')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-crimson-700 hover:bg-crimson-800 text-white text-sm font-semibold rounded-xl shadow-md transition-all"
            >
              <span>Explore Compatible Matches</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shortlist.map((item) => {
              const p = item.profile;
              const formattedName = `${p.first_name} ${p.last_name || ''}`;
              const hasSentInterest = sentInterests.has(p.id);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col justify-between group"
                >
                  <div>
                    {/* Photo with dynamic protection & anti-screenshot watermark */}
                    <div className="relative h-60 w-full overflow-hidden bg-gray-100">
                      <ProtectedPhoto
                        photoUrl={p.photo_url}
                        gender={p.gender}
                        altText={formattedName}
                        profileId={p.id}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Remove Bookmark Button */}
                      <button
                        onClick={() => handleRemove(p.id, formattedName)}
                        className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white text-rose-600 rounded-full shadow-md backdrop-blur-sm transition-colors"
                        title="Remove from shortlist"
                      >
                        <BookmarkX className="w-4 h-4" />
                      </button>

                      {/* Match Score Badge */}
                      <div className="absolute bottom-3 left-3">
                        <MatchScoreBadge score={p.match_score || 90} />
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-5 space-y-3">
                      <div>
                        <h3 className="text-lg font-bold text-navy-950 font-serif">{formattedName}</h3>
                        <p className="text-xs text-crimson-700 font-semibold flex items-center gap-1 mt-0.5">
                          <Sparkles className="w-3.5 h-3.5 text-crimson-700" />
                          <span>{p.community} {p.sub_community ? `(${p.sub_community})` : ''}</span>
                        </p>
                      </div>

                      <div className="space-y-1.5 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-800">{p.age} yrs</span>
                          <span>•</span>
                          <span>{p.height_cm} cm</span>
                          <span>•</span>
                          <span>{p.mother_tongue}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{p.current_city}, {p.current_state}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{p.highest_qualification}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{p.occupation}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-5 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      onClick={() => navigate(`/profile/${p.id}`)}
                      className="min-h-[44px] px-3.5 py-2.5 text-xs font-semibold text-gray-700 hover:text-navy-950 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors text-center flex items-center justify-center"
                    >
                      View Profile
                    </button>

                    <button
                      onClick={() => handleSendInterest(p.id, formattedName)}
                      disabled={hasSentInterest}
                      className={`min-h-[44px] px-3.5 py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs ${
                        hasSentInterest
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                          : 'bg-crimson-700 hover:bg-crimson-800 text-white active:bg-crimson-900'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${hasSentInterest ? 'fill-emerald-600' : ''}`} />
                      <span>{hasSentInterest ? 'Interested' : 'Express Interest'}</span>
                    </button>
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
