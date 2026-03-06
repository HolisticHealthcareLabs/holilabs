'use client';
export const dynamic = 'force-dynamic';

/**
 * Workspaces Settings Page
 *
 * License management and team-collaboration view for workspace owners.
 * Access is restricted to users with role ADMIN or LICENSE_OWNER.
 *
 * Matches the ElevenLabs-inspired workspaces UI:
 *  - Workspace card (name · plan · member count)
 *  - "Create New Workspace" action
 *  - Workspace Invites section
 */

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkspaceRecord {
  id:          string;
  name:        string;
  plan:        string;
  memberCount: number;
  isCurrent:   boolean;
}

interface PendingInvite {
  id:            string;
  workspaceName: string;
  invitedBy:     string;
  expiresAt:     string;
}

// ─── Allowed roles ────────────────────────────────────────────────────────────
const ALLOWED_ROLES = new Set(['ADMIN', 'LICENSE_OWNER']);

// ─── Gear icon button ─────────────────────────────────────────────────────────
function GearButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Workspace settings"
      className="
        w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
        text-gray-400 hover:text-gray-700 hover:bg-gray-100
        transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300
      "
    >
      <Settings className="w-4 h-4" />
    </button>
  );
}

// ─── Workspace card ───────────────────────────────────────────────────────────
function WorkspaceCard({ workspace }: { workspace: WorkspaceRecord }) {
  return (
    <div className="flex items-center justify-between px-4 py-4 rounded-xl border border-gray-200 bg-white">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {workspace.name}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {workspace.plan} plan &bull; {workspace.memberCount}{' '}
          {workspace.memberCount === 1 ? 'member' : 'members'}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        {workspace.isCurrent && (
          <span className="
            px-3 py-1.5 rounded-lg text-xs font-medium
            bg-gray-100 text-gray-500
            select-none
          ">
            Current Workspace
          </span>
        )}
        <GearButton />
      </div>
    </div>
  );
}

// ─── Invite row ───────────────────────────────────────────────────────────────
function InviteRow({ invite }: { invite: PendingInvite }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-white">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {invite.workspaceName}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          Invited by {invite.invitedBy} · expires {invite.expiresAt}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        <button
          type="button"
          className="
            px-3 py-1.5 rounded-lg text-xs font-medium
            border border-gray-300 text-gray-700
            hover:bg-gray-50 transition-colors
          "
        >
          Decline
        </button>
        <button
          type="button"
          className="
            px-3 py-1.5 rounded-lg text-xs font-medium
            bg-gray-900 text-white
            hover:bg-gray-700 transition-colors
          "
        >
          Accept
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WorkspacesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // ── RBAC guard ──────────────────────────────────────────────────────────────
  const userRole = String(
    (session?.user as { role?: string } | undefined)?.role ?? ''
  ).toUpperCase();

  const userName = String(
    (session?.user as { firstName?: string; name?: string } | undefined)
      ?.firstName ||
    (session?.user as { name?: string } | undefined)?.name ||
    'My'
  );

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.replace('/auth/login?callbackUrl=/dashboard/settings/workspaces');
      return;
    }
    if (!ALLOWED_ROLES.has(userRole)) {
      router.replace('/dashboard');
    }
  }, [status, userRole, router]);

  // ── Local state (demo data — replace with API calls) ────────────────────────
  const [workspaces] = useState<WorkspaceRecord[]>([
    {
      id:          'ws-default',
      name:        `${userName}'s Workspace`,
      plan:        'Creator',
      memberCount: 1,
      isCurrent:   true,
    },
  ]);

  const [invites] = useState<PendingInvite[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  // ── Render guards ───────────────────────────────────────────────────────────
  if (status === 'loading' || !ALLOWED_ROLES.has(userRole)) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <span className="w-6 h-6 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── Settings header ────────────────────────────────────────────────── */}
      <header className="border-b border-gray-200 px-6 py-4">
        <h1 className="text-sm font-semibold text-gray-900">Settings</h1>
      </header>

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <nav className="border-b border-gray-200 px-6">
        <div className="flex gap-8">
          <a
            href="/dashboard/settings"
            className="
              py-3 text-sm font-medium text-gray-500
              hover:text-gray-900 transition-colors
              border-b-2 border-transparent
            "
          >
            Profile
          </a>
          <span
            aria-current="page"
            className="
              py-3 text-sm font-medium text-gray-900
              border-b-2 border-gray-900
            "
          >
            Workspaces
          </span>
        </div>
      </nav>

      {/* ── Page body ──────────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* ── Workspaces section ───────────────────────────────────────────── */}
        <section>
          <div className="
            rounded-xl border border-gray-200 bg-white overflow-hidden
          ">
            {/* Section header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Workspaces</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="
                  px-4 py-2 rounded-lg text-sm font-semibold
                  bg-gray-900 text-white
                  hover:bg-gray-700 active:bg-gray-800
                  transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400
                "
              >
                Create New Workspace
              </button>
            </div>

            {/* Workspace list */}
            <div className="p-4 space-y-2">
              {workspaces.map((ws) => (
                <WorkspaceCard key={ws.id} workspace={ws} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Workspace Invites section ────────────────────────────────────── */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Workspace Invites
          </h2>

          {invites.length === 0 ? (
            <div className="
              rounded-xl border border-gray-200 bg-white
              px-5 py-6 text-center
            ">
              <p className="text-sm text-gray-400">
                You have no pending workspace invites.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {invites.map((inv) => (
                <InviteRow key={inv.id} invite={inv} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── Create workspace modal (lightweight) ─────────────────────────── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
        >
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Create New Workspace
            </h3>

            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Workspace name
            </label>
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              autoFocus
              placeholder={`${userName}'s Team`}
              className="
                w-full px-4 py-3 rounded-xl border border-gray-300
                text-sm text-gray-900
                focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent
                transition
              "
            />

            <div className="mt-5 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); setNewWorkspaceName(''); }}
                className="
                  px-4 py-2 rounded-lg text-sm font-medium
                  border border-gray-300 text-gray-700
                  hover:bg-gray-50 transition-colors
                "
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newWorkspaceName.trim()}
                onClick={() => {
                  // TODO: POST /api/workspace with newWorkspaceName
                  setShowCreateModal(false);
                  setNewWorkspaceName('');
                }}
                className="
                  px-4 py-2 rounded-lg text-sm font-semibold
                  bg-gray-900 text-white
                  hover:bg-gray-700
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                "
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
