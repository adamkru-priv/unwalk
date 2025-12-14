import { motion } from 'framer-motion';
import { useState } from 'react';
import { uploadChallengeImage, createCustomChallenge, assignChallengeToUsers } from '../../lib/api';
import { getDeviceId } from '../../lib/deviceId';

interface CreateChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateChallengeModal({ isOpen, onClose, onSuccess }: CreateChallengeModalProps) {
  const [step, setStep] = useState<'form' | 'assign'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdChallengeId, setCreatedChallengeId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'animals' | 'sport' | 'nature' | 'surprise'>('nature');
  const [goalSteps, setGoalSteps] = useState(10000);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isImageHidden, setIsImageHidden] = useState(true);
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadline, setDeadline] = useState('');

  // Assignment state
  const [assignTo, setAssignTo] = useState<'myself' | 'person' | 'group'>('myself');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Mock family members - later from API
  const familyMembers = [
    { id: '1', name: 'Mama', avatar: '👩', deviceId: 'device-mama' },
    { id: '2', name: 'Tata', avatar: '👨', deviceId: 'device-tata' },
    { id: '3', name: 'Kasia', avatar: '👧', deviceId: 'device-kasia' },
  ];

  const categoryOptions = [
    { value: 'animals' as const, label: 'Animals', emoji: '🦁' },
    { value: 'sport' as const, label: 'Sport', emoji: '⚽' },
    { value: 'nature' as const, label: 'Nature', emoji: '🏔️' },
    { value: 'surprise' as const, label: 'Surprise', emoji: '🎲' },
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateChallenge = async () => {
    if (!title || !imageFile) {
      setError('Please provide title and image');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Upload image
      const imageUrl = await uploadChallengeImage(imageFile);

      // Create challenge
      const challenge = await createCustomChallenge({
        title,
        description: description || 'Custom challenge',
        category,
        goal_steps: goalSteps,
        image_url: imageUrl,
        is_image_hidden: isImageHidden,
        deadline: hasDeadline ? deadline : undefined,
      });

      setCreatedChallengeId(challenge.id);
      setStep('assign');
      setLoading(false);
    } catch (err) {
      console.error('Failed to create challenge:', err);
      setError('Failed to create challenge. Please try again.');
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!createdChallengeId) return;

    try {
      setLoading(true);
      setError(null);

      let targetDeviceIds: string[] = [];

      if (assignTo === 'myself') {
        targetDeviceIds = [getDeviceId()];
      } else if (assignTo === 'person') {
        targetDeviceIds = selectedMembers;
      } else if (assignTo === 'group') {
        targetDeviceIds = selectedMembers;
      }

      await assignChallengeToUsers(
        createdChallengeId,
        targetDeviceIds,
        assignTo === 'group'
      );

      setLoading(false);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Failed to assign challenge:', err);
      setError('Failed to assign challenge. Please try again.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setTitle('');
    setDescription('');
    setGoalSteps(10000);
    setImageFile(null);
    setImagePreview(null);
    setIsImageHidden(true);
    setHasDeadline(false);
    setDeadline('');
    setAssignTo('myself');
    setSelectedMembers([]);
    setCreatedChallengeId(null);
    setError(null);
    onClose();
  };

  const toggleMember = (deviceId: string) => {
    if (selectedMembers.includes(deviceId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== deviceId));
    } else {
      setSelectedMembers([...selectedMembers, deviceId]);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {step === 'form' ? 'Create Custom Challenge' : 'Assign Challenge'}
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* STEP 1: Form */}
        {step === 'form' && (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Walk to Paris"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={50}
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Challenge Image <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="block w-full aspect-video bg-gray-900 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 transition-colors overflow-hidden"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm">Click to upload image</span>
                    </div>
                  )}
                </label>
              </div>

              {/* Image Hidden Toggle */}
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="image-hidden"
                  checked={isImageHidden}
                  onChange={(e) => setIsImageHidden(e.target.checked)}
                  className="w-4 h-4 accent-blue-500"
                />
                <label htmlFor="image-hidden" className="text-sm text-white/80">
                  Keep image hidden (blur) until goal reached
                </label>
              </div>
            </div>

            {/* Goal Steps */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Goal Steps: {(goalSteps / 1000).toFixed(0)}k
              </label>
              <input
                type="range"
                min={1000}
                max={50000}
                step={1000}
                value={goalSteps}
                onChange={(e) => setGoalSteps(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-white/50 mt-1">
                <span>1k</span>
                <span>50k</span>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {categoryOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setCategory(option.value)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      category === option.value
                        ? 'bg-blue-600/20 border-blue-500'
                        : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{option.emoji}</span>
                      <span className="text-sm text-white">{option.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Deadline */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="checkbox"
                  id="has-deadline"
                  checked={hasDeadline}
                  onChange={(e) => setHasDeadline(e.target.checked)}
                  className="w-4 h-4 accent-blue-500"
                />
                <label htmlFor="has-deadline" className="text-sm font-medium text-white/80">
                  Set deadline
                </label>
              </div>
              {hasDeadline && (
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleCreateChallenge}
              disabled={loading || !title || !imageFile}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Next: Assign Challenge'}
            </button>
          </div>
        )}

        {/* STEP 2: Assignment */}
        {step === 'assign' && (
          <div className="space-y-4">
            <p className="text-white/70 text-sm mb-4">Who should do this challenge?</p>

            {/* Assignment Options */}
            <div className="space-y-2">
              <button
                onClick={() => setAssignTo('myself')}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  assignTo === 'myself'
                    ? 'bg-blue-600/20 border-blue-500'
                    : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🚶‍♂️</span>
                  <div className="text-left">
                    <div className="text-white font-medium">Do it Myself</div>
                    <div className="text-white/60 text-sm">Start this challenge now</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setAssignTo('person')}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  assignTo === 'person'
                    ? 'bg-blue-600/20 border-blue-500'
                    : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👤</span>
                  <div className="text-left">
                    <div className="text-white font-medium">Assign to Someone</div>
                    <div className="text-white/60 text-sm">Choose family member(s)</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setAssignTo('group')}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  assignTo === 'group'
                    ? 'bg-blue-600/20 border-blue-500'
                    : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👥</span>
                  <div className="text-left">
                    <div className="text-white font-medium">Group Challenge</div>
                    <div className="text-white/60 text-sm">Multiple people work together</div>
                  </div>
                </div>
              </button>
            </div>

            {/* Member Selection */}
            {(assignTo === 'person' || assignTo === 'group') && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Select {assignTo === 'group' ? 'group members' : 'person'}:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {familyMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => toggleMember(member.deviceId)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedMembers.includes(member.deviceId)
                          ? 'bg-blue-600/20 border-blue-500'
                          : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="text-2xl mb-1">{member.avatar}</div>
                      <div className="text-xs text-white font-medium">{member.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Assignment */}
            <div className="flex gap-2 pt-4">
              <button
                onClick={() => setStep('form')}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-xl font-semibold transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleAssign}
                disabled={loading || (assignTo !== 'myself' && selectedMembers.length === 0)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Assigning...' : 'Create & Assign'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
