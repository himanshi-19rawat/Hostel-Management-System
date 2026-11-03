import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Search,
  ShieldCheck,
  Scale,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { MessInventory as MessItem } from '../types';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';

export const MessInventory: React.FC = () => {
  const { role } = useAuth();
  const [items, setItems] = useState<MessItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MessItem | null>(null);
  const [form, setForm] = useState({
    item_name: '',
    category: 'Grains & Cereals',
    quantity: '' as number | '',
    unit: 'kg',
    min_threshold: '' as number | '',
    unit_price: '' as number | '',
    notes: '',
  });

  const categories = [
    'Grains & Cereals',
    'Pulses & Legumes',
    'Dairy & Eggs',
    'Vegetables & Fruits',
    'Spices & Condiments',
    'Cooking Oils & Ghee',
    'Cleaning & Sanitary',
    'Other Provisions',
  ];

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await api.getInventory(categoryFilter || undefined);
      setItems(list);
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to load mess inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({
      item_name: '',
      category: 'Grains & Cereals',
      quantity: '',
      unit: 'kg',
      min_threshold: '',
      unit_price: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MessItem) => {
    setEditingItem(item);
    setForm({
      item_name: item.item_name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      min_threshold: item.min_threshold ?? '',
      unit_price: item.unit_price ?? '',
      notes: item.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.item_name.trim()) {
      showFeedback('error', 'Please provide an item name.');
      return;
    }
    if (form.quantity === '' || isNaN(Number(form.quantity)) || Number(form.quantity) < 0) {
      showFeedback('error', 'Please enter a valid stock quantity (0 or greater).');
      return;
    }
    if (!form.unit.trim()) {
      showFeedback('error', 'Please specify a unit (e.g. kg, L, packets).');
      return;
    }
    if (form.min_threshold !== '' && (isNaN(Number(form.min_threshold)) || Number(form.min_threshold) < 0)) {
      showFeedback('error', 'Minimum threshold must be a non-negative number.');
      return;
    }
    if (form.unit_price !== '' && (isNaN(Number(form.unit_price)) || Number(form.unit_price) < 0)) {
      showFeedback('error', 'Unit price must be a non-negative number.');
      return;
    }

    try {
      const payload = {
        item_name: form.item_name.trim(),
        category: form.category,
        quantity: Number(form.quantity),
        unit: form.unit.trim(),
        min_threshold: form.min_threshold !== '' ? Number(form.min_threshold) : undefined,
        unit_price: form.unit_price !== '' ? Number(form.unit_price) : undefined,
        notes: form.notes.trim() || undefined,
      };

      if (editingItem) {
        await api.updateInventoryItem(editingItem.id, payload);
        showFeedback('success', `Updated inventory record for '${payload.item_name}'.`);
      } else {
        await api.createInventoryItem(payload);
        showFeedback('success', `Added new stock item '${payload.item_name}'.`);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to save inventory item');
    }
  };

  const handleDelete = async (item: MessItem) => {
    if (!window.confirm(`Are you sure you want to remove '${item.item_name}' from mess inventory?`)) return;
    try {
      await api.deleteInventoryItem(item.id);
      showFeedback('success', `Removed '${item.item_name}' from stock.`);
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete item');
    }
  };

  // Permission checks: Warden is the ONLY role that can add, edit, or delete inventory
  const canEdit = role === 'warden';

  const filteredItems = items.filter((i) =>
    searchQuery ? i.item_name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const lowStockCount = items.filter(
    (i) => i.min_threshold !== null && i.min_threshold !== undefined && Number(i.quantity) <= Number(i.min_threshold)
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {role === 'warden' ? 'Mess Provisions & Kitchen Inventory' : 'Mess Inventory (Read-Only Oversight)'}
            </h2>
            {role === 'admin' && (
              <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} /> Read-Only Oversight
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {role === 'admin'
              ? 'Administrative read-only oversight of mess stock levels and reorder thresholds. Adding, editing, and deleting inventory items is restricted strictly to the Warden.'
              : 'Track real hostel mess supplies, food grains, perishable stocks, and reorder levels. Starts completely empty until actual inventory is recorded.'}
          </p>
        </div>

        {canEdit && (
          <button onClick={handleOpenAdd} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} />
            <span>Add Stock Item</span>
          </button>
        )}
      </div>

      {role === 'admin' && (
        <div
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderColor: 'var(--info)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.875rem',
            color: 'var(--text-primary)',
          }}
        >
          <ShieldCheck size={18} color="var(--info)" />
          <span>
            <strong>Administrative Read-Only Oversight:</strong> You can view all stock records, current levels, and low-stock alerts. Adding, editing, adjusting quantities, and deleting items is restricted strictly to the Warden.
          </span>
        </div>
      )}

      {/* Metrics */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info)' }}>
            <Package size={24} />
          </div>
          <div>
            <div className="stat-val">{items.length}</div>
            <div className="stat-lbl">Tracked Stock Items</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: lowStockCount > 0 ? 'var(--danger-bg)' : 'var(--success-bg)', color: lowStockCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="stat-val">{lowStockCount}</div>
            <div className="stat-lbl">Low Stock Alerts</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
            <Scale size={24} />
          </div>
          <div>
            <div className="stat-val">{new Set(items.map((i) => i.category)).size}</div>
            <div className="stat-lbl">Active Categories</div>
          </div>
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
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search items..."
            style={{ paddingLeft: '32px', fontSize: '0.875rem' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: '180px', fontSize: '0.875rem' }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading mess stock records...
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No Mess Inventory Records"
          description={
            canEdit
              ? "The mess inventory starts clean with no preloaded or dummy stock. Use 'Add Stock Item' to register actual food provisions and kitchen inventory."
              : "There are no mess inventory records in the database. The Warden has not added any stock items yet."
          }
          actionText={canEdit ? 'Add First Stock Item' : undefined}
          onAction={handleOpenAdd}
          canAction={canEdit}
        />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>In Stock Quantity</th>
                <th>Min Reorder Threshold</th>
                <th>Unit Price</th>
                <th>Stock Status</th>
                <th>Notes</th>
                <th>Last Updated</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const isLow =
                  item.min_threshold !== null &&
                  item.min_threshold !== undefined &&
                  Number(item.quantity) <= Number(item.min_threshold);

                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {Number(item.quantity).toFixed(2)} {item.unit}
                    </td>
                    <td>
                      {item.min_threshold !== null && item.min_threshold !== undefined
                        ? `${Number(item.min_threshold).toFixed(2)} ${item.unit}`
                        : '—'}
                    </td>
                    <td>{item.unit_price ? `₹${Number(item.unit_price).toFixed(2)}` : '—'}</td>
                    <td>
                      <span className={`badge ${isLow ? 'badge-danger' : 'badge-success'}`}>
                        {isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '200px' }}>
                      {item.notes || '—'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(item.updated_at || item.created_at).toLocaleDateString()}
                    </td>
                    {canEdit && (
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="btn btn-secondary btn-sm"
                            title="Edit item or update quantity"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="btn btn-danger btn-sm"
                            title="Delete item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Edit ${editingItem.item_name}` : 'Add New Mess Stock Item'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Item Name *</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="e.g. Basmati Rice, Sunflower Oil, Toor Dal"
              value={form.item_name}
              onChange={(e) => setForm({ ...form, item_name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-select"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Unit of Measure *</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="e.g. kg, L, bags, packets"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                className="form-control"
                placeholder="Current quantity"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value === '' ? '' : Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Min Threshold</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                placeholder="Alert below"
                value={form.min_threshold}
                onChange={(e) => setForm({ ...form, min_threshold: e.target.value === '' ? '' : Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Unit Price (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                placeholder="Rate per unit"
                value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: e.target.value === '' ? '' : Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Storage Notes / Vendor</label>
            <textarea
              rows={2}
              className="form-control"
              placeholder="e.g. Dry storage room B, purchased from Wholesale Mart..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <span>{editingItem ? 'Save Changes' : 'Add Item'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
