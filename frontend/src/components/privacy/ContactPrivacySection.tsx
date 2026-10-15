import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  Phone,
  Mail,
  Lock,
  Copy,
  Check,
  Settings2,
  Users,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import {
  getConnectionPrivacyList,
  type ConnectionPrivacyItem,
} from '../../lib/contactPrivacyApi';
import { ContactPrivacyModal } from './ContactPrivacyModal';
import { getDefaultAvatar } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export const ContactPrivacySection: React.FC = () => {
  const { user } = useAuth();
  const [selectedConnection, setSelectedConnection] = useState<ConnectionPrivacyItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const {
    data: connections = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['connections', 'contact-privacy', user?.user_id],
    queryFn: getConnectionPrivacyList,
    staleTime: 30 * 1000,
  });

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleModalSuccess = (_updated: { connection_id: string; phone_shared: boolean; email_shared: boolean }) => {
    refetch();
  };

  const getSharingBadge = (phone: boolean, email: boolean) => {
    if (phone && email) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Both Shared</span>
        </span>
      );
    }
    if (phone) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
          <Phone className="w-3.5 h-3.5 text-sky-600" />
          <span>Phone Shared</span>
        </span>
      );
    }
    if (email) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
          <Mail className="w-3.5 h-3.5 text-indigo-600" />
          <span>Email Shared</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        <Lock className="w-3.5 h-3.5 text-slate-400" />
        <span>Private (Hidden)</span>
      </span>
    );
  };

  // Contacts shared with the logged-in user
  const sharedWithMe = connections.filter(
    (c) => c.their_sharing_phone || c.their_sharing_email
  );

  return (
    <div className="space-y-6">
      {/* Educational Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-navy-950 to-slate-900 text-white p-5 sm:p-6 shadow-sm border border-navy-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-crimson-600/30 border border-crimson-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
            <ShieldCheck className="w-6 h-6 text-crimson-400" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white font-serif">
              Private Contact Details & Granular Sharing
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Your phone number and email address are strictly private by default. Premium subscribers and accepted connections cannot view them unless you explicitly choose to share them with each individual connection below.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): What You Share with Connections */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-crimson-50 text-crimson-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-navy-950 font-sans">
                  Manage Sharing with Connections
                </h4>
                <p className="text-[11px] text-slate-500">
                  Select which contact fields each accepted connection can see
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {connections.length} {connections.length === 1 ? 'Connection' : 'Connections'}
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2 text-crimson-700" />
              <span className="text-xs font-medium">Loading connections...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-crimson-50 border border-crimson-200 text-xs text-crimson-800 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-crimson-600 flex-shrink-0" />
              <span>Failed to load contact privacy connections.</span>
            </div>
          ) : connections.length === 0 ? (
            <div className="py-10 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 p-6">
              <Lock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h5 className="text-xs sm:text-sm font-bold text-navy-950">No Accepted Connections Yet</h5>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Once an interest is mutually accepted, you will be able to manage granular phone and email permissions for that person here.
              </p>
              <Link
                to="/search"
                className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-crimson-700 hover:bg-crimson-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <span>Discover Profiles</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 space-y-2">
              {connections.map((c) => {
                const avatar = c.other_photo_url || getDefaultAvatar(c.other_gender);
                return (
                  <div
                    key={c.connection_id}
                    className="pt-3 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Link
                        to={`/profile/${c.other_profile_id}`}
                        className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-slate-100 bg-slate-100 flex-shrink-0 hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={avatar}
                          alt={c.other_name}
                          className="w-full h-full object-cover"
                        />
                      </Link>
                      <div className="min-w-0">
                        <Link
                          to={`/profile/${c.other_profile_id}`}
                          className="text-xs sm:text-sm font-bold text-navy-950 hover:text-crimson-700 transition-colors truncate block"
                        >
                          {c.other_name}
                        </Link>
                        <p className="text-[11px] text-slate-500 truncate">
                          {c.other_occupation || 'Member'}
                          {c.other_city ? ` • ${c.other_city}` : ''}
                        </p>
                        <div className="mt-1">
                          {getSharingBadge(c.my_sharing_phone, c.my_sharing_email)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedConnection(c);
                        setModalOpen(true);
                      }}
                      className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-crimson-50 text-navy-900 hover:text-crimson-700 border border-slate-200 hover:border-crimson-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs self-end sm:self-auto"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      <span>Manage Sharing</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Contacts Shared With You */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-navy-50 text-navy-800 flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-navy-950 font-sans">
                  Shared With You
                </h4>
                <p className="text-[11px] text-slate-500">
                  Verified details shared by your connections
                </p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="py-8 flex justify-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-crimson-700" />
            </div>
          ) : sharedWithMe.length === 0 ? (
            <div className="py-8 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 p-5">
              <Lock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h5 className="text-xs font-bold text-navy-950">No Shared Contacts Yet</h5>
              <p className="text-[11px] text-slate-500 mt-1">
                When a connected member explicitly chooses to share their direct phone number or email address with you, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sharedWithMe.map((item) => {
                const avatar = item.other_photo_url || getDefaultAvatar(item.other_gender);
                return (
                  <div
                    key={`shared-by-${item.connection_id}`}
                    className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2.5"
                  >
                    <div className="flex items-center space-x-2.5">
                      <img
                        src={avatar}
                        alt={item.other_name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-navy-950 truncate">
                          {item.other_name}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          Granted contact permission
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {item.their_sharing_phone && item.revealed_phone && (
                        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 text-xs">
                          <div className="flex items-center space-x-2 min-w-0 pr-2">
                            <Phone className="w-3.5 h-3.5 text-navy-800 flex-shrink-0" />
                            <span className="font-semibold text-slate-800 truncate">
                              {item.revealed_phone}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.revealed_phone || '', `phone-${item.connection_id}`)}
                            className="p-1 text-slate-400 hover:text-navy-900 rounded-lg transition-colors cursor-pointer"
                            title="Copy Phone"
                            aria-label="Copy Phone"
                          >
                            {copiedField === `phone-${item.connection_id}` ? (
                              <Check className="w-3.5 h-3.5 text-crimson-700" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}

                      {item.their_sharing_email && item.revealed_email && (
                        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 text-xs">
                          <div className="flex items-center space-x-2 min-w-0 pr-2">
                            <Mail className="w-3.5 h-3.5 text-navy-800 flex-shrink-0" />
                            <span className="font-semibold text-slate-800 truncate">
                              {item.revealed_email}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.revealed_email || '', `email-${item.connection_id}`)}
                            className="p-1 text-slate-400 hover:text-navy-900 rounded-lg transition-colors cursor-pointer"
                            title="Copy Email"
                            aria-label="Copy Email"
                          >
                            {copiedField === `email-${item.connection_id}` ? (
                              <Check className="w-3.5 h-3.5 text-crimson-700" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Contact Privacy Modal */}
      <ContactPrivacyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        connection={selectedConnection}
        myPhone={user?.phone_number}
        myEmail={user?.email}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};
