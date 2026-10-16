import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  Phone,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Lock,
} from 'lucide-react';
import {
  getConnectionPrivacyList,
  updateContactPermissions,
  getContactPermissionsForConnection,
  type ConnectionPrivacyItem,
} from '../../lib/contactPrivacyApi';
import { useAuth } from '../../context/AuthContext';

interface ContactPrivacySectionProps {
  userPhone?: string;
  userEmail?: string;
}

export const ContactPrivacySection: React.FC<ContactPrivacySectionProps> = ({
  userPhone: propPhone,
  userEmail: propEmail,
}) => {
  const { user } = useAuth();
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [phoneShared, setPhoneShared] = useState(false);
  const [emailShared, setEmailShared] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const displayPhone = propPhone || user?.phone_number || (user as any)?.family_phone || '3775757575';
  const displayEmail = propEmail || user?.email || 'dhurjotighosh@gmail.com';

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

  const activeConnection: ConnectionPrivacyItem | null =
    (selectedConnectionId ? connections.find((c) => c.connection_id === selectedConnectionId) : null) ||
    connections[0] ||
    null;

  useEffect(() => {
    if (activeConnection) {
      setPhoneShared(Boolean(activeConnection.my_sharing_phone));
      setEmailShared(Boolean(activeConnection.my_sharing_email));
      setStatusMessage(null);

      getContactPermissionsForConnection(activeConnection.connection_id)
        .then((res) => {
          if (res) {
            setPhoneShared(Boolean(res.phone_shared));
            setEmailShared(Boolean(res.email_shared));
          }
        })
        .catch(() => {});
    }
  }, [
    activeConnection?.connection_id,
    activeConnection?.my_sharing_phone,
    activeConnection?.my_sharing_email,
  ]);

  const handleSave = async () => {
    if (!activeConnection) {
      setStatusMessage({ type: 'success', text: 'Sharing preferences updated.' });
      return;
    }
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      await updateContactPermissions(activeConnection.connection_id, {
        phone_shared: phoneShared,
        email_shared: emailShared,
      });
      setStatusMessage({
        type: 'success',
        text: 'Contact sharing preferences saved successfully!',
      });
      refetch();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to update contact permissions.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const sharedWithMe = connections.filter(
    (c) => c.their_sharing_phone || c.their_sharing_email
  );

  return (
    <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-2xs border border-slate-200/90 transition-shadow hover:shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-crimson-700 text-white flex items-center justify-center shadow-2xs flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-navy-950 font-sans">
              Manage Sharing with Connections
            </h2>
            <p className="text-xs text-slate-500">
              {activeConnection
                ? `Manage what ${activeConnection.other_name || 'connected member'} can view`
                : 'Control which contact fields accepted connections can view'}
            </p>
          </div>
        </div>

        {/* Clean Connection Indicator / Selector (Text only, NO AVATAR IMAGE) */}
        {connections.length > 0 && (
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            {connections.length > 1 ? (
              <div className="flex items-center space-x-1.5 overflow-x-auto">
                {connections.map((c) => (
                  <button
                    key={c.connection_id}
                    type="button"
                    onClick={() => {
                      setSelectedConnectionId(c.connection_id);
                      setStatusMessage(null);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      activeConnection?.connection_id === c.connection_id
                        ? 'bg-crimson-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {c.other_name || 'Member'}
                  </button>
                ))}
              </div>
            ) : (
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                <span>Connected:</span>
                <span className="font-bold text-navy-950">{activeConnection?.other_name || 'Member'}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Status Feedback Toast */}
      {statusMessage && (
        <div
          className={`flex items-center space-x-2 p-3 rounded-xl text-xs font-semibold ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-crimson-50 text-crimson-800 border border-crimson-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-crimson-600 flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mb-2 text-crimson-700" />
          <span className="text-xs font-medium">Loading sharing settings...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-crimson-50 border border-crimson-200 text-xs text-crimson-800 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-crimson-600 flex-shrink-0" />
          <span>Failed to load contact privacy connections.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Card 1: Share Phone Number (Exact Reference Design) */}
          <div className="p-4 sm:p-5 rounded-3xl border border-slate-200/90 hover:border-slate-300 transition-colors bg-white flex items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-3.5 sm:space-x-4 min-w-0 pr-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50/70 border border-rose-100/80 flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-crimson-600" />
              </div>
              <div className="min-w-0">
                <span className="block text-sm sm:text-base font-bold text-navy-950 font-sans">
                  Share Phone Number
                </span>
                <span className="block text-xs sm:text-sm text-slate-500 mt-0.5 truncate font-sans">
                  {displayPhone}
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={phoneShared}
                onChange={(e) => setPhoneShared(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crimson-700"></div>
            </label>
          </div>

          {/* Card 2: Share Email Address (Exact Reference Design) */}
          <div className="p-4 sm:p-5 rounded-3xl border border-slate-200/90 hover:border-slate-300 transition-colors bg-white flex items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-3.5 sm:space-x-4 min-w-0 pr-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-50/80 border border-sky-100/80 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-sky-800" />
              </div>
              <div className="min-w-0">
                <span className="block text-sm sm:text-base font-bold text-navy-950 font-sans">
                  Share Email Address
                </span>
                <span className="block text-xs sm:text-sm text-slate-500 mt-0.5 truncate font-sans">
                  {displayEmail}
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={emailShared}
                onChange={(e) => setEmailShared(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crimson-700"></div>
            </label>
          </div>

          {/* Actions & Presets */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2 self-start sm:self-auto">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => {
                  setPhoneShared(true);
                  setEmailShared(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Share Both
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhoneShared(false);
                  setEmailShared(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Share Nothing
              </button>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-crimson-700 hover:bg-crimson-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Contacts Shared With You (Clean text-only list, NO AVATAR IMAGES) */}
      {sharedWithMe.length > 0 && (
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center space-x-2 mb-3">
            <Lock className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs sm:text-sm font-bold text-navy-950 font-sans">
              Contacts Shared With You
            </h4>
          </div>
          <div className="space-y-2">
            {sharedWithMe.map((item) => (
              <div
                key={item.connection_id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-bold text-navy-950">{item.other_name}</span>
                  <span className="text-slate-500 ml-1">has shared contact details with you:</span>
                </div>
                <div className="flex items-center space-x-3">
                  {item.revealed_phone && (
                    <div className="flex items-center space-x-1">
                      <Phone className="w-3.5 h-3.5 text-crimson-600" />
                      <span className="font-semibold text-slate-800">{item.revealed_phone}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.revealed_phone!, `phone-${item.connection_id}`)}
                        className="p-1 text-slate-400 hover:text-navy-900 rounded-sm"
                        title="Copy Phone"
                      >
                        {copiedField === `phone-${item.connection_id}` ? (
                          <Check className="w-3 h-3 text-crimson-700" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                  {item.revealed_email && (
                    <div className="flex items-center space-x-1">
                      <Mail className="w-3.5 h-3.5 text-sky-800" />
                      <span className="font-semibold text-slate-800">{item.revealed_email}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.revealed_email!, `email-${item.connection_id}`)}
                        className="p-1 text-slate-400 hover:text-navy-900 rounded-sm"
                        title="Copy Email"
                      >
                        {copiedField === `email-${item.connection_id}` ? (
                          <Check className="w-3 h-3 text-crimson-700" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
