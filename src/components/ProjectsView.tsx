import React, { useState, useRef } from 'react';
import {
  Building2,
  MapPin,
  Plus,
  Edit3,
  Users,
  Link2,
  X,
  Upload,
  Image as ImageIcon,
  Camera,
  Trash2,
  Maximize2,
  Check,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import {
  formatBudgetRange,
  PRESET_PROPERTY_IMAGES,
  readAndCompressImageFile,
} from '../services/crmService';
import { ALL_PROPERTY_TYPES } from '../data/demoData';
import { Project, PropertyType } from '../types/crm';

export const ProjectsView: React.FC = () => {
  const {
    projects,
    visibleLeads: leads,
    addProject,
    updateProject,
    updateLead,
    setSelectedLeadId,
    addToast,
  } = useCRM();

  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Modal fields
  const [name, setName] = useState('');
  const [developerName, setDeveloperName] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('Lahore');
  const [propertyType, setPropertyType] = useState<PropertyType>('Houses');
  const [availableUnits, setAvailableUnits] = useState('12');
  const [totalUnits, setTotalUnits] = useState('30');
  const [minPrice, setMinPrice] = useState('35000000');
  const [maxPrice, setMaxPrice] = useState('75000000');
  const [status, setStatus] = useState<Project['status']>('Active');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string>(PRESET_PROPERTY_IMAGES[0].url);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const quickCardFileInputRef = useRef<HTMLInputElement | null>(null);
  const [quickUploadProjectId, setQuickUploadProjectId] = useState<string | null>(null);

  // Connect Lead to Project Modal
  const [connectingProject, setConnectingProject] = useState<Project | null>(null);
  const [selectedLeadToConnect, setSelectedLeadToConnect] = useState<string>(
    leads[0]?.id || 'LD-1001'
  );

  // Full-Screen Property Photo Lightbox & Gallery Modal
  const [lightboxProject, setLightboxProject] = useState<Project | null>(null);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string>('');

  // Resilient image error tracker
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const filteredProjects = projects.filter(
    (p) => propertyTypeFilter === 'ALL' || p.propertyType === propertyTypeFilter
  );

  const openAddModal = () => {
    setEditingProject(null);
    setName('');
    setDeveloperName('');
    setLocation('');
    setCity('Lahore');
    setPropertyType('Houses');
    setAvailableUnits('10');
    setTotalUnits('25');
    setMinPrice('35000000');
    setMaxPrice('85000000');
    setStatus('Active');
    setDescription('');
    setImageUrl(PRESET_PROPERTY_IMAGES[0].url);
    setGalleryImages([]);
    setIsModalOpen(true);
  };

  const openEditModal = (proj: Project) => {
    setEditingProject(proj);
    setName(proj.name);
    setDeveloperName(proj.developerName);
    setLocation(proj.location);
    setCity(proj.city);
    setPropertyType(proj.propertyType);
    setAvailableUnits(String(proj.availableUnits));
    setTotalUnits(String(proj.totalUnits));
    setMinPrice(String(proj.minPrice));
    setMaxPrice(String(proj.maxPrice));
    setStatus(proj.status);
    setDescription(proj.description);
    setImageUrl(proj.imageUrl || PRESET_PROPERTY_IMAGES[0].url);
    setGalleryImages(proj.galleryImages || []);
    setIsModalOpen(true);
  };

  const handlePrimaryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const dataUrl = await readAndCompressImageFile(file);
      setImageUrl(dataUrl);
      setBrokenImages({});
      addToast('Picture Uploaded', `Selected "${file.name}" as main property picture.`, 'success');
    } catch {
      addToast('Upload Error', 'Could not read the selected image file.', 'danger');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      setIsUploading(true);
      const uploadedUrls: string[] = [];
      for (let i = 0; i < Math.min(files.length, 4); i++) {
        const url = await readAndCompressImageFile(files[i]);
        uploadedUrls.push(url);
      }
      setGalleryImages((prev) => [...prev, ...uploadedUrls]);
      addToast(
        'Gallery Photos Added',
        `${uploadedUrls.length} additional property picture(s) attached.`,
        'success'
      );
    } catch {
      addToast('Upload Error', 'Failed to process gallery image.', 'danger');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleQuickCardImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !quickUploadProjectId) return;
    try {
      const dataUrl = await readAndCompressImageFile(file);
      updateProject(quickUploadProjectId, { imageUrl: dataUrl });
      setBrokenImages((prev) => ({ ...prev, [quickUploadProjectId]: false }));
    } catch {
      addToast('Upload Error', 'Failed to update property photo.', 'danger');
    } finally {
      setQuickUploadProjectId(null);
      e.target.value = '';
    }
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !developerName.trim()) return;
    const minP = Number(minPrice) || 10000000;
    const maxP = Number(maxPrice) || minP;
    const priceLabel = formatBudgetRange(minP, maxP);
    const finalImage = imageUrl.trim() || PRESET_PROPERTY_IMAGES[0].url;

    if (editingProject) {
      updateProject(editingProject.id, {
        name: name.trim(),
        developerName: developerName.trim(),
        location: location.trim(),
        city: city.trim(),
        propertyType,
        availableUnits: Number(availableUnits) || 0,
        totalUnits: Number(totalUnits) || 50,
        minPrice: minP,
        maxPrice: maxP,
        priceRangeLabel: priceLabel,
        status,
        description: description.trim(),
        imageUrl: finalImage,
        galleryImages,
      });
      setBrokenImages((prev) => ({ ...prev, [editingProject.id]: false }));
    } else {
      addProject({
        name: name.trim(),
        developerName: developerName.trim(),
        location: location.trim(),
        city: city.trim(),
        propertyType,
        availableUnits: Number(availableUnits) || 0,
        totalUnits: Number(totalUnits) || 50,
        minPrice: minP,
        maxPrice: maxP,
        priceRangeLabel: priceLabel,
        status,
        description: description.trim(),
        imageUrl: finalImage,
        galleryImages,
      });
    }
    setIsModalOpen(false);
  };

  const handleConnectLeadToProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectingProject || !selectedLeadToConnect) return;
    updateLead(
      selectedLeadToConnect,
      {
        interestedProjectId: connectingProject.id,
        interestedProperty: connectingProject.name,
        propertyType: connectingProject.propertyType,
        propertyImageUrl: connectingProject.imageUrl,
      },
      `Connected lead with project: ${connectingProject.name} (${connectingProject.propertyType}).`
    );
    setConnectingProject(null);
  };

  return (
    <div className="space-y-6">
      {/* Hidden input for quick card photo replacement */}
      <input
        ref={quickCardFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleQuickCardImageChange}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Property & Real Estate Inventory (With Pictures & Gallery)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Add houses, residential plots, commercial shops, and apartments with real property photos and link them to buyer leads
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Inventory / Project (With Picture)
        </button>
      </div>

      {/* Property Type Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white border border-slate-200 rounded-xl w-fit">
        <button
          onClick={() => setPropertyTypeFilter('ALL')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            propertyTypeFilter === 'ALL'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Inventory ({projects.length})
        </button>
        {ALL_PROPERTY_TYPES.map((pt) => (
          <button
            key={pt}
            onClick={() => setPropertyTypeFilter(pt)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              propertyTypeFilter === pt
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {pt}
          </button>
        ))}
      </div>

      {/* Projects & Property Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProjects.map((proj) => {
          const connectedLeads = leads.filter(
            (l) =>
              l.interestedProjectId === proj.id || l.interestedProperty === proj.name
          );
          const hasImageError = brokenImages[proj.id] || !proj.imageUrl;
          const totalPhotos = 1 + (proj.galleryImages?.length || 0);

          return (
            <div
              key={proj.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between group"
            >
              <div>
                {/* Property Picture Header with Quick Upload & Lightbox Trigger */}
                <div className="relative h-56 bg-slate-900 overflow-hidden">
                  {!hasImageError ? (
                    <img
                      src={proj.imageUrl}
                      alt={proj.name}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setBrokenImages((prev) => ({ ...prev, [proj.id]: true }))
                      }
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col items-center justify-center p-4 text-center text-white">
                      <Building2 className="w-8 h-8 text-blue-400 mb-2" />
                      <span className="text-sm font-bold">{proj.name}</span>
                      <span className="text-xs text-slate-300 mt-0.5">{proj.propertyType}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                  {/* Top Overlay Controls: Change Photo & View Full Photo */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setQuickUploadProjectId(proj.id);
                        quickCardFileInputRef.current?.click();
                      }}
                      title="Upload New Picture for This Property"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-slate-900/85 hover:bg-blue-700 text-white rounded-lg backdrop-blur-xs transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Change Picture
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLightboxProject(proj);
                        setActiveLightboxImage(proj.imageUrl);
                      }}
                      title="View Full-Size Property Picture"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-slate-900/85 hover:bg-slate-800 text-white rounded-lg backdrop-blur-xs transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      {totalPhotos > 1 ? `${totalPhotos} Photos` : 'View Photo'}
                    </button>
                  </div>

                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
                    <div>
                      <span className="text-[11px] font-medium text-blue-300 block">
                        {proj.propertyType} · {proj.status}
                      </span>
                      <h3 className="text-base font-bold leading-snug">{proj.name}</h3>
                    </div>
                  </div>
                </div>

                {/* Gallery Strip Preview (if multiple photos attached) */}
                {proj.galleryImages && proj.galleryImages.length > 0 && (
                  <div className="px-5 pt-3 flex items-center gap-2 overflow-x-auto">
                    {[proj.imageUrl, ...proj.galleryImages].map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setLightboxProject(proj);
                          setActiveLightboxImage(img);
                        }}
                        className="w-12 h-9 rounded-md overflow-hidden border border-slate-200 hover:border-blue-600 shrink-0 cursor-pointer"
                      >
                        <img
                          src={img}
                          alt={`${proj.name} photo ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Project Metadata & Description */}
                <div className="p-5 space-y-3">
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">{proj.developerName}</span>
                    <span className="mx-1.5">·</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {proj.location}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {proj.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-500 block">Price Range (PKR)</span>
                      <span className="font-mono font-bold text-slate-900 tabular-nums mt-0.5 block">
                        {proj.priceRangeLabel}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block">Available Inventory</span>
                      <span className="font-mono font-bold text-emerald-700 tabular-nums mt-0.5 block">
                        {proj.availableUnits} / {proj.totalUnits} Units
                      </span>
                    </div>
                  </div>

                  {/* Connected Buyer Inquiries List */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold text-slate-800 inline-flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-700" />
                        Connected Leads ({connectedLeads.length})
                      </span>
                      <button
                        onClick={() => setConnectingProject(proj)}
                        className="text-blue-700 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Link2 className="w-3 h-3" />
                        Link Lead
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {connectedLeads.slice(0, 4).map((l) => (
                        <button
                          key={l.id}
                          onClick={() => setSelectedLeadId(l.id)}
                          className="text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-2 py-1 rounded-md transition-colors cursor-pointer"
                        >
                          {l.customerName} ({l.propertySize})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-500">{proj.id}</span>
                <button
                  onClick={() => openEditModal(proj)}
                  className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-700 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Details & Photos
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Project & Inventory Modal (WITH FULL PICTURE UPLOAD & GALLERY) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingProject
                    ? `Edit Property / Inventory — ${editingProject.name}`
                    : 'Add New Property / Real Estate Inventory'}
                </h3>
                <p className="text-xs text-slate-500">
                  Upload house, plot, or apartment pictures and configure unit inventory & PKR pricing
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveProject}
              className="p-6 space-y-5 text-xs max-h-[82vh] overflow-y-auto"
            >
              {/* PICTURE UPLOAD & LIVE PREVIEW SECTION */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-blue-700" />
                      Property / House Picture
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Upload a photo of the house, plot, or building from your computer/mobile or pick a preset
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePrimaryImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {isUploading ? 'Uploading...' : 'Upload Picture from Device'}
                    </button>

                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleGalleryUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      + Add Gallery Photos
                    </button>
                  </div>
                </div>

                {/* Live Picture Preview & Preset Picker */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center pt-2">
                  <div className="sm:col-span-5 relative h-36 rounded-lg overflow-hidden border border-slate-300 bg-slate-900">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Property Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        No image selected
                      </div>
                    )}
                    <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                      Main Property Photo
                    </span>
                  </div>

                  <div className="sm:col-span-7 space-y-2.5">
                    <div>
                      <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                        Or Quick-Select Property Type Photo:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {PRESET_PROPERTY_IMAGES.map((preset) => {
                          const isSelected = imageUrl === preset.url;
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => setImageUrl(preset.url)}
                              className={`flex items-center gap-2 p-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold'
                                  : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <img
                                src={preset.url}
                                alt={preset.label}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded object-cover shrink-0"
                              />
                              <span className="text-[11px] leading-tight line-clamp-2">
                                {preset.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Or Paste Image URL Directly:
                      </label>
                      <input
                        type="text"
                        value={imageUrl.startsWith('data:') ? '' : imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder={
                          imageUrl.startsWith('data:')
                            ? 'Custom uploaded photo active (or paste URL to replace)'
                            : 'https://...'
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Extra Gallery Thumbnails if uploaded */}
                {galleryImages.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                      Additional Gallery Photos ({galleryImages.length}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {galleryImages.map((gImg, idx) => (
                        <div
                          key={idx}
                          className="relative w-16 h-12 rounded-md overflow-hidden border border-slate-300 group"
                        >
                          <img
                            src={gImg}
                            alt={`Gallery ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setGalleryImages((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Property & Inventory Details Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Project / Property Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. 1 Kanal Designer House #24, DHA Phase 6"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Developer / Owner Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={developerName}
                    onChange={(e) => setDeveloperName(e.target.value)}
                    placeholder="e.g. Crestline Signature Builders"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">
                    Exact Location / Sector / Street
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Sector C Main Boulevard, DHA Phase 6, Lahore"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Property Category
                  </label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {ALL_PROPERTY_TYPES.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Avail. Units</label>
                  <input
                    type="number"
                    value={availableUnits}
                    onChange={(e) => setAvailableUnits(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Total Units</label>
                  <input
                    type="number"
                    value={totalUnits}
                    onChange={(e) => setTotalUnits(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Min Price (PKR)</label>
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Max Price (PKR)</label>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Inventory Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Project['status'])}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Pre-Launch">Pre-Launch</option>
                  <option value="Completed">Completed</option>
                  <option value="Sold Out">Sold Out</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Property Specifications & Features
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe bedrooms, plot dimensions, facing (park/corner), possession status, or installment plan..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  {editingProject ? 'Save Property & Picture' : 'Add Property to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full-Screen Property Photo Lightbox & Gallery Modal */}
      {lightboxProject && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs text-blue-400 font-semibold">
                  {lightboxProject.propertyType} · {lightboxProject.priceRangeLabel}
                </span>
                <h3 className="text-lg font-bold">{lightboxProject.name}</h3>
              </div>
              <button
                onClick={() => setLightboxProject(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="h-[420px] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center">
                <img
                  src={activeLightboxImage || lightboxProject.imageUrl}
                  alt={lightboxProject.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>

              {[lightboxProject.imageUrl, ...(lightboxProject.galleryImages || [])].length >
                1 && (
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                  {[
                    lightboxProject.imageUrl,
                    ...(lightboxProject.galleryImages || []),
                  ].map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveLightboxImage(img)}
                      className={`w-20 h-14 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer ${
                        (activeLightboxImage || lightboxProject.imageUrl) === img
                          ? 'border-blue-600'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                <div className="text-slate-600">
                  <strong className="text-slate-900">{lightboxProject.developerName}</strong> ·{' '}
                  {lightboxProject.location}
                </div>
                <button
                  onClick={() => {
                    const proj = lightboxProject;
                    setLightboxProject(null);
                    openEditModal(proj);
                  }}
                  className="px-4 py-2 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  Edit Property / Upload More Photos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connect Lead to Project Modal */}
      {connectingProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Connect Lead to {connectingProject.name}
            </h3>
            <form onSubmit={handleConnectLeadToProject} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Select Customer Lead to Connect
                </label>
                <select
                  value={selectedLeadToConnect}
                  onChange={(e) => setSelectedLeadToConnect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.id} — {l.customerName} (Currently: {l.interestedProperty})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConnectingProject(null)}
                  className="px-4 py-2 font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  Connect Lead to Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
