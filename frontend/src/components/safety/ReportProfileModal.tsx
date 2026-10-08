import React, { useState } from 'react';
import { ShieldAlert, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { reportProfile } from '../../lib/interactionApi';

interface ReportProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
}

const REPORT_REASONS = [
  { id: 'FAKE_PROFILE', label: 'Fake profile, inaccurate details or misleading identity' },
  { id: 'INAPPROPRIATE_PHOTO', label: 'Inappropriate, stolen or indecent photos' },
  { id: 'HARASSMENT', label: 'Abusive language, harassment or offensive messages' },
  { id: 'FRAUD_MONEY', label: 'Asking for money, gifts, loans or financial schemes' },
  { id: 'ALREADY_MARRIED', label: 'Member is already married or concealed marital status' },
  { id: 'OTHER', label: 'Other community policy violation' },
];

export const ReportProfileModal: React.FC<ReportProfileModalProps> = ({
  isOpen,
  onClose,
  profileId,
  profileName,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0].id);
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const selected = REPORT_REASONS.find(r => r.id === selectedReason)?.label || selectedReason;
      const res = await reportProfile(profileId, selected, description);
      setSuccessMessage(res.message || 'Report submitted successfully. Our Trust & Safety team will review.');
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
        setDescription('');
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92dvh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-crimson-50 px-4 sm:px-6 py-4 border-b border-crimson-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 text-crimson-700 font-semibold text-sm sm:text-base truncate mr-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Report Profile: {profileName}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 min-h-[44px] min-w-[44px] rounded-full hover:bg-crimson-100/50 transition-colors flex items-center justify-center flex-shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {successMessage ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-navy-950 font-serif">Report Received</h4>
              <p className="text-sm text-gray-600 max-w-xs mx-auto">{successMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-xs text-gray-500">
                BorKonya is committed to maintaining a safe and respectful matrimonial community.
                Your report is 100% confidential and will never be revealed to {profileName}.
              </p>

              {errorMessage && (
                <div className="p-3 bg-crimson-50 border border-crimson-200 rounded-lg flex items-center gap-2 text-xs text-crimson-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Reasons */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Select Reason for Reporting
                </label>
                <div className="space-y-2">
                  {REPORT_REASONS.map((r) => (
                    <label
                      key={r.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-sm cursor-pointer transition-all ${
                        selectedReason === r.id
                          ? 'border-crimson-700 bg-crimson-50/50 text-crimson-950 font-medium'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        value={r.id}
                        checked={selectedReason === r.id}
                        onChange={() => setSelectedReason(r.id)}
                        className="mt-0.5 text-crimson-700 focus:ring-crimson-700"
                      />
                      <span className="text-xs sm:text-sm leading-relaxed">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide any additional context or incident timestamps..."
                  className="w-full text-sm rounded-xl border border-gray-200 p-3 focus:border-crimson-700 focus:ring-1 focus:ring-crimson-700 outline-none resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 text-sm font-semibold text-white bg-crimson-700 hover:bg-crimson-800 rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isSubmitting ? 'Submitting Report...' : 'Submit Confidential Report'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
