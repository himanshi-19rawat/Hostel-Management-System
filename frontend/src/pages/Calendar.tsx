import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Plus, Trash2, Clock, CheckCircle, AlertCircle, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { CalendarEvent } from '../types';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';

export const Calendar: React.FC = () => {
  const { role } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Event Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_type: 'other',
    start_date: '',
    end_date: '',
    target_role: 'all',
  });

  const loadEvents = async () => {
    setLoading(true);
    try {
      const list = await api.getEvents(eventTypeFilter || undefined);
      setEvents(list);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load events' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [eventTypeFilter]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title.trim()) {
      showFeedback('error', 'Please enter an event title.');
      return;
    }
    if (!eventForm.start_date) {
      showFeedback('error', 'Please select a start date and time.');
      return;
    }

    try {
      await api.createEvent({
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || undefined,
        event_type: eventForm.event_type || 'other',
        start_date: eventForm.start_date,
        end_date: eventForm.end_date || undefined,
        target_role: eventForm.target_role || 'all',
      });
      showFeedback('success', 'Event scheduled successfully.');
      setIsAddOpen(false);
      setEventForm({
        title: '',
        description: '',
        event_type: 'other',
        start_date: '',
        end_date: '',
        target_role: 'all',
      });
      await loadEvents();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to schedule event');
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!window.confirm('Delete this calendar event?')) return;
    try {
      await api.deleteEvent(id);
      showFeedback('success', 'Event removed.');
      await loadEvents();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete event');
    }
  };

  const canManage = role === 'admin' || role === 'warden';

  const getEventTypeBadge = (t: string) => {
    switch (t) {
      case 'inspection':
        return 'badge-warning';
      case 'payment_deadline':
        return 'badge-danger';
      case 'holiday':
        return 'badge-success';
      case 'maintenance':
        return 'badge-info';
      default:
        return 'badge-info';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Hostel Calendar & Reminders</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Schedule of maintenance visits, inspections, fee deadlines, and meetings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            className="form-select"
            style={{ width: '180px', fontSize: '0.875rem' }}
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
          >
            <option value="">All Event Categories</option>
            <option value="meeting">Meetings</option>
            <option value="inspection">Hostel Inspections</option>
            <option value="payment_deadline">Payment Deadlines</option>
            <option value="maintenance">Maintenance Works</option>
            <option value="holiday">Holidays & Vacations</option>
          </select>

          {canManage && (
            <button onClick={() => setIsAddOpen(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>Schedule Event</span>
            </button>
          )}
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

      {/* Events List */}
      {events.length === 0 ? (
        <EmptyState
          icon={CalendarIcon}
          title="No Scheduled Events"
          description="There are currently no events or reminders in the hostel calendar."
          actionText={canManage ? 'Schedule First Event' : undefined}
          onAction={() => setIsAddOpen(true)}
          canAction={canManage}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {events.map((e) => (
            <div key={e.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span className={`badge ${getEventTypeBadge(e.event_type)}`}>
                    {e.event_type.replace('_', ' ')}
                  </span>
                  {canManage && (
                    <button
                      onClick={() => handleDeleteEvent(e.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--danger)', padding: '4px' }}
                      title="Delete event"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {e.title}
                </h3>
                {e.description && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                    {e.description}
                  </p>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} />
                  <span>Start: {new Date(e.start_date).toLocaleString()}</span>
                </div>
                {e.end_date && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} />
                    <span>End: {new Date(e.end_date).toLocaleString()}</span>
                  </div>
                )}
                <div style={{ marginTop: '2px' }}>
                  By: <strong>{e.creator_name}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Event Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Schedule Hostel Event / Reminder"
        footer={
          <>
            <button type="button" onClick={() => setIsAddOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="add-event-form" type="submit" className="btn btn-primary">
              Confirm Schedule
            </button>
          </>
        }
      >
        <form id="add-event-form" onSubmit={handleCreateEvent}>
          <div className="form-group">
            <label className="form-label">Event Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter the event title"
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={eventForm.event_type}
                required
                onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
              >
                <option value="">Select event type</option>
                <option value="meeting">Meeting</option>
                <option value="inspection">Hostel Inspection</option>
                <option value="payment_deadline">Payment Deadline</option>
                <option value="maintenance">Maintenance Work</option>
                <option value="holiday">Holiday / Vacation</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Audience</label>
              <select
                className="form-select"
                value={eventForm.target_role}
                required
                onChange={(e) => setEventForm({ ...eventForm, target_role: e.target.value })}
              >
                <option value="">Select audience</option>
                <option value="all">All Residents</option>
                <option value="student">Students Only</option>
                <option value="warden">Wardens Only</option>
                <option value="accounts_staff">Staff Only</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Start Date & Time</label>
              <input
                type="datetime-local"
                className="form-input"
                value={eventForm.start_date}
                onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date & Time (Optional)</label>
              <input
                type="datetime-local"
                className="form-input"
                value={eventForm.end_date}
                onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Event Description</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Details, guidelines or preparation required..."
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
