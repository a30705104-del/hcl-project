import React, { useState } from 'react';
import { 
  Wrench, 
  Plus, 
  Calendar, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X,
  FileText
} from 'lucide-react';
import { MaintenanceRecord } from '../types';

interface MaintenanceViewProps {
  records: MaintenanceRecord[];
  onAddRecord: (data: {
    maintenance_type: string;
    description: string;
    technician: string;
    status: string;
    downtime: number;
  }) => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({ records, onAddRecord }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    maintenance_type: 'Bearing Inspection & Grease Replenishment',
    description: 'Vibration spectrum showed minor raceway pitting. Flushed bearing cavity and injected synthetic grease.',
    technician: 'Alex Rivera (Reliability Specialist)',
    status: 'Completed',
    downtime: 1.0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddRecord(formData);
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Action */}
      <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wide">
              Work Orders & Maintenance Logbook
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Historical work orders, root cause records, replacement part numbers, and downtime tracking
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Log Work Order</span>
        </button>
      </div>

      {/* Maintenance History Table (Section 28 requirements) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Machine</th>
                <th className="py-3 px-4">Maintenance Action / Problem</th>
                <th className="py-3 px-4">Technician</th>
                <th className="py-3 px-4">Downtime</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap text-zinc-400 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-zinc-500" />
                    {new Date(r.timestamp).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-bold text-white">
                    {r.machine_id}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-zinc-100">{r.maintenance_type}</div>
                    <div className="text-[11px] text-zinc-400 font-sans mt-0.5 max-w-lg leading-relaxed">
                      {r.description}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-zinc-300">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-zinc-500" />
                      {r.technician}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-amber-400 font-bold">
                    {r.downtime} hrs
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-800/60">
                      <CheckCircle2 className="h-3 w-3" />
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form for Adding Maintenance Record */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wide flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-400" />
                Add Maintenance Work Order Record
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-zinc-400 mb-1">Maintenance Type / Procedure</label>
                <input
                  type="text"
                  required
                  value={formData.maintenance_type}
                  onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Work Description & Parts Changed</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white font-sans text-xs focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 mb-1">Assigned Technician</label>
                  <input
                    type="text"
                    required
                    value={formData.technician}
                    onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:outline-hidden focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Downtime (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={formData.downtime}
                    onChange={(e) => setFormData({ ...formData, downtime: parseFloat(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:outline-hidden focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-sans text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-sans text-xs font-semibold shadow-sm"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
