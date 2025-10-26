"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  UserCog,
  Calendar,
  Edit,
  Trash2,
  X,
  Loader2,
  Shield,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function AdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [communities, setCommunities] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobileNumber: "",
    password: "",
    communityId: "",
    role: "admin",
  });

  const fetchCommunities = async () => {
    try {
      const res = await fetch("/api/communities");
      const data = await res.json();
      if (res.ok) setCommunities(data.communities);
    } catch {
      toast.error("Failed to fetch communities");
    }
  };
  // Inside useEffect, add fetchCommunities().
  useEffect(() => {
    fetchAdmins();
    fetchCommunities();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await fetch("/api/admins");
      const data = await res.json();
      if (res.ok) setAdmins(data.admins);
      else toast.error(data.error || "Failed to load admins");
    } catch {
      toast.error("Failed to fetch admins");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingAdmin
        ? `/api/admins/${editingAdmin.id}`
        : "/api/admins";
      const method = editingAdmin ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(editingAdmin ? "Admin updated!" : "Admin created!");
        setShowModal(false);
        resetForm();
        fetchAdmins();
      } else toast.error(data.error || "Error saving admin");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (admin) => {
    setEditingAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      mobileNumber: admin.mobileNumber || "",
      password: "",
      communityId: admin.communityId,
      role: admin.role,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this admin?")) return;
    try {
      const res = await fetch(`/api/admins/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Admin deleted");
        fetchAdmins();
      } else toast.error("Failed to delete admin");
    } catch {
      toast.error("Something went wrong");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      mobileNumber: "",
      password: "",
      communityId: "",
      role: "admin",
    });
    setEditingAdmin(null);
  };

  const filteredAdmins = admins.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admins</h1>
          <p className="text-slate-600 mt-1">Manage all community admins</p>
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
          Add Admin
        </motion.button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search admins..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Admins Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
          <UserCog className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No admins found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAdmins.map((admin, index) => (
            <motion.div
              key={admin.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-lg transition-all"
            >
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {admin.name}
                  </h3>
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm text-slate-600">{admin.email}</p>
                <p className="text-sm text-slate-600">
                  {admin.mobileNumber || "-"}
                </p>
                <div className="text-sm text-slate-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(admin.createdAt).toLocaleDateString()}
                </div>
                <p className="text-sm mt-1 font-medium capitalize">
                  Role: <span className="text-blue-600">{admin.role}</span>
                </p>

                <div className="flex gap-2 pt-3">
                  <button
                    onClick={() => handleEdit(admin)}
                    className="flex-1 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(admin.id)}
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-slate-900/50 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-lg"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {editingAdmin ? "Edit Admin" : "Add Admin"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Name"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="Email"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  placeholder="Mobile Number"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={
                    editingAdmin ? "New Password (optional)" : "Password"
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
                <select
                  name="communityId"
                  value={formData.communityId}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Select Community</option>
                  {communities.map((community) => (
                    <option key={community.id} value={community.id}>
                      {community.name}
                    </option>
                  ))}
                </select>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="admin">Admin</option>
                  <option value="sub_admin">Sub Admin</option>
                </select>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 border border-slate-300 rounded-lg py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg py-2 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin w-5 h-5" />
                    ) : (
                      "Save"
                    )}
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
