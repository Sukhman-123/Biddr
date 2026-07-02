import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Crown, User, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useToast } from '../../components/ToastProvider'
import {
  addFranchiseMemberRequest,
  removeFranchiseMemberRequest,
  updateFranchiseMemberRoleRequest,
  getFranchiseMembersRequest,
} from './franchise.api'
import './FranchiseMembers.css'

export default function FranchiseMembers({
  tournamentId,
  franchise,
  isTournamentHost,
  currentUserId,
}) {
  const [searchEmail, setSearchEmail] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('member')

  const toast = useToast()
  const queryClient = useQueryClient()

  // Get user details for members
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['franchise-members', tournamentId, franchise.id],
    queryFn: () => getFranchiseMembersRequest(tournamentId, franchise.id),
    enabled: Boolean(tournamentId && franchise.id),
  })

  const addMember = useMutation({
    mutationFn: ({ userId, role }) =>
      addFranchiseMemberRequest(tournamentId, franchise.id, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchise-members', tournamentId, franchise.id] })
      toast.success('Member added successfully')
      setShowAddMember(false)
      setNewMemberEmail('')
      setNewMemberRole('member')
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const removeMember = useMutation({
    mutationFn: (userId) =>
      removeFranchiseMemberRequest(tournamentId, franchise.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchise-members', tournamentId, franchise.id] })
      toast.success('Member removed')
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const updateRole = useMutation({
    mutationFn: ({ userId, role }) =>
      updateFranchiseMemberRoleRequest(tournamentId, franchise.id, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchise-members', tournamentId, franchise.id] })
      toast.success('Role updated')
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  // For now, we'll add members by userId (in a real app, you'd search users first)
  const handleAddMember = () => {
    if (!newMemberEmail.trim()) {
      toast.error('Please enter a user email')
      return
    }
    // In v2, we'd search for the user by email and get their ID
    // For now, we'll show a placeholder
    toast.info('User search coming soon. Use the user management panel to add members.')
    setShowAddMember(false)
  }

  const currentMember = members.find(m => m.userId === currentUserId)
  const isFranchiseOwner = currentMember?.role === 'owner' || isTournamentHost

  const owners = members.filter(m => m.role === 'owner')
  const regularMembers = members.filter(m => m.role === 'member')

  return (
    <div className="franchise-members">
      <div className="franchise-members-header">
        <h4>
          <span className="franchise-members-icon" style={{ background: franchise.colorHex }}>
            {franchise.name.charAt(0)}
          </span>
          {franchise.name}
        </h4>
        <span className="franchise-members-count">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="franchise-members-list">
        {owners.map(member => (
          <div key={member.userId} className="franchise-member franchise-member-owner">
            <div className="franchise-member-info">
              <Crown size={14} className="franchise-member-icon owner" />
              <span className="franchise-member-name">{member.fullName}</span>
              <span className="franchise-member-email">{member.email}</span>
            </div>
            {isFranchiseOwner && member.userId !== currentUserId && (
              <div className="franchise-member-actions">
                <button
                  className="franchise-member-action-btn"
                  onClick={() => updateRole.mutate({ userId: member.userId, role: 'member' })}
                  title="Demote to member"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  className="franchise-member-action-btn danger"
                  onClick={() => removeMember.mutate(member.userId)}
                  title="Remove from franchise"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}

        {regularMembers.map(member => (
          <div key={member.userId} className="franchise-member">
            <div className="franchise-member-info">
              <User size={14} className="franchise-member-icon" />
              <span className="franchise-member-name">{member.fullName}</span>
              <span className="franchise-member-email">{member.email}</span>
            </div>
            {isFranchiseOwner && (
              <div className="franchise-member-actions">
                <button
                  className="franchise-member-action-btn"
                  onClick={() => updateRole.mutate({ userId: member.userId, role: 'owner' })}
                  title="Promote to owner"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  className="franchise-member-action-btn danger"
                  onClick={() => removeMember.mutate(member.userId)}
                  title="Remove from franchise"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}

        {members.length === 0 && !isLoading && (
          <p className="franchise-members-empty">No members yet</p>
        )}
      </div>

      {isFranchiseOwner && (
        <div className="franchise-members-add">
          {!showAddMember ? (
            <button
              className="franchise-members-add-btn"
              onClick={() => setShowAddMember(true)}
            >
              <UserPlus size={14} />
              Add Member
            </button>
          ) : (
            <div className="franchise-members-add-form">
              <input
                type="email"
                placeholder="User email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="franchise-members-input"
              />
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="franchise-members-select"
              >
                <option value="member">Member</option>
                <option value="owner">Owner</option>
              </select>
              <button
                className="franchise-members-submit"
                onClick={handleAddMember}
                disabled={addMember.isPending}
              >
                Add
              </button>
              <button
                className="franchise-members-cancel"
                onClick={() => setShowAddMember(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
