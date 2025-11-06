import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md m-4 p-6 border border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
        <p className="text-slate-300 mb-6">{message}</p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 text-slate-200 font-semibold rounded-lg hover:bg-slate-600 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-500 transition-colors duration-200"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
