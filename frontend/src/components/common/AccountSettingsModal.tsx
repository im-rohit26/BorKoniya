import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Settings,
  Shield,
  Trash2,
  AlertTriangle,
  User,
  Heart,
  ChevronRight,
  ArrowLeft,
  Phone,
  Mail,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDefaultAvatar } from '../../lib/utils';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsSection = 'overview' | 'privacy' | 'notifications' | 'delete_flow';
type DeleteStep = 'reason' | 'consequences' | 'confirm';

const DELETION_REASONS = [
  { id: 'found_match_borkonya', label: '💍 Found my life partner on BorKonya! 💕', note: 'Congratulations from the BorKonya family!' },
  { id: 'found_match_elsewhere', label: '💑 Found a match through family or other platforms', note: 'We wish you a wonderful journey!' },
  { id: 'taking_break', label: '⏳ Taking a temporary break from matrimonial search', note: 'You can always return anytime.' },
  { id: 'privacy_concerns', label: '🔒 Privacy or safety preferences', note: 'We value your trust and confidentiality.' },
  { id: 'app_experience', label: '⚙️ App experience or technical difficulties', note: 'We are sorry we fell short of your expectations.' },
  { id: 'other', label: '📝 Other reason', note: 'Please let us know how we can improve.' },
];

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, deleteMyAccount } = useAuth();
  const [activeSection, setActiveSection] = useState<SettingsSection>('overview');

  // Deletion Flow State
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('reason');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartDeleteFlow = () => {
    setActiveSection('delete_flow');
    setDeleteStep('reason');
    setSelectedReason('');
    setFeedbackText('');
    setDeleteError(null);
  };

  const handleCancelDeleteFlow = () => {
    setActiveSection('overview');
    setDeleteStep('reason');
    setDeleteError(null);
  };

  const handleExecuteDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteMyAccount();
      onClose();
      navigate('/login');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account. Please check your connection and try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0b2a5b]/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#e3e9f5] overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-[#e3e9f5] bg-gradient-to-r from-[#f8faff] to-[#fff] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {activeSection === 'delete_flow' ? (
              <button
                type="button"
                onClick={handleCancelDeleteFlow}
                className="p-2 text-[#0b2a5b] hover:bg-[#eef3fb] rounded-full transition-colors mr-1 flex-shrink-0"
                title="Back to Settings"
                aria-label="Back to settings"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-2xl bg-[#eef3fb] text-[#0b2a5b] flex items-center justify-center flex-shrink-0">
                <Settings className="w-5 h-5 text-crimson-700" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-[#0b2a5b] truncate">
                {activeSection === 'delete_flow' ? 'Account Deletion' : 'Account & Privacy Settings'}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-[#6b7a99] truncate">
                {activeSection === 'delete_flow'
                  ? 'Step-by-step account closure'
                  : 'Manage your BorKonya profile, safety & preferences'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#6b7a99] hover:text-[#e0102f] hover:bg-[#fde8ee] rounded-full transition-colors flex-shrink-0"
            title="Close"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 sm:space-y-6">
          {activeSection !== 'delete_flow' ? (
            <>
              {/* Account Overview Card */}
              <div className="p-4 bg-gradient-to-br from-[#f8faff] to-[#f4f7fd] rounded-2xl border border-[#e3e9f5] flex items-center gap-3.5 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-white shadow-md bg-white flex-shrink-0">
                  <img
                    src={user?.photo_url || getDefaultAvatar(user?.gender)}
                    alt={user?.first_name || 'Member'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      const fallback = getDefaultAvatar(user?.gender);
                      if (target.src !== fallback) target.src = fallback;
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-sm text-[#0b2a5b] truncate">
                      {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Member'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-crimson-100 text-crimson-800">
                      {user?.role || 'MEMBER'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#6b7a99] space-y-0.5">
                    {user?.phone_number && (
                      <p className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{user.phone_number}</span>
                      </p>
                    )}
                    {user?.email && (
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{user.email}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation Options List */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/profile/edit');
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-white hover:bg-[#f6f9ff] hover:border-[#dbe3f5] transition-all text-left group min-h-[48px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-navy-950">Edit Profile & Horoscope</p>
                      <p className="text-[10px] text-slate-500">Update personal, career, and family details</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/subscription');
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50/50 to-white hover:bg-amber-50 transition-all text-left group min-h-[48px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                      <Heart className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-navy-950">Membership & Subscription Plan</p>
                      <p className="text-[10px] text-slate-500">Manage plan, unlock direct calls & chats</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                </button>

                {/* Privacy & Screenshot Shield Card */}
                <div className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 text-left space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0b2a5b]">
                    <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Privacy & Screenshot Protection</span>
                  </div>
                  <p className="text-[11px] text-[#6b7a99] leading-relaxed">
                    BorKonya photo protection and anti-screenshot shield is active. Your photos cannot be downloaded, and direct contact details are shared only with mutual consent.
                  </p>
                </div>
              </div>

              {/* Account Management & Danger Zone */}
              <div className="pt-3 border-t border-[#e3e9f5]">
                <div className="p-4 rounded-2xl border border-rose-100 bg-rose-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>Account Management</span>
                      </h4>
                      <p className="text-[10px] text-rose-700/80 mt-0.5">
                        Permanently close your BorKonya matrimonial account
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartDeleteFlow}
                    className="w-full py-3 px-4 bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Account Permanently</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* ================= MULTI-STEP DELETION FLOW ================= */
            <div className="space-y-4">
              {/* Step indicator */}
              <div className="flex items-center justify-between px-2 text-[11px] font-semibold text-[#6b7a99]">
                <span className={deleteStep === 'reason' ? 'text-[#e0102f] font-bold' : ''}>
                  1. Reason
                </span>
                <span>&rarr;</span>
                <span className={deleteStep === 'consequences' ? 'text-[#e0102f] font-bold' : ''}>
                  2. Consequences
                </span>
                <span>&rarr;</span>
                <span className={deleteStep === 'confirm' ? 'text-[#e0102f] font-bold' : ''}>
                  3. Confirm
                </span>
              </div>

              {/* STEP 1: Reason Selection */}
              {deleteStep === 'reason' && (
                <div className="space-y-3 animate-in fade-in duration-100">
                  <div>
                    <h3 className="text-sm font-bold text-[#0b2a5b]">
                      Please tell us why you want to delete your account
                    </h3>
                    <p className="text-xs text-[#6b7a99] mt-0.5">
                      Your feedback helps us understand and improve BorKonya for everyone.
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    {DELETION_REASONS.map((r) => {
                      const isSelected = selectedReason === r.id;
                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelectedReason(r.id)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                            isSelected
                              ? 'border-[#e0102f] bg-[#fde8ee]/60 shadow-xs'
                              : 'border-[#e3e9f5] hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected
                                ? 'border-[#e0102f] bg-[#e0102f] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[#0b2a5b]">{r.label}</p>
                            <p className="text-[10px] text-[#6b7a99] mt-0.5">{r.note}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedReason && (
                    <div className="pt-2">
                      <label className="block text-[11px] font-semibold text-[#0b2a5b] mb-1">
                        Any additional thoughts or feedback? (Optional)
                      </label>
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Write your comments here..."
                        rows={2}
                        className="w-full text-xs p-2.5 rounded-xl border border-[#e3e9f5] focus:outline-none focus:border-[#e0102f] text-[#0b2a5b]"
                      />
                    </div>
                  )}

                  <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs pt-3 pb-1 border-t border-slate-100 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCancelDeleteFlow}
                      className="flex-1 py-3 px-4 text-xs font-semibold text-[#0b2a5b] bg-[#f1f4fb] hover:bg-[#e4ebf8] rounded-xl transition-colors min-h-[44px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!selectedReason}
                      onClick={() => setDeleteStep('consequences')}
                      className="flex-1 py-3 px-4 text-xs font-bold text-white bg-[#0b2a5b] hover:bg-[#071d40] disabled:opacity-40 rounded-xl transition-colors shadow-sm min-h-[44px]"
                    >
                      Continue &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Consequences Warning */}
              {deleteStep === 'consequences' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>What will happen when you delete your account:</span>
                    </div>
                    <ul className="text-[11px] text-amber-900/90 space-y-1.5 pl-6 list-disc">
                      <li>Your profile and photos will be permanently removed from searches & matches.</li>
                      <li>All your conversations, chat messages, and call history will be deleted.</li>
                      <li>All sent and received express interests will be cancelled.</li>
                      <li>Active premium subscriptions and benefits will immediately terminate without refund.</li>
                      <li>This action is irreversible and your account cannot be recovered.</li>
                    </ul>
                  </div>

                  <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs pt-3 pb-1 border-t border-slate-100 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setDeleteStep('reason')}
                      className="flex-1 py-3 px-4 text-xs font-semibold text-[#0b2a5b] bg-[#f1f4fb] hover:bg-[#e4ebf8] rounded-xl transition-colors min-h-[44px]"
                    >
                      &larr; Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteStep('confirm')}
                      className="flex-1 py-3 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm min-h-[44px]"
                    >
                      I Understand, Proceed &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Final Confirmation */}
              {deleteStep === 'confirm' && (
                <div className="space-y-4 animate-in fade-in duration-100 text-center">
                  <div className="w-14 h-14 rounded-full bg-[#fde8ee] text-[#e0102f] flex items-center justify-center mx-auto">
                    <Trash2 className="w-7 h-7" />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[#0b2a5b]">
                      Are you absolutely sure?
                    </h3>
                    <p className="text-xs text-[#6b7a99] mt-1 max-w-xs mx-auto">
                      All your account data, matches, and chats will be permanently deleted right now.
                    </p>
                  </div>

                  {deleteError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                      {deleteError}
                    </div>
                  )}

                  <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs pt-3 pb-1 border-t border-slate-100 flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleCancelDeleteFlow}
                      className="flex-1 py-3 px-4 text-xs font-semibold text-[#0b2a5b] bg-[#f1f4fb] hover:bg-[#e4ebf8] rounded-xl transition-colors disabled:opacity-50 min-h-[44px]"
                    >
                      Keep Account
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleExecuteDeleteAccount}
                      className="flex-1 py-3 px-4 text-xs font-bold text-white bg-[#e0102f] hover:bg-[#c70a27] rounded-xl transition-colors shadow-md shadow-[#e0102f]/25 disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <span>Confirm & Delete</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
