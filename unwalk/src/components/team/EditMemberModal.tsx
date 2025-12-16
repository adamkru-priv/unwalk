import { useState } from 'react';
import { teamService, type TeamMember } from '../../lib/auth';

interface EditMemberModalProps {
  member: TeamMember;
  onClose: () => void;
  onSaved: () => void;
}

const RELATIONSHIP_OPTIONS = [
  'Son',
  'Daughter',
  'Partner',
  'Friend',
  'Parent',
  'Sibling',
  'Colleague',
  'Other',
];

export function EditMemberModal({ member, onClose, onSaved }: EditMemberModalProps) {
  const [customName, setCustomName] = useState(member.custom_name || '');
  const [relationship, setRelationship] = useState(member.relationship || '');
  const [notes, setNotes] = useState(member.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await teamService.updateMemberPersonalization(member.id, {
        custom_name: customName.trim() || undefined,
        relationship: relationship.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (error) throw error;

      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to update member:', err);
      alert('Failed to update. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#151A25] border border-white/10 rounded-3xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Personalize</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Custom Name */}
          <div>
            <label className="block text-sm font-bold text-white/80 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={member.display_name || member.email.split('@')[0]}
              className="w-full bg-[#0B101B] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none transition-colors"
            />
            <p className="text-xs text-white/40 mt-1.5">
              Give them a nickname (e.g., "Johnny", "Little Champ")
            </p>
          </div>

          {/* Relationship */}
          <div>
            <label className="block text-sm font-bold text-white/80 mb-2">
              Relationship
            </label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full bg-[#0B101B] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 focus:outline-none transition-colors appearance-none"
            >
              <option value="">Select relationship</option>
              {RELATIONSHIP_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="text-xs text-white/40 mt-1.5">
              Who is this person to you?
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-white/80 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this person..."
              rows={3}
              className="w-full bg-[#0B101B] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none transition-colors resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-all"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
