import React, { useEffect, useState } from 'react';
import { BedDouble, Plus, UserCheck, Trash2, Edit3, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Room, RoomAllocation, StudentProfile } from '../types';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';

export const Rooms: React.FC = () => {
  const { role } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'rooms' | 'allocations'>('rooms');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allocations, setAllocations] = useState<RoomAllocation[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Room Modal State
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [roomForm, setRoomForm] = useState({
    room_number: '',
    block: '',
    floor: '' as number | '',
    capacity: '' as number | '',
    room_type: '',
    monthly_rate: '' as number | '',
    status: 'available' as const,
  });

  // Allocate Modal State
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [allocForm, setAllocForm] = useState({
    student_id: 0,
    room_id: 0,
    allocated_from: '',
    remarks: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const roomList = await api.getRooms(undefined, statusFilter || undefined);
      setRooms(roomList);
      const allocList = await api.getAllocations();
      setAllocations(allocList);
      if (role === 'admin' || role === 'warden') {
        const studentList = await api.getStudents();
        setStudents(studentList);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load room data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.room_number.trim() || !roomForm.block.trim()) {
      showFeedback('error', 'Please enter both room number and hostel block.');
      return;
    }
    if (roomForm.floor === '' || isNaN(Number(roomForm.floor))) {
      showFeedback('error', 'Please enter a valid floor number.');
      return;
    }
    if (roomForm.capacity === '' || isNaN(Number(roomForm.capacity)) || Number(roomForm.capacity) < 1) {
      showFeedback('error', 'Please enter a capacity of at least 1 bed.');
      return;
    }
    if (roomForm.monthly_rate === '' || isNaN(Number(roomForm.monthly_rate)) || Number(roomForm.monthly_rate) < 0) {
      showFeedback('error', 'Monthly rate must be a non-negative number.');
      return;
    }

    try {
      await api.createRoom({
        ...roomForm,
        room_number: roomForm.room_number.trim(),
        block: roomForm.block.trim(),
        room_type: roomForm.room_type.trim() || 'Standard',
        floor: Number(roomForm.floor),
        capacity: Number(roomForm.capacity),
        monthly_rate: Number(roomForm.monthly_rate),
      });
      showFeedback('success', `Room ${roomForm.room_number.trim()} added successfully.`);
      setIsAddRoomOpen(false);
      setRoomForm({
        room_number: '',
        block: '',
        floor: '',
        capacity: '',
        room_type: '',
        monthly_rate: '',
        status: 'available',
      });
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to add room');
    }
  };

  const handleCreateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocForm.student_id || !allocForm.room_id) {
      showFeedback('error', 'Please select both a student and a room.');
      return;
    }
    if (!allocForm.allocated_from) {
      showFeedback('error', 'Please select an allocation start date.');
      return;
    }
    try {
      await api.createAllocation(allocForm);
      showFeedback('success', 'Room allocated successfully to student.');
      setIsAllocateOpen(false);
      setAllocForm({
        student_id: 0,
        room_id: 0,
        allocated_from: new Date().toISOString().split('T')[0],
        remarks: '',
      });
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Allocation failed');
    }
  };

  const handleVacate = async (allocId: number) => {
    if (!window.confirm('Are you sure you want to mark this room bed as vacated?')) return;
    try {
      await api.updateAllocation(allocId, {
        status: 'vacated',
        allocated_to: new Date().toISOString().split('T')[0],
      });
      showFeedback('success', 'Allocation vacated. Bed is now freed.');
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to vacate room');
    }
  };

  const handleDeleteRoom = async (roomId: number, roomNo: string) => {
    if (!window.confirm(`Delete room ${roomNo}?`)) return;
    try {
      await api.deleteRoom(roomId);
      showFeedback('success', `Room ${roomNo} deleted.`);
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete room');
    }
  };

  const canManage = role === 'admin' || role === 'warden';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Sub-Tab Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Hostel Rooms & Allocations</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Manage physical rooms, capacities, and bed assignments.
          </p>
        </div>

        {canManage && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setIsAddRoomOpen(true)} className="btn btn-secondary">
              <Plus size={16} />
              <span>Add Room</span>
            </button>
            <button onClick={() => setIsAllocateOpen(true)} className="btn btn-primary">
              <UserCheck size={16} />
              <span>Allocate Bed</span>
            </button>
          </div>
        )}
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveSubTab('rooms')}
          className={`btn btn-sm ${activeSubTab === 'rooms' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Room Inventory ({rooms.length})
        </button>
        <button
          onClick={() => setActiveSubTab('allocations')}
          className={`btn btn-sm ${activeSubTab === 'allocations' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Active Allocations ({allocations.filter((a) => a.status === 'active').length})
        </button>
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

      {/* TAB 1: ROOMS INVENTORY */}
      {activeSubTab === 'rooms' && (
        <>
          {rooms.length === 0 ? (
            <EmptyState
              icon={BedDouble}
              title="No Rooms Added Yet"
              description="The hostel inventory currently has no rooms registered. Use 'Add Room' above to create your first hostel room record."
              actionText={canManage ? 'Add First Room' : undefined}
              onAction={() => setIsAddRoomOpen(true)}
              canAction={canManage}
            />
          ) : (
            <div className="table-responsive-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Room No</th>
                    <th>Block</th>
                    <th>Floor</th>
                    <th>Type</th>
                    <th>Capacity</th>
                    <th>Occupied</th>
                    <th>Monthly Rate</th>
                    <th>Status</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r) => {
                    const occ = r.occupied_count || 0;
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700 }}>{r.room_number}</td>
                        <td>{r.block}</td>
                        <td>Floor {r.floor}</td>
                        <td>{r.room_type}</td>
                        <td>{r.capacity} Beds</td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{occ}</span> / {r.capacity}
                        </td>
                        <td>₹{Number(r.monthly_rate).toFixed(2)}</td>
                        <td>
                          <span
                            className={`badge ${
                              r.status === 'available'
                                ? 'badge-success'
                                : r.status === 'full'
                                ? 'badge-danger'
                                : 'badge-warning'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        {canManage && (
                          <td>
                            <button
                              onClick={() => handleDeleteRoom(r.id, r.room_number)}
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--danger)' }}
                              title="Delete room"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* TAB 2: ALLOCATIONS */}
      {activeSubTab === 'allocations' && (
        <>
          {allocations.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No Room Allocations Recorded"
              description="No student has been assigned to a room bed yet. Click 'Allocate Bed' above to assign a student to an available room."
              actionText={canManage ? 'Allocate Bed' : undefined}
              onAction={() => setIsAllocateOpen(true)}
              canAction={canManage}
            />
          ) : (
            <div className="table-responsive-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Room Assigned</th>
                    <th>Block</th>
                    <th>Allocated From</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{a.student_name}</td>
                      <td style={{ fontWeight: 600 }}>Room {a.room_number}</td>
                      <td>{a.block}</td>
                      <td>{a.allocated_from}</td>
                      <td>
                        <span className={`badge ${a.status === 'active' ? 'badge-success' : 'badge-info'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td>{a.remarks || '—'}</td>
                      {canManage && (
                        <td>
                          {a.status === 'active' && (
                            <button
                              onClick={() => handleVacate(a.id)}
                              className="btn btn-secondary btn-sm"
                              title="Mark as vacated"
                            >
                              Vacate Bed
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add Room Modal */}
      <Modal
        isOpen={isAddRoomOpen}
        onClose={() => setIsAddRoomOpen(false)}
        title="Add New Hostel Room"
        footer={
          <>
            <button type="button" onClick={() => setIsAddRoomOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="add-room-form" type="submit" className="btn btn-primary">
              Save Room
            </button>
          </>
        }
      >
        <form id="add-room-form" onSubmit={handleCreateRoom}>
          <div className="form-group">
            <label className="form-label">Room Number / ID</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter room number"
              value={roomForm.room_number}
              onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Hostel Block</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter block"
                value={roomForm.block}
                onChange={(e) => setRoomForm({ ...roomForm, block: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Floor</label>
              <input
                type="number"
                min={0}
                className="form-input"
                value={roomForm.floor}
                onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value ? Number(e.target.value) : '' })}
                required
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Bed Capacity</label>
              <input
                type="number"
                min={1}
                max={6}
                className="form-input"
                value={roomForm.capacity}
                onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value ? Number(e.target.value) : '' })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Room Type</label>
              <select
                className="form-select"
                value={roomForm.room_type}
                required
                onChange={(e) => setRoomForm({ ...roomForm, room_type: e.target.value })}
              >
                <option value="">Select room type</option>
                <option value="Single Room">Single Room</option>
                <option value="Double Sharing">Double Sharing</option>
                <option value="Triple Sharing">Triple Sharing</option>
                <option value="Deluxe AC">Deluxe AC</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Monthly Rate (₹)</label>
            <input
              type="number"
              min={0}
              step="50"
              className="form-input"
              value={roomForm.monthly_rate}
              onChange={(e) => setRoomForm({ ...roomForm, monthly_rate: e.target.value ? Number(e.target.value) : '' })}
              required
            />
          </div>
        </form>
      </Modal>

      {/* Allocate Bed Modal */}
      <Modal
        isOpen={isAllocateOpen}
        onClose={() => setIsAllocateOpen(false)}
        title="Allocate Bed to Student"
        footer={
          <>
            <button type="button" onClick={() => setIsAllocateOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="alloc-bed-form" type="submit" className="btn btn-primary">
              Confirm Allocation
            </button>
          </>
        }
      >
        <form id="alloc-bed-form" onSubmit={handleCreateAllocation}>
          <div className="form-group">
            <label className="form-label">Select Student</label>
            <select
              className="form-select"
              value={allocForm.student_id}
              onChange={(e) => setAllocForm({ ...allocForm, student_id: parseInt(e.target.value) })}
              required
            >
              <option value={0}>-- Choose Student --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.email}) {s.current_room ? `[Already in ${s.current_room}]` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Select Available Room</label>
            <select
              className="form-select"
              value={allocForm.room_id}
              onChange={(e) => setAllocForm({ ...allocForm, room_id: parseInt(e.target.value) })}
              required
            >
              <option value={0}>-- Choose Room --</option>
              {rooms
                .filter((r) => r.status !== 'full' && r.status !== 'maintenance')
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.block} — Room {r.room_number} ({r.occupied_count || 0}/{r.capacity} beds occupied)
                  </option>
                ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Allocation Start Date</label>
            <input
              type="date"
              className="form-input"
              value={allocForm.allocated_from}
              onChange={(e) => setAllocForm({ ...allocForm, allocated_from: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Remarks / Special Notes</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Enter allocation notes if needed"
              value={allocForm.remarks}
              onChange={(e) => setAllocForm({ ...allocForm, remarks: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
