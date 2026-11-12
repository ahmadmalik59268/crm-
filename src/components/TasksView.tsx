import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { ALL_LEAD_PRIORITIES, SYSTEM_TODAY } from '../data/demoData';
import { LeadPriority } from '../types/crm';

export const TasksView: React.FC = () => {
  const {
    visibleTasks,
    visibleLeads,
    agents,
    addTask,
    toggleTaskStatus,
    deleteTask,
    setSelectedLeadId,
  } = useCRM();

  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'overdue' | 'completed'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Task Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedAgentId, setAssignedAgentId] = useState(
    agents.find((a) => a.accountStatus === 'Active')?.id || 'AGT-01'
  );
  const [relatedLeadId, setRelatedLeadId] = useState<string>('');
  const [dueDate, setDueDate] = useState(SYSTEM_TODAY);
  const [priority, setPriority] = useState<LeadPriority>('High');

  const overdueCount = visibleTasks.filter(
    (t) => t.status === 'Pending' && t.dueDate < SYSTEM_TODAY
  ).length;

  const filteredTasks = visibleTasks.filter((t) => {
    if (filterMode === 'pending') return t.status === 'Pending';
    if (filterMode === 'completed') return t.status === 'Completed';
    if (filterMode === 'overdue') return t.status === 'Pending' && t.dueDate < SYSTEM_TODAY;
    return true;
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const ag = agents.find((a) => a.id === assignedAgentId);
    const ld = visibleLeads.find((l) => l.id === relatedLeadId);

    addTask({
      title: title.trim(),
      description: description.trim(),
      assignedAgentId,
      assignedAgentName: ag ? ag.name : 'Assigned Agent',
      relatedLeadId: ld?.id,
      relatedLeadName: ld?.customerName,
      dueDate,
      priority,
    });

    setTitle('');
    setDescription('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Tasks & Team Action Reminders
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Assign operational tasks to agents, monitor documentation deadlines, and track pending vs. completed deliverables
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create New Task
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl w-fit">
        <button
          onClick={() => setFilterMode('all')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            filterMode === 'all'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Tasks ({visibleTasks.length})
        </button>
        <button
          onClick={() => setFilterMode('pending')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            filterMode === 'pending'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pending ({visibleTasks.filter((t) => t.status === 'Pending').length})
        </button>
        <button
          onClick={() => setFilterMode('overdue')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            filterMode === 'overdue'
              ? 'bg-red-600 text-white'
              : 'text-red-700 hover:bg-red-50'
          }`}
        >
          Overdue ({overdueCount})
        </button>
        <button
          onClick={() => setFilterMode('completed')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            filterMode === 'completed'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Completed ({visibleTasks.filter((t) => t.status === 'Completed').length})
        </button>
      </div>

      {/* Tasks List */}
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No tasks match the selected filter.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isOverdue = task.status === 'Pending' && task.dueDate < SYSTEM_TODAY;
            return (
              <div
                key={task.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={task.status === 'Completed'}
                    onChange={() => toggleTaskStatus(task.id)}
                    className="mt-1 rounded border-slate-300 cursor-pointer"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`font-bold ${
                          task.status === 'Completed'
                            ? 'line-through text-slate-400'
                            : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span
                        className={`font-semibold ${
                          task.priority === 'Urgent'
                            ? 'text-red-600'
                            : task.priority === 'High'
                            ? 'text-amber-700'
                            : 'text-blue-700'
                        }`}
                      >
                        Priority: {task.priority}
                      </span>
                      {task.relatedLeadId && (
                        <>
                          <span className="text-slate-300">·</span>
                          <button
                            onClick={() => setSelectedLeadId(task.relatedLeadId!)}
                            className="text-blue-700 hover:underline font-medium cursor-pointer"
                          >
                            Lead: {task.relatedLeadName} ({task.relatedLeadId})
                          </button>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{task.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-xs">
                  <div className="text-right font-mono tabular-nums">
                    <div
                      className={`font-semibold ${
                        isOverdue ? 'text-red-600' : 'text-slate-800'
                      }`}
                    >
                      Due: {task.dueDate} {isOverdue && '(OVERDUE)'}
                    </div>
                    <div className="text-[11px] font-sans text-slate-500">
                      Assigned: {task.assignedAgentName}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTask(task.id)}
                    title="Delete Task"
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-md cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create New Sales Task</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Prepare NDC transfer documents for Plot #114-A"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Assign to Agent</label>
                  <select
                    value={assignedAgentId}
                    onChange={(e) => setAssignedAgentId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {agents
                      .filter((a) => a.accountStatus === 'Active')
                      .map((ag) => (
                        <option key={ag.id} value={ag.id}>
                          {ag.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Related Lead</label>
                  <select
                    value={relatedLeadId}
                    onChange={(e) => setRelatedLeadId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">None (General Task)</option>
                    {visibleLeads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.id} — {l.customerName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as LeadPriority)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {ALL_LEAD_PRIORITIES.map((pr) => (
                      <option key={pr} value={pr}>
                        {pr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Task Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
