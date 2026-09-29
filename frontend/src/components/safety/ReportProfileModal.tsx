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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-red-100">
        {/* Header */}
        <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-red-700 font-semibold">
            <ShieldAlert className="w-5 h-5" />
            <span>Report Member Profile: {profileName}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-red-100/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {successMessage ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-gray-900">Report Received</h4>
              <p className="text-sm text-gray-600 max-w-xs mx-auto">{successMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-xs text-gray-500">
                BorKonya is committed to maintaining a safe and respectful matrimonial community.
                Your report is 100% confidential and will never be revealed to {profileName}.
              </p>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
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
                          ? 'border-red-500 bg-red-50/50 text-red-950 font-medium'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        value={r.id}
                        checked={selectedReason === r.id}
                        onChange={() => setSelectedReason(r.id)}
                        className="mt-0.5 text-red-600 focus:ring-red-500"
                      />
                      <span>{r.label}</span>
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
                  className="w-full text-sm rounded-xl border border-gray-200 p-3 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
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
