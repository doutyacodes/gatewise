// ============================================
// PAGE: Admin Dispute Resolution Chat
// Join and resolve escalated disputes
// ============================================
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Send, 
  Shield, 
  Home as HomeIcon, 
  User as UserIcon,
  CheckCircle,
  AlertCircle,
  Clock,
  MoreVertical,
  X,
  MessageSquare,
  ChevronLeft,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function AdminDisputeChatPage() {
  const params = useParams();
  const router = useRouter();
  const [dispute, setDispute] = useState(null);
  const [messages, setMessages] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchDisputeDetails();
    const interval = setInterval(fetchDisputeDetails, 10000); // Poll for new messages
    return () => clearInterval(interval);
  }, [params.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchDisputeDetails = async () => {
    try {
      const res = await fetch(`/api/mobile-api/disputes/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setDispute(data.data.dispute);
        setMessages(data.data.messages);
        setApprovals(data.data.approvals);
      }
    } catch (error) {
      console.error('Failed to fetch details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Pending';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!messageText.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/mobile-api/disputes/${params.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageText: messageText.trim(),
          senderRole: 'admin' // Fixed role for admin panel
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessageText('');
        fetchDisputeDetails();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveResolution = async () => {
    try {
      setResolving(true);
      const res = await fetch(`/api/mobile-api/disputes/${params.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin' })
      });
      const data = await res.json();
      if (data.success) {
        fetchDisputeDetails();
      }
    } catch (error) {
      console.error('Failed to resolve:', error);
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const hasAdminApproved = approvals.some(a => a.approvedByRole === 'admin');

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Chat Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/admin/disputes" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
            <ChevronLeft size={24} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {dispute?.reportType === 'room_based' ? `Room: ${dispute.roomName}` : 'General Dispute'}
              </h1>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                dispute?.status === 'resolved' ? 'bg-green-100 text-green-700' : 
                dispute?.status === 'escalated' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                'bg-blue-100 text-blue-700'
              }`}>
                {dispute?.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">Session ID: #{dispute?.sessionId || 'N/A'} • {formatDate(dispute?.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {dispute?.status !== 'resolved' && (
            <button 
              onClick={handleApproveResolution}
              disabled={resolving || hasAdminApproved}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
                hasAdminApproved 
                ? 'bg-green-50 text-green-600 border border-green-200 cursor-default' 
                : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'
              }`}
            >
              {hasAdminApproved ? <><CheckCircle size={18}/> Approved</> : 'Approve Resolution'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
            {/* System Info Box */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-4 max-w-3xl mx-auto mb-8">
              <div className="bg-blue-100 p-2 rounded-lg h-fit">
                <AlertCircle size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-blue-900 text-sm mb-1">Dispute Reason</p>
                <p className="text-blue-800 text-sm leading-relaxed mb-3">{dispute?.reason}</p>
                {dispute?.imageFilename && (
                  <div className="relative group w-fit">
                    <img 
                      src={`https://wowfy.in/gatewise/guest_images/${dispute.imageFilename}`} 
                      alt="Dispute evidence" 
                      className="max-h-64 rounded-lg border border-blue-200 shadow-sm cursor-zoom-in transition-transform group-hover:scale-[1.02]"
                      onClick={() => window.open(`https://wowfy.in/gatewise/guest_images/${dispute.imageFilename}`, '_blank')}
                    />
                    <div className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink size={14} className="text-blue-600" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="max-w-4xl mx-auto w-full space-y-4">
              {messages.map((msg, idx) => {
                const isSystem = msg.senderRole === 'system';
                const isAdmin = msg.senderRole === 'admin';
                const isOwn = isAdmin; // In admin panel, admin is 'own'
                
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                const showName = !isOwn && (!prevMsg || prevMsg.senderId !== msg.senderId || prevMsg.senderRole !== msg.senderRole);
                
                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-6">
                      <div className="px-5 py-1.5 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200 shadow-sm flex items-center gap-2">
                        <Shield size={12} className="text-slate-400" />
                        {msg.messageText}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showName ? 'mt-6' : 'mt-1'}`}>
                    <div className={`flex items-end gap-3 max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-transform hover:scale-110 ${
                        showName ? 'opacity-100' : 'opacity-0 select-none pointer-events-none'
                      } ${
                        isAdmin ? 'bg-red-50 border-red-200 text-red-600' : 
                        msg.senderRole === 'owner' ? 'bg-blue-50 border-blue-200 text-blue-600' : 
                        'bg-purple-50 border-purple-200 text-purple-600'
                      }`}>
                        {isAdmin ? <Shield size={14}/> : <UserIcon size={14}/>}
                      </div>
                      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                        {showName && (
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className="text-[11px] font-bold text-slate-700 capitalize">{msg.senderName}</span>
                            <span className="text-[10px] font-medium text-slate-400">•</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{msg.senderRole}</span>
                          </div>
                        )}
                        <div className={`px-4 py-2 rounded-2xl shadow-sm text-sm leading-relaxed ${
                          isAdmin 
                          ? 'bg-slate-900 text-white rounded-br-none' 
                          : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                        }`}>
                          {msg.imageFilename && (
                            <img 
                              src={`https://wowfy.in/gatewise/guest_images/${msg.imageFilename}`} 
                              alt="Chat attachment" 
                              className="max-w-full max-h-64 rounded-lg mb-2 cursor-zoom-in"
                              onClick={() => window.open(`https://wowfy.in/gatewise/guest_images/${msg.imageFilename}`, '_blank')}
                            />
                          )}
                          {msg.messageText}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                          {formatTime(msg.sentAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-white border-t border-slate-200">
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-end gap-3">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-2 flex items-end shadow-inner focus-within:ring-2 focus-within:ring-slate-900 transition-all">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your official response..."
                  className="flex-1 bg-transparent border-none focus:ring-0 p-2 text-sm min-h-[44px] max-h-32 resize-none text-slate-800"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !messageText.trim()}
                className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-all disabled:bg-slate-200 disabled:text-slate-400 shadow-lg active:scale-95"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="w-80 bg-white border-l border-slate-200 p-6 hidden lg:block overflow-y-auto">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6">Dispute Details</h2>
          
          <div className="space-y-6">
            <section>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Status Matrix</p>
              <div className="space-y-3">
                {['owner', 'tenant', 'admin'].map(role => {
                  const approved = approvals.find(a => a.approvedByRole === role);
                  return (
                    <div key={role} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {role === 'admin' ? <Shield size={16}/> : <UserIcon size={16}/>}
                        </div>
                        <span className="text-xs font-bold text-slate-700 capitalize">{role}</span>
                      </div>
                      {approved ? (
                        <CheckCircle size={18} className="text-green-600" />
                      ) : (
                        <Clock size={18} className="text-slate-300" />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="pt-6 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Property Info</p>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <HomeIcon size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Room Details</p>
                    <p className="text-[11px] text-slate-500">{dispute?.roomName || 'Common Area'}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500">Reported By</span>
                    <span className="text-[10px] font-bold text-slate-900 capitalize">{dispute?.reportedByRole}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500">Created At</span>
                    <span className="text-[10px] font-bold text-slate-900">{formatDate(dispute?.createdAt)}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
