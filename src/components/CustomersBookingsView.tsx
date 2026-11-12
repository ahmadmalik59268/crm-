import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  BadgeCheck,
  Plus,
  Search,
  FileDown,
  CreditCard,
  Building2,
  Phone,
  UserCheck,
  Receipt,
  Upload,
  Camera,
  Eye,
  X,
  CheckCircle2,
  Calendar,
  MapPin,
  FileText,
  Printer,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import {
  formatPKR,
  exportRecordsToCSV,
  PRESET_PROPERTY_IMAGES,
  readAndCompressImageFile,
} from '../services/crmService';
import { ALL_PROPERTY_TYPES, SYSTEM_TODAY } from '../data/demoData';
import {
  BookingDealStage,
  CustomerBooking,
  PaymentMethodType,
  PaymentPlanType,
  PaymentReceipt,
  PropertyType,
} from '../types/crm';

const DEAL_STAGES: BookingDealStage[] = [
  'Token / Biyana',
  'Booking Confirmed',
  'Installments Ongoing',
  'Possession Ready',
  'Registry / Completed',
];

const PAYMENT_PLAN_TYPES: PaymentPlanType[] = [
  'Full Cash Payment',
  'Installment Plan',
  'Token Hold',
];

const PAYMENT_METHODS: PaymentMethodType[] = [
  'Bank Transfer',
  'Pay Order / DD',
  'Cheque',
  'Cash',
];

export const CustomersBookingsView: React.FC = () => {
  const {
    visibleCustomers,
    visibleLeads,
    projects,
    agents,
    setConvertingLeadToCustomer,
    setSelectedLeadId,
    recordCustomerPayment,
    updateCustomerBooking,
  } = useCRM();

  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [planFilter, setPlanFilter] = useState<string>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');

  // Direct Walk-in Customer Modal Trigger
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);

  // Selected Customer File & Ledger Modal
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Quick Record Payment Modal
  const [paymentTargetCustomer, setPaymentTargetCustomer] = useState<CustomerBooking | null>(
    null
  );
  const [pmtAmount, setPmtAmount] = useState<number>(5000000);
  const [pmtStage, setPmtStage] = useState<PaymentReceipt['paymentStage']>('Installment');
  const [pmtMethod, setPmtMethod] = useState<PaymentMethodType>('Bank Transfer');
  const [pmtDate, setPmtDate] = useState(SYSTEM_TODAY);
  const [pmtRef, setPmtRef] = useState('');
  const [pmtNotes, setPmtNotes] = useState('');

  // Quick Change Photo on Customer Card
  const cardPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [photoTargetCustomerId, setPhotoTargetCustomerId] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return visibleCustomers.filter((c) => {
      if (q) {
        const match =
          c.id.toLowerCase().includes(q) ||
          c.customerName.toLowerCase().includes(q) ||
          c.cnic.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.unitNumber.toLowerCase().includes(q) ||
          c.projectName.toLowerCase().includes(q) ||
          (c.leadId && c.leadId.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (stageFilter !== 'ALL' && c.dealStage !== stageFilter) return false;
      if (planFilter !== 'ALL' && c.paymentPlanType !== planFilter) return false;
      if (projectFilter !== 'ALL' && c.projectId !== projectFilter) return false;
      return true;
    });
  }, [visibleCustomers, searchQuery, stageFilter, planFilter, projectFilter]);

  const financialSummary = useMemo(() => {
    const totalDealVolume = visibleCustomers.reduce((s, c) => s + c.totalDealAmount, 0);
    const totalReceived = visibleCustomers.reduce((s, c) => s + c.paidAmount, 0);
    const totalRemaining = visibleCustomers.reduce((s, c) => s + c.remainingAmount, 0);
    const activeInstallments = visibleCustomers.filter(
      (c) => c.remainingAmount > 0
    ).length;
    const completedDeals = visibleCustomers.filter(
      (c) => c.dealStage === 'Registry / Completed' || c.dealStage === 'Possession Ready'
    ).length;

    return {
      totalCustomers: visibleCustomers.length,
      totalDealVolume,
      totalReceived,
      totalRemaining,
      activeInstallments,
      completedDeals,
    };
  }, [visibleCustomers]);

  const selectedCustomer = useMemo(
    () => visibleCustomers.find((c) => c.id === selectedCustomerId) || null,
    [visibleCustomers, selectedCustomerId]
  );

  // Leads that are not yet linked to a customer record
  const convertibleLeads = useMemo(() => {
    const linkedLeadIds = new Set(
      visibleCustomers.map((c) => c.leadId).filter(Boolean)
    );
    return visibleLeads.filter((l) => !linkedLeadIds.has(l.id) && l.status !== 'Lost');
  }, [visibleLeads, visibleCustomers]);

  const handleOpenPaymentModal = (customer: CustomerBooking) => {
    setPaymentTargetCustomer(customer);
    setPmtAmount(
      customer.nextInstallmentAmount > 0
        ? customer.nextInstallmentAmount
        : Math.min(5000000, customer.remainingAmount || 5000000)
    );
    setPmtStage(
      customer.paidAmount === 0
        ? 'Token / Biyana'
        : customer.dealStage === 'Token / Biyana'
        ? 'Down Payment'
        : 'Installment'
    );
    setPmtMethod('Bank Transfer');
    setPmtDate(SYSTEM_TODAY);
    setPmtRef(`TRX-${Math.floor(10000 + Math.random() * 90000)}`);
    setPmtNotes('');
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTargetCustomer || pmtAmount <= 0) return;

    recordCustomerPayment(paymentTargetCustomer.id, {
      date: pmtDate,
      amount: Number(pmtAmount),
      paymentStage: pmtStage,
      paymentMethod: pmtMethod,
      referenceNo: pmtRef.trim() || 'VCH-DIRECT',
      notes: pmtNotes.trim() || `${pmtStage} payment received.`,
    });

    setPaymentTargetCustomer(null);
  };

  const handleCustomerCardPhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !photoTargetCustomerId) return;
    try {
      const dataUrl = await readAndCompressImageFile(file);
      updateCustomerBooking(photoTargetCustomerId, { propertyImageUrl: dataUrl });
    } finally {
      setPhotoTargetCustomerId(null);
      e.target.value = '';
    }
  };

  const handleExportCustomersCSV = () => {
    exportRecordsToCSV(
      'crestline_customers_bookings_ledger',
      [
        'Customer ID',
        'Source Lead ID',
        'Customer Name',
        'Father/Spouse Name',
        'CNIC',
        'Phone',
        'City',
        'Project Name',
        'Unit / Plot Number',
        'Property Type',
        'Size',
        'Deal Stage',
        'Payment Plan',
        'Total Deal Price (PKR)',
        'Paid Amount (PKR)',
        'Remaining Balance (PKR)',
        'Next Due Date',
        'Sales Consultant',
        'Booking Date',
      ],
      filteredCustomers.map((c) => [
        c.id,
        c.leadId || 'Walk-in Buyer',
        c.customerName,
        c.fatherOrSpouseName,
        c.cnic,
        c.phone,
        c.city,
        c.projectName,
        c.unitNumber,
        c.propertyType,
        c.propertySize,
        c.dealStage,
        c.paymentPlanType,
        c.totalDealAmount,
        c.paidAmount,
        c.remainingAmount,
        c.nextDueDate || 'Cleared',
        c.salesAgentName,
        c.bookingDate,
      ])
    );
  };

  return (
    <div className="space-y-6">
      {/* Hidden input for changing property picture directly on any customer card */}
      <input
        ref={cardPhotoInputRef}
        type="file"
        accept="image/*"
        onChange={handleCustomerCardPhotoUpload}
        className="hidden"
      />

      {/* Module Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
              Buyer & Deal Management
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-medium text-slate-500">
              Lead-to-Customer Conversion & Installment Ledger
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Customers, Property Bookings & Payment Plans
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Register walk-in property buyers, convert leads into confirmed customers, manage unit allotments, and track token/installment receipts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Quick Convert Existing Lead Dropdown */}
          {convertibleLeads.length > 0 && (
            <div className="relative">
              <select
                value=""
                onChange={(e) => {
                  const found = visibleLeads.find((l) => l.id === e.target.value);
                  if (found) setConvertingLeadToCustomer(found);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg focus:outline-none cursor-pointer"
              >
                <option value="">Convert Lead to Customer ({convertibleLeads.length})...</option>
                {convertibleLeads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.id} — {l.customerName} ({l.interestedProperty})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleExportCustomersCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export Ledger CSV
          </button>

          <button
            onClick={() => setIsWalkInModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Register New Customer / Book Property
          </button>
        </div>
      </div>

      {/* 6 Financial & Customer KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-[11px] font-medium text-slate-500 block">
            Confirmed Customers
          </span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block tabular-nums">
            {financialSummary.totalCustomers} Buyers
          </span>
          <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
            Active Property Files
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-[11px] font-medium text-slate-500 block">
            Total Booked Sales Volume
          </span>
          <span className="text-xl font-bold font-mono text-blue-700 mt-1 block tabular-nums">
            {formatPKR(financialSummary.totalDealVolume)}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Agreed Contract Value
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-[11px] font-medium text-slate-500 block">
            Total Amount Received
          </span>
          <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block tabular-nums">
            {formatPKR(financialSummary.totalReceived)}
          </span>
          <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
            Token + Down Payment + Installments
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-[11px] font-medium text-slate-500 block">
            Remaining Receivable
          </span>
          <span className="text-xl font-bold font-mono text-amber-700 mt-1 block tabular-nums">
            {formatPKR(financialSummary.totalRemaining)}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Pending Installments Balance
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-[11px] font-medium text-slate-500 block">
            Active Installment Files
          </span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block tabular-nums">
            {financialSummary.activeInstallments} Files
          </span>
          <span className="text-[11px] text-blue-700 font-medium mt-1 block">
            Scheduled Payment Plans
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-[11px] font-medium text-slate-500 block">
            Possession / Registry Ready
          </span>
          <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block tabular-nums">
            {financialSummary.completedDeals} Units
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Handed Over / Transferred
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search buyer name, CNIC, Customer ID, Plot/Villa #, or phone..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">All Booking Stages</option>
              {DEAL_STAGES.map((st) => (
                <option key={st} value={st}>
                  Stage: {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">All Payment Plans</option>
              {PAYMENT_PLAN_TYPES.map((pt) => (
                <option key={pt} value={pt}>
                  Plan: {pt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">All Projects / Societies</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Customer & Property Booking Cards Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <BadgeCheck className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">
            No Customer Bookings Match Your Filter
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Register a new walk-in customer or convert an existing lead into a property buyer to manage their allotment and payment schedule.
          </p>
          <button
            onClick={() => setIsWalkInModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Register New Customer Booking
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredCustomers.map((customer) => {
            const paidPercent =
              customer.totalDealAmount > 0
                ? Math.min(
                    100,
                    Math.round((customer.paidAmount / customer.totalDealAmount) * 100)
                  )
                : 0;

            const stageBadgeStyle =
              customer.dealStage === 'Registry / Completed'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : customer.dealStage === 'Possession Ready'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : customer.dealStage === 'Installments Ongoing'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-amber-50 text-amber-800 border-amber-200';

            return (
              <div
                key={customer.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between shadow-2xs hover:border-slate-300 transition-all"
              >
                <div>
                  {/* Top Property Banner & Customer Identity Header */}
                  <div className="flex flex-col sm:flex-row border-b border-slate-100">
                    {/* Property / House Picture Thumbnail */}
                    <div className="sm:w-48 h-44 sm:h-auto relative bg-slate-900 shrink-0 group overflow-hidden">
                      <img
                        src={
                          customer.propertyImageUrl ||
                          PRESET_PROPERTY_IMAGES[0].url
                        }
                        alt={customer.unitNumber}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-900/80 text-white rounded">
                        {customer.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoTargetCustomerId(customer.id);
                          cardPhotoInputRef.current?.click();
                        }}
                        className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-white/90 hover:bg-white text-slate-900 rounded shadow-xs cursor-pointer"
                      >
                        <Camera className="w-3 h-3 text-blue-700" />
                        Change Photo
                      </button>
                    </div>

                    {/* Customer & Unit Details */}
                    <div className="p-4 flex-1 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-base font-bold text-slate-900">
                              {customer.customerName}
                            </h3>
                            {customer.leadId ? (
                              <button
                                onClick={() => setSelectedLeadId(customer.leadId)}
                                className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 hover:underline rounded border border-blue-200 cursor-pointer"
                              >
                                Converted from {customer.leadId}
                              </button>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                                Direct Walk-in Buyer
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            S/O, D/O, W/O: <span className="font-medium text-slate-700">{customer.fatherOrSpouseName || 'Recorded on File'}</span> · CNIC:{' '}
                            <span className="font-mono font-medium text-slate-800">
                              {customer.cnic}
                            </span>
                          </p>
                        </div>

                        <span
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border shrink-0 ${stageBadgeStyle}`}
                        >
                          {customer.dealStage}
                        </span>
                      </div>

                      {/* Booked Unit Box */}
                      <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            Booked Property / Unit #
                          </span>
                          <span className="font-bold text-slate-900 block truncate">
                            {customer.unitNumber}
                          </span>
                          <span className="text-[11px] text-blue-700 font-medium block truncate">
                            {customer.projectName}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            Type & Area Size
                          </span>
                          <span className="font-semibold text-slate-800 block">
                            {customer.propertyType} ({customer.propertySize})
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            Agent: {customer.salesAgentName}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-0.5">
                        <span className="font-mono inline-flex items-center gap-1">
                          <Phone className="w-3 h-3 text-blue-700" />
                          {customer.phone}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {customer.city}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          Booked: {customer.bookingDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Payment Plan & Progress Strip */}
                  <div className="p-4 bg-slate-50/60 space-y-3">
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="bg-white border border-slate-200/90 rounded-lg p-2.5">
                        <span className="text-[11px] text-slate-500 block">
                          Total Deal Price
                        </span>
                        <span className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-0.5 block">
                          {formatPKR(customer.totalDealAmount)}
                        </span>
                      </div>
                      <div className="bg-white border border-emerald-200 rounded-lg p-2.5">
                        <span className="text-[11px] text-emerald-700 font-medium block">
                          Received ({paidPercent}%)
                        </span>
                        <span className="font-mono text-sm font-bold text-emerald-700 tabular-nums mt-0.5 block">
                          {formatPKR(customer.paidAmount)}
                        </span>
                      </div>
                      <div className="bg-white border border-amber-200 rounded-lg p-2.5">
                        <span className="text-[11px] text-amber-800 font-medium block">
                          Remaining Balance
                        </span>
                        <span className="font-mono text-sm font-bold text-amber-800 tabular-nums mt-0.5 block">
                          {formatPKR(customer.remainingAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Payment Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700">
                          {customer.paymentPlanType} ({customer.receipts.length} Payment Receipts Recorded)
                        </span>
                        {customer.remainingAmount > 0 && customer.nextDueDate ? (
                          <span className="font-mono text-amber-800 font-semibold">
                            Next Installment: {formatPKR(customer.nextInstallmentAmount)} due {customer.nextDueDate}
                          </span>
                        ) : (
                          <span className="font-semibold text-emerald-700">
                            100% Payment Cleared
                          </span>
                        )}
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all"
                          style={{ width: `${paidPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-4 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedCustomerId(customer.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-700" />
                    Customer File & Receipts ({customer.receipts.length})
                  </button>

                  {customer.remainingAmount > 0 ? (
                    <button
                      onClick={() => handleOpenPaymentModal(customer)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Record Installment / Payment
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      All Dues Cleared
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Walk-in Customer Registration Modal */}
      {isWalkInModalOpen && (
        <CustomerBookingModal
          isOpen={isWalkInModalOpen}
          onClose={() => setIsWalkInModalOpen(false)}
        />
      )}

      {/* Quick Record Payment / Installment Modal */}
      {paymentTargetCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-emerald-400 block">
                  {paymentTargetCustomer.id} · {paymentTargetCustomer.unitNumber}
                </span>
                <h3 className="text-base font-bold">
                  Record Payment / Installment — {paymentTargetCustomer.customerName}
                </h3>
              </div>
              <button
                onClick={() => setPaymentTargetCustomer(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div>
                  <span className="text-slate-500 block">Total Deal</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatPKR(paymentTargetCustomer.totalDealAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Already Paid</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatPKR(paymentTargetCustomer.paidAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Remaining Due</span>
                  <span className="font-mono font-bold text-amber-800">
                    {formatPKR(paymentTargetCustomer.remainingAmount)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount Received (PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    min={10000}
                    max={paymentTargetCustomer.remainingAmount}
                    step={50000}
                    value={pmtAmount}
                    onChange={(e) => setPmtAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                  <span className="text-[11px] font-mono text-emerald-700 mt-0.5 block">
                    {formatPKR(pmtAmount)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Stage / Type
                  </label>
                  <select
                    value={pmtStage}
                    onChange={(e) =>
                      setPmtStage(e.target.value as PaymentReceipt['paymentStage'])
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Token / Biyana">Token / Biyana</option>
                    <option value="Down Payment">Down Payment</option>
                    <option value="Installment">Installment</option>
                    <option value="Possession / Transfer">Possession / Transfer</option>
                    <option value="Final Settlement">Final Settlement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={pmtMethod}
                    onChange={(e) => setPmtMethod(e.target.value as PaymentMethodType)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={pmtDate}
                    onChange={(e) => setPmtDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cheque / Pay Order / Bank Reference Number
                  </label>
                  <input
                    type="text"
                    value={pmtRef}
                    onChange={(e) => setPmtRef(e.target.value)}
                    placeholder="e.g., PO-MEEZAN-88291 or IBFT-99201"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Receipt Remarks / Notes
                  </label>
                  <input
                    type="text"
                    value={pmtNotes}
                    onChange={(e) => setPmtNotes(e.target.value)}
                    placeholder="Enter payment remarks..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPaymentTargetCustomer(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                >
                  Generate Receipt & Update Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Customer File, Allotment Certificate & Payment Ledger Drawer/Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl my-auto">
            {/* Top Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-blue-300 font-mono">
                  <span>{selectedCustomer.id}</span>
                  <span>·</span>
                  <span>Booked on {selectedCustomer.bookingDate}</span>
                  <span>·</span>
                  <span className="text-emerald-300 font-sans font-semibold">
                    {selectedCustomer.dealStage}
                  </span>
                </div>
                <h2 className="text-lg font-bold mt-0.5">
                  Customer Booking File & Payment Statement — {selectedCustomer.customerName}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Statement
                </button>
                <button
                  onClick={() => setSelectedCustomerId(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[82vh] overflow-y-auto space-y-6">
              {/* Property Banner + Buyer KYC */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 relative h-52 md:h-auto">
                  <img
                    src={
                      selectedCustomer.propertyImageUrl ||
                      PRESET_PROPERTY_IMAGES[0].url
                    }
                    alt={selectedCustomer.unitNumber}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="text-[10px] uppercase tracking-wider font-mono text-blue-300 block">
                      {selectedCustomer.propertyType} · {selectedCustomer.propertySize}
                    </span>
                    <h4 className="text-sm font-bold leading-snug">
                      {selectedCustomer.unitNumber}
                    </h4>
                    <p className="text-xs text-slate-200">{selectedCustomer.projectName}</p>
                  </div>
                </div>

                {/* Buyer KYC & Nominee Details */}
                <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <span className="text-slate-400 block">Buyer Full Name</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {selectedCustomer.customerName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Father / Husband Name</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {selectedCustomer.fatherOrSpouseName || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Customer CNIC / NICOP</span>
                    <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                      {selectedCustomer.cnic}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Phone / WhatsApp</span>
                    <span className="font-mono font-medium text-slate-900 mt-0.5 block">
                      {selectedCustomer.phone}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Email Address</span>
                    <span className="font-medium text-slate-800 mt-0.5 block truncate">
                      {selectedCustomer.email || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Residential Address</span>
                    <span className="font-medium text-slate-800 mt-0.5 block">
                      {selectedCustomer.address}, {selectedCustomer.city}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Nominee (Next of Kin)</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">
                      {selectedCustomer.nomineeName || '—'} ({selectedCustomer.nomineeRelation || 'Nominee'})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Nominee CNIC</span>
                    <span className="font-mono text-slate-800 mt-0.5 block">
                      {selectedCustomer.nomineeCnic || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Closing Consultant</span>
                    <span className="font-semibold text-blue-700 mt-0.5 block">
                      {selectedCustomer.salesAgentName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stage Updater + Financial Account Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                <div className="bg-slate-900 text-white rounded-xl p-4">
                  <span className="text-[11px] text-slate-400 block">Total Agreed Price</span>
                  <span className="text-lg font-bold font-mono mt-1 block">
                    {formatPKR(selectedCustomer.totalDealAmount)}
                  </span>
                  <span className="text-[11px] text-blue-300 mt-0.5 block">
                    {selectedCustomer.paymentPlanType}
                  </span>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <span className="text-[11px] text-emerald-700 font-medium block">
                    Total Received Amount
                  </span>
                  <span className="text-lg font-bold font-mono text-emerald-800 mt-1 block">
                    {formatPKR(selectedCustomer.paidAmount)}
                  </span>
                  <span className="text-[11px] text-emerald-700 mt-0.5 block">
                    {selectedCustomer.receipts.length} Verified Receipts
                  </span>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <span className="text-[11px] text-amber-800 font-medium block">
                    Balance Receivable
                  </span>
                  <span className="text-lg font-bold font-mono text-amber-900 mt-1 block">
                    {formatPKR(selectedCustomer.remainingAmount)}
                  </span>
                  <span className="text-[11px] text-amber-800 mt-0.5 block">
                    {selectedCustomer.nextDueDate
                      ? `Next Due: ${selectedCustomer.nextDueDate}`
                      : 'No Pending Balance'}
                  </span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">
                    Update File Stage
                  </label>
                  <select
                    value={selectedCustomer.dealStage}
                    onChange={(e) =>
                      updateCustomerBooking(selectedCustomer.id, {
                        dealStage: e.target.value as BookingDealStage,
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-slate-50"
                  >
                    {DEAL_STAGES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Receipts Ledger Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-blue-700" />
                    Official Payment Receipts & Installment Ledger ({selectedCustomer.receipts.length})
                  </h4>
                  {selectedCustomer.remainingAmount > 0 && (
                    <button
                      onClick={() => handleOpenPaymentModal(selectedCustomer)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Receipt / Installment
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 bg-slate-50/50">
                        <th className="py-2.5 px-4">Receipt #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Payment Stage</th>
                        <th className="py-2.5 px-3">Method & Ref #</th>
                        <th className="py-2.5 px-3 text-right">Amount (PKR)</th>
                        <th className="py-2.5 px-3">Received By</th>
                        <th className="py-2.5 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedCustomer.receipts.map((rcp) => (
                        <tr key={rcp.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-mono font-bold text-blue-700">
                            {rcp.receiptNumber}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">
                            {rcp.date}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {rcp.paymentStage}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-medium text-slate-800">
                              {rcp.paymentMethod}
                            </span>
                            <span className="block font-mono text-[10px] text-slate-500">
                              Ref: {rcp.referenceNo}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                            {formatPKR(rcp.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{rcp.receivedBy}</td>
                          <td className="py-2.5 px-4 text-slate-600">{rcp.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Global Modal for Converting a Lead to a Customer OR Registering a Direct Walk-in Property Buyer
 */
export const CustomerBookingModal: React.FC<{
  isOpen?: boolean;
  onClose?: () => void;
}> = ({ isOpen, onClose }) => {
  const {
    convertingLeadToCustomer,
    setConvertingLeadToCustomer,
    visibleLeads,
    currentRole,
    activeSalesAgentId,
    projects,
    agents,
    createCustomerBooking,
    setActiveSection,
  } = useCRM();

  const activeLead = convertingLeadToCustomer;
  const modalVisible = Boolean(isOpen || activeLead);

  const defaultProject = projects[0];
  const defaultAgent = agents.find((a) => a.accountStatus === 'Active') || agents[0];

  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [fatherOrSpouseName, setFatherOrSpouseName] = useState('');
  const [cnic, setCnic] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Lahore');
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelation, setNomineeRelation] = useState('Spouse / Son');
  const [nomineeCnic, setNomineeCnic] = useState('');

  const [projectId, setProjectId] = useState(defaultProject?.id || 'PRJ-01');
  const [customProjectName, setCustomProjectName] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('Residential Plots');
  const [unitNumber, setUnitNumber] = useState('');
  const [propertySize, setPropertySize] = useState('1 Kanal');
  const [propertyImageUrl, setPropertyImageUrl] = useState(
    defaultProject?.imageUrl || PRESET_PROPERTY_IMAGES[0].url
  );
  const [salesAgentId, setSalesAgentId] = useState(
    currentRole !== 'Super Admin' ? activeSalesAgentId : defaultAgent?.id || 'AGT-01'
  );
  const [bookingDate, setBookingDate] = useState(SYSTEM_TODAY);
  const [dealStage, setDealStage] = useState<BookingDealStage>('Booking Confirmed');
  const [paymentPlanType, setPaymentPlanType] =
    useState<PaymentPlanType>('Installment Plan');

  const [totalDealAmount, setTotalDealAmount] = useState<number>(45000000);
  const [tokenAmount, setTokenAmount] = useState<number>(5000000);
  const [downPaymentAmount, setDownPaymentAmount] = useState<number>(10000000);
  const [initialReceivedAmount, setInitialReceivedAmount] = useState<number>(5000000);
  const [initialPaymentStage, setInitialPaymentStage] =
    useState<PaymentReceipt['paymentStage']>('Token / Biyana');
  const [initialPaymentMethod, setInitialPaymentMethod] =
    useState<PaymentMethodType>('Pay Order / DD');
  const [initialReferenceNo, setInitialReferenceNo] = useState('PO-HBL-88410');
  const [totalInstallments, setTotalInstallments] = useState<number>(8);
  const [installmentFrequency, setInstallmentFrequency] = useState<
    'Monthly' | 'Quarterly' | 'Lump Sum'
  >('Quarterly');
  const [nextDueDate, setNextDueDate] = useState<string>('2026-12-10');
  const [notes, setNotes] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync form fields when convertingLeadToCustomer is passed in
  useEffect(() => {
    if (activeLead) {
      const matchedProject = projects.find(
        (p) =>
          p.id === activeLead.interestedProjectId ||
          p.name === activeLead.interestedProperty
      );

      setSelectedLeadId(activeLead.id);
      setCustomerName(activeLead.customerName);
      setPhone(activeLead.phone);
      setWhatsapp(activeLead.whatsapp || activeLead.phone);
      setEmail(activeLead.email);
      setAddress(activeLead.area);
      setCity(activeLead.city);
      if (matchedProject && activeLead.interestedProjectId !== 'CUSTOM') {
        setProjectId(matchedProject.id);
        setCustomProjectName('');
      } else {
        setProjectId('CUSTOM');
        setCustomProjectName(activeLead.interestedProperty || '');
      }
      setPropertyType(activeLead.propertyType);
      setPropertySize(activeLead.propertySize);
      setUnitNumber(
        activeLead.propertyType === 'Houses'
          ? 'Signature Villa # 15'
          : activeLead.propertyType === 'Apartments'
          ? 'Executive Suite # 1204'
          : activeLead.propertyType === 'Shops'
          ? 'Commercial Shop # GF-09'
          : 'Plot # 214-B, Main Sector'
      );
      setPropertyImageUrl(
        activeLead.propertyImageUrl ||
          matchedProject?.imageUrl ||
          PRESET_PROPERTY_IMAGES[0].url
      );
      setSalesAgentId(activeLead.assignedAgentId || defaultAgent?.id || 'AGT-01');
      const agreedPrice = activeLead.maxBudget || 45000000;
      setTotalDealAmount(agreedPrice);
      const suggestedToken = Math.round(agreedPrice * 0.1);
      setTokenAmount(suggestedToken);
      setDownPaymentAmount(Math.round(agreedPrice * 0.25));
      setInitialReceivedAmount(suggestedToken);
      setNotes(
        `Converted from Lead ${activeLead.id}. Original inquiry notes: ${activeLead.notes}`
      );
    }
  }, [activeLead, projects, defaultProject, defaultAgent]);

  if (!modalVisible) return null;

  const closeModal = () => {
    setConvertingLeadToCustomer(null);
    if (onClose) onClose();
  };

  const handleSelectExistingLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    const found = visibleLeads.find((l) => l.id === leadId);
    if (!found) return;
    const matchedProj =
      projects.find(
        (p) => p.id === found.interestedProjectId || p.name === found.interestedProperty
      ) || defaultProject;

    setCustomerName(found.customerName);
    setPhone(found.phone);
    setWhatsapp(found.whatsapp || found.phone);
    setEmail(found.email);
    setAddress(found.area);
    setCity(found.city);
    if (matchedProj) {
      setProjectId(matchedProj.id);
      setPropertyImageUrl(found.propertyImageUrl || matchedProj.imageUrl);
    }
    setPropertyType(found.propertyType);
    setPropertySize(found.propertySize);
    setTotalDealAmount(found.maxBudget || 45000000);
    setInitialReceivedAmount(Math.round((found.maxBudget || 45000000) * 0.1));
    if (found.assignedAgentId) {
      setSalesAgentId(found.assignedAgentId);
    }
  };

  const handleUploadBookingPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await readAndCompressImageFile(file);
      setPropertyImageUrl(compressed);
    } finally {
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim() || !unitNumber.trim()) return;

    const isCustomProj = projectId === 'CUSTOM';
    const chosenProject =
      projects.find((p) => p.id === projectId) || defaultProject;
    const finalProjectId = isCustomProj ? 'CUSTOM' : chosenProject.id;
    const finalProjectName = isCustomProj
      ? customProjectName.trim() || 'Custom Property'
      : chosenProject.name;
    const chosenAgent =
      agents.find((a) => a.id === salesAgentId) || defaultAgent;

    const remainingAfterInitial = Math.max(0, totalDealAmount - initialReceivedAmount);
    const perInstallment =
      totalInstallments > 0
        ? Math.round(remainingAfterInitial / totalInstallments)
        : 0;

    createCustomerBooking(
      {
        leadId: selectedLeadId || null,
        customerName: customerName.trim(),
        fatherOrSpouseName: fatherOrSpouseName.trim() || 'Recorded on CNIC',
        cnic: cnic.trim() || '35202-0000000-1',
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        email: email.trim(),
        address: address.trim() || 'Main Boulevard',
        city: city.trim() || 'Lahore',
        nomineeName: nomineeName.trim() || 'Recorded on File',
        nomineeRelation: nomineeRelation.trim() || 'Spouse',
        nomineeCnic: nomineeCnic.trim() || '—',
        projectId: finalProjectId,
        projectName: finalProjectName,
        propertyType,
        unitNumber: unitNumber.trim(),
        propertySize: propertySize.trim(),
        propertyImageUrl: propertyImageUrl || chosenProject.imageUrl,
        salesAgentId: chosenAgent.id,
        salesAgentName: chosenAgent.name,
        bookingDate,
        dealStage:
          initialReceivedAmount >= totalDealAmount
            ? 'Registry / Completed'
            : dealStage,
        paymentPlanType,
        totalDealAmount: Number(totalDealAmount),
        tokenAmount: Number(tokenAmount),
        downPaymentAmount: Number(downPaymentAmount),
        totalInstallments: Number(totalInstallments),
        installmentFrequency,
        nextDueDate: remainingAfterInitial > 0 ? nextDueDate : null,
        nextInstallmentAmount: perInstallment,
        notes: notes.trim(),
      },
      {
        amount: Number(initialReceivedAmount),
        stage: initialPaymentStage,
        method: initialPaymentMethod,
        referenceNo: initialReferenceNo.trim() || 'VCH-BOOKING',
        notes: `Initial ${initialPaymentStage} received upon property booking.`,
      }
    );

    closeModal();
    setActiveSection('customers');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl my-auto">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 block">
              {selectedLeadId
                ? `Lead-to-Customer Conversion (${selectedLeadId})`
                : 'Direct Walk-in Buyer & Property Booking'}
            </span>
            <h2 className="text-base font-bold mt-0.5">
              {selectedLeadId
                ? `Convert ${customerName} to Confirmed Customer & Book Property`
                : 'Register Confirmed Customer & Property Allotment'}
            </h2>
          </div>
          <button
            onClick={closeModal}
            className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 max-h-[82vh] overflow-y-auto space-y-6"
        >
          {/* Optional: Pick from existing Lead if opened as Walk-in */}
          {!activeLead && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Is this buyer already in your Leads list?
                </span>
                <span className="text-[11px] text-slate-600">
                  Select an existing Lead to auto-fill their contact & property details, or leave blank for a new Walk-in Customer.
                </span>
              </div>
              <select
                value={selectedLeadId}
                onChange={(e) => handleSelectExistingLead(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-white border border-blue-300 rounded-lg text-slate-900"
              >
                <option value="">-- Direct Walk-in Customer (New) --</option>
                {visibleLeads
                  .filter((l) => l.status !== 'Converted')
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.id} — {l.customerName} ({l.interestedProperty})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Section 1: Customer KYC & Nominee Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5">
              1. Buyer / Customer Personal & CNIC Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g., Mian Khurram Shahzad"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Father / Husband Name
                </label>
                <input
                  type="text"
                  value={fatherOrSpouseName}
                  onChange={(e) => setFatherOrSpouseName(e.target.value)}
                  placeholder="e.g., Mian Muhammad Akram"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CNIC / NICOP Number *
                </label>
                <input
                  type="text"
                  required
                  value={cnic}
                  onChange={(e) => setCnic(e.target.value)}
                  placeholder="35202-1234567-1"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+92 300 8412091"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Residential Address & Area
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House # / Sector / Area"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Lahore"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominee Full Name
                </label>
                <input
                  type="text"
                  value={nomineeName}
                  onChange={(e) => setNomineeName(e.target.value)}
                  placeholder="Next of kin full name"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Relation with Buyer
                </label>
                <input
                  type="text"
                  value={nomineeRelation}
                  onChange={(e) => setNomineeRelation(e.target.value)}
                  placeholder="Wife / Son / Brother"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominee CNIC
                </label>
                <input
                  type="text"
                  value={nomineeCnic}
                  onChange={(e) => setNomineeCnic(e.target.value)}
                  placeholder="35202-7654321-2"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Property / Unit Allotment & Picture */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5">
              2. Booked Property, Plot / House Number & Picture
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Property Picture Preview + Upload */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                <div className="h-36 w-full rounded-lg overflow-hidden bg-slate-900 relative border border-slate-200">
                  <img
                    src={propertyImageUrl}
                    alt="Booked Property"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadBookingPhoto}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload House / Plot Picture
                </button>
              </div>

              {/* Unit & Project Fields */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Select Project / Society *
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setProjectId(
                          projectId === 'CUSTOM'
                            ? defaultProject?.id || 'PRJ-01'
                            : 'CUSTOM'
                        )
                      }
                      className="text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer"
                    >
                      {projectId === 'CUSTOM' ? 'Select from List' : '+ Custom Name'}
                    </button>
                  </div>
                  <select
                    value={projectId}
                    onChange={(e) => {
                      setProjectId(e.target.value);
                      const p = projects.find((proj) => proj.id === e.target.value);
                      if (p) {
                        setPropertyType(p.propertyType);
                        setPropertyImageUrl(p.imageUrl);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.availableUnits} units left)
                      </option>
                    ))}
                    <option value="CUSTOM">+ Custom Project / Society (Type Custom Name)</option>
                  </select>
                  {projectId === 'CUSTOM' && (
                    <input
                      type="text"
                      required
                      value={customProjectName}
                      onChange={(e) => setCustomProjectName(e.target.value)}
                      placeholder="Type custom project or society name..."
                      className="mt-2 w-full px-3 py-2 text-xs font-semibold border border-blue-400 bg-blue-50/40 rounded-lg"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    House / Plot / Apartment / Shop Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    placeholder="e.g., Plot # 114-A, Sector C or Villa # 9"
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Property Category
                  </label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {ALL_PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Property Size (Marla / Kanal / Sq. Ft.)
                  </label>
                  <input
                    type="text"
                    value={propertySize}
                    onChange={(e) => setPropertySize(e.target.value)}
                    placeholder="e.g., 1 Kanal, 10 Marla, 2,400 Sq. Ft."
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Closing Sales Consultant
                  </label>
                  <select
                    value={salesAgentId}
                    onChange={(e) => setSalesAgentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Booking Date
                  </label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Financial Deal, Token & Installment Plan */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5">
              3. Agreed Deal Price, Token / Down Payment & Installment Schedule
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Agreed Deal Price (PKR) *
                </label>
                <input
                  type="number"
                  required
                  min={500000}
                  step={500000}
                  value={totalDealAmount}
                  onChange={(e) => setTotalDealAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                />
                <span className="text-[11px] font-mono text-blue-700 font-semibold mt-0.5 block">
                  {formatPKR(totalDealAmount)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Amount Received Now (PKR) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  max={totalDealAmount}
                  step={100000}
                  value={initialReceivedAmount}
                  onChange={(e) => setInitialReceivedAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-emerald-400 rounded-lg bg-white"
                />
                <span className="text-[11px] font-mono text-emerald-700 font-semibold mt-0.5 block">
                  Received: {formatPKR(initialReceivedAmount)} (Balance:{' '}
                  {formatPKR(Math.max(0, totalDealAmount - initialReceivedAmount))})
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Payment Type
                </label>
                <select
                  value={initialPaymentStage}
                  onChange={(e) =>
                    setInitialPaymentStage(
                      e.target.value as PaymentReceipt['paymentStage']
                    )
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Token / Biyana">Token / Biyana</option>
                  <option value="Down Payment">Down Payment (Booking)</option>
                  <option value="Final Settlement">Full Cash Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Plan Mode
                </label>
                <select
                  value={paymentPlanType}
                  onChange={(e) =>
                    setPaymentPlanType(e.target.value as PaymentPlanType)
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {PAYMENT_PLAN_TYPES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Method & Ref #
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={initialPaymentMethod}
                    onChange={(e) =>
                      setInitialPaymentMethod(e.target.value as PaymentMethodType)
                    }
                    className="w-1/2 px-2 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={initialReferenceNo}
                    onChange={(e) => setInitialReferenceNo(e.target.value)}
                    placeholder="Ref / Cheque #"
                    className="w-1/2 px-2.5 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Booking File Stage
                </label>
                <select
                  value={dealStage}
                  onChange={(e) => setDealStage(e.target.value as BookingDealStage)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {DEAL_STAGES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {paymentPlanType === 'Installment Plan' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Number of Installments
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={totalInstallments}
                      onChange={(e) => setTotalInstallments(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Installment Frequency
                    </label>
                    <select
                      value={installmentFrequency}
                      onChange={(e) =>
                        setInstallmentFrequency(
                          e.target.value as 'Monthly' | 'Quarterly' | 'Lump Sum'
                        )
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Monthly">Monthly Installments</option>
                      <option value="Quarterly">Quarterly Installments</option>
                      <option value="Lump Sum">Lump Sum</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Next Installment Due Date
                    </label>
                    <input
                      type="date"
                      value={nextDueDate}
                      onChange={(e) => setNextDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Special Deal Terms / Allotment Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record corner plot charges, possession timeline, or special rebate terms..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
            >
              <BadgeCheck className="w-4 h-4" />
              Confirm Customer Booking & Generate Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
