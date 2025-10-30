// ============================================
// FILE: app/(dashboard)/admin/apartment-requests/[requestId]/page.jsx
// Admin - Review Specific Apartment Request
// ============================================
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  User,
  Home,
  Users,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Shield,
  Calendar,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function ReviewRequestPage({ params }) {
  const router = useRouter();
  const { requestId } = params;

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminComments, setAdminComments] = useState("");
  const [imageModal, setImageModal] = useState({ show: false, url: null });

  useEffect(() => {
    fetchRequestDetails();
  }, [requestId]);

  const fetchRequestDetails = async () => {
    try {
      const res = await fetch(`/api/admin/apartment-requests?status=all`);
      if (res.ok) {
        const data = await res.json();
        const foundRequest = data.requests.find(
          (r) => r.requestId === parseInt(requestId)
        );
        if (foundRequest) {
          setRequest(foundRequest);
        } else {
          toast.error("Request not found");
          router.push("/admin/apartment-requests");
        }
      }
    } catch (error) {
      console.error("Failed to fetch request:", error);
      toast.error("Failed to load request details");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    if (window.confirm("Are you sure you want to approve this request?")) {
      submitReview("approve");
    }
  };

  const handleReject = () => {
    setShowRejectModal(true);
  };

  const submitReview = async (action) => {
    if (action === "reject" && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/apartment-requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejectionReason: action === "reject" ? rejectionReason.trim() : null,
          adminComments: adminComments.trim() || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          action === "approve"
            ? "Request approved successfully!"
            : "Request rejected"
        );
        setTimeout(() => {
          router.push("/admin/apartment-requests");
        }, 1500);
      } else {
        toast.error(data.error || "Failed to submit review");
      }
    } catch (error) {
      console.error("Submit review error:", error);
      toast.error("Failed to submit review");
    } finally {
      setSubmitting(false);
      setShowRejectModal(false);
    }
  };

  const viewImage = (imageFilename) => {
    const imageUrl = `https://wowfy.in/gatewise/guest_images/${imageFilename}`;
    setImageModal({ show: true, url: imageUrl });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Request not found
          </h3>
          <button
            onClick={() => router.push("/admin/apartment-requests")}
            className="text-blue-600 hover:text-blue-700"
          >
            Go back to requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Toaster position="top-right" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <button
          onClick={() => router.push("/admin/apartment-requests")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back to requests</span>
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Review Request
            </h1>
            <p className="text-slate-600 mt-1">Request #{requestId}</p>
          </div>
          <span
            className={`px-4 py-2 text-sm font-semibold rounded-full ${
              request.status === "pending"
                ? "bg-yellow-100 text-yellow-800"
                : request.status === "approved"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </span>
        </div>
      </motion.div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* User Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              User Information
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500 mb-1">Full Name</p>
              <p className="font-semibold text-slate-900">{request.userName}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Email Address</p>
              <p className="font-semibold text-slate-900">
                {request.userEmail}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Mobile Number</p>
              <p className="font-semibold text-slate-900">
                {request.userMobile || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Submitted On</p>
              <p className="font-semibold text-slate-900">
                {new Date(request.submittedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Apartment Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Apartment Details
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-500 mb-1">Apartment Number</p>
              <p className="font-semibold text-slate-900">
                {request.towerName ? `${request.towerName} - ` : ""}
                {request.apartmentNumber}
              </p>
            </div>
            {request.floorNumber && (
              <div>
                <p className="text-sm text-slate-500 mb-1">Floor</p>
                <p className="font-semibold text-slate-900">
                  {request.floorNumber}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-slate-500 mb-1">Ownership Type</p>
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  request.ownershipType === "owner"
                    ? "bg-green-100 text-green-800"
                    : "bg-purple-100 text-purple-800"
                }`}
              >
                {request.ownershipType === "owner" ? "Owner" : "Tenant"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Family Members */}
        {request.members && request.members.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl border border-slate-200 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Family Members ({request.members.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {request.members.map((member, index) => (
                <div
                  key={index}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <p className="font-semibold text-slate-900 mb-2">
                    {member.name}
                  </p>
                  {member.mobileNumber && (
                    <p className="text-sm text-slate-600 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {member.mobileNumber}
                    </p>
                  )}
                  {member.relation && (
                    <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                      <User className="w-4 h-4" />
                      {member.relation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Rule Responses */}
        {request.ruleResponses && request.ruleResponses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl border border-slate-200 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Community Rules ({request.ruleResponses.length})
              </h2>
            </div>
            <div className="space-y-4">
              {request.ruleResponses.map((response, index) => (
                <div
                  key={index}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">
                      {response.ruleName}
                    </h3>
                    {response.isMandatory && (
                      <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">
                        Required
                      </span>
                    )}
                  </div>
                  {response.ruleDescription && (
                    <p className="text-sm text-slate-600 mb-3">
                      {response.ruleDescription}
                    </p>
                  )}
                  {response.textResponse && (
                    <div className="mb-3 p-3 bg-white rounded border border-slate-200">
                      <p className="text-xs text-slate-500 mb-1">Response:</p>
                      <p className="text-sm text-slate-900">
                        {response.textResponse}
                      </p>
                    </div>
                  )}
                  {response.imageFilename && (
                    <button
                      onClick={() => viewImage(response.imageFilename)}
                      className="relative group"
                    >
                      <img
                        src={`https://wowfy.in/gatewise/guest_images/${response.imageFilename}`}
                        alt="Rule proof"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <div className="text-white text-center">
                          <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm font-medium">
                            Click to view full size
                          </p>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Admin Comments */}
        {request.status === "pending" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl border border-slate-200 p-6"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-3">
              Admin Comments (Optional)
            </h2>
            <textarea
              value={adminComments}
              onChange={(e) => setAdminComments(e.target.value)}
              placeholder="Add any internal notes or comments..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            />
          </motion.div>
        )}

        {/* Action Buttons */}
        {request.status === "pending" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex gap-4"
          >
            <button
              onClick={handleReject}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-5 h-5" />
              <span className="font-semibold">Reject Request</span>
            </button>
            <button
              onClick={handleApprove}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Approve Request</span>
                </>
              )}
            </button>
          </motion.div>
        )}
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRejectModal(false)}
              className="fixed inset-0 bg-slate-900/50 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg bg-white rounded-2xl shadow-2xl z-50"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Reject Request
                  </h2>
                </div>
                <p className="text-slate-600 mb-4">
                  Please provide a reason for rejecting this apartment request:
                </p>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[120px] mb-4"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => submitReview("reject")}
                    disabled={submitting || !rejectionReason.trim()}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Confirm Rejection"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Image Modal */}
      <AnimatePresence>
        {imageModal.show && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setImageModal({ show: false, url: null })}
              className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4"
            >
              <motion.img
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                src={imageModal.url}
                alt="Full size"
                className="max-w-full max-h-full rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => setImageModal({ show: false, url: null })}
                className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center"
              >
                <XCircle className="w-6 h-6 text-white" />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
