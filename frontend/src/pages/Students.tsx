import React, { useEffect, useState } from 'react';
import { Users, Search, Edit3, Phone, Mail, MapPin, Building, GraduationCap, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StudentProfile } from '../types';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';

export const Students: React.FC = () => {
  const { role } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  const [editForm, setEditForm] = useState<Partial<StudentProfile>>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      if (role === 'student') {
        const myProfile = await api.getMyStudentProfile();
        setStudents([myProfile]);
      } else {
        const list = await api.getStudents(search);
        setStudents(list);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load student records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [role, search]);

  const handleOpenEdit = (student: StudentProfile) => {
    setEditingStudent(student);
    setEditForm({
      full_name: student.full_name,
      registration_no: student.registration_no || '',
      phone: student.phone || '',
      emergency_contact: student.emergency_contact || '',
      department: student.department || '',
      year_of_study: student.year_of_study ?? undefined,
      address: student.address || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSaveLoading(true);
    try {
      if (role === 'student') {
        await api.updateMyContact({
          phone: editForm.phone || undefined,
          emergency_contact: editForm.emergency_contact || undefined,
          address: editForm.address || undefined,
        });
      } else {
        await api.updateStudent(editingStudent.id, editForm);
      }
      setSuccessMsg('Student record updated successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
      setEditingStudent(null);
      await fetchStudents();
    } catch (err: any) {
      setError(err.message || 'Failed to save student details');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            {role === 'student' ? 'My Student Profile' : 'Student Directory'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {role === 'student'
              ? 'View and manage your registered contact details and room allocation.'
              : 'Official residential register for all student occupants.'}
          </p>
        </div>

        {role !== 'student' && (
          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '34px', fontSize: '0.875rem' }}
              placeholder="Search by name, reg no, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        )}
      </div>

      {successMsg && (
        <div style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', padding: '10px 14px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Student View (Single Profile Card) */}
      {role === 'student' && students.length > 0 && (
        <div className="card" style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700 }}>
                {students[0].full_name.charAt(0)}
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{students[0].full_name}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{students[0].email}</div>
              </div>
            </div>
            <button onClick={() => handleOpenEdit(students[0])} className="btn btn-secondary btn-sm">
              <Edit3 size={15} />
              <span>Edit Contact</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Registration Number</div>
              <div style={{ fontWeight: 600, marginTop: '2px' }}>{students[0].registration_no || 'Not Registered'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Current Assigned Room</div>
              <div style={{ fontWeight: 600, marginTop: '2px', color: students[0].current_room ? 'var(--text-primary)' : 'var(--warning)' }}>
                {students[0].current_room || 'No active allocation'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Department / Major</div>
              <div style={{ fontWeight: 600, marginTop: '2px' }}>{students[0].department || 'Not specified'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Year of Study</div>
              <div style={{ fontWeight: 600, marginTop: '2px' }}>{students[0].year_of_study ? `Year ${students[0].year_of_study}` : 'Not specified'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Contact Phone</div>
              <div style={{ fontWeight: 600, marginTop: '2px' }}>{students[0].phone || 'None provided'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Emergency Contact</div>
              <div style={{ fontWeight: 600, marginTop: '2px' }}>{students[0].emergency_contact || 'None provided'}</div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Permanent Address</div>
              <div style={{ fontWeight: 500, marginTop: '2px' }}>{students[0].address || 'None provided'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Directory Table View (Admin / Warden) */}
      {role !== 'student' && (
        <>
          {students.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Student Records Found"
              description={search ? "No students match your query." : "No student profiles exist in the database. New students can be created by Administrator under User Administration."}
            />
          ) : (
            <div className="table-responsive-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Email Address</th>
                    <th>Reg No</th>
                    <th>Assigned Room</th>
                    <th>Department</th>
                    <th>Phone</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.full_name}</td>
                      <td>{s.email}</td>
                      <td>
                        {s.registration_no ? (
                          <span className="badge badge-info">{s.registration_no}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unset</span>
                        )}
                      </td>
                      <td>
                        {s.current_room ? (
                          <span className="badge badge-success">{s.current_room}</span>
                        ) : (
                          <span className="badge badge-warning">Unallocated</span>
                        )}
                      </td>
                      <td>{s.department || '—'}</td>
                      <td>{s.phone || '—'}</td>
                      <td>
                        <button onClick={() => handleOpenEdit(s)} className="btn btn-secondary btn-sm" title="Edit student record">
                          <Edit3 size={14} />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Edit Student Modal */}
      <Modal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        title={role === 'student' ? 'Update My Contact Details' : `Edit Student: ${editingStudent?.full_name}`}
        footer={
          <>
            <button type="button" onClick={() => setEditingStudent(null)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="edit-student-form" type="submit" className="btn btn-primary" disabled={saveLoading}>
              {saveLoading ? 'Saving...' : 'Save Details'}
            </button>
          </>
        }
      >
        <form id="edit-student-form" onSubmit={handleSaveEdit}>
          {role !== 'student' && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.full_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Registration / Roll Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.registration_no || ''}
                  onChange={(e) => setEditForm({ ...editForm, registration_no: e.target.value })}
                  placeholder="Enter registration or roll number"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Department / Major</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.department || ''}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  placeholder="Enter department or major"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Year of Study</label>
                <select
                  className="form-select"
                  value={editForm.year_of_study ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, year_of_study: e.target.value ? parseInt(e.target.value) : undefined })}
                >
                  <option value="">Not provided</option>
                  <option value={1}>1st Year</option>
                  <option value={2}>2nd Year</option>
                  <option value={3}>3rd Year</option>
                  <option value={4}>4th Year</option>
                </select>
              </div>
            </>
          )}

          {/* Contact Details (Editable by both student and warden/admin) */}
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="text"
              className="form-input"
              value={editForm.phone || ''}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              placeholder="Enter phone number"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Emergency Contact (Parent / Guardian)</label>
            <input
              type="text"
              className="form-input"
              value={editForm.emergency_contact || ''}
              onChange={(e) => setEditForm({ ...editForm, emergency_contact: e.target.value })}
              placeholder="Enter emergency contact"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Permanent Address</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={editForm.address || ''}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              placeholder="Residential address..."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
