import React, { useEffect, useState } from 'react';
import { ShieldCheck, Plus, Key, UserX, UserCheck, Search, CheckCircle, AlertCircle, Link as LinkIcon, Trash2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { User, UserRole, ParentStudentLink, StudentProfile } from '../types';
import { Modal } from '../components/Modal';

export const AdminUsers: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add User Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    role: 'student' as UserRole,
    full_name: '',
  });

  // Reset Password Modal
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Parent-Student Links
  const [parentLinks, setParentLinks] = useState<ParentStudentLink[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>([]);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkFormData, setLinkFormData] = useState({
    parent_user_id: 0,
    student_id: 0,
    relationship: 'Parent',
  });

  const loadUsersAndLinks = async () => {
    setLoading(true);
    try {
      const [list, links, students] = await Promise.all([
        api.getUsers(roleFilter || undefined, search || undefined),
        api.getParentLinks().catch(() => []),
        api.getStudents().catch(() => []),
      ]);
      setUsers(list);
      setParentLinks(links);
      setStudentProfiles(students);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load user accounts' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersAndLinks();
  }, [roleFilter, search]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.email.trim() || !userForm.email.includes('@')) {
      showFeedback('error', 'Please provide a valid email address.');
      return;
    }
    if (!userForm.password || userForm.password.length < 5) {
      showFeedback('error', 'Password must be at least 5 characters long.');
      return;
    }

    try {
      await api.createUser({
        email: userForm.email.trim().toLowerCase(),
        password: userForm.password,
        role: userForm.role,
        full_name: userForm.full_name?.trim() || undefined,
      });
      showFeedback('success', `Account created successfully for ${userForm.email.trim()}.`);
      setIsAddOpen(false);
      setUserForm({ email: '', password: '', role: 'student', full_name: '' });
      await loadUsersAndLinks();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to create user');
    }
  };

  const handleToggleActive = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      showFeedback('error', 'Administrator cannot deactivate own account.');
      return;
    }
    const newStatus = !targetUser.is_active;
    const confirmMsg = newStatus
      ? `Activate account for ${targetUser.email}?`
      : `Deactivate account for ${targetUser.email}? User will be blocked from logging in.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.updateUser(targetUser.id, { is_active: newStatus });
      showFeedback('success', `Account ${targetUser.email} is now ${newStatus ? 'Active' : 'Inactive'}.`);
      await loadUsersAndLinks();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update account status');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    try {
      await api.updateUser(resetUser.id, { password: newPassword });
      showFeedback('success', `Password updated for ${resetUser.email}.`);
      setResetUser(null);
      setNewPassword('');
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to reset password');
    }
  };

  const handleCreateParentLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkFormData.parent_user_id || !linkFormData.student_id) {
      showFeedback('error', 'Please select both a parent account and a student.');
      return;
    }
    try {
      await api.createParentLink({
        parent_user_id: Number(linkFormData.parent_user_id),
        student_id: Number(linkFormData.student_id),
        relationship: linkFormData.relationship || 'Parent',
      });
      showFeedback('success', 'Parent successfully linked to student.');
      setIsLinkModalOpen(false);
      setLinkFormData({ parent_user_id: 0, student_id: 0, relationship: 'Parent' });
      await loadUsersAndLinks();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to link parent to student');
    }
  };

  const handleDeleteParentLink = async (linkId: number) => {
    if (!window.confirm('Are you sure you want to remove this parent-student link?')) return;
    try {
      await api.deleteParentLink(linkId);
      showFeedback('success', 'Link removed successfully.');
      await loadUsersAndLinks();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to remove link');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Account & Role Administration</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            System-level access control. Passwords are encrypted as salted hashes and never visible.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '34px', fontSize: '0.875rem' }}
              placeholder="Search email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <select
            className="form-select"
            style={{ width: '150px', fontSize: '0.875rem' }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="admin">Administrator</option>
            <option value="warden">Warden</option>
            <option value="student">Student</option>
            <option value="parent">Parent</option>
            <option value="staff">Staff</option>
            <option value="accounts_staff">Accounts Staff</option>
          </select>

          <button onClick={() => setIsAddOpen(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>Create Account</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
            backgroundColor: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
            color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.875rem',
          }}
        >
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="table-responsive-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Full Name / Identity</th>
              <th>Login Email</th>
              <th>Assigned Role</th>
              <th>Status</th>
              <th>Created Date</th>
              <th>Account Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>#{u.id}</td>
                <td style={{ fontWeight: 600 }}>{u.full_name || 'System User'}</td>
                <td>{u.email}</td>
                <td>
                  <span
                    className={`badge ${
                      u.role === 'admin'
                        ? 'badge-danger'
                        : u.role === 'warden'
                        ? 'badge-warning'
                        : u.role === 'parent'
                        ? 'badge-purple'
                        : u.role === 'staff' || u.role === 'accounts_staff'
                        ? 'badge-info'
                        : 'badge-success'
                    }`}
                  >
                    {u.role.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {u.is_active ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setResetUser(u)}
                      className="btn btn-secondary btn-sm"
                      title="Reset user password"
                    >
                      <Key size={14} />
                      <span>Reset Pass</span>
                    </button>
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`btn btn-sm ${u.is_active ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ color: u.is_active ? 'var(--danger)' : undefined }}
                        title={u.is_active ? 'Deactivate account' : 'Reactivate account'}
                      >
                        {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                        <span>{u.is_active ? 'Deactivate' : 'Activate'}</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Parent-Student Links Management Section */}
      <div className="card" style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <LinkIcon size={18} style={{ color: 'var(--accent-primary)' }} />
              Parent–Student Account Links
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Authorize parents to view only their linked student's campus presence, gate activity, and leave status.
            </p>
          </div>
          <button onClick={() => setIsLinkModalOpen(true)} className="btn btn-secondary btn-sm">
            <Plus size={14} />
            <span>Link Parent to Student</span>
          </button>
        </div>

        {parentLinks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No parent–student links established yet. Click "Link Parent to Student" to create a link.
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Link ID</th>
                  <th>Parent Account</th>
                  <th>Parent Name</th>
                  <th>Linked Student</th>
                  <th>Student Roll</th>
                  <th>Relationship</th>
                  <th>Established On</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {parentLinks.map((link) => (
                  <tr key={link.id}>
                    <td>#{link.id}</td>
                    <td style={{ fontWeight: 600 }}>{link.parent_email}</td>
                    <td>{link.parent_name || '—'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{link.student_name}</td>
                    <td>{link.student_registration_no || link.student_roll || '—'}</td>
                    <td>
                      <span className="badge badge-purple">{link.relationship || 'Parent'}</span>
                    </td>
                    <td>{new Date(link.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteParentLink(link.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--danger)' }}
                        title="Remove link"
                      >
                        <Trash2 size={14} />
                        <span>Unlink</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Link Parent to Student Modal */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title="Link Parent Account to Student"
        footer={
          <>
            <button type="button" onClick={() => setIsLinkModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="link-parent-form" type="submit" className="btn btn-primary">
              Establish Link
            </button>
          </>
        }
      >
        <form id="link-parent-form" onSubmit={handleCreateParentLink}>
          <div className="form-group">
            <label className="form-label">Parent Account (User with Parent Role)</label>
            <select
              className="form-select"
              value={linkFormData.parent_user_id}
              onChange={(e) => setLinkFormData({ ...linkFormData, parent_user_id: Number(e.target.value) })}
              required
            >
              <option value="0">-- Select Parent Account --</option>
              {users
                .filter((u) => u.role === 'parent')
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Student</label>
            <select
              className="form-select"
              value={linkFormData.student_id}
              onChange={(e) => setLinkFormData({ ...linkFormData, student_id: Number(e.target.value) })}
              required
            >
              <option value="0">-- Select Student --</option>
              {studentProfiles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} (Roll/Reg: {s.registration_no || s.roll_number || 'N/A'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Relationship Description</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Father, Mother, Legal Guardian"
              value={linkFormData.relationship}
              onChange={(e) => setLinkFormData({ ...linkFormData, relationship: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Create User Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Create Authorized Login Account"
        footer={
          <>
            <button type="button" onClick={() => setIsAddOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="create-user-form" type="submit" className="btn btn-primary">
              Create Account
            </button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={handleCreateUser}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter the person's name"
              value={userForm.full_name}
              onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address (Login Identifier)</label>
            <input
              type="email"
              className="form-input"
              placeholder="user@example.com"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Temporary Initial Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Minimum 5 characters"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              required
              minLength={5}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Assign System Role</label>
            <select
              className="form-select"
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
            >
              <option value="student">Student (Hostel Resident)</option>
              <option value="warden">Hostel Warden</option>
              <option value="parent">Parent (Ward Guardian)</option>
              <option value="staff">Staff (Campus & Gate)</option>
              <option value="accounts_staff">Accounts Staff (Legacy)</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetUser}
        onClose={() => setResetUser(null)}
        title={`Reset Password for ${resetUser?.email}`}
        footer={
          <>
            <button type="button" onClick={() => setResetUser(null)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="reset-pass-form" type="submit" className="btn btn-primary">
              Update Password
            </button>
          </>
        }
      >
        <form id="reset-pass-form" onSubmit={handleResetPassword}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={5}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
