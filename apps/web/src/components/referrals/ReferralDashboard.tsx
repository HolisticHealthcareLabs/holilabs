/**
 * Referral Dashboard Component
 *
 * Beautiful, conversion-optimized referral dashboard with:
 * - Shareable referral code
 * - Email invitation form
 * - Progress tracking (3 referrals → unlock reward)
 * - Referral stats and leaderboard
 * - Social proof
 *
 * Design: Apple Clinical aesthetic with glassmorphism
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShareIcon,
  EnvelopeIcon,
  GiftIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  SparklesIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface ReferralStats {
  code: string;
  totalInvited: number;
  successfulSignups: number;
  activeReferrals: number;
  viralCoefficient: number;
  progressToReward: {
    current: number;
    required: number;
    percentage: number;
  };
  referrals: Array<{
    id: string;
    refereeEmail: string;
    status: string;
    invitedAt: string;
    refereeUser?: {
      firstName: string;
      lastName: string;
    };
  }>;
}

interface Reward {
  id: string;
  rewardType: string;
  rewardValue: number;
  rewardDescription: string;
  status: 'PENDING' | 'CLAIMED' | 'EXPIRED';
  earnedAt: string;
  claimedAt?: string;
  expiresAt?: string;
}

export default function ReferralDashboard() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [emailInvites, setEmailInvites] = useState('');
  const [sending, setSending] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  useEffect(() => {
    loadReferralData();
  }, []);

  async function loadReferralData() {
    try {
      // Fetch referral code and stats
      const codeRes = await fetch('/api/referrals/code');
      const codeData = await codeRes.json();

      if (codeData.success) {
        setStats(codeData.stats);
      }

      // Fetch rewards
      const rewardsRes = await fetch('/api/referrals/rewards');
      const rewardsData = await rewardsRes.json();

      if (rewardsData.success) {
        setRewards(rewardsData.rewards);
      }
    } catch (error) {
      console.error('Failed to load referral data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function copyReferralCode() {
    if (!stats) return;

    const referralUrl = `${window.location.origin}/signup?ref=${stats.code}`;
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function sendInvitations() {
    if (!emailInvites.trim()) return;

    setSending(true);

    try {
      // Parse comma-separated emails
      const emails = emailInvites
        .split(/[\n,;]/)
        .map((e) => e.trim())
        .filter((e) => e);

      const res = await fetch('/api/referrals/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });

      const data = await res.json();

      if (data.success) {
        setInviteSent(true);
        setEmailInvites('');
        await loadReferralData(); // Refresh stats
        setTimeout(() => setInviteSent(false), 3000);
      }
    } catch (error) {
      console.error('Failed to send invitations:', error);
    } finally {
      setSending(false);
    }
  }

  async function claimReward(rewardId: string) {
    try {
      const res = await fetch('/api/referrals/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId }),
      });

      const data = await res.json();

      if (data.success) {
        await loadReferralData(); // Refresh rewards
      }
    } catch (error) {
      console.error('Failed to claim reward:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Failed to load referral data</p>
      </div>
    );
  }

  const progressPercentage = stats.progressToReward.percentage;
  const isRewardUnlocked = stats.progressToReward.current >= stats.progressToReward.required;

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 p-8 text-white"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <GiftIcon className="w-8 h-8" />
            <h2 className="text-3xl font-bold">Invite Colleagues, Unlock Rewards</h2>
          </div>
          <p className="text-green-50 text-lg mb-6 max-w-2xl">
            Share Holi Labs with 3 colleagues and unlock <strong>6 months of Prevention Alerts</strong> free.
            Help your peers save time on documentation while earning premium features.
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="text-3xl font-bold">{stats.totalInvited}</div>
              <div className="text-green-50 text-sm">Invitations Sent</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="text-3xl font-bold">{stats.successfulSignups}</div>
              <div className="text-green-50 text-sm">Successful Signups</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="text-3xl font-bold">{(stats.viralCoefficient * 100).toFixed(0)}%</div>
              <div className="text-green-50 text-sm">Conversion Rate</div>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      </motion.div>

      {/* Progress to Reward */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Your Progress</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {stats.progressToReward.current} of {stats.progressToReward.required} referrals completed
            </p>
          </div>
          {isRewardUnlocked && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-4 py-2 rounded-full"
            >
              <CheckCircleIcon className="w-5 h-5" />
              <span className="font-semibold">Reward Unlocked!</span>
            </motion.div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
          />
        </div>

        <div className="flex justify-between mt-2 text-sm text-gray-600 dark:text-gray-400">
          <span>0</span>
          <span className="font-semibold text-green-600 dark:text-green-400">{progressPercentage}%</span>
          <span>{stats.progressToReward.required}</span>
        </div>

        {/* Milestones */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[1, 2, 3].map((milestone) => {
            const achieved = stats.progressToReward.current >= milestone;
            return (
              <div
                key={milestone}
                className={`text-center p-3 rounded-xl border-2 transition-all ${
                  achieved
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {achieved ? (
                  <CheckCircleIcon className="w-6 h-6 mx-auto text-green-600 dark:text-green-400 mb-1" />
                ) : (
                  <div className="w-6 h-6 mx-auto border-2 border-gray-300 dark:border-gray-600 rounded-full mb-1" />
                )}
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {milestone} Referral{milestone > 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Referral Code */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-3 mb-4">
          <ShareIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Your Referral Code</h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 font-mono text-2xl font-bold text-center text-gray-900 dark:text-white border-2 border-dashed border-gray-300 dark:border-gray-600">
            {stats.code}
          </div>
          <button
            onClick={copyReferralCode}
            className="flex items-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all hover:scale-105"
          >
            {copied ? (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                Copied!
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="w-5 h-5" />
                Copy Link
              </>
            )}
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
          Share this link:{' '}
          <code className="text-green-600 dark:text-green-400">
            {window.location.origin}/signup?ref={stats.code}
          </code>
        </p>
      </motion.div>

      {/* Email Invitations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-3 mb-4">
          <EnvelopeIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Send Invitations</h3>
        </div>

        <textarea
          value={emailInvites}
          onChange={(e) => setEmailInvites(e.target.value)}
          placeholder="Enter email addresses (comma or newline separated)
e.g., doctor@clinic.com, colleague@hospital.com"
          rows={4}
          className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
        />

        <button
          onClick={sendInvitations}
          disabled={sending || !emailInvites.trim()}
          className="w-full mt-4 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all hover:scale-[1.02]"
        >
          {sending ? 'Sending...' : 'Send Invitations'}
        </button>

        <AnimatePresence>
          {inviteSent && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-sm flex items-center gap-2"
            >
              <CheckCircleIcon className="w-5 h-5" />
              Invitations sent successfully!
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Rewards */}
      {rewards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3 mb-4">
            <SparklesIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Your Rewards</h3>
          </div>

          <div className="space-y-3">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {reward.rewardDescription}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Earned {new Date(reward.earnedAt).toLocaleDateString()}
                    </div>
                  </div>
                  {reward.status === 'PENDING' && (
                    <button
                      onClick={() => claimReward(reward.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all"
                    >
                      Claim Now
                    </button>
                  )}
                  {reward.status === 'CLAIMED' && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircleIcon className="w-5 h-5" />
                      <span className="font-semibold">Claimed</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Referrals */}
      {stats.referrals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3 mb-4">
            <UserGroupIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Referrals</h3>
          </div>

          <div className="space-y-2">
            {stats.referrals.slice(0, 5).map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {referral.refereeUser
                      ? `${referral.refereeUser.firstName} ${referral.refereeUser.lastName}`
                      : referral.refereeEmail}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(referral.invitedAt).toLocaleDateString()}
                  </div>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    referral.status === 'CONVERTED'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : referral.status === 'SIGNED_UP'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {referral.status.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
