import React, { useEffect, useState } from 'react';
import { BedDouble, Plus, UserCheck, Trash2, CheckCircle, AlertCircle, Eye, Building, Layers, Check, UserMinus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Room, RoomAllocation, StudentProfile, Bed } from '../types';
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
    hostel_name: 'Main Campus Hostel',
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
    bed_number: '',
    allocated_from: new Date().toISOString().split('T')[0],
    remarks: '',
  });
  const [roomBedsForAllocation, setRoomBedsForAllocation] = useState<Bed[]>([]);

  // Visual Bed View Modal State
  const [selectedRoomForBeds, setSelectedRoomForBeds] = useState<Room | null>(null);
  const [bedList, setBedList] = useState<Bed[]>([]);
  const [loadingBeds, setLoadingBeds] = useState(false);

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

  // Fetch beds when a room is selected in Allocation modal
  const handleRoomSelectionChange = async (roomId: number) => {
    setAllocForm((prev) => ({ ...prev, room_id: roomId, bed_number: '' }));
    if (!roomId) {
      setRoomBedsForAllocation([]);
      return;
    }
    try {
      const beds = await api.getRoomBeds(roomId);
      setRoomBedsForAllocation(beds);
      const firstAvailable = beds.find((b) => b.status === 'available');
      if (firstAvailable) {
        setAllocForm((prev) => ({ ...prev, bed_number: firstAvailable.bed_number }));
      }
    } catch (e) {
      setRoomBedsForAllocation([]);
    }
  };

  const openVisualBeds = async (room: Room) => {
    setSelectedRoomForBeds(room);
    setLoadingBeds(true);
    try {
      const beds = await api.getRoomBeds(room.id);
      setBedList(beds);
    } catch (err: any) {
      showFeedback('error', 'Failed to load bed details');
    } finally {
      setLoadingBeds(false);
    }
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
        hostel_name: roomForm.hostel_name.trim() || 'Main Campus Hostel',
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
        hostel_name: 'Main Campus Hostel',
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
      showFeedback('success', 'Bed allocated successfully to student.');
      setIsAllocateOpen(false);
      setAllocForm({
        student_id: 0,
        room_id: 0,
        bed_number: '',
        allocated_from: new Date().toISOString().split('T')[0],
        remarks: '',
      });
      await loadData();
      if (selectedRoomForBeds && selectedRoomForBeds.id === allocForm.room_id) {
        const beds = await api.getRoomBeds(selectedRoomForBeds.id);
        setBedList(beds);
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Allocation failed');
    }
  };

  const handleVacate = async (allocId: number) => {
    if (!window.confirm('Are you sure you want to mark this room bed as vacated?')) return;
    try {
      await api.vacateAllocation(allocId);
      showFeedback('success', 'Allocation vacated. Bed is now freed.');
      await loadData();
      if (selectedRoomForBeds) {
        const beds = await api.getRoomBeds(selectedRoomForBeds.id);
        setBedList(beds);
      }
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={22} style={{ color: 'var(--accent-primary)' }} />
            Hostel Rooms & Bed Management
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Manage physical rooms, individual bed allocations, capacities, and visual occupant layouts.
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
                    <th>Hostel</th>
                    <th>Block</th>
                    <th>Floor</th>
                    <th>Type</th>
                    <th>Bed Capacity</th>
                    <th>Occupancy</th>
                    <th>Monthly Rate</th>
                    <th>Status</th>
                    <th>Bed Layout</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r) => {
                    const occ = r.occupied_count || 0;
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{r.room_number}</td>
                        <td style={{ fontSize: '0.85rem' }}>{r.hostel_name || 'Main Campus Hostel'}</td>
                        <td>{r.block}</td>
                        <td>Floor {r.floor}</td>
                        <td>{r.room_type}</td>
                        <td>{r.capacity} Beds</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700 }}>{occ}</span> / {r.capacity}
                            <div style={{ width: '48px', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${Math.min(100, Math.round((occ / r.capacity) * 100))}%`,
                                  height: '100%',
                                  background: occ >= r.capacity ? 'var(--danger)' : 'var(--accent-primary)',
                                }}
                              />
                            </div>
                          </div>
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
                        <td>
                          <button
                            onClick={() => openVisualBeds(r)}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="View individual bed slots"
                          >
                            <Layers size={14} />
                            <span>Beds</span>
                          </button>
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
                    <th>Bed Slot</th>
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
                      <td>
                        <span className="badge badge-info" style={{ fontWeight: 600 }}>
                          {a.bed_number || 'Bed 1'}
                        </span>
                      </td>
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
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--danger)' }}
                              title="Vacate Bed"
                            >
                              <UserMinus size={14} />
                              <span>Vacate Bed</span>
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

      {/* Visual Bed Grid Modal */}
      <Modal
        isOpen={Boolean(selectedRoomForBeds)}
        onClose={() => setSelectedRoomForBeds(null)}
        title={selectedRoomForBeds ? `Room ${selectedRoomForBeds.room_number} — Bed Layout Grid` : 'Bed Layout'}
      >
        {selectedRoomForBeds && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-muted)', borderRadius: '8px' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Location: </span>
                <span style={{ fontWeight: 600 }}>{selectedRoomForBeds.block}, Floor {selectedRoomForBeds.floor}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Capacity: </span>
                <span style={{ fontWeight: 600 }}>{selectedRoomForBeds.capacity} Beds</span>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Type: </span>
                <span style={{ fontWeight: 600 }}>{selectedRoomForBeds.room_type}</span>
              </div>
            </div>

            {loadingBeds ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Loading bed status...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {bedList.map((b) => {
                  const isOccupied = b.status === 'occupied';
                  return (
                    <div
                      key={b.bed_number}
                      style={{
                        padding: '14px',
                        border: isOccupied ? '1px solid var(--danger-border, #fca5a5)' : '1px solid var(--success-border, #86efac)',
                        borderRadius: '8px',
                        background: isOccupied ? 'var(--danger-bg, #fef2f2)' : 'var(--success-bg, #f0fdf4)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{b.bed_number}</span>
                        <span
                          className={`badge ${isOccupied ? 'badge-danger' : 'badge-success'}`}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {isOccupied ? 'Occupied' : 'Available'}
                        </span>
                      </div>

                      {isOccupied ? (
                        <div style={{ fontSize: '0.85rem' }}>
                          <p style={{ fontWeight: 600, color: 'var(--text-main)', margin: '2px 0' }}>{b.student_name}</p>
                          {b.registration_no && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Roll: {b.registration_no}</p>
                          )}
                          {b.allocated_from && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>From: {b.allocated_from}</p>
                          )}
                          {canManage && b.allocation_id && (
                            <button
                              onClick={() => handleVacate(b.allocation_id!)}
                              className="btn btn-secondary btn-sm"
                              style={{ width: '100%', marginTop: '8px', color: 'var(--danger)' }}
                            >
                              Vacate Bed
                            </button>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <p style={{ margin: '4px 0 8px' }}>Ready for assignment</p>
                          {canManage && (
                            <button
                              onClick={() => {
                                setSelectedRoomForBeds(null);
                                setAllocForm({
                                  student_id: 0,
                                  room_id: selectedRoomForBeds.id,
                                  bed_number: b.bed_number,
                                  allocated_from: new Date().toISOString().split('T')[0],
                                  remarks: '',
                                });
                                setIsAllocateOpen(true);
                              }}
                              className="btn btn-primary btn-sm"
                              style={{ width: '100%' }}
                            >
                              Assign Bed
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>

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
            <label className="form-label">Hostel Name</label>
            <input
              type="text"
              className="form-input"
              value={roomForm.hostel_name}
              onChange={(e) => setRoomForm({ ...roomForm, hostel_name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Room Number / ID</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 101, A-204"
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
                placeholder="Block A, Block B..."
                value={roomForm.block}
                onChange={(e) => setRoomForm({ ...roomForm, block: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Floor Number</label>
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
              <label className="form-label">Individual Bed Capacity</label>
              <input
                type="number"
                min={1}
                max={10}
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
                <option value="Single Room">Single Room (1 Bed)</option>
                <option value="Double Sharing">Double Sharing (2 Beds)</option>
                <option value="Triple Sharing">Triple Sharing (3 Beds)</option>
                <option value="Four Sharing">Four Sharing (4 Beds)</option>
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
        title="Allocate Bed Slot to Student"
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
            <label className="form-label">Select Room</label>
            <select
              className="form-select"
              value={allocForm.room_id}
              onChange={(e) => handleRoomSelectionChange(parseInt(e.target.value))}
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
          {allocForm.room_id > 0 && (
            <div className="form-group">
              <label className="form-label">Choose Individual Bed Slot</label>
              <select
                className="form-select"
                value={allocForm.bed_number}
                onChange={(e) => setAllocForm({ ...allocForm, bed_number: e.target.value })}
                required
              >
                <option value="">-- Auto Assign Available Bed --</option>
                {roomBedsForAllocation.map((b) => (
                  <option key={b.bed_number} value={b.bed_number} disabled={b.status === 'occupied'}>
                    {b.bed_number} — {b.status === 'occupied' ? `Occupied by ${b.student_name}` : '🟢 Available'}
                  </option>
                ))}
              </select>
            </div>
          )}
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
              placeholder="e.g. Lower bunk requested, medical accommodation"
              value={allocForm.remarks}
              onChange={(e) => setAllocForm({ ...allocForm, remarks: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
