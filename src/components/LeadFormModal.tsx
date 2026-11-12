import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Upload, Trash2 } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import {
  ALL_LEAD_PRIORITIES,
  ALL_LEAD_SOURCES,
  ALL_LEAD_STATUSES,
  ALL_PROPERTY_TYPES,
  SYSTEM_TODAY,
} from '../data/demoData';
import { readAndCompressImageFile } from '../services/crmService';
import {
  LeadPriority,
  LeadSourceType,
  LeadStatus,
  PropertyType,
  PurchasePurpose,
} from '../types/crm';

export const LeadFormModal: React.FC = () => {
  const {
    isAddLeadModalOpen,
    setIsAddLeadModalOpen,
    editingLead,
    setEditingLead,
    currentRole,
    activeSalesAgentId,
    projects,
    agents,
    addLead,
    updateLead,
    addToast,
    canAssignLeads,
  } = useCRM();

  const isOpen = isAddLeadModalOpen || Boolean(editingLead);

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Lahore');
  const [area, setArea] = useState('DHA Phase 6');
  const [interestedProjectId, setInterestedProjectId] = useState(projects[0]?.id || 'PRJ-01');
  const [customProjectName, setCustomProjectName] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('Residential Plots');
  const [propertySize, setPropertySize] = useState('10 Marla');
  const [minBudget, setMinBudget] = useState('22000000');
  const [maxBudget, setMaxBudget] = useState('28000000');
  const [purchasePurpose, setPurchasePurpose] = useState<PurchasePurpose>('Personal Residence');
  const [source, setSource] = useState<LeadSourceType>('Property Portals');
  const [leadReference, setLeadReference] = useState('');
  const [priority, setPriority] = useState<LeadPriority>('High');
  const [status, setStatus] = useState<LeadStatus>('New');
  const [assignedAgentId, setAssignedAgentId] = useState<string>('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>('');
  const [createdAt, setCreatedAt] = useState<string>(SYSTEM_TODAY);
  const [notes, setNotes] = useState('');
  const [propertyImageUrl, setPropertyImageUrl] = useState<string>('');
  const [error, setError] = useState('');

  const leadPhotoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingLead) {
      setCustomerName(editingLead.customerName);
      setPhone(editingLead.phone);
      setWhatsapp(editingLead.whatsapp);
      setEmail(editingLead.email);
      setCity(editingLead.city);
      setArea(editingLead.area);
      const matchedPreset = projects.find((p) => p.id === editingLead.interestedProjectId);
      if (matchedPreset && editingLead.interestedProjectId !== 'CUSTOM') {
        setInterestedProjectId(editingLead.interestedProjectId);
        setCustomProjectName('');
      } else {
        setInterestedProjectId('CUSTOM');
        setCustomProjectName(editingLead.interestedProperty || '');
      }
      setPropertyType(editingLead.propertyType);
      setPropertySize(editingLead.propertySize);
      setMinBudget(String(editingLead.minBudget));
      setMaxBudget(String(editingLead.maxBudget));
      setPurchasePurpose(editingLead.purchasePurpose);
      setSource(editingLead.source);
      setLeadReference(editingLead.leadReference || '');
      setPriority(editingLead.priority);
      setStatus(editingLead.status);
      setAssignedAgentId(editingLead.assignedAgentId || '');
      setNextFollowUpDate(editingLead.nextFollowUpDate || '');
      setCreatedAt(editingLead.createdAt);
      setNotes(editingLead.notes);
      setPropertyImageUrl(editingLead.propertyImageUrl || '');
      setError('');
    } else if (isAddLeadModalOpen) {
      setCustomerName('');
      setPhone('+92 300 ');
      setWhatsapp('+92 300 ');
      setEmail('');
      setCity('Lahore');
      setArea('DHA Phase 6');
      setInterestedProjectId(projects[0]?.id || 'PRJ-01');
      setCustomProjectName('');
      setPropertyType('Residential Plots');
      setPropertySize('10 Marla');
      setMinBudget('20000000');
      setMaxBudget('28000000');
      setPurchasePurpose('Investment');
      setSource('Property Portals');
      setLeadReference('');
      setPriority('High');
      setStatus('New');
      setAssignedAgentId(currentRole !== 'Super Admin' ? activeSalesAgentId : '');
      setNextFollowUpDate(SYSTEM_TODAY);
      setCreatedAt(SYSTEM_TODAY);
      setNotes('');
      setPropertyImageUrl('');
      setError('');
    }
  }, [editingLead, isAddLeadModalOpen, projects, currentRole, activeSalesAgentId]);

  if (!isOpen) return null;

  const isCustomProject = interestedProjectId === 'CUSTOM';
  const selectedProjectObj = projects.find((p) => p.id === interestedProjectId);
  const displayedPreviewPhoto =
    propertyImageUrl ||
    selectedProjectObj?.imageUrl ||
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80';

  const handleCustomLeadPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await readAndCompressImageFile(file);
      setPropertyImageUrl(compressed);
      addToast('Property Picture Attached', `Attached "${file.name}" to this lead.`, 'success');
    } catch {
      addToast('Upload Error', 'Could not read image file.', 'danger');
    } finally {
      e.target.value = '';
    }
  };

  const closeModal = () => {
    setIsAddLeadModalOpen(false);
    setEditingLead(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim()) {
      setError('Customer full name and phone number are required.');
      return;
    }

    if (isCustomProject && !customProjectName.trim()) {
      setError('Please enter the custom project or property name.');
      return;
    }

    const minB = Number(minBudget) || 0;
    const maxB = Number(maxBudget) || minB;
    if (maxB < minB) {
      setError('Maximum budget cannot be lower than minimum budget.');
      return;
    }

    const projObj = projects.find((p) => p.id === interestedProjectId);
    const interestedProperty = isCustomProject
      ? customProjectName.trim()
      : projObj
      ? projObj.name
      : 'Custom Property Inquiry';

    if (editingLead) {
      updateLead(
        editingLead.id,
        {
          customerName: customerName.trim(),
          phone: phone.trim(),
          whatsapp: whatsapp.trim() || phone.trim(),
          email: email.trim(),
          city: city.trim(),
          area: area.trim(),
          interestedProjectId,
          interestedProperty,
          propertyType,
          propertySize,
          minBudget: minB,
          maxBudget: maxB,
          purchasePurpose,
          source,
          leadReference: leadReference.trim() || undefined,
          priority,
          status,
          assignedAgentId: assignedAgentId || null,
          nextFollowUpDate: nextFollowUpDate || null,
          createdAt,
          notes: notes.trim(),
          propertyImageUrl: propertyImageUrl || undefined,
        },
        'Lead profile fields updated via Edit Lead form.'
      );
    } else {
      addLead({
        customerName: customerName.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        email: email.trim(),
        city: city.trim(),
        area: area.trim(),
        interestedProjectId,
        interestedProperty,
        propertyType,
        propertySize,
        minBudget: minB,
        maxBudget: maxB,
        purchasePurpose,
        source,
        leadReference: leadReference.trim() || undefined,
        priority,
        status,
        assignedAgentId: assignedAgentId || null,
        lastFollowUpDate: null,
        nextFollowUpDate: nextFollowUpDate || null,
        createdAt: createdAt || SYSTEM_TODAY,
        notes: notes.trim(),
        propertyImageUrl: propertyImageUrl || undefined,
      });
    }

    closeModal();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {editingLead ? `Edit Lead — ${editingLead.id}` : 'Add New Real Estate Lead'}
            </h2>
            <p className="text-xs text-slate-500">
              Enter buyer contact details, project interest, property picture, and PKR budget range
            </p>
          </div>
          <button
            onClick={closeModal}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Section 1: Customer Contact Information */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100">
              01. Customer Contact & Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Tariq Mehmood Khan"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+92 300 1234567"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  WhatsApp Number
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+92 300 1234567"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@company.pk"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Lahore / Islamabad / Rawalpindi"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Area / Sector</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. DHA Phase 6 / Gulberg III"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Property, Picture & Budget Requirements */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100">
              02. Interested Project, Property Picture & PKR Budget
            </h3>

            {/* Property Picture Preview & Custom Upload inside Lead Form */}
            <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {displayedPreviewPhoto && (
                  <img
                    src={displayedPreviewPhoto}
                    alt="Property Preview"
                    referrerPolicy="no-referrer"
                    className="w-20 h-14 rounded-lg object-cover border border-slate-300 shrink-0"
                  />
                )}
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {propertyImageUrl
                      ? 'Custom House / Property Picture Attached'
                      : isCustomProject
                      ? `Custom Property: ${customProjectName || 'Enter Name Below'}`
                      : `Project Photo: ${selectedProjectObj?.name || 'Selected Property'}`}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Automatically shows the project picture, or upload a specific house/plot picture
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  ref={leadPhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCustomLeadPhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => leadPhotoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Property Picture
                </button>
                {propertyImageUrl && (
                  <button
                    type="button"
                    onClick={() => setPropertyImageUrl('')}
                    title="Revert to Default Project Photo"
                    className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Interested Project / Property
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (isCustomProject) {
                        setInterestedProjectId(projects[0]?.id || 'PRJ-01');
                      } else {
                        setInterestedProjectId('CUSTOM');
                      }
                    }}
                    className="text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer"
                  >
                    {isCustomProject ? 'Select from List' : '+ Custom Name'}
                  </button>
                </div>

                <select
                  value={interestedProjectId}
                  onChange={(e) => setInterestedProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.city})
                    </option>
                  ))}
                  <option value="CUSTOM">+ Custom Project / Property (Type Custom Name)</option>
                </select>

                {isCustomProject && (
                  <input
                    type="text"
                    required
                    value={customProjectName}
                    onChange={(e) => setCustomProjectName(e.target.value)}
                    placeholder="Type custom project, society, or house name..."
                    className="mt-2 w-full px-3 py-2 text-xs font-semibold border border-blue-400 bg-blue-50/40 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Property Type
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                >
                  {ALL_PROPERTY_TYPES.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Property Size (Marla / Kanal / Sq. Ft.)
                </label>
                <input
                  type="text"
                  value={propertySize}
                  onChange={(e) => setPropertySize(e.target.value)}
                  placeholder="e.g. 5 Marla, 10 Marla, 1 Kanal, 1800 Sq. Ft."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Minimum Budget (PKR)
                </label>
                <input
                  type="number"
                  value={minBudget}
                  onChange={(e) => setMinBudget(e.target.value)}
                  step="500000"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Maximum Budget (PKR)
                </label>
                <input
                  type="number"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  step="500000"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Purchase Purpose
                </label>
                <select
                  value={purchasePurpose}
                  onChange={(e) => setPurchasePurpose(e.target.value as PurchasePurpose)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                >
                  <option value="Investment">Investment</option>
                  <option value="Personal Residence">Personal Residence</option>
                  <option value="Commercial Rental">Commercial Rental</option>
                  <option value="Development">Development</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Lead Source, Company / Sender Reference, Assignment & Scheduling */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100">
              03. Lead Source, Lead Reference (Company / Sent By) & Agent Allocation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Lead Source
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as LeadSourceType)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                >
                  {ALL_LEAD_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-800 mb-1 whitespace-nowrap">
                  Lead Reference (Company Name / Sent By)
                </label>
                <input
                  type="text"
                  value={leadReference}
                  onChange={(e) => setLeadReference(e.target.value)}
                  placeholder="Company Name or Person who sent lead..."
                  className="w-full px-3 py-2 text-xs font-medium border border-blue-300 bg-blue-50/30 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Lead Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as LeadPriority)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                >
                  {ALL_LEAD_PRIORITIES.map((pr) => (
                    <option key={pr} value={pr}>
                      {pr}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Lead Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LeadStatus)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                >
                  {ALL_LEAD_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Assign To (Sales Agent / Sales Manager)
                </label>
                {canAssignLeads ? (
                  <select
                    value={assignedAgentId}
                    onChange={(e) => setAssignedAgentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                  >
                    {currentRole === 'Super Admin' && (
                      <option value="">Leave Unassigned (Queue)</option>
                    )}
                    {agents
                      .filter((a) => a.accountStatus === 'Active')
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.roleTitle} — {a.email || a.id})
                        </option>
                      ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-lg truncate">
                    Assigned to You ({agents.find((a) => a.id === activeSalesAgentId)?.name || activeSalesAgentId})
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Next Follow-up Date
                </label>
                <input
                  type="date"
                  value={nextFollowUpDate}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Lead Creation Date
                </label>
                <input
                  type="date"
                  value={createdAt}
                  onChange={(e) => setCreatedAt(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Additional Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Additional Buyer Notes & Requirements
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record plot preference (corner, park-facing, main boulevard), down payment readiness, or specific payment plan notes..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
            >
              {editingLead ? 'Save Lead Changes' : 'Create Lead Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
