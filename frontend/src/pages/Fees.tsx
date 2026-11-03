import React, { useEffect, useState } from 'react';
import { Receipt, Plus, CreditCard, CheckCircle, AlertCircle, Calendar, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { FeeRecord, StudentProfile } from '../types';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';

export const Fees: React.FC = () => {
  const { role } = useAuth();
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Fee Modal
  const [isAddFeeOpen, setIsAddFeeOpen] = useState(false);
  const [feeForm, setFeeForm] = useState({
    student_id: 0,
    fee_type: '',
    amount_due: '' as number | '',
    due_date: '',
    notes: '',
  });

  // Record Payment Modal
  const [selectedFee, setSelectedFee] = useState<FeeRecord | null>(null);
  const [payForm, setPayForm] = useState({
    amount_paying: '' as number | '',
    payment_method: '',
    receipt_no: '',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await api.getFees(statusFilter || undefined);
      setFees(list);
      if (role === 'admin' || role === 'warden') {
        const studentList = await api.getStudents();
        setStudents(studentList);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load fee ledger' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, role]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeForm.student_id) {
      showFeedback('error', 'Please select a student.');
      return;
    }
    if (!feeForm.fee_type.trim()) {
      showFeedback('error', 'Please specify the fee type (e.g. Room & Mess Fee).');
      return;
    }
    if (feeForm.amount_due === '' || isNaN(Number(feeForm.amount_due)) || Number(feeForm.amount_due) <= 0) {
      showFeedback('error', 'Please enter a valid fee amount greater than 0.');
      return;
    }
    if (!feeForm.due_date) {
      showFeedback('error', 'Please specify the fee payment due date.');
      return;
    }

    try {
      await api.createFee({
        student_id: feeForm.student_id,
        fee_type: feeForm.fee_type.trim(),
        amount_due: Number(feeForm.amount_due),
        due_date: feeForm.due_date,
        notes: feeForm.notes.trim() || undefined,
      });
      showFeedback('success', 'Fee invoice generated successfully.');
      setIsAddFeeOpen(false);
      setFeeForm({
        student_id: 0,
        fee_type: '',
        amount_due: '',
        due_date: '',
        notes: '',
      });
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to create fee');
    }
  };

  const handleOpenPayment = (fee: FeeRecord) => {
    const outstanding = Number(fee.amount_due) - Number(fee.amount_paid);
    setSelectedFee(fee);
    setPayForm({
      amount_paying: outstanding > 0 ? outstanding : '',
      payment_method: 'UPI / Net Banking',
      receipt_no: '',
      notes: '',
    });
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFee) return;
    if (payForm.amount_paying === '' || isNaN(Number(payForm.amount_paying)) || Number(payForm.amount_paying) <= 0) {
      showFeedback('error', 'Please enter a valid payment amount greater than 0.');
      return;
    }
    if (!payForm.payment_method.trim()) {
      showFeedback('error', 'Please select a payment method.');
      return;
    }

    try {
      await api.recordPayment(selectedFee.id, {
        amount_paying: Number(payForm.amount_paying),
        payment_method: payForm.payment_method.trim(),
        receipt_no: payForm.receipt_no.trim() || undefined,
        notes: payForm.notes.trim() || undefined,
      });
      showFeedback('success', `Payment of ₹${Number(payForm.amount_paying).toFixed(2)} recorded successfully.`);
      setSelectedFee(null);
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Payment recording failed');
    }
  };

  const canManageFees = role === 'warden';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {role === 'student'
                ? 'My Fee Invoices & Payment Ledger'
                : role === 'admin'
                ? 'Fee Status Register & Ledger (Read-Only Oversight)'
                : 'Hostel Fee Register & Accounting'}
            </h2>
            {role === 'admin' && (
              <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} /> Read-Only Oversight
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {role === 'student'
              ? 'Review pending dues, due dates, and official payment receipts.'
              : role === 'admin'
              ? 'Administrative read-only oversight of fee status (Collected vs Pending). Fee issuance and collection are restricted strictly to the Warden.'
              : 'Issue hostel fee invoices and record student payment transactions.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            className="form-select"
            style={{ width: '160px', fontSize: '0.875rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>

          {canManageFees && (
            <button onClick={() => setIsAddFeeOpen(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>Issue Fee Invoice</span>
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

      {/* Ledger Table */}
      {fees.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No Fee Records Found"
          description={
            role === 'student'
              ? 'No fee invoices have been issued to your account yet.'
              : role === 'admin'
              ? 'There are no fee records in the database. The Warden has not issued any fee invoices yet.'
              : 'There are no fee records in the database. Use the button above to issue the first fee invoice.'
          }
          actionText={canManageFees ? 'Issue First Fee Invoice' : undefined}
          onAction={() => setIsAddFeeOpen(true)}
          canAction={canManageFees}
        />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                {role !== 'student' && <th>Student</th>}
                <th>Fee Type</th>
                <th>Amount Due</th>
                <th>Amount Paid</th>
                <th>Outstanding</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Receipt / Notes</th>
                {canManageFees && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {fees.map((f) => {
                const balance = Number(f.amount_due) - Number(f.amount_paid);
                return (
                  <tr key={f.id}>
                    {role !== 'student' && <td style={{ fontWeight: 600 }}>{f.student_name}</td>}
                    <td>{f.fee_type}</td>
                    <td style={{ fontWeight: 600 }}>₹{Number(f.amount_due).toFixed(2)}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{Number(f.amount_paid).toFixed(2)}</td>
                    <td style={{ color: balance > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                      ₹{balance.toFixed(2)}
                    </td>
                    <td>{f.due_date}</td>
                    <td>
                      <span
                        className={`badge ${
                          f.status === 'paid'
                            ? 'badge-success'
                            : f.status === 'partial'
                            ? 'badge-info'
                            : f.status === 'overdue'
                            ? 'badge-danger'
                            : 'badge-warning'
                        }`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {f.receipt_no ? `Rec: ${f.receipt_no}` : f.notes || '—'}
                    </td>
                    {canManageFees && (
                      <td>
                        {balance > 0 && (
                          <button
                            onClick={() => handleOpenPayment(f)}
                            className="btn btn-primary btn-sm"
                            title="Record payment"
                          >
                            <CreditCard size={14} />
                            <span>Collect</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Fee Modal */}
      <Modal
        isOpen={isAddFeeOpen}
        onClose={() => setIsAddFeeOpen(false)}
        title="Issue Fee Invoice"
        footer={
          <>
            <button type="button" onClick={() => setIsAddFeeOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="add-fee-form" type="submit" className="btn btn-primary">
              Generate Invoice
            </button>
          </>
        }
      >
        <form id="add-fee-form" onSubmit={handleCreateFee}>
          <div className="form-group">
            <label className="form-label">Student Resident</label>
            <select
              className="form-select"
              value={feeForm.student_id}
              onChange={(e) => setFeeForm({ ...feeForm, student_id: parseInt(e.target.value) })}
              required
            >
              <option value={0}>-- Select Student --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.email})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Fee Category</label>
            <select
              className="form-select"
              value={feeForm.fee_type}
              required
              onChange={(e) => setFeeForm({ ...feeForm, fee_type: e.target.value })}
            >
              <option value="">Select fee category</option>
              <option value="Hostel Rent (Monthly)">Hostel Rent (Monthly)</option>
              <option value="Mess / Food Charges">Mess / Food Charges</option>
              <option value="Caution Deposit">Caution Deposit</option>
              <option value="Maintenance Fee">Maintenance Fee</option>
              <option value="Electricity / Utility">Electricity / Utility</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Amount Due (₹)</label>
            <input
              type="number"
              min={1}
              step="50"
              className="form-input"
              value={feeForm.amount_due}
              onChange={(e) => setFeeForm({ ...feeForm, amount_due: e.target.value ? Number(e.target.value) : '' })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Payment Due Date</label>
            <input
              type="date"
              className="form-input"
              value={feeForm.due_date}
              onChange={(e) => setFeeForm({ ...feeForm, due_date: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Notes / Instructions</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Enter invoice notes if needed"
              value={feeForm.notes}
              onChange={(e) => setFeeForm({ ...feeForm, notes: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={!!selectedFee}
        onClose={() => setSelectedFee(null)}
        title={`Record Payment for ${selectedFee?.student_name}`}
        footer={
          <>
            <button type="button" onClick={() => setSelectedFee(null)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="record-payment-form" type="submit" className="btn btn-primary">
              Confirm Receipt
            </button>
          </>
        }
      >
        <form id="record-payment-form" onSubmit={handleRecordPayment}>
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Invoice: {selectedFee?.fee_type}</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Outstanding Balance: ₹
              {(Number(selectedFee?.amount_due || 0) - Number(selectedFee?.amount_paid || 0)).toFixed(2)}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Amount Paying (₹)</label>
            <input
              type="number"
              min={1}
              step="1"
              max={Number(selectedFee?.amount_due || 0) - Number(selectedFee?.amount_paid || 0)}
              className="form-input"
              value={payForm.amount_paying}
              onChange={(e) => setPayForm({ ...payForm, amount_paying: e.target.value ? Number(e.target.value) : '' })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Payment Mode</label>
            <select
              className="form-select"
              value={payForm.payment_method}
              required
              onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
            >
              <option value="">Select payment method</option>
              <option value="UPI">UPI / QR Code</option>
              <option value="Bank Transfer (NEFT/IMPS)">Bank Transfer (NEFT/IMPS)</option>
              <option value="Cash Receipt">Cash Receipt</option>
              <option value="Demand Draft / Cheque">Demand Draft / Cheque</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Receipt / Transaction Reference No.</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter the actual receipt or transaction reference"
              value={payForm.receipt_no}
              onChange={(e) => setPayForm({ ...payForm, receipt_no: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Accountant Remarks</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Enter payment notes if needed"
              value={payForm.notes}
              onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
