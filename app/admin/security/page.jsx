"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Shield, Edit, Trash2, X, Loader2, Search, Eye, EyeOff, User, Lock } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function SecuritiesPage() {
  const [securities, setSecurities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSecurity, setEditingSecurity] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    mobileNumber: "",
    username: "",
    password: "",
    shiftTiming: "",
    photoUrl: "",
  });

  useEffect(() => {
    fetchSecurities();
  }, []);

  const fetchSecurities = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/securities");
      const data = await res.json();
      if (res.ok) setSecurities(data.securities || []);
      else toast.error(data.error || "Failed to load security staff");
    } catch {
      toast.error("Failed to fetch security staff");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      mobileNumber: "",
      username: "",
      password: "",
      shiftTiming: "",
      photoUrl: "",
    });
    setEditingSecurity(null);
    setShowPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingSecurity
        ? `/api/securities/${editingSecurity.id}`
        : "/api/securities";
      const method = editingSecurity ? "PUT" : "POST";
      
      // For editing, only send password if it's been changed
      const payload = { ...formData };
      if (editingSecurity && !formData.password) {
        delete payload.password;
      }
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          editingSecurity
            ? "Security staff updated!"
            : "Security staff added!"
        );
        setShowModal(false);
        resetForm();
        fetchSecurities();
      } else {
        toast.error(data.error || "Error saving security staff");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (security) => {
    setEditingSecurity(security);
    setFormData({
      name: security.name,
      mobileNumber: security.mobileNumber,
      username: security.username,
      password: "", // Don't populate password for security
      shiftTiming: security.shiftTiming || "",
      photoUrl: security.photoUrl || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this security staff?")) return;
    try {
      const res = await fetch(`/api/securities/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Security staff deleted!");
        fetchSecurities();
      } else {
        toast.error("Failed to delete security staff");
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  const filteredSecurities = securities.filter((s) =>
    [s.name, s.mobileNumber, s.username, s.shiftTiming]
      .join(" ")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Security Staff</h1>
          <p className="text-slate-600 mt-1">
            Manage all security staff for your community
          </p>
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
          Add Security
        </motion.button>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search security staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
        </div>
      ) : filteredSecurities.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No security staff found
          </h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSecurities.map((sec, idx) => (
            <motion.div
              key={sec.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-lg transition-all"
            >
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {sec.name}
                  </h3>
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-600 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {sec.username}
                  </p>
                  <p className="text-sm text-slate-600">{sec.mobileNumber}</p>
                  {sec.shiftTiming && (
                    <p className="text-sm text-slate-600">{sec.shiftTiming}</p>
                  )}
                </div>
                {sec.photoUrl && (
                  <img
                    src={sec.photoUrl}
                    alt={sec.name}
                    className="w-20 h-20 rounded-lg object-cover border border-slate-100"
                  />
                )}
                <div className="flex gap-2 pt-3">
                  <button
                    onClick={() => handleEdit(sec)}
                    className="flex-1 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(sec.id)}
                    className="flex-1 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-slate-900/50 z-40"
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-4 sm:inset-auto sm:top-12 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg bg-white rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-2xl font-bold">
                  {editingSecurity ? "Edit Security Staff" : "Add Security Staff"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter full name"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter mobile number"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Divider */}
                <div className="border-t border-slate-200 my-4"></div>
                <p className="text-sm font-semibold text-slate-700 -mb-2">Login Credentials</p>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Username * <span className="text-xs text-slate-500">(3-20 characters, letters, numbers, underscore)</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter username"
                      pattern="[a-zA-Z0-9_]{3,20}"
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Password {editingSecurity ? "(leave blank to keep current)" : "*"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required={!editingSecurity}
                      placeholder={editingSecurity ? "Enter new password (optional)" : "Enter password"}
                      minLength="6"
                      className="w-full pl-10 pr-12 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {!editingSecurity && (
                    <p className="text-xs text-slate-500 mt-1">Minimum 6 characters</p>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-slate-200 my-4"></div>
                <p className="text-sm font-semibold text-slate-700 -mb-2">Additional Details</p>

                {/* Shift Timing */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Shift Timing
                  </label>
                  <input
                    type="text"
                    name="shiftTiming"
                    value={formData.shiftTiming}
                    onChange={handleInputChange}
                    placeholder="e.g., 9:00 AM - 6:00 PM"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Photo URL */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Photo URL
                  </label>
                  <input
                    type="url"
                    name="photoUrl"
                    value={formData.photoUrl}
                    onChange={handleInputChange}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 border border-slate-300 rounded-lg py-2 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg py-2 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting && (
                      <Loader2 className="animate-spin w-5 h-5" />
                    )}
                    {editingSecurity ? "Update" : "Add"} Security
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}