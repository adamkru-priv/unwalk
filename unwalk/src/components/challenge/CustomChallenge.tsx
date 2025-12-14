import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { createCustomChallenge, uploadChallengeImage, assignChallengeToUsers, getMyCustomChallenges, deleteCustomChallenge, startChallenge } from '../../lib/api';
import type { AdminChallenge } from '../../types';

type CreateStep = 'form' | 'assign';
type ViewMode = 'list' | 'create' | 'edit';

export function CustomChallenge() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [createStep, setCreateStep] = useState<CreateStep>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myCustomChallenges, setMyCustomChallenges] = useState<AdminChallenge[]>([]);
  const [editingChallenge, setEditingChallenge] = useState<AdminChallenge | null>(null);
  const { setCurrentScreen, activeUserChallenge, setActiveChallenge } = useChallengeStore();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalSteps, setGoalSteps] = useState(10000);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isImageHidden, setIsImageHidden] = useState(true);
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadlineDays, setDeadlineDays] = useState(7);
  const [deadlineHours, setDeadlineHours] = useState(0);
  const [deadlineMinutes, setDeadlineMinutes] = useState(0);
  const [assignTo, setAssignTo] = useState<'myself' | 'person' | 'group'>('myself');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [createdChallengeId, setCreatedChallengeId] = useState<string | null>(null);

  const familyMembers = [
    { id: '1', name: 'Mama', avatar: '👩', deviceId: 'device-mama' },
    { id: '2', name: 'Tata', avatar: '👨', deviceId: 'device-tata' },
    { id: '3', name: 'Kasia', avatar: '👧', deviceId: 'device-kasia' },
  ];

  useEffect(() => {
    loadMyCustomChallenges();
  }, []);

  const loadMyCustomChallenges = async () => {
    try {
      const data = await getMyCustomChallenges();
      setMyCustomChallenges(data);
    } catch (err) {
      console.error('Failed to load custom challenges:', err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const getTotalMinutes = () => {
    return deadlineDays * 24 * 60 + deadlineHours * 60 + deadlineMinutes;
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

      // Calculate deadline as ISO string from now + time limit
      let deadline: string | undefined;
      if (hasDeadline) {
        const totalMinutes = getTotalMinutes();
        const deadlineDate = new Date();
        deadlineDate.setMinutes(deadlineDate.getMinutes() + totalMinutes);
        deadline = deadlineDate.toISOString();
      }

      // Create challenge
      const challenge = await createCustomChallenge({
        title,
        description: description || 'Custom challenge',
        category: 'surprise',
        goal_steps: goalSteps,
        image_url: imageUrl,
        is_image_hidden: isImageHidden,
        deadline,
      });

      setCreatedChallengeId(challenge.id);
      setCreateStep('assign');
      setLoading(false);
    } catch (err) {
      console.error('Failed to create challenge:', err);
      setError('Failed to create challenge. Please try again.');
      setLoading(false);
    }
  };

  const handleAssignChallenge = async () => {
    if (!createdChallengeId) return;

    try {
      setLoading(true);
      setError(null);

      let deviceIds: string[] = [];
      
      if (assignTo === 'myself') {
        deviceIds = [];
      } else if (assignTo === 'person' && selectedMembers.length > 0) {
        const selectedMemberDevices = familyMembers
          .filter(m => selectedMembers.includes(m.id))
          .map(m => m.deviceId);
        deviceIds = selectedMemberDevices;
      } else if (assignTo === 'group') {
        deviceIds = familyMembers.map(m => m.deviceId);
      }

      await assignChallengeToUsers(createdChallengeId, deviceIds);
      
      // Reset form
      setTitle('');
      setDescription('');
      setGoalSteps(10000);
      setImageFile(null);
      setImagePreview(null);
      setIsImageHidden(true);
      setHasDeadline(false);
      setDeadlineDays(7);
      setDeadlineHours(0);
      setDeadlineMinutes(0);
      setAssignTo('myself');
      setSelectedMembers([]);
      setCreatedChallengeId(null);
      setCreateStep('form');
      setLoading(false);
      
      // Go back to home
      setCurrentScreen('home');
    } catch (err) {
      console.error('Failed to assign challenge:', err);
      setError('Failed to assign challenge. Please try again.');
      setLoading(false);
    }
  };

  const handleStartCustomChallenge = async (challengeId: string) => {
    if (activeUserChallenge) {
      setError('You already have an active challenge. Complete it first!');
      return;
    }

    try {
      const userChallenge = await startChallenge(challengeId);
      setActiveChallenge(userChallenge);
      setCurrentScreen('dashboard');
    } catch (err) {
      console.error('Failed to start challenge:', err);
      setError('Failed to start challenge. Please try again.');
    }
  };

  const handleDeleteCustomChallenge = async (challengeId: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      try {
        await deleteCustomChallenge(challengeId);
        loadMyCustomChallenges(); // Refresh list
      } catch (err) {
        console.error('Failed to delete challenge:', err);
        setError('Failed to delete challenge. Please try again.');
      }
    }
  };

  const handleEditChallenge = (challenge: AdminChallenge) => {
    setEditingChallenge(challenge);
    setTitle(challenge.title);
    setDescription(challenge.description || '');
    setGoalSteps(challenge.goal_steps);
    setImagePreview(challenge.image_url);
    setIsImageHidden(challenge.is_image_hidden || false);
    // TODO: Parse deadline if exists
    setViewMode('edit');
  };

  const handleUpdateChallenge = async () => {
    if (!title || (!imageFile && !imagePreview)) {
      setError('Please provide title and image');
      return;
    }

    if (!editingChallenge) return;

    try {
      setLoading(true);
      setError(null);

      // Upload new image if changed
      const imageUrl = imagePreview;
      if (imageFile) {
        const uploadedUrl = await uploadChallengeImage(imageFile);
        // Use uploadedUrl for update when API is ready
        console.log('New image uploaded:', uploadedUrl);
      }

      // Calculate deadline as ISO string from now + time limit
      const deadline: string | undefined = hasDeadline 
        ? new Date(Date.now() + getTotalMinutes() * 60000).toISOString()
        : undefined;

      // Update challenge via API
      // TODO: Add updateCustomChallenge API function
      console.log('Update challenge:', { 
        id: editingChallenge.id,
        title, 
        description, 
        goalSteps, 
        imageUrl, 
        isImageHidden, 
        deadline 
      });
      
      // For now, just show success and refresh
      setLoading(false);
      setViewMode('list');
      setEditingChallenge(null);
      loadMyCustomChallenges();
      
    } catch (err) {
      console.error('Failed to update challenge:', err);
      setError('Failed to update challenge. Please try again.');
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {/* Error Message */}
      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-200 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {viewMode === 'list' ? (
        /* LIST VIEW - My Challenges */
        <>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">My Custom Challenges</h2>
            <p className="text-gray-400 text-sm">
              Create, manage, and start your personalized challenges
            </p>
          </div>

          {/* Create New Button */}
          <button
            onClick={() => setViewMode('create')}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white px-6 py-4 rounded-xl font-bold text-base transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <span>✨</span>
            <span>Create New Challenge</span>
          </button>

          {/* MY CUSTOM CHALLENGES LIST */}
          {myCustomChallenges.length > 0 ? (
            <section>
              <h3 className="text-sm font-bold text-gray-400 mb-3 px-1 uppercase tracking-wider">
                Your Challenges ({myCustomChallenges.length})
              </h3>
              
              <div className="space-y-3">
                {myCustomChallenges.map((challenge) => (
                  <div
                    key={challenge.id}
                    className="bg-gradient-to-br from-amber-900/20 to-amber-800/20 border border-amber-700/30 rounded-2xl p-4 flex items-center gap-4"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-amber-500/30">
                      <img
                        src={challenge.image_url}
                        alt={challenge.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 right-1 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                        ✨
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-sm truncate">
                        {challenge.title}
                      </h3>
                      <div className="text-xs text-amber-200/60 flex items-center gap-2 mt-0.5">
                        <span>🎯 {(challenge.goal_steps / 1000).toFixed(0)}k steps</span>
                        <span>•</span>
                        <span>≈ {(challenge.goal_steps / 1250).toFixed(1)} km</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartCustomChallenge(challenge.id)}
                        disabled={!!activeUserChallenge}
                        className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-gray-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                        title={activeUserChallenge ? 'Complete current challenge first' : 'Start this challenge'}
                      >
                        Start
                      </button>
                      <button
                        onClick={() => handleEditChallenge(challenge)}
                        className="text-xs font-bold text-blue-400 bg-blue-900/20 hover:bg-blue-900/40 px-2.5 py-1.5 rounded-lg transition-colors"
                        title="Edit challenge"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteCustomChallenge(challenge.id, challenge.title)}
                        className="text-xs font-bold text-red-400 bg-red-900/20 hover:bg-red-900/40 px-2.5 py-1.5 rounded-lg transition-colors"
                        title="Delete challenge"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            /* Empty State */
            <div className="bg-[#151A25] border border-white/10 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📝</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No Custom Challenges Yet</h3>
              <p className="text-gray-400 text-sm mb-4">
                Create your first personalized challenge and start walking!
              </p>
            </div>
          )}
        </>
      ) : viewMode === 'create' ? (
        /* CREATE VIEW - Form */
        <>
          {createStep === 'form' ? (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Create Custom Challenge</h2>
                <p className="text-gray-400 text-sm">
                  Design your personal walking adventure
                </p>
              </div>

              {/* Title */}
              <section>
                <label className="text-sm font-semibold text-white mb-2 block px-1">
                  Challenge Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Walk to Paris"
                  className="w-full bg-[#151A25] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-base"
                />
              </section>

              {/* Description */}
              <section>
                <label className="text-sm font-semibold text-white mb-2 block px-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add some details about your challenge..."
                  rows={3}
                  className="w-full bg-[#151A25] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-base resize-none"
                />
              </section>

              {/* Image Upload */}
              <section>
                <label className="text-sm font-semibold text-white mb-2 block px-1">
                  Challenge Image <span className="text-red-400">*</span>
                </label>
                <div
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all ${
                    imagePreview
                      ? 'border-amber-500/50 bg-amber-500/5'
                      : 'border-white/20 bg-[#151A25] hover:border-amber-500/50 hover:bg-amber-500/5'
                  }`}
                >
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  {imagePreview ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                        <div className="text-white text-xs">✓ Image uploaded - click to change</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="text-white text-sm font-medium mb-1">Click to upload image</div>
                      <div className="text-gray-400 text-xs">PNG, JPG or WEBP (max 5MB)</div>
                    </div>
                  )}
                </div>
                
                {/* Blur checkbox */}
                <label className="flex items-center gap-3 mt-3 px-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isImageHidden}
                    onChange={(e) => setIsImageHidden(e.target.checked)}
                    className="w-5 h-5 rounded bg-[#151A25] border border-white/10 checked:bg-amber-500 checked:border-amber-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-300">Keep image hidden (blur) until goal reached</span>
                </label>
              </section>

              {/* Goal Steps Slider */}
              <section>
                <div className="flex items-center justify-between mb-3 px-1">
                  <label className="text-sm font-semibold text-white">
                    Goal Steps
                  </label>
                  <span className="text-2xl font-bold text-amber-400">
                    {(goalSteps / 1000).toFixed(0)}k
                  </span>
                </div>
                
                <input
                  type="range"
                  min="1000"
                  max="100000"
                  step="1000"
                  value={goalSteps}
                  onChange={(e) => setGoalSteps(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  style={{
                    background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${((goalSteps - 1000) / 99000) * 100}%, #374151 ${((goalSteps - 1000) / 99000) * 100}%, #374151 100%)`
                  }}
                />
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>1k</span>
                  <span>50k</span>
                  <span>100k</span>
                </div>
                <div className="text-xs text-gray-400 px-1 mt-2">
                  ≈ {(goalSteps / 1250).toFixed(1)} km
                </div>
              </section>

              {/* Time Limit */}
              <section>
                <label className="flex items-center gap-3 mb-3 px-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasDeadline}
                    onChange={(e) => setHasDeadline(e.target.checked)}
                    className="w-5 h-5 rounded bg-[#151A25] border border-white/10 checked:bg-amber-500 checked:border-amber-500 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-white">Set time limit</span>
                </label>
                
                {hasDeadline && (
                  <div className="space-y-3">
                    <div className="bg-[#151A25] border border-white/10 rounded-xl p-4">
                      <div className="text-xs text-gray-400 mb-3">Time will start when challenge begins</div>
                      
                      {/* Days */}
                      <div className="mb-4">
                        <label className="text-xs text-gray-400 mb-2 block">Days</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="365"
                            value={deadlineDays}
                            onChange={(e) => setDeadlineDays(parseInt(e.target.value))}
                            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                          />
                          <span className="text-white font-semibold w-12 text-right">{deadlineDays}d</span>
                        </div>
                      </div>

                      {/* Hours */}
                      <div className="mb-4">
                        <label className="text-xs text-gray-400 mb-2 block">Hours</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="23"
                            value={deadlineHours}
                            onChange={(e) => setDeadlineHours(parseInt(e.target.value))}
                            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                          />
                          <span className="text-white font-semibold w-12 text-right">{deadlineHours}h</span>
                        </div>
                      </div>

                      {/* Minutes */}
                      <div>
                        <label className="text-xs text-gray-400 mb-2 block">Minutes</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="59"
                            value={deadlineMinutes}
                            onChange={(e) => setDeadlineMinutes(parseInt(e.target.value))}
                            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                          />
                          <span className="text-white font-semibold w-12 text-right">{deadlineMinutes}m</span>
                        </div>
                      </div>

                      {/* Total time display */}
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Total time limit:</span>
                          <span className="text-sm font-bold text-amber-400">
                            {deadlineDays > 0 && `${deadlineDays}d `}
                            {deadlineHours > 0 && `${deadlineHours}h `}
                            {deadlineMinutes > 0 && `${deadlineMinutes}m`}
                            {deadlineDays === 0 && deadlineHours === 0 && deadlineMinutes === 0 && 'Not set'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Create Button */}
              <button
                onClick={handleCreateChallenge}
                disabled={!title || !imageFile || loading}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:from-gray-700 disabled:to-gray-700 text-white px-6 py-4 rounded-xl font-bold text-base transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Next: Assign Challenge</span>
                  </>
                )}
              </button>
            </>
          ) : (
            /* ASSIGN STEP */
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">✅</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Challenge Created!</h2>
                <p className="text-gray-400 text-sm">
                  Who should take on this challenge?
                </p>
              </div>

              {/* Assignment Options */}
              <section className="space-y-3">
                <button
                  onClick={() => setAssignTo('myself')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    assignTo === 'myself'
                      ? 'bg-amber-600/20 border-amber-500 shadow-lg shadow-amber-500/20'
                      : 'bg-[#151A25] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🚶‍♂️</span>
                    <div className="flex-1">
                      <div className="font-semibold text-white">Start for Myself</div>
                      <div className="text-xs text-gray-400">Begin walking immediately</div>
                    </div>
                    {assignTo === 'myself' && (
                      <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => setAssignTo('person')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    assignTo === 'person'
                      ? 'bg-amber-600/20 border-amber-500 shadow-lg shadow-amber-500/20'
                      : 'bg-[#151A25] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👤</span>
                    <div className="flex-1">
                      <div className="font-semibold text-white">Assign to Someone</div>
                      <div className="text-xs text-gray-400">Choose family member</div>
                    </div>
                    {assignTo === 'person' && (
                      <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>

                {assignTo === 'person' && (
                  <div className="grid grid-cols-3 gap-2 ml-11">
                    {familyMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => {
                          if (selectedMembers.includes(member.id)) {
                            setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                          } else {
                            setSelectedMembers([...selectedMembers, member.id]);
                          }
                        }}
                        className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                          selectedMembers.includes(member.id)
                            ? 'bg-amber-600/20 border-amber-500'
                            : 'bg-[#151A25] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <span className="text-2xl">{member.avatar}</span>
                        <span className="text-[10px] text-white font-medium">{member.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setAssignTo('group')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    assignTo === 'group'
                      ? 'bg-amber-600/20 border-amber-500 shadow-lg shadow-amber-500/20'
                      : 'bg-[#151A25] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👥</span>
                    <div className="flex-1">
                      <div className="font-semibold text-white">Assign to Everyone</div>
                      <div className="text-xs text-gray-400">All family members</div>
                    </div>
                    {assignTo === 'group' && (
                      <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              </section>

              {/* Assign Button */}
              <button
                onClick={handleAssignChallenge}
                disabled={loading || (assignTo === 'person' && selectedMembers.length === 0)}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:from-gray-700 disabled:to-gray-700 text-white px-6 py-4 rounded-xl font-bold text-base transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
                    <span>🎯</span>
                    <span>Assign Challenge</span>
                  </>
                )}
              </button>
            </>
          )}
        </>
      ) : (
        /* EDIT VIEW */
        <>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Edit Custom Challenge</h2>
            <p className="text-gray-400 text-sm">
              Update your personalized challenge
            </p>
          </div>

          {/* Title */}
          <section>
            <label className="text-sm font-semibold text-white mb-2 block px-1">
              Challenge Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Walk to Paris"
              className="w-full bg-[#151A25] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-base"
            />
          </section>

          {/* Description */}
          <section>
            <label className="text-sm font-semibold text-white mb-2 block px-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add some details about your challenge..."
              rows={3}
              className="w-full bg-[#151A25] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-base resize-none"
            />
          </section>

          {/* Image Upload */}
          <section>
            <label className="text-sm font-semibold text-white mb-2 block px-1">
              Challenge Image <span className="text-red-400">*</span>
            </label>
            <div
              onClick={() => document.getElementById('image-upload')?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all ${
                imagePreview
                  ? 'border-amber-500/50 bg-amber-500/5'
                  : 'border-white/20 bg-[#151A25] hover:border-amber-500/50 hover:bg-amber-500/5'
              }`}
            >
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              {imagePreview ? (
                <div className="relative aspect-video rounded-xl overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                    <div className="text-white text-xs">✓ Image uploaded - click to change</div>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-white text-sm font-medium mb-1">Click to upload image</div>
                  <div className="text-gray-400 text-xs">PNG, JPG or WEBP (max 5MB)</div>
                </div>
              )}
            </div>
            
            {/* Blur checkbox */}
            <label className="flex items-center gap-3 mt-3 px-1 cursor-pointer">
              <input
                type="checkbox"
                checked={isImageHidden}
                onChange={(e) => setIsImageHidden(e.target.checked)}
                className="w-5 h-5 rounded bg-[#151A25] border border-white/10 checked:bg-amber-500 checked:border-amber-500 cursor-pointer"
              />
              <span className="text-sm text-gray-300">Keep image hidden (blur) until goal reached</span>
            </label>
          </section>

          {/* Goal Steps Slider */}
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <label className="text-sm font-semibold text-white">
                Goal Steps
              </label>
              <span className="text-2xl font-bold text-amber-400">
                {(goalSteps / 1000).toFixed(0)}k
              </span>
            </div>
            
            <input
              type="range"
              min="1000"
              max="100000"
              step="1000"
              value={goalSteps}
              onChange={(e) => setGoalSteps(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              style={{
                background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${((goalSteps - 1000) / 99000) * 100}%, #374151 ${((goalSteps - 1000) / 99000) * 100}%, #374151 100%)`
              }}
            />
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>1k</span>
              <span>50k</span>
              <span>100k</span>
            </div>
            <div className="text-xs text-gray-400 px-1 mt-2">
              ≈ {(goalSteps / 1250).toFixed(1)} km
            </div>
          </section>

          {/* Time Limit */}
          <section>
            <label className="flex items-center gap-3 mb-3 px-1 cursor-pointer">
              <input
                type="checkbox"
                checked={hasDeadline}
                onChange={(e) => setHasDeadline(e.target.checked)}
                className="w-5 h-5 rounded bg-[#151A25] border border-white/10 checked:bg-amber-500 checked:border-amber-500 cursor-pointer"
              />
              <span className="text-sm font-semibold text-white">Set time limit</span>
            </label>
            
            {hasDeadline && (
              <div className="space-y-3">
                <div className="bg-[#151A25] border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-gray-400 mb-3">Time will start when challenge begins</div>
                  
                  {/* Days */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 mb-2 block">Days</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="365"
                        value={deadlineDays}
                        onChange={(e) => setDeadlineDays(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <span className="text-white font-semibold w-12 text-right">{deadlineDays}d</span>
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 mb-2 block">Hours</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="23"
                        value={deadlineHours}
                        onChange={(e) => setDeadlineHours(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <span className="text-white font-semibold w-12 text-right">{deadlineHours}h</span>
                    </div>
                  </div>

                  {/* Minutes */}
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Minutes</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="59"
                        value={deadlineMinutes}
                        onChange={(e) => setDeadlineMinutes(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <span className="text-white font-semibold w-12 text-right">{deadlineMinutes}m</span>
                    </div>
                  </div>

                  {/* Total time display */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Total time limit:</span>
                      <span className="text-sm font-bold text-amber-400">
                        {deadlineDays > 0 && `${deadlineDays}d `}
                        {deadlineHours > 0 && `${deadlineHours}h `}
                        {deadlineMinutes > 0 && `${deadlineMinutes}m`}
                        {deadlineDays === 0 && deadlineHours === 0 && deadlineMinutes === 0 && 'Not set'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Update Button */}
          <button
            onClick={handleUpdateChallenge}
            disabled={!title || (!imageFile && !imagePreview) || loading}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:from-gray-700 disabled:to-gray-700 text-white px-6 py-4 rounded-xl font-bold text-base transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Updating...</span>
              </>
            ) : (
              <>
                <span>✏️</span>
                <span>Update Challenge</span>
              </>
            )}
          </button>
        </>
      )}
    </motion.div>
  );
}