// ============================================
// FILE: app/(dashboard)/admin/apartments/page.jsx
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Building2,
  Edit,
  Trash2,
  X,
  Loader2,
  Home,
  Hash,
  Layers,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function ApartmentsPage() {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingApartment, setEditingApartment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Bulk create state
  const [bulkApartments, setBulkApartments] = useState([
    { towerName: '', floorNumber: '', apartmentNumber: '', status: 'active' }
  ]);

  useEffect(() => {
    fetchApartments();
  }, []);

  const fetchApartments = async () => {
    try {
      const res = await fetch('/api/apartments');
      if (res.ok) {
        const data = await res.json();
        setApartments(data.apartments);
      }
    } catch (error) {
      toast.error('Failed to fetch apartments');
    } finally {
      setLoading(false);
    }
  };

  const addBulkRow = () => {
    setBulkApartments([
      ...bulkApartments,
      { towerName: '', floorNumber: '', apartmentNumber: '', status: 'active' }
    ]);
  };

  const removeBulkRow = (index) => {
    if (bulkApartments.length > 1) {
      setBulkApartments(bulkApartments.filter((_, i) => i !== index));
    }
  };

  const updateBulkRow = (index, field, value) => {
    const updated = [...bulkApartments];
    updated[index][field] = value;
    setBulkApartments(updated);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Validate all rows
    const isValid = bulkApartments.every(
      apt => apt.towerName && apt.floorNumber && apt.apartmentNumber
    );

    if (!isValid) {
      toast.error('Please fill all required fields');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/apartments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apartments: bulkApartments }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`${bulkApartments.length} apartment(s) created successfully!`);
        setShowModal(false);
        resetForm();
        fetchApartments();
      } else {
        toast.error(data.error || 'Failed to create apartments');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (apartment) => {
    setEditingApartment(apartment);
    setBulkApartments([{
      towerName: apartment.towerName || '',
      floorNumber: apartment.floorNumber?.toString() || '',
      apartmentNumber: apartment.apartmentNumber,
      status: apartment.status || 'active'
    }]);
    setShowModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const data = bulkApartments[0];

    try {
      const res = await fetch(`/api/apartments/${editingApartment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success('Apartment updated successfully!');
        setShowModal(false);
        resetForm();
        fetchApartments();
      } else {
        toast.error(result.error || 'Failed to update apartment');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this apartment?')) return;

    try {
      const res = await fetch(`/api/apartments/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Apartment deleted successfully!');
        fetchApartments();
      } else {
        toast.error('Failed to delete apartment');
      }
    } catch (error) {
      toast.error('Something went wrong');
    }
  };

  const resetForm = () => {
    setBulkApartments([
      { towerName: '', floorNumber: '', apartmentNumber: '', status: 'active' }
    ]);
    setEditingApartment(null);
  };

  const filteredApartments = apartments.filter((apt) =>
    apt.apartmentNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    apt.towerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Apartments</h1>
          <p className="text-slate-600 mt-1">Manage all apartment units</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Apartments
        </motion.button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search apartments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Apartments Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredApartments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Home className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No apartments found
          </h3>
          <p className="text-slate-600 mb-4">
            {searchQuery ? 'Try adjusting your search' : 'Get started by adding apartments'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Tower
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Floor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Apartment No.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredApartments.map((apt, index) => (
                  <motion.tr
                    key={apt.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-slate-900">
                          {apt.towerName || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-600" />
                        <span className="text-sm text-slate-900">{apt.floorNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-slate-900">
                          {apt.apartmentNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          apt.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {apt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(apt.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(apt)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(apt.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-slate-900/50 z-50"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-3xl z-50"
            >
              <div className="bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {editingApartment ? 'Edit Apartment' : 'Add Apartments'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <form onSubmit={editingApartment ? handleUpdate : handleBulkSubmit}>
                    <div className="space-y-4">
                      {bulkApartments.map((apt, index) => (
                        <div
                          key={index}
                          className="p-4 border border-slate-200 rounded-lg space-y-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-slate-900">
                              Apartment {index + 1}
                            </h3>
                            {!editingApartment && bulkApartments.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeBulkRow(index)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                Tower Name *
                              </label>
                              <input
                                type="text"
                                value={apt.towerName}
                                onChange={(e) =>
                                  updateBulkRow(index, 'towerName', e.target.value)
                                }
                                required
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., Tower A"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                Floor Number *
                              </label>
                              <input
                                type="number"
                                value={apt.floorNumber}
                                onChange={(e) =>
                                  updateBulkRow(index, 'floorNumber', e.target.value)
                                }
                                required
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., 5"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                Apartment Number *
                              </label>
                              <input
                                type="text"
                                value={apt.apartmentNumber}
                                onChange={(e) =>
                                  updateBulkRow(index, 'apartmentNumber', e.target.value)
                                }
                                required
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., 501"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                Status
                              </label>
                              <select
                                value={apt.status}
                                onChange={(e) =>
                                  updateBulkRow(index, 'status', e.target.value)
                                }
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}

                      {!editingApartment && (
                        <button
                          type="button"
                          onClick={addBulkRow}
                          className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus className="w-5 h-5" />
                          Add Another Apartment
                        </button>
                      )}
                    </div>

                    <div className="flex gap-3 pt-6">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Saving...
                          </>
                        ) : editingApartment ? (
                          'Update Apartment'
                        ) : (
                          `Create ${bulkApartments.length} Apartment(s)`
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
