import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  MessageSquareQuote,
  Target,
  GitBranch,
  ShieldAlert,
  Bug,
  RotateCw,
  Plus,
  Trash2,
  Edit3,
  CheckCircle,
  AlertCircle,
  Star,
  Activity,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  TqmVoC,
  TqmCtq,
  TqmSipoc,
  TqmFmea,
  TqmDefect,
  TqmPdca,
} from '../types';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';

export const TqmFramework: React.FC = () => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<'voc' | 'ctq' | 'sipoc' | 'fmea' | 'defects' | 'pdca'>('voc');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data states (Initial clean empty states)
  const [vocList, setVocList] = useState<TqmVoC[]>([]);
  const [ctqList, setCtqList] = useState<TqmCtq[]>([]);
  const [sipocList, setSipocList] = useState<TqmSipoc[]>([]);
  const [fmeaList, setFmeaList] = useState<TqmFmea[]>([]);
  const [defectsList, setDefectsList] = useState<TqmDefect[]>([]);
  const [pdcaList, setPdcaList] = useState<TqmPdca[]>([]);

  // Modal open states
  const [isAddVocOpen, setIsAddVocOpen] = useState(false);
  const [isAddCtqOpen, setIsAddCtqOpen] = useState(false);
  const [isAddSipocOpen, setIsAddSipocOpen] = useState(false);
  const [isAddFmeaOpen, setIsAddFmeaOpen] = useState(false);
  const [isLogDefectOpen, setIsLogDefectOpen] = useState(false);
  const [isAddPdcaOpen, setIsAddPdcaOpen] = useState(false);

  // Forms
  const [vocForm, setVocForm] = useState({
    feedback_category: '',
    customer_verbatim: '',
    key_issue: '',
    satisfaction_rating: null as number | null,
    usability_metric: '',
  });

  const [ctqForm, setCtqForm] = useState({
    need_statement: '',
    quality_driver: '',
    ctq_metric: '',
    target_specification: '',
    lower_limit: '',
    upper_limit: '',
  });

  const [sipocForm, setSipocForm] = useState({
    process_name: '',
    supplier: '',
    inputs: '',
    process_steps: '',
    outputs: '',
    customer: '',
  });

  const [fmeaForm, setFmeaForm] = useState({
    process_step: '',
    potential_failure_mode: '',
    potential_effect: '',
    severity: '' as number | '',
    potential_cause: '',
    occurrence: '' as number | '',
    current_controls: '',
    detection: '' as number | '',
    recommended_action: '',
    action_taken: '',
  });

  const [defectForm, setDefectForm] = useState({
    title: '',
    description: '',
    defect_type: 'usability' as const,
    severity: 'minor' as const,
  });

  const [editDefect, setEditDefect] = useState<TqmDefect | null>(null);
  const [defectUpdateForm, setDefectUpdateForm] = useState({
    root_cause: '',
    corrective_action: '',
    status: 'logged' as const,
  });

  const [pdcaForm, setPdcaForm] = useState({
    cycle_name: '',
    target_objective: '',
    plan_stage: '',
    do_stage: '',
    check_stage: '',
    act_stage: '',
    status: 'plan' as const,
  });

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const loadActiveTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'voc') {
        const data = await api.getVoC();
        setVocList(data);
      } else if (activeTab === 'ctq') {
        const data = await api.getCtq();
        setCtqList(data);
      } else if (activeTab === 'sipoc') {
        const data = await api.getSipoc();
        setSipocList(data);
      } else if (activeTab === 'fmea') {
        if (role !== 'student') {
          const data = await api.getFmea();
          setFmeaList(data);
        }
      } else if (activeTab === 'defects') {
        const data = await api.getDefects();
        setDefectsList(data);
      } else if (activeTab === 'pdca') {
        const data = await api.getPdca();
        setPdcaList(data);
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to load TQM data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveTabData();
  }, [activeTab]);

  // Submit Handlers
  const handleCreateVoc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.submitVoC(vocForm);
      showFeedback('success', 'Voice of Customer feedback logged successfully.');
      setIsAddVocOpen(false);
      setVocForm({
        feedback_category: '',
        customer_verbatim: '',
        key_issue: '',
        satisfaction_rating: null,
        usability_metric: '',
      });
      await loadActiveTabData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to submit VoC');
    }
  };

  const handleCreateCtq = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCtq(ctqForm);
      showFeedback('success', 'Critical to Quality (CTQ) parameter added.');
      setIsAddCtqOpen(false);
      setCtqForm({ need_statement: '', quality_driver: '', ctq_metric: '', target_specification: '', lower_limit: '', upper_limit: '' });
      await loadActiveTabData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to create CTQ');
    }
  };

  const handleDeleteCtq = async (id: number) => {
    if (!window.confirm('Delete this CTQ parameter?')) return;
    try {
      await api.deleteCtq(id);
      showFeedback('success', 'CTQ parameter deleted.');
      await loadActiveTabData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete CTQ');
    }
  };

  const handleCreateSipoc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSipoc(sipocForm);
      showFeedback('success', 'SIPOC process map added.');
      setIsAddSipocOpen(false);
      setSipocForm({ process_name: '', supplier: '', inputs: '', process_steps: '', outputs: '', customer: '' });
      await loadActiveTabData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to create SIPOC');
    }
  };

  const handleDeleteSipoc = async (id: number) => {
    if (!window.confirm('Delete this SIPOC map?')) return;
    try {
      await api.deleteSipoc(id);
      showFeedback('success', 'SIPOC map deleted.');
      await loadActiveTabData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete SIPOC');
    }
  };

  const handleCreateFmea = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createFmea({
        ...fmeaForm,
        severity: Number(fmeaForm.severity),
        occurrence: Number(fmeaForm.occurrence),
        detection: Number(fmeaForm.detection),
      });
      showFeedback('success', 'FMEA failure mode recorded and RPN calculated.');
      setIsAddFmeaOpen(false);
      setFmeaForm({
        process_step: '',
        potential_failure_mode: '',
        potential_effect: '',
        severity: '',
        potential_cause: '',
        occurrence: '',
        current_controls: '',
        detection: '',
        recommended_action: '',
        action_taken: '',
      });
      await loadActiveTabData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to create FMEA record');
    }
  };

  const handleDeleteFmea = async (id: number) => {
    if (!window.confirm('Delete this FMEA record?')) return;
    try {
      await api.deleteFmea(id);
      showFeedback('success', 'FMEA record deleted.');
      await loadActiveTabData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete FMEA');
    }
  };

  const handleLogDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.logDefect(defectForm);
      showFeedback('success', 'Defect logged into TQM register.');
      setIsLogDefectOpen(false);
      setDefectForm({ title: '', description: '', defect_type: 'usability', severity: 'minor' });
      await loadActiveTabData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to log defect');
    }
  };

  const handleOpenEditDefect = (d: TqmDefect) => {
    setEditDefect(d);
    setDefectUpdateForm({
      root_cause: d.root_cause || '',
      corrective_action: d.corrective_action || '',
      status: d.status as any,
    });
  };

  const handleSaveDefectUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDefect) return;
    try {
      await api.updateDefect(editDefect.id, defectUpdateForm);
      showFeedback('success', 'Defect remediation details updated.');
      setEditDefect(null);
      await loadActiveTabData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update defect');
    }
  };

  const handleCreatePdca = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPdca(pdcaForm);
      showFeedback('success', 'PDCA continuous improvement cycle created.');
      setIsAddPdcaOpen(false);
      setPdcaForm({ cycle_name: '', target_objective: '', plan_stage: '', do_stage: '', check_stage: '', act_stage: '', status: 'plan' });
      await loadActiveTabData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to create PDCA cycle');
    }
  };

  const handleDeletePdca = async (id: number) => {
    if (!window.confirm('Delete this PDCA cycle?')) return;
    try {
      await api.deletePdca(id);
      showFeedback('success', 'PDCA cycle deleted.');
      await loadActiveTabData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete PDCA');
    }
  };

  const canManageTqm = role === 'admin' || role === 'warden';
  const isAdmin = role === 'admin';
  const canViewManagementTqm = role !== 'student';
  const hasCompleteFmeaRatings = [fmeaForm.severity, fmeaForm.occurrence, fmeaForm.detection]
    .every((rating) => typeof rating === 'number' && rating >= 1 && rating <= 10);
  const calculatedFmeaRpn = hasCompleteFmeaRatings
    ? Number(fmeaForm.severity) * Number(fmeaForm.occurrence) * Number(fmeaForm.detection)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Sub Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={22} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>TQM Quality Framework (Q03: Usability)</h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Total Quality Management instruments: VoC, CTQ Tree, SIPOC, FMEA with RPN, Defect Tracking, and PDCA Cycles.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('voc')}
          className={`btn btn-sm ${activeTab === 'voc' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <MessageSquareQuote size={15} />
          <span>Voice of Customer</span>
        </button>
        {canViewManagementTqm && <button
          onClick={() => setActiveTab('ctq')}
          className={`btn btn-sm ${activeTab === 'ctq' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Target size={15} />
          <span>CTQ Parameters</span>
        </button>}
        {canManageTqm && <button
          onClick={() => setActiveTab('sipoc')}
          className={`btn btn-sm ${activeTab === 'sipoc' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <GitBranch size={15} />
          <span>SIPOC Process Map</span>
        </button>}
        {role !== 'student' && (
          <button
            onClick={() => setActiveTab('fmea')}
            className={`btn btn-sm ${activeTab === 'fmea' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <ShieldAlert size={15} />
          <span>FMEA with RPN</span>
          </button>
        )}
        <button
          onClick={() => setActiveTab('defects')}
          className={`btn btn-sm ${activeTab === 'defects' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Bug size={15} />
          <span>Defect Logging</span>
        </button>
        {canManageTqm && <button
          onClick={() => setActiveTab('pdca')}
          className={`btn btn-sm ${activeTab === 'pdca' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <RotateCw size={15} />
          <span>PDCA Cycles</span>
        </button>}
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

      {/* 1. TAB: VOICE OF CUSTOMER (VoC) */}
      {activeTab === 'voc' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Capture raw customer verbatims, usability evidence, satisfaction ratings, and usability metrics.
            </span>
            <button onClick={() => setIsAddVocOpen(true)} className="btn btn-primary btn-sm">
              <Plus size={15} />
              <span>Submit VoC Feedback</span>
            </button>
          </div>

          {vocList.length === 0 ? (
            <EmptyState
              icon={MessageSquareQuote}
              title="No VoC Evidence Logged Yet"
              description="No stakeholder feedback or usability survey responses have been submitted. Click 'Submit VoC Feedback' to record qualitative voice-of-customer input."
              actionText="Submit VoC Feedback"
              onAction={() => setIsAddVocOpen(true)}
            />
          ) : (
            <div className="table-responsive-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Stakeholder</th>
                    <th>Category</th>
                    <th>Customer Verbatim (VoC)</th>
                    <th>Key Issue</th>
                    <th>Satisfaction</th>
                    <th>Usability Metric</th>
                    <th>Recorded Date</th>
                  </tr>
                </thead>
                <tbody>
                  {vocList.map((v) => (
                    <tr key={v.id}>
                      <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{v.stakeholder_type}</td>
                      <td>
                        <span className="badge badge-info">{v.feedback_category}</span>
                      </td>
                      <td style={{ fontStyle: 'italic', maxWidth: '300px' }}>"{v.customer_verbatim}"</td>
                      <td style={{ fontWeight: 600 }}>{v.key_issue}</td>
                      <td>
                        {v.satisfaction_rating ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#f59e0b' }}>
                            {v.satisfaction_rating} <Star size={14} fill="#f59e0b" />
                          </div>
                        ) : '—'}
                      </td>
                      <td>{v.usability_metric || '—'}</td>
                      <td>{new Date(v.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. TAB: CRITICAL TO QUALITY (CTQ) */}
      {activeTab === 'ctq' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              CTQ Tree: Links overarching customer needs to quality drivers, measurable metrics, and target specifications.
            </span>
            {isAdmin && (
              <button onClick={() => setIsAddCtqOpen(true)} className="btn btn-primary btn-sm">
                <Plus size={15} />
                <span>Add CTQ Requirement</span>
              </button>
            )}
          </div>

          {ctqList.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No CTQ Parameters Defined"
              description="No Critical to Quality specifications have been defined yet. The Administrator can add customer needs, quality drivers, and measurable target limits."
              actionText={isAdmin ? 'Add First CTQ Parameter' : undefined}
              onAction={() => setIsAddCtqOpen(true)}
              canAction={isAdmin}
            />
          ) : (
            <div className="table-responsive-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer Need</th>
                    <th>Quality Driver</th>
                    <th>CTQ Metric</th>
                    <th>Target Specification</th>
                    <th>Lower Limit (LSL)</th>
                    <th>Upper Limit (USL)</th>
                    {isAdmin && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {ctqList.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.need_statement}</td>
                      <td>{c.quality_driver}</td>
                      <td><span className="badge badge-info">{c.ctq_metric}</span></td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{c.target_specification}</td>
                      <td>{c.lower_limit || 'N/A'}</td>
                      <td>{c.upper_limit || 'N/A'}</td>
                      {isAdmin && (
                        <td>
                          <button onClick={() => handleDeleteCtq(c.id)} className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)' }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. TAB: SIPOC PROCESS MAP */}
      {activeTab === 'sipoc' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              High-level process mapping: Suppliers, Inputs, Process Steps, Outputs, Customers.
            </span>
            {isAdmin && (
              <button onClick={() => setIsAddSipocOpen(true)} className="btn btn-primary btn-sm">
                <Plus size={15} />
                <span>Map New Process (SIPOC)</span>
              </button>
            )}
          </div>

          {sipocList.length === 0 ? (
            <EmptyState
              icon={GitBranch}
              title="No SIPOC Process Maps Created"
              description="No high-level process flows are currently mapped. Authorized managers can add a process map using information from the hostel."
              actionText={canManageTqm ? 'Map First Process' : undefined}
              onAction={() => setIsAddSipocOpen(true)}
              canAction={canManageTqm}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {sipocList.map((s) => (
                <div key={s.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Process: {s.process_name}
                    </h3>
                {isAdmin && (
                      <button onClick={() => handleDeleteSipoc(s.id)} className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)' }}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Suppliers</div>
                      <div style={{ fontSize: '0.875rem', marginTop: '4px', whiteSpace: 'pre-line' }}>{s.supplier}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inputs</div>
                      <div style={{ fontSize: '0.875rem', marginTop: '4px', whiteSpace: 'pre-line' }}>{s.inputs}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>Process Steps</div>
                      <div style={{ fontSize: '0.875rem', marginTop: '4px', whiteSpace: 'pre-line' }}>{s.process_steps}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Outputs</div>
                      <div style={{ fontSize: '0.875rem', marginTop: '4px', whiteSpace: 'pre-line' }}>{s.outputs}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Customers</div>
                      <div style={{ fontSize: '0.875rem', marginTop: '4px', whiteSpace: 'pre-line' }}>{s.customer}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. TAB: FMEA WITH RPN (Failure Mode and Effects Analysis) */}
      {activeTab === 'fmea' && role !== 'student' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Proactive Risk Assessment: Risk Priority Number (RPN) = Severity (S) × Occurrence (O) × Detection (D).
            </span>
            {canManageTqm && (
              <button onClick={() => setIsAddFmeaOpen(true)} className="btn btn-primary btn-sm">
                <Plus size={15} />
                <span>Add Failure Mode (FMEA)</span>
              </button>
            )}
          </div>

          {fmeaList.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="No FMEA Risks Identified"
              description="No failure modes have been evaluated yet. Identify potential process failure modes, effects, severity, and occurrence ratings to compute Risk Priority Numbers (RPN)."
              actionText={canManageTqm ? 'Add First FMEA Record' : undefined}
              onAction={() => setIsAddFmeaOpen(true)}
              canAction={canManageTqm}
            />
          ) : (
            <div className="table-responsive-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Process Step</th>
                    <th>Potential Failure Mode</th>
                    <th>Potential Effect</th>
                    <th>S (1-10)</th>
                    <th>Potential Cause</th>
                    <th>O (1-10)</th>
                    <th>Current Controls</th>
                    <th>D (1-10)</th>
                    <th>RPN</th>
                    <th>Recommended Action</th>
                    {canManageTqm && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {fmeaList.map((f) => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 600 }}>{f.process_step}</td>
                      <td>{f.potential_failure_mode}</td>
                      <td>{f.potential_effect}</td>
                      <td style={{ textAlign: 'center' }}>{f.severity}</td>
                      <td>{f.potential_cause}</td>
                      <td style={{ textAlign: 'center' }}>{f.occurrence}</td>
                      <td>{f.current_controls}</td>
                      <td style={{ textAlign: 'center' }}>{f.detection}</td>
                      <td>
                        <span
                          className={`badge ${
                            f.rpn >= 125
                              ? 'badge-danger'
                              : f.rpn >= 50
                              ? 'badge-warning'
                              : 'badge-success'
                          }`}
                          style={{ fontSize: '0.85rem' }}
                        >
                          {f.rpn}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{f.recommended_action || '—'}</td>
                      {canManageTqm && (
                        <td>
                          <button onClick={() => handleDeleteFmea(f.id)} className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)' }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. TAB: DEFECT LOGGING & REMEDIATION */}
      {activeTab === 'defects' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Log software usability defects, UI display glitches, functional bugs, and track corrective action remediation.
            </span>
            <button onClick={() => setIsLogDefectOpen(true)} className="btn btn-primary btn-sm">
              <Plus size={15} />
              <span>Log Usability Defect</span>
            </button>
          </div>

          {defectsList.length === 0 ? (
            <EmptyState
              icon={Bug}
              title="No Quality Defects Recorded"
              description="No usability or functional defects have been reported in the TQM register. Use 'Log Usability Defect' to report any issue encountered during operations."
              actionText="Log Defect"
              onAction={() => setIsLogDefectOpen(true)}
            />
          ) : (
            <div className="table-responsive-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Defect ID</th>
                    <th>Title & Description</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Root Cause</th>
                    <th>Corrective Action</th>
                    {canManageTqm && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {defectsList.map((d) => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>#{d.id}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{d.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '280px' }}>{d.description}</div>
                      </td>
                      <td><span className="badge badge-info">{d.defect_type}</span></td>
                      <td>
                        <span className={`badge ${d.severity === 'critical' ? 'badge-danger' : d.severity === 'major' ? 'badge-warning' : 'badge-info'}`}>
                          {d.severity}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${d.status === 'verified_closed' ? 'badge-success' : d.status === 'in_remediation' ? 'badge-info' : 'badge-warning'}`}>
                          {d.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{d.root_cause || '—'}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{d.corrective_action || '—'}</td>
                      {canManageTqm && (
                        <td>
                          <button onClick={() => handleOpenEditDefect(d)} className="btn btn-secondary btn-sm">
                            <Edit3 size={14} />
                            <span>Update</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. TAB: PDCA CYCLES */}
      {activeTab === 'pdca' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Plan-Do-Check-Act continuous improvement cycle tracking for Q03 usability enhancement.
            </span>
            {canManageTqm && (
              <button onClick={() => setIsAddPdcaOpen(true)} className="btn btn-primary btn-sm">
                <Plus size={15} />
                <span>Start New PDCA Cycle</span>
              </button>
            )}
          </div>

          {pdcaList.length === 0 ? (
            <EmptyState
              icon={RotateCw}
              title="No PDCA Improvement Cycles"
              description="No continuous improvement iterations are active. Managers can launch a PDCA cycle to plan, pilot, measure, and standardize usability solutions."
              actionText={canManageTqm ? 'Start First PDCA Cycle' : undefined}
              onAction={() => setIsAddPdcaOpen(true)}
              canAction={canManageTqm}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pdcaList.map((p) => (
                <div key={p.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{p.cycle_name}</h3>
                        <span className={`badge ${p.status === 'standardized' ? 'badge-success' : 'badge-info'}`}>
                          Phase: {p.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Target: {p.target_objective}
                      </div>
                    </div>
                    {canManageTqm && (
                      <button onClick={() => handleDeletePdca(p.id)} className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)' }}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>1. Plan</div>
                      <div style={{ fontSize: '0.85rem', marginTop: '4px', whiteSpace: 'pre-line' }}>{p.plan_stage}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>2. Do (Pilot)</div>
                      <div style={{ fontSize: '0.85rem', marginTop: '4px', whiteSpace: 'pre-line' }}>{p.do_stage || 'Pending execution'}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>3. Check (Measure)</div>
                      <div style={{ fontSize: '0.85rem', marginTop: '4px', whiteSpace: 'pre-line' }}>{p.check_stage || 'Pending measurement'}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>4. Act (Standardize)</div>
                      <div style={{ fontSize: '0.85rem', marginTop: '4px', whiteSpace: 'pre-line' }}>{p.act_stage || 'Pending standardization'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* VoC Modal */}
      <Modal
        isOpen={isAddVocOpen}
        onClose={() => setIsAddVocOpen(false)}
        title="Submit Voice of Customer / Usability Feedback"
        footer={
          <>
            <button type="button" onClick={() => setIsAddVocOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="voc-form" type="submit" className="btn btn-primary">
              Log Feedback
            </button>
          </>
        }
      >
        <form id="voc-form" onSubmit={handleCreateVoc}>
          <div className="form-group">
            <label className="form-label">Feedback Category</label>
            <select
              className="form-select"
              value={vocForm.feedback_category}
              required
              onChange={(e) => setVocForm({ ...vocForm, feedback_category: e.target.value })}
            >
              <option value="" disabled>Select a category</option>
              <option value="Usability & Navigation">Usability & Navigation</option>
              <option value="Room Allocation Process">Room Allocation Process</option>
              <option value="Fee Invoicing & Payment">Fee Invoicing & Payment</option>
              <option value="Maintenance Request Response">Maintenance Request Response</option>
              <option value="Accessibility & Layout">Accessibility & Layout</option>
              <option value="General Hostel Governance">General Hostel Governance</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Customer Verbatim (Raw Quote)</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Enter the customer’s exact feedback"
              value={vocForm.customer_verbatim}
              onChange={(e) => setVocForm({ ...vocForm, customer_verbatim: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Key Identified Quality Issue</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter the issue identified from this feedback"
              value={vocForm.key_issue}
              onChange={(e) => setVocForm({ ...vocForm, key_issue: e.target.value })}
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Satisfaction Rating (1-5)</label>
              <select
                className="form-select"
                value={vocForm.satisfaction_rating ?? ''}
                onChange={(e) => setVocForm({ ...vocForm, satisfaction_rating: e.target.value ? parseInt(e.target.value) : null })}
              >
                <option value="">Not recorded</option>
                <option value={5}>5 - Excellent</option>
                <option value={4}>4 - Good</option>
                <option value={3}>3 - Average</option>
                <option value={2}>2 - Poor</option>
                <option value={1}>1 - Very Dissatisfied</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Applicable Usability Metric</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter a metric only if it was measured"
                value={vocForm.usability_metric}
                onChange={(e) => setVocForm({ ...vocForm, usability_metric: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* CTQ Modal */}
      <Modal
        isOpen={isAddCtqOpen}
        onClose={() => setIsAddCtqOpen(false)}
        title="Add Critical to Quality (CTQ) Requirement"
        footer={
          <>
            <button type="button" onClick={() => setIsAddCtqOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="ctq-form" type="submit" className="btn btn-primary">
              Save CTQ Specification
            </button>
          </>
        }
      >
        <form id="ctq-form" onSubmit={handleCreateCtq}>
          <div className="form-group">
            <label className="form-label">Customer Need Statement</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter the customer need"
              value={ctqForm.need_statement}
              onChange={(e) => setCtqForm({ ...ctqForm, need_statement: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Quality Driver</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter the related quality driver"
              value={ctqForm.quality_driver}
              onChange={(e) => setCtqForm({ ...ctqForm, quality_driver: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">CTQ Measurable Metric</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter the measurable quality requirement"
              value={ctqForm.ctq_metric}
              onChange={(e) => setCtqForm({ ...ctqForm, ctq_metric: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Target Specification</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter the target based on collected requirements"
              value={ctqForm.target_specification}
              onChange={(e) => setCtqForm({ ...ctqForm, target_specification: e.target.value })}
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Lower Spec Limit (LSL)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter lower limit if defined"
                value={ctqForm.lower_limit}
                onChange={(e) => setCtqForm({ ...ctqForm, lower_limit: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Upper Spec Limit (USL)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter upper limit if defined"
                value={ctqForm.upper_limit}
                onChange={(e) => setCtqForm({ ...ctqForm, upper_limit: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* SIPOC Modal */}
      <Modal
        isOpen={isAddSipocOpen}
        onClose={() => setIsAddSipocOpen(false)}
        title="Map High-Level Process (SIPOC)"
        footer={
          <>
            <button type="button" onClick={() => setIsAddSipocOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="sipoc-form" type="submit" className="btn btn-primary">
              Save SIPOC Map
            </button>
          </>
        }
      >
        <form id="sipoc-form" onSubmit={handleCreateSipoc}>
          <div className="form-group">
            <label className="form-label">Process Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter the process name"
              value={sipocForm.process_name}
              onChange={(e) => setSipocForm({ ...sipocForm, process_name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Suppliers</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Enter suppliers"
              value={sipocForm.supplier}
              onChange={(e) => setSipocForm({ ...sipocForm, supplier: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Inputs</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Enter process inputs"
              value={sipocForm.inputs}
              onChange={(e) => setSipocForm({ ...sipocForm, inputs: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Process Steps (Key sequence)</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Enter the process steps"
              value={sipocForm.process_steps}
              onChange={(e) => setSipocForm({ ...sipocForm, process_steps: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Outputs</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Enter process outputs"
              value={sipocForm.outputs}
              onChange={(e) => setSipocForm({ ...sipocForm, outputs: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Customers</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Enter the customers"
              value={sipocForm.customer}
              onChange={(e) => setSipocForm({ ...sipocForm, customer: e.target.value })}
              required
            />
          </div>
        </form>
      </Modal>

      {/* FMEA Modal */}
      <Modal
        isOpen={isAddFmeaOpen}
        onClose={() => setIsAddFmeaOpen(false)}
        title="Add Failure Mode and Effects Analysis (FMEA)"
        footer={
          <>
            <button type="button" onClick={() => setIsAddFmeaOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="fmea-form" type="submit" className="btn btn-primary">
              Compute RPN & Save
            </button>
          </>
        }
      >
        <form id="fmea-form" onSubmit={handleCreateFmea}>
          <div className="form-group">
            <label className="form-label">Process Step</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter the process step"
              value={fmeaForm.process_step}
              onChange={(e) => setFmeaForm({ ...fmeaForm, process_step: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Potential Failure Mode</label>
            <input
              type="text"
              className="form-input"
              placeholder="Describe a potential failure mode"
              value={fmeaForm.potential_failure_mode}
              onChange={(e) => setFmeaForm({ ...fmeaForm, potential_failure_mode: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Potential Effect of Failure</label>
            <input
              type="text"
              className="form-input"
              placeholder="Describe the potential effect"
              value={fmeaForm.potential_effect}
              onChange={(e) => setFmeaForm({ ...fmeaForm, potential_effect: e.target.value })}
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <div className="form-group">
              <label className="form-label">Severity (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                className="form-input"
                value={fmeaForm.severity}
                onChange={(e) => setFmeaForm({ ...fmeaForm, severity: e.target.value ? Number(e.target.value) : '' })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Occurrence (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                className="form-input"
                value={fmeaForm.occurrence}
                onChange={(e) => setFmeaForm({ ...fmeaForm, occurrence: e.target.value ? Number(e.target.value) : '' })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Detection (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                className="form-input"
                value={fmeaForm.detection}
                onChange={(e) => setFmeaForm({ ...fmeaForm, detection: e.target.value ? Number(e.target.value) : '' })}
                required
              />
            </div>
          </div>
          <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '14px', fontSize: '0.85rem' }}>
            Calculated RPN (S × O × D): <strong>{calculatedFmeaRpn ?? 'Enter all three ratings'}</strong>
          </div>
          <div className="form-group">
            <label className="form-label">Potential Cause</label>
            <input
              type="text"
              className="form-input"
              placeholder="Describe the potential cause"
              value={fmeaForm.potential_cause}
              onChange={(e) => setFmeaForm({ ...fmeaForm, potential_cause: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Current Prevention / Controls</label>
            <input
              type="text"
              className="form-input"
              placeholder="Describe existing controls"
              value={fmeaForm.current_controls}
              onChange={(e) => setFmeaForm({ ...fmeaForm, current_controls: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Recommended Corrective Action</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Enter a recommended action if identified"
              value={fmeaForm.recommended_action}
              onChange={(e) => setFmeaForm({ ...fmeaForm, recommended_action: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Log Defect Modal */}
      <Modal
        isOpen={isLogDefectOpen}
        onClose={() => setIsLogDefectOpen(false)}
        title="Log Usability or Quality Defect"
        footer={
          <>
            <button type="button" onClick={() => setIsLogDefectOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="defect-form" type="submit" className="btn btn-primary">
              Log Defect
            </button>
          </>
        }
      >
        <form id="defect-form" onSubmit={handleLogDefect}>
          <div className="form-group">
            <label className="form-label">Defect Summary / Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="Describe the observed defect"
              value={defectForm.title}
              onChange={(e) => setDefectForm({ ...defectForm, title: e.target.value })}
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Defect Type</label>
              <select
                className="form-select"
                value={defectForm.defect_type}
                onChange={(e) => setDefectForm({ ...defectForm, defect_type: e.target.value as any })}
              >
                <option value="usability">Usability / UX Issue</option>
                <option value="ui_display">UI Layout / Clipping</option>
                <option value="functional">Functional Defect</option>
                <option value="data_error">Data Error</option>
                <option value="performance">Performance Latency</option>
                <option value="security">Security / Access Control</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Severity Level</label>
              <select
                className="form-select"
                value={defectForm.severity}
                onChange={(e) => setDefectForm({ ...defectForm, severity: e.target.value as any })}
              >
                <option value="critical">Critical</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
                <option value="cosmetic">Cosmetic</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Detailed Description & Steps to Reproduce</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Explain where and how this quality defect occurred..."
              value={defectForm.description}
              onChange={(e) => setDefectForm({ ...defectForm, description: e.target.value })}
              required
            />
          </div>
        </form>
      </Modal>

      {/* Update Defect Modal (Manager) */}
      <Modal
        isOpen={!!editDefect}
        onClose={() => setEditDefect(null)}
        title={`Remediate Defect #${editDefect?.id} (${editDefect?.title})`}
        footer={
          <>
            <button type="button" onClick={() => setEditDefect(null)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="edit-defect-form" type="submit" className="btn btn-primary">
              Save Resolution
            </button>
          </>
        }
      >
        <form id="edit-defect-form" onSubmit={handleSaveDefectUpdate}>
          <div className="form-group">
            <label className="form-label">Defect Status</label>
            <select
              className="form-select"
              value={defectUpdateForm.status}
              onChange={(e) => setDefectUpdateForm({ ...defectUpdateForm, status: e.target.value as any })}
            >
              <option value="logged">Logged (Under Review)</option>
              <option value="analyzing">Analyzing Root Cause</option>
              <option value="in_remediation">In Remediation (Fix in Progress)</option>
              <option value="verified_closed">Verified & Closed</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Root Cause Analysis</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Describe the underlying cause of the defect..."
              value={defectUpdateForm.root_cause}
              onChange={(e) => setDefectUpdateForm({ ...defectUpdateForm, root_cause: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Corrective & Preventive Action (CAPA)</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Action taken to eliminate recurrence..."
              value={defectUpdateForm.corrective_action}
              onChange={(e) => setDefectUpdateForm({ ...defectUpdateForm, corrective_action: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* PDCA Modal */}
      <Modal
        isOpen={isAddPdcaOpen}
        onClose={() => setIsAddPdcaOpen(false)}
        title="Start PDCA Continuous Improvement Cycle"
        footer={
          <>
            <button type="button" onClick={() => setIsAddPdcaOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="pdca-form" type="submit" className="btn btn-primary">
              Launch PDCA Cycle
            </button>
          </>
        }
      >
        <form id="pdca-form" onSubmit={handleCreatePdca}>
          <div className="form-group">
            <label className="form-label">Cycle Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter a name for this improvement cycle"
              value={pdcaForm.cycle_name}
              onChange={(e) => setPdcaForm({ ...pdcaForm, cycle_name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Target Quality Objective</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter an objective based on measured evidence"
              value={pdcaForm.target_objective}
              onChange={(e) => setPdcaForm({ ...pdcaForm, target_objective: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Plan Stage (Problem definition, root cause, planned intervention)</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Identify usability bottlenecks and propose changes..."
              value={pdcaForm.plan_stage}
              onChange={(e) => setPdcaForm({ ...pdcaForm, plan_stage: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Do Stage (Implementation details)</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Intervention carried out..."
              value={pdcaForm.do_stage}
              onChange={(e) => setPdcaForm({ ...pdcaForm, do_stage: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Check Stage (Verification & measurements)</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Comparative measurements vs baseline..."
              value={pdcaForm.check_stage}
              onChange={(e) => setPdcaForm({ ...pdcaForm, check_stage: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Act Stage (Standardization)</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Standardize successful solution into policy..."
              value={pdcaForm.act_stage}
              onChange={(e) => setPdcaForm({ ...pdcaForm, act_stage: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
