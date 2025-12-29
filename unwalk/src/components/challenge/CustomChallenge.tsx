import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { createCustomChallenge, uploadChallengeImage, getMyCustomChallenges, deleteCustomChallenge, startChallenge, updateCustomChallenge } from '../../lib/api';
import { teamService, type TeamMember } from '../../lib/auth';
import type { AdminChallenge } from '../../types';
import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';

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
  const userProfile = useChallengeStore((s) => s.userProfile);
  const isGuest = userProfile?.is_guest ?? false;

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
  const [assignTo, setAssignTo] = useState<'myself' | 'person'>('myself');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [createdChallengeId, setCreatedChallengeId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningChallenge, setAssigningChallenge] = useState<AdminChallenge | null>(null);
  const [assignModalTo, setAssignModalTo] = useState<'myself' | 'person'>('person');
  const [assignModalSelected, setAssignModalSelected] = useState<string[]>([]);

  const goalStepPresets = [1000, 5000, 10000, 15000, 25000, 50000];
  const timePresets = [
    { label: '1h', minutes: 60 },
    { label: '12h', minutes: 12 * 60 },
    { label: '24h', minutes: 24 * 60 },
    { label: '3d', minutes: 3 * 24 * 60 },
    { label: '7d', minutes: 7 * 24 * 60 },
    { label: '14d', minutes: 14 * 24 * 60 },
  ];

  useEffect(() => {
    loadMyCustomChallenges();
  }, []);

  useEffect(() => {
    const loadTeam = async () => {
      if (isGuest) {
        setTeamMembers([]);
        return;
      }
      try {
        const members = await teamService.getTeamMembers();
        setTeamMembers(members || []);
      } catch (e) {
        console.error('❌ [CustomChallenge] Failed to load team members:', e);
        setTeamMembers([]);
      }
    };

    loadTeam();
  }, [isGuest, userProfile?.id]);

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

  const getDeadlineTotalMinutes = () => deadlineDays * 24 * 60 + deadlineHours * 60 + deadlineMinutes;
  const setDeadlineFromTotalMinutes = (total: number) => {
    const t = Math.max(0, Math.round(total));
    const d = Math.floor(t / (24 * 60));
    const rem = t % (24 * 60);
    const h = Math.floor(rem / 60);
    const m = rem % 60;
    setDeadlineDays(d);
    setDeadlineHours(h);
    setDeadlineMinutes(m);
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
        const totalMinutes = getDeadlineTotalMinutes();
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

      if (assignTo === 'myself') {
        // Start the newly created challenge for the current user immediately
        const userChallenge = await startChallenge(createdChallengeId);
        setActiveChallenge(userChallenge);
        setCurrentScreen('dashboard');
        return;
      }

      if (assignTo === 'person' && selectedMembers.length > 0) {
        // Assign to a specific team member (by user id)
        await teamService.assignChallenge(selectedMembers[0], createdChallengeId);
      }

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

      // Go back to home
      setCurrentScreen('home');
    } catch (err) {
      console.error('Failed to assign challenge:', err);
      setError('Failed to assign challenge. Please try again.');
    } finally {
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
      let imageUrl = imagePreview || editingChallenge.image_url;
      if (imageFile) {
        imageUrl = await uploadChallengeImage(imageFile);
      }

      const deadline: string | null = hasDeadline
        ? new Date(Date.now() + getDeadlineTotalMinutes() * 60000).toISOString()
        : null;

      const updated = await updateCustomChallenge(editingChallenge.id, {
        title,
        description: description || 'Custom challenge',
        goal_steps: goalSteps,
        image_url: imageUrl,
        is_image_hidden: isImageHidden,
        deadline,
      });

      // Update local list immediately
      setMyCustomChallenges((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));

      setLoading(false);
      setViewMode('list');
      setEditingChallenge(null);
      // clear file selection
      setImageFile(null);
      // keep preview as the saved url
      setImagePreview(updated.image_url);
    } catch (err) {
      console.error('Failed to update challenge:', err);
      setError('Failed to update challenge. Please try again.');
      setLoading(false);
    }
  };

  const closeAssignModal = () => {
    setAssignModalOpen(false);
    setAssigningChallenge(null);
    setAssignModalSelected([]);
    setAssignModalTo('person');
  };

  const openAssignExisting = (challenge: AdminChallenge) => {
    setAssigningChallenge(challenge);
    setAssignModalTo('person');
    setAssignModalSelected([]);
    setAssignModalOpen(true);
  };

  const handleAssignExisting = async () => {
    if (!assigningChallenge) return;

    try {
      setLoading(true);
      setError(null);

      if (assignModalTo === 'myself') {
        await handleStartCustomChallenge(assigningChallenge.id);
        closeAssignModal();
        return;
      }

      const memberId = assignModalSelected[0];
      if (!memberId) {
        setError('Select a team member');
        return;
      }
      await teamService.assignChallenge(memberId, assigningChallenge.id);

      closeAssignModal();
    } catch (e) {
      console.error('❌ [CustomChallenge] Failed to assign existing custom challenge:', e);
      setError('Failed to assign challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B101B] text-gray-900 dark:text-white pb-24 font-sans selection:bg-blue-500/30">
      <AppHeader />

      <main className="pt-6 pb-6 px-4 space-y-6">
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
              {/* Hero */}
              <div className="text-center mb-6">
                <div className="text-xs font-black text-amber-400/90 uppercase tracking-[0.2em] mb-2">
                  Your creation
                </div>
                <h2 className="text-3xl font-black text-white mb-2 tracking-tight">My Custom Challenges</h2>
                <p className="text-white/60 text-sm leading-relaxed">
                  Create a challenge, then assign it to yourself or a teammate.
                </p>
              </div>

              {/* Create New Button */}
              <button
                onClick={() => {
                  setViewMode('create');
                  setCreateStep('form');
                }}
                className="relative w-full overflow-hidden rounded-3xl p-5 text-left border border-amber-500/20 bg-gradient-to-br from-amber-600/30 via-amber-500/10 to-[#151A25] hover:border-amber-500/40 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black text-amber-300 uppercase tracking-widest">New</div>
                    <div className="text-xl font-black text-white mt-1">Create New Challenge</div>
                    <div className="text-xs text-white/60 mt-1">Pick steps, add image, assign</div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl">
                    ✨
                  </div>
                </div>
              </button>

              {/* MY CUSTOM CHALLENGES LIST */}
              {myCustomChallenges.length > 0 ? (
                <section>
                  <h3 className="text-xs font-bold text-gray-400 mb-3 px-1 uppercase tracking-wider">
                    Your Challenges ({myCustomChallenges.length})
                  </h3>

                  <div className="space-y-3">
                    {myCustomChallenges.map((challenge) => (
                      <div
                        key={challenge.id}
                        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#151A25] via-[#121827] to-[#0E1423] p-4"
                      >
                        {/* Subtle image backdrop */}
                        <div
                          className="absolute inset-0 opacity-20"
                          style={{
                            backgroundImage: `url(${challenge.image_url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0B101B] via-[#0B101B]/70 to-transparent" />
                        <div className="absolute -top-24 -right-24 w-56 h-56 bg-amber-500/15 blur-3xl rounded-full" />

                        <div className="relative flex items-center gap-4">
                          {/* Thumbnail */}
                          <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 ring-2 ring-white/10">
                            <img src={challenge.image_url} alt={challenge.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/10" />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-black text-white text-base truncate">{challenge.title}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="inline-flex items-center rounded-xl bg-white/10 px-2.5 py-1 border border-white/10 text-xs font-bold text-white/80">
                                🎯 {(challenge.goal_steps / 1000).toFixed(0)}k steps
                              </span>
                              <span className="text-xs text-white/50">≈ {(challenge.goal_steps / 1250).toFixed(1)} km</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={() => openAssignExisting(challenge)}
                              className="text-xs font-black text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 px-4 py-2 rounded-2xl transition-colors shadow-lg shadow-amber-500/10"
                              title="Assign"
                            >
                              Assign
                            </button>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditChallenge(challenge)}
                                className="text-xs font-bold text-white/70 bg-white/10 hover:bg-white/15 px-3 py-2 rounded-2xl transition-colors"
                                title="Edit challenge"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteCustomChallenge(challenge.id, challenge.title)}
                                className="text-xs font-bold text-red-300 bg-red-500/15 hover:bg-red-500/20 px-3 py-2 rounded-2xl transition-colors"
                                title="Delete challenge"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                /* Empty State */
                <div className="relative overflow-hidden bg-gradient-to-br from-[#151A25] to-[#1A1F2E] border border-white/10 rounded-3xl p-8 text-center">
                  <div className="absolute -top-20 -left-20 w-60 h-60 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-full blur-3xl" />
                  <div className="relative">
                    <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl">✨</span>
                    </div>
                    <h3 className="text-lg font-black text-white mb-2">Create your first custom challenge</h3>
                    <p className="text-white/60 text-sm mb-4">
                      Make it personal: set steps, add a photo, then assign it.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : viewMode === 'create' ? (
            /* CREATE VIEW - Form */
            <>
              {/* Top back */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('list');
                    setCreateStep('form');
                  }}
                  className="text-sm font-black text-white/70 hover:text-white px-1"
                >
                  ← Back
                </button>
              </div>

              {createStep === 'form' ? (
                <>
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-black text-white mb-2">Create Custom Challenge</h2>
                    <p className="text-gray-400 text-sm">Design your personal walking adventure</p>
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
                    <label className="text-sm font-semibold text-white mb-2 block px-1">Description (optional)</label>
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
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                            <div className="text-white text-xs">✓ Image uploaded - click to change</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
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

                  {/* Goal Steps */}
                  <section>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <label className="text-sm font-semibold text-white">Goal Steps</label>
                      <span className="text-2xl font-bold text-amber-400">{(goalSteps / 1000).toFixed(0)}k</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {goalStepPresets.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setGoalSteps(p)}
                          className={`px-3 py-3 rounded-2xl text-sm font-black border transition-all ${
                            goalSteps === p
                              ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                              : 'bg-[#151A25] border-white/10 text-white/70 hover:border-white/20'
                          }`}
                        >
                          {(p / 1000).toFixed(0)}k
                        </button>
                      ))}
                    </div>

                    <div className="text-xs text-gray-400 px-1 mt-2">≈ {(goalSteps / 1250).toFixed(1)} km</div>
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

                          <div className="grid grid-cols-3 gap-2 mb-4">
                            {timePresets.map((p) => (
                              <button
                                key={p.label}
                                type="button"
                                onClick={() => setDeadlineFromTotalMinutes(p.minutes)}
                                className={`px-3 py-3 rounded-2xl text-sm font-black border transition-all ${
                                  getDeadlineTotalMinutes() === p.minutes
                                    ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                                    : 'bg-[#151A25] border-white/10 text-white/70 hover:border-white/20'
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>

                          <div className="pt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400">Total time limit:</span>
                              <span className="text-sm font-bold text-amber-400">
                                {(() => {
                                  const t = getDeadlineTotalMinutes();
                                  const d = Math.floor(t / (24 * 60));
                                  const h = Math.floor((t % (24 * 60)) / 60);
                                  const m = t % 60;
                                  if (t === 0) return 'Not set';
                                  return `${d > 0 ? `${d}d ` : ''}${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m` : ''}`.trim();
                                })()}
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
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCreateStep('form')}
                      className="text-sm font-black text-white/70 hover:text-white px-1"
                    >
                      ← Back
                    </button>
                  </div>

                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl">✅</span>
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">Challenge Created!</h2>
                    <p className="text-gray-400 text-sm">Who should take on this challenge?</p>
                  </div>

                  <section className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setAssignTo('myself')}
                      className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                        assignTo === 'myself'
                          ? 'bg-amber-600/15 border-amber-500/60'
                          : 'bg-[#151A25] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="font-black text-white">Myself</div>
                      <div className="text-xs text-white/50">Start now on this device</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAssignTo('person')}
                      className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                        assignTo === 'person'
                          ? 'bg-amber-600/15 border-amber-500/60'
                          : 'bg-[#151A25] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="font-black text-white">Someone</div>
                      <div className="text-xs text-white/50">Pick one team member</div>
                    </button>

                    {assignTo === 'person' && (
                      <div className="grid grid-cols-3 gap-2">
                        {teamMembers.map((member) => {
                          const label = member.custom_name || member.display_name || member.email;
                          const avatar = member.avatar_url;
                          const isSelected = selectedMembers.includes(member.member_id);

                          return (
                            <button
                              key={member.member_id}
                              type="button"
                              onClick={() => setSelectedMembers(isSelected ? [] : [member.member_id])}
                              className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                                isSelected
                                  ? 'bg-amber-600/20 border-amber-500'
                                  : 'bg-[#151A25] border-white/10 hover:border-white/20'
                              }`}
                            >
                              {avatar ? (
                                <img src={avatar} alt={label} className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-white/10 grid place-items-center text-white/70 font-black">👤</div>
                              )}
                              <span className="text-[11px] text-white font-bold truncate w-full text-center">{label}</span>
                            </button>
                          );
                        })}
                        {teamMembers.length === 0 && (
                          <div className="col-span-3 text-xs text-white/50">No team members yet. Invite someone in Team first.</div>
                        )}
                      </div>
                    )}
                  </section>

                  <button
                    onClick={handleAssignChallenge}
                    disabled={loading || (assignTo === 'person' && selectedMembers.length === 0)}
                    className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-700 text-white px-6 py-4 rounded-2xl font-black text-base transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              {/* Top back */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('list');
                    setEditingChallenge(null);
                  }}
                  className="text-sm font-black text-white/70 hover:text-white px-1"
                >
                  ← Back
                </button>
              </div>

              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-white mb-2">Edit Custom Challenge</h2>
                <p className="text-gray-400 text-sm">Update your personal walking adventure</p>
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
                <label className="text-sm font-semibold text-white mb-2 block px-1">Description (optional)</label>
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
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                        <div className="text-white text-xs">✓ Image uploaded - click to change</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
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

              {/* Goal Steps */}
              <section>
                <div className="flex items-center justify-between mb-3 px-1">
                  <label className="text-sm font-semibold text-white">Goal Steps</label>
                  <span className="text-2xl font-bold text-amber-400">{(goalSteps / 1000).toFixed(0)}k</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {goalStepPresets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setGoalSteps(p)}
                      className={`px-3 py-3 rounded-2xl text-sm font-black border transition-all ${
                        goalSteps === p
                          ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                          : 'bg-[#151A25] border-white/10 text-white/70 hover:border-white/20'
                      }`}
                    >
                      {(p / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>

                <div className="text-xs text-gray-400 px-1 mt-2">≈ {(goalSteps / 1250).toFixed(1)} km</div>
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

                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {timePresets.map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => setDeadlineFromTotalMinutes(p.minutes)}
                            className={`px-3 py-3 rounded-2xl text-sm font-black border transition-all ${
                              getDeadlineTotalMinutes() === p.minutes
                                ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                                : 'bg-[#151A25] border-white/10 text-white/70 hover:border-white/20'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>

                      <div className="pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Total time limit:</span>
                          <span className="text-sm font-bold text-amber-400">
                            {(() => {
                              const t = getDeadlineTotalMinutes();
                              const d = Math.floor(t / (24 * 60));
                              const h = Math.floor((t % (24 * 60)) / 60);
                              const m = t % 60;
                              if (t === 0) return 'Not set';
                              return `${d > 0 ? `${d}d ` : ''}${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m` : ''}`.trim();
                            })()}
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
                    <span>✨</span>
                    <span>Update Challenge</span>
                  </>
                )}
              </button>
            </>
          )}

          {assignModalOpen && assigningChallenge && (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4"
              onClick={closeAssignModal}
            >
              <div
                className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0B101B] p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-white font-black">Assign</div>
                    <div className="text-white/50 text-xs truncate max-w-[260px]">{assigningChallenge.title}</div>
                  </div>
                  <button
                    type="button"
                    className="text-white/60 hover:text-white text-sm font-bold"
                    onClick={closeAssignModal}
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setAssignModalTo('myself')}
                    className={`w-full p-3 rounded-2xl border text-left ${
                      assignModalTo === 'myself'
                        ? 'bg-amber-600/15 border-amber-500/60'
                        : 'bg-[#151A25] border-white/10'
                    }`}
                  >
                    <div className="font-black text-white">Myself</div>
                    <div className="text-xs text-white/50">Start now on this device</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignModalTo('person')}
                    className={`w-full p-3 rounded-2xl border text-left ${
                      assignModalTo === 'person'
                        ? 'bg-amber-600/15 border-amber-500/60'
                        : 'bg-[#151A25] border-white/10'
                    }`}
                  >
                    <div className="font-black text-white">Someone</div>
                    <div className="text-xs text-white/50">Pick one team member</div>
                  </button>

                  {assignModalTo === 'person' && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {teamMembers.map((m) => {
                        const label = m.custom_name || m.display_name || m.email;
                        const selected = assignModalSelected[0] === m.member_id;
                        return (
                          <button
                            key={m.member_id}
                            type="button"
                            onClick={() => setAssignModalSelected(selected ? [] : [m.member_id])}
                            className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                              selected
                                ? 'bg-amber-600/20 border-amber-500'
                                : 'bg-[#151A25] border-white/10 hover:border-white/20'
                            }`}
                          >
                            {m.avatar_url ? (
                              <img src={m.avatar_url} alt={label} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-white/10 grid place-items-center text-white/70 font-black">👤</div>
                            )}
                            <span className="text-[11px] text-white font-bold truncate w-full text-center">{label}</span>
                          </button>
                        );
                      })}
                      {teamMembers.length === 0 && (
                        <div className="col-span-3 text-xs text-white/50">No team members yet.</div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={loading || (assignModalTo === 'person' && assignModalSelected.length === 0)}
                    onClick={handleAssignExisting}
                    className="w-full mt-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-700 text-white py-3 rounded-2xl font-black text-sm transition-all"
                  >
                    {loading ? 'Assigning...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      <BottomNavigation currentScreen="library" />
    </div>
  );
}