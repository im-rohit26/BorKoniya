import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  updateContactPermissions,
  revokeContactPermissions,
  type ConnectionPrivacyItem,
} from '../../lib/contactPrivacyApi';
import { getDefaultAvatar } from '../../lib/utils';

interface ContactPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: ConnectionPrivacyItem | null;
  myPhone?: string;
  myEmail?: string;
  onSuccess: (updated: { connection_id: string; phone_shared: boolean; email_shared: boolean }) => void;
}

export const ContactPrivacyModal: React.FC<ContactPrivacyModalProps> = ({
  isOpen,
  onClose,
  connection,
  myPhone,
  myEmail,
  onSuccess,
}) => {
  const [phoneShared, setPhoneShared] = useState(false);
  const [emailShared, setEmailShared] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (connection) {
      setPhoneShared(connection.my_sharing_phone);
      setEmailShared(connection.my_sharing_email);
      setStatusMessage(null);
    }
  }, [connection]);

  if (!isOpen || !connection) return null;

  const handleSave = async () => {
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      await updateContactPermissions(connection.connection_id, {
        phone_shared: phoneShared,
        email_shared: emailShared,
      });
      setStatusMessage({ type: 'success', text: 'Contact sharing preferences saved successfully!' });
      onSuccess({
        connection_id: connection.connection_id,
        phone_shared: phoneShared,
        email_shared: emailShared,
      });
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update contact permissions.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeAll = async () => {
    if (!window.confirm(`Revoke all contact sharing access for ${connection.other_name}? They will no longer see your phone or email.`)) {
      return;
    }
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      await revokeContactPermissions(connection.connection_id);
      setPhoneShared(false);
      setEmailShared(false);
      setStatusMessage({ type: 'success', text: 'All contact permissions revoked.' });
      onSuccess({
        connection_id: connection.connection_id,
        phone_shared: false,
        email_shared: false,
      });
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to revoke contact permissions.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const otherAvatar = connection.other_photo_url || getDefaultAvatar(connection.other_gender);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-privacy-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200 flex flex-col space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3.5">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-crimson-600 bg-slate-100 flex-shrink-0">
              <img
                src={otherAvatar}
                alt={connection.other_name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 id="contact-privacy-title" className="text-base sm:text-lg font-bold text-navy-950">
                Contact Privacy Settings
              </h3>
              <p className="text-xs text-slate-500">
                Manage what <span className="font-semibold text-slate-700">{connection.other_name}</span> can view
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-navy-900 hover:bg-slate-100 transition-colors"
            title="Close"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast */}
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

        {/* Privacy Info Note */}
        <div className="rounded-2xl bg-navy-50/80 p-3.5 border border-navy-100 text-xs text-navy-900 flex items-start space-x-2.5">
          <ShieldCheck className="w-5 h-5 text-crimson-700 flex-shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-slate-600">
            <span className="font-bold text-navy-950">Strict Privacy Guarantee:</span> Your phone number and email address stay completely hidden unless you explicitly toggle them on here. Neither premium status nor connection acceptance reveals them.
          </div>
        </div>

        {/* Granular Toggles */}
        <div className="space-y-3">
          {/* Toggle 1: Phone */}
          <div className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors bg-white flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0 pr-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                phoneShared ? 'bg-crimson-50 text-crimson-700' : 'bg-slate-100 text-slate-400'
              }`}>
                <Phone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs sm:text-sm font-bold text-navy-950">
                  Share Phone Number
                </span>
                <span className="block text-[11px] text-slate-500 truncate">
                  {myPhone ? myPhone : 'Your verified registered phone'}
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
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crimson-700"></div>
            </label>
          </div>

          {/* Toggle 2: Email */}
          <div className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors bg-white flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0 pr-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                emailShared ? 'bg-navy-50 text-navy-800' : 'bg-slate-100 text-slate-400'
              }`}>
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs sm:text-sm font-bold text-navy-950">
                  Share Email Address
                </span>
                <span className="block text-[11px] text-slate-500 truncate">
                  {myEmail ? myEmail : 'Your registered verified email'}
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
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crimson-700"></div>
            </label>
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <span className="text-slate-500 font-medium text-[11px]">Quick presets:</span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                setPhoneShared(true);
                setEmailShared(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
            >
              Share Both
            </button>
            <button
              type="button"
              onClick={() => {
                setPhoneShared(false);
                setEmailShared(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
            >
              Share Nothing
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleRevokeAll}
            disabled={isSubmitting || (!phoneShared && !emailShared && !connection.my_sharing_phone && !connection.my_sharing_email)}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Revoke All Access</span>
          </button>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-5 py-2.5 rounded-xl bg-crimson-700 hover:bg-crimson-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
