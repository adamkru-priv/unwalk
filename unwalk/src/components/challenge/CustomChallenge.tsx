import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { createCustomChallenge, uploadChallengeImage, getMyCustomChallenges, deleteCustomChallenge, startChallenge, updateCustomChallenge } from '../../lib/api';
import { teamService, type TeamMember } from '../../lib/auth';
import type { AdminChallenge } from '../../types';
import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';

type ViewMode = 'list' | 'create' | 'edit';
type AssignMode = 'solo' | 'team';

export function CustomChallenge() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myCustomChallenges, setMyCustomChallenges] = useState<AdminChallenge[]>([]);
  const [editingChallenge, setEditingChallenge] = useState<AdminChallenge | null>(null);
  const { setCurrentScreen, activeUserChallenge, setActiveChallenge } = useChallengeStore();
  const userProfile = useChallengeStore((s) => s.userProfile);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalSteps, setGoalSteps] = useState(10000);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isImageHidden, setIsImageHidden] = useState(true);
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadlineHours, setDeadlineHours] = useState(24);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningChallenge, setAssigningChallenge] = useState<AdminChallenge | null>(null);
  const [assignMode, setAssignMode] = useState<AssignMode>('solo');
  const [selectedMember, setSelectedMember] = useState<string>('');

  const goalStepPresets = [1000, 5000, 10000, 15000, 25000, 50000];
  const timePresets = [
    { label: '1h', hours: 1 },
    { label: '12h', hours: 12 },
    { label: '24h', hours: 24 },
    { label: '3d', hours: 72 },
    { label: '7d', hours: 168 },
  ];

  useEffect(() => {
    loadMyCustomChallenges();
    loadTeamMembers();
  }, []);

  const loadMyCustomChallenges = async () => {
    try {
      const data = await getMyCustomChallenges();
      setMyCustomChallenges(data);
    } catch (err) {
      console.error('Failed to load custom challenges:', err);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const members = await teamService.getTeamMembers();
      setTeamMembers(members || []);
    } catch (e) {
      console.error('Failed to load team members:', e);
      setTeamMembers([]);
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

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setGoalSteps(10000);
    setImageFile(null);
    setImagePreview(null);
    setIsImageHidden(true);
    setHasDeadline(false);
    setDeadlineHours(24);
    setEditingChallenge(null);
  };

  const handleCreateChallenge = async () => {
    if (!title || !imageFile) {
      setError('Please provide title and image');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const imageUrl = await uploadChallengeImage(imageFile);

      let deadline: string | undefined;
      if (hasDeadline) {
        const deadlineDate = new Date();
        deadlineDate.setHours(deadlineDate.getHours() + deadlineHours);
        deadline = deadlineDate.toISOString();
      }

      await createCustomChallenge({
        title,
        description: description || 'Custom challenge',
        category: 'surprise',
        goal_steps: goalSteps,
        image_url: imageUrl,
        is_image_hidden: isImageHidden,
        deadline,
      });

      await loadMyCustomChallenges();
      resetForm();
      setViewMode('list');
    } catch (err) {
      console.error('Failed to create challenge:', err);
      setError('Failed to create challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChallenge = async () => {
    if (!title || (!imageFile && !imagePreview) || !editingChallenge) {
      setError('Please provide title and image');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let imageUrl = imagePreview || editingChallenge.image_url;
      if (imageFile) {
        imageUrl = await uploadChallengeImage(imageFile);
      }

      const deadline: string | null = hasDeadline
        ? new Date(Date.now() + deadlineHours * 3600000).toISOString()
        : null;

      const updated = await updateCustomChallenge(editingChallenge.id, {
        title,
        description: description || 'Custom challenge',
        goal_steps: goalSteps,
        image_url: imageUrl,
        is_image_hidden: isImageHidden,
        deadline,
      });

      setMyCustomChallenges((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      resetForm();
      setViewMode('list');
    } catch (err) {
      console.error('Failed to update challenge:', err);
      setError('Failed to update challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openAssignModal = (challenge: AdminChallenge) => {
    setAssigningChallenge(challenge);
    setAssignMode('solo');
    setSelectedMember('');
    setAssignModalOpen(true);
  };

  const closeAssignModal = () => {
    setAssignModalOpen(false);
    setAssigningChallenge(null);
    setSelectedMember('');
    setAssignMode('solo');
  };

  const handleAssign = async () => {
    if (!assigningChallenge) return;

    try {
      setLoading(true);
      setError(null);

      if (assignMode === 'solo') {
        if (selectedMember === 'myself') {
          // Start for self
          const userChallenge = await startChallenge(assigningChallenge.id);
          setActiveChallenge(userChallenge);
          setCurrentScreen('dashboard');
        } else {
          // Assign to team member (solo challenge)
          await teamService.assignChallenge(selectedMember, assigningChallenge.id);
          closeAssignModal();
        }
      } else {
        // Team challenge - assign to selected member
        await teamService.assignTeamChallenge(selectedMember, assigningChallenge.id);
        closeAssignModal();
      }
    } catch (e) {
      console.error('Failed to assign challenge:', e);
      setError('Failed to assign challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChallenge = async (challengeId: string, title: string) => {
    if (confirm(`Delete "${title}"?\n\nThis cannot be undone.`)) {
      try {
        await deleteCustomChallenge(challengeId);
        await loadMyCustomChallenges();
      } catch (err) {
        console.error('Failed to delete challenge:', err);
        setError('Failed to delete challenge.');
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
    setViewMode('edit');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B101B] text-gray-900 dark:text-white pb-24">
      <AppHeader />

      <main className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {viewMode === 'list' ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold">My Custom Challenges</h1>
                <p className="text-sm text-gray-600 dark:text-white/60">Create and share your own challenges</p>
              </div>
              <button
                onClick={() => setViewMode('create')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm"
              >
                + Create
              </button>
            </div>

            {myCustomChallenges.length > 0 ? (
              <div className="space-y-3">
                {myCustomChallenges.map((challenge) => (
                  <div
                    key={challenge.id}
                    className="bg-white dark:bg-[#151A25] rounded-2xl p-4 border border-gray-200 dark:border-white/10"
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={challenge.image_url}
                        alt={challenge.title}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{challenge.title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-white/60">
                          <span>🎯 {(challenge.goal_steps / 1000).toFixed(0)}k steps</span>
                          <span>•</span>
                          <span>≈ {(challenge.goal_steps / 1250).toFixed(1)} km</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => openAssignModal(challenge)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium text-sm"
                        >
                          Assign
                        </button>
                        <button
                          onClick={() => handleEditChallenge(challenge)}
                          className="bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 px-2 py-1.5 rounded-lg text-sm"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteChallenge(challenge.id, challenge.title)}
                          className="bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1.5 rounded-lg text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-[#151A25] rounded-2xl p-8 text-center border border-gray-200 dark:border-white/10">
                <div className="text-4xl mb-3">✨</div>
                <h3 className="font-bold mb-2">No custom challenges yet</h3>
                <p className="text-sm text-gray-600 dark:text-white/60 mb-4">
                  Create your first challenge to get started
                </p>
                <button
                  onClick={() => setViewMode('create')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm"
                >
                  Create Challenge
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  resetForm();
                  setViewMode('list');
                }}
                className="text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                ← Back
              </button>
              <h1 className="text-xl font-bold">{viewMode === 'edit' ? 'Edit' : 'Create'} Challenge</h1>
              <div className="w-16"></div>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Walk to Paris"
                  className="w-full bg-white dark:bg-[#151A25] border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details..."
                  rows={3}
                  className="w-full bg-white dark:bg-[#151A25] border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Image */}
              <div>
                <label className="block text-sm font-medium mb-2">Image *</label>
                <div
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl p-6 cursor-pointer hover:border-blue-500 transition-colors"
                >
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                  ) : (
                    <div className="text-center text-gray-500 dark:text-white/50">
                      <div className="text-3xl mb-2">📷</div>
                      <div className="text-sm">Click to upload image</div>
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-2 mt-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isImageHidden}
                    onChange={(e) => setIsImageHidden(e.target.checked)}
                    className="rounded"
                  />
                  Keep image hidden until completed
                </label>
              </div>

              {/* Goal Steps */}
              <div>
                <label className="block text-sm font-medium mb-2">Goal Steps</label>
                <div className="grid grid-cols-3 gap-2">
                  {goalStepPresets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setGoalSteps(preset)}
                      className={`py-2 rounded-lg font-medium text-sm ${
                        goalSteps === preset
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15'
                      }`}
                    >
                      {(preset / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>
                <div className="text-xs text-gray-500 dark:text-white/50 mt-2">
                  ≈ {(goalSteps / 1250).toFixed(1)} km
                </div>
              </div>

              {/* Time Limit */}
              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={hasDeadline}
                    onChange={(e) => setHasDeadline(e.target.checked)}
                    className="rounded"
                  />
                  Add time limit
                </label>
                {hasDeadline && (
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {timePresets.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setDeadlineHours(preset.hours)}
                        className={`py-2 rounded-lg font-medium text-sm ${
                          deadlineHours === preset.hours
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                onClick={viewMode === 'edit' ? handleUpdateChallenge : handleCreateChallenge}
                disabled={!title || (!imageFile && !imagePreview) || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-xl font-semibold disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : viewMode === 'edit' ? 'Update Challenge' : 'Create Challenge'}
              </button>
            </div>
          </>
        )}
      </main>

      {/* Assign Modal */}
      {assignModalOpen && assigningChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeAssignModal}>
          <div
            className="w-full max-w-md bg-white dark:bg-[#151A25] rounded-3xl p-6 border border-gray-200 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Assign Challenge</h2>
              <button onClick={closeAssignModal} className="text-gray-500 hover:text-gray-700 dark:text-white/60 dark:hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-white/60 mb-4">{assigningChallenge.title}</p>

            {/* Challenge Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Challenge Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAssignMode('solo')}
                  className={`py-3 rounded-xl font-medium ${
                    assignMode === 'solo'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15'
                  }`}
                >
                  Solo
                </button>
                <button
                  onClick={() => setAssignMode('team')}
                  className={`py-3 rounded-xl font-medium ${
                    assignMode === 'team'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15'
                  }`}
                >
                  Team
                </button>
              </div>
            </div>

            {/* Assign To */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {assignMode === 'solo' ? 'Assign To' : 'Challenge Team Member'}
              </label>
              
              {assignMode === 'solo' && (
                <button
                  onClick={() => setSelectedMember('myself')}
                  className={`w-full p-3 rounded-xl mb-2 text-left ${
                    selectedMember === 'myself'
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                      : 'bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10'
                  }`}
                >
                  <div className="font-medium">Myself</div>
                  <div className="text-xs text-gray-500 dark:text-white/50">Start now</div>
                </button>
              )}

              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <button
                    key={member.member_id}
                    onClick={() => setSelectedMember(member.member_id)}
                    className={`w-full p-3 rounded-xl text-left flex items-center gap-3 ${
                      selectedMember === member.member_id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                        : 'bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10'
                    }`}
                  >
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center">
                        👤
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {member.custom_name || member.display_name || member.email}
                      </div>
                      {member.relationship && (
                        <div className="text-xs text-gray-500 dark:text-white/50">{member.relationship}</div>
                      )}
                    </div>
                  </button>
                ))}
                {teamMembers.length === 0 && (
                  <div className="text-sm text-gray-500 dark:text-white/50 text-center py-4">
                    No team members yet. Invite someone first.
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleAssign}
              disabled={!selectedMember || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-xl font-semibold disabled:cursor-not-allowed"
            >
              {loading ? 'Assigning...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      <BottomNavigation currentScreen="library" />
    </div>
  );
}