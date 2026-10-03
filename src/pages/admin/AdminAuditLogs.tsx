import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  limit, 
  where,
  startAfter,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { 
  Shield, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Calendar,
  User,
  ExternalLink,
  Activity,
  UserX,
  CreditCard,
  BookOpen,
  Lock,
  RefreshCw
} from 'lucide-react';

export function AdminAuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [lastDoc, setLastDoc] = useState<any>(null);
  
  const fetchLogs = async (isNext = false) => {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'audit_logs'), 
        orderBy('timestamp', 'desc'), 
        limit(20)
      );

      if (isNext && lastDoc) {
        q = query(
          collection(db, 'audit_logs'),
          orderBy('timestamp', 'desc'),
          startAfter(lastDoc),
          limit(20)
        );
      }

      if (filterAction !== 'all') {
        q = query(
          collection(db, 'audit_logs'),
          where('action', '==', filterAction),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
      }

      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (isNext) {
        setLogs(prev => [...prev, ...list]);
      } else {
        setLogs(list);
      }
      
      setLastDoc(snap.docs[snap.docs.length - 1]);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterAction]);

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'block_user':
      case 'unblock_user':
        return <UserX className="h-4 w-4" />;
      case 'approve_payment':
      case 'reject_payment':
        return <CreditCard className="h-4 w-4" />;
      case 'create_course':
      case 'archive_course':
      case 'delete_course':
        return <BookOpen className="h-4 w-4" />;
      case 'broadcast_sent':
        return <Shield className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('block') || act.includes('reject') || act.includes('delete')) return 'text-red-600 bg-red-50 border-red-100';
    if (act.includes('approve') || act.includes('create') || act.includes('unblock')) return 'text-green-700 bg-green-50 border-green-100';
    if (act.includes('broadcast')) return 'text-blue-700 bg-blue-50 border-blue-100';
    return 'text-neutral-600 bg-neutral-100 border-neutral-200';
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-900 uppercase">Audit & Activity Logs</h1>
            <p className="text-neutral-500 text-sm">Security logs tracking all administrative actions and system events.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input 
                type="text"
                placeholder="Search logs..."
                className="pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 focus:outline-none w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => fetchLogs()}
              className="p-2 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'all', label: 'All Actions' },
            { id: 'BLOCK_USER', label: 'Blocks' },
            { id: 'UNBLOCK_USER', label: 'Unblocks' },
            { id: 'APPROVE_PAYMENT', label: 'Payments' },
            { id: 'CREATE_COURSE', label: 'Courses' },
            { id: 'BROADCAST_SENT', label: 'Broadcasts' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterAction(f.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border transition-all shrink-0 ${
                filterAction === f.id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase text-[10px] tracking-widest border-b border-neutral-100">
                <tr>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Admin</th>
                  <th className="px-6 py-4">Target / Entity</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 font-medium">
                {logs.length > 0 ? logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border ${getActionColor(log.action)}`}>
                          {getActionIcon(log.action)}
                        </div>
                        <span className="text-neutral-900 font-bold">{log.action?.replace(/_/g, ' ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-[10px] shrink-0">
                          {log.adminId?.slice(0, 2).toUpperCase() || 'AD'}
                        </div>
                        <span className="text-neutral-600 text-xs truncate max-w-[120px]">{log.adminId || 'System'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight">{log.targetType}</span>
                        <p className="text-neutral-700 text-xs truncate max-w-[180px] font-mono">{log.targetId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-500 text-xs font-mono">
                      {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {log.metadata && Object.entries(log.metadata).map(([k, v]) => (
                          <span key={k} className="px-1.5 py-0.5 bg-neutral-100 text-neutral-500 text-[9px] rounded font-mono border border-neutral-200">
                            {k}:{JSON.stringify(v).slice(0, 15)}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">
                      {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : "No logs found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {logs.length >= 20 && (
            <div className="p-4 border-t border-neutral-50 text-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchLogs(true)}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                Load Older Activity
              </Button>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-neutral-900 rounded-3xl p-6 text-white space-y-3">
            <Lock className="h-6 w-6 text-brand-500" />
            <h3 className="font-bold uppercase tracking-tight">Immutable Logs</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">Audit logs are write-only records. They cannot be modified or deleted by admins for compliance.</p>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm space-y-3">
            <Calendar className="h-6 w-6 text-neutral-400" />
            <h3 className="font-bold text-neutral-900 uppercase tracking-tight">Retention Policy</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">System logs are retained for 365 days before automated archival to cold storage.</p>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm space-y-3">
            <Activity className="h-6 w-6 text-neutral-400" />
            <h3 className="font-bold text-neutral-900 uppercase tracking-tight">Real-time Sync</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">Every administrative action is logged instantly to the secure centralized audit database.</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
