import React, { useState, useEffect } from "react";
import { AlertTriangle, Upload, X, Loader2, Clock } from "lucide-react";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import { hindranceService } from "@/modules/timbangan/overview/services/hindranceService";
import { showToast } from "@/shared/utils/toast";

const KendalaModal = ({ 
  isOpen, 
  hour, 
  mode = "create", // "create" or "edit"
  currentKendala = null, // Data kendala untuk mode edit
  onClose, 
  onSave,
  excaHullNo,
  date,
  shift
}) => {
  // State Management
  const [hindrancesData, setHindrancesData] = useState([]); // Data mentah dari API
  const [categories, setCategories] = useState([]); // List kategori unik
  const [selectedCategory, setSelectedCategory] = useState("");
  const [hindranceOptions, setHindranceOptions] = useState([]); // Filtered hindrances
  const [selectedHindrance, setSelectedHindrance] = useState("");
  const [selectedHindranceId, setSelectedHindranceId] = useState(null);
  const [customHindrance, setCustomHindrance] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploadedMediaIds, setUploadedMediaIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Validation states
  const [errors, setErrors] = useState({});

  // Format hour for display
  const formattedHour = hour !== null && hour !== undefined 
    ? `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`
    : '';

  // Generate hour_data (format: "HH:00:00")
  const hourData = hour !== null && hour !== undefined
    ? `${hour.toString().padStart(2, '0')}:00:00`
    : null;

  // Load data when modal opens or mode/currentKendala changes
  useEffect(() => {
    if (isOpen && mode === "edit" && currentKendala) {
      loadKendalaData(currentKendala);
    } else if (isOpen && mode === "create") {
      resetForm();
    }
  }, [isOpen, mode, currentKendala]);

  // Fetch categories when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchHindrances();
    }
  }, [isOpen]);

  // Update hindrance options when category changes
  useEffect(() => {
    if (selectedCategory && hindrancesData.length > 0) {
      // Filter hindrances berdasarkan kategori yang dipilih
      const filtered = hindrancesData.filter(item => {
        const categoryName = item.attributes?.hindrance_category?.data?.attributes?.category_name;
        return categoryName === selectedCategory;
      });
      
      setHindranceOptions(filtered);
      
      // Reset hindrance selection if in create mode or category changed
      if (mode === "create") {
        setSelectedHindrance("");
        setSelectedHindranceId(null);
        setCustomHindrance("");
      }
    } else {
      setHindranceOptions([]);
    }
  }, [selectedCategory, hindrancesData, mode]);

  /**
   * Load existing kendala data for editing
   */
  const loadKendalaData = (kendala) => {
    
    setSelectedCategory(kendala.hindrance_category || "");
    
    // Check if hindrance exists in predefined options
    const isCustomHindrance = !hindrancesData.some(item => 
      item.attributes?.hindrance === kendala.hindrance &&
      item.attributes?.hindrance_category?.data?.attributes?.category_name === kendala.hindrance_category
    );
    
    if (isCustomHindrance) {
      setSelectedHindrance("custom");
      setCustomHindrance(kendala.hindrance || "");
      setSelectedHindranceId(null);
    } else {
      const hindranceItem = hindrancesData.find(item => 
        item.attributes?.hindrance === kendala.hindrance
      );
      setSelectedHindrance(kendala.hindrance || "");
      setSelectedHindranceId(hindranceItem?.id || null);
      setCustomHindrance("");
    }
    
    setDescription(kendala.description || "");
    
    // Load existing photos/evidence
    if (kendala.evidence) {
      let evidenceIds = [];
      
      if (typeof kendala.evidence === 'string') {
        try {
          evidenceIds = JSON.parse(kendala.evidence);
        } catch (e) {
          console.error('❌ Failed to parse evidence string:', e);
          evidenceIds = [];
        }
      } else if (Array.isArray(kendala.evidence)) {
        evidenceIds = kendala.evidence;
      }
      
      if (evidenceIds.length > 0) {
        
        setUploadedMediaIds(evidenceIds);
        setPreviews(evidenceIds.map((id, index) => ({
          id,
          url: `/timbangan-internal/uploads/media-${id}`,
          name: `Foto ${index + 1}`
        })));
        setPhotos(evidenceIds.map((id, index) => ({
          id,
          name: `Foto ${index + 1}`
        })));
      } else {
        resetPhotoState();
      }
    } else {
      resetPhotoState();
    }
  };

  /**
   * Reset photo state
   */
  const resetPhotoState = () => {
    setPhotos([]);
    setPreviews([]);
    setUploadedMediaIds([]);
  };

  /**
   * Fetch hindrances from API and extract unique categories
   */
  const fetchHindrances = async () => {
    setIsLoadingCategories(true);
    try {
      const result = await hindranceService.getHindranceCategories();
      
      if (result.success && result.data) {
        
        // Simpan data mentah
        setHindrancesData(result.data);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(
          result.data
            .map(item => item.attributes?.hindrance_category?.data?.attributes?.category_name)
            .filter(Boolean)
        )].sort();
        
        setCategories(uniqueCategories);
        
        // Set default category for create mode
        if (mode === "create" && uniqueCategories.length > 0 && !selectedCategory) {
          setSelectedCategory(uniqueCategories[0]);
        }
      }
    } catch (error) {
      console.error("❌ Error fetching hindrances:", error);
      showToast.error(error.message || "Gagal memuat data kendala");
    } finally {
      setIsLoadingCategories(false);
    }
  };

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setSelectedCategory(categories[0] || "");
    setSelectedHindrance("");
    setSelectedHindranceId(null);
    setCustomHindrance("");
    setDescription("");
    resetPhotoState();
    setErrors({});
  };

  /**
   * Handle file upload
   */
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    
    // Validate max 3 photos
    if (photos.length + files.length > 3) {
      showToast.error("Maksimal 3 foto");
      return;
    }

    // Validate file size (max 5MB)
    const invalidFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      showToast.error("Ukuran file maksimal 5MB per foto");
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidTypes = files.filter(file => !validTypes.includes(file.type));
    if (invalidTypes.length > 0) {
      showToast.error("Hanya file JPG, PNG, dan WebP yang diperbolehkan");
      return;
    }

    setIsUploading(true);

    try {
      // Upload all files
      const uploadPromises = files.map(file => 
        hindranceService.uploadEvidence(file)
      );
      
      const results = await Promise.all(uploadPromises);
      
      // Process results
      const newMediaIds = [];
      const newPreviews = [];
      const newPhotos = [];

      results.forEach((result, index) => {
        if (result.success && result.data) {
          newMediaIds.push(result.data.id);
          newPreviews.push({
            id: result.data.id,
            url: result.data.url || URL.createObjectURL(files[index]),
            name: files[index].name
          });
          newPhotos.push(files[index]);
        }
      });

      // Update state
      setUploadedMediaIds(prev => [...prev, ...newMediaIds]);
      setPreviews(prev => [...prev, ...newPreviews]);
      setPhotos(prev => [...prev, ...newPhotos]);
      setErrors(prev => ({ ...prev, photos: null }));

      showToast.success(`${newMediaIds.length} foto berhasil diupload`);
      
    } catch (error) {
      console.error("❌ Upload failed:", error);
      showToast.error(error.message || "Gagal mengupload foto");
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Remove photo from selection
   */
  const removePhoto = (index) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    const updatedMediaIds = uploadedMediaIds.filter((_, i) => i !== index);

    setPhotos(updatedPhotos);
    setPreviews(updatedPreviews);
    setUploadedMediaIds(updatedMediaIds);

  };

  /**
   * Validate form before submit
   */
  const validateForm = () => {
    const newErrors = {};

    // Validate category
    if (!selectedCategory) {
      newErrors.category = "Pilih jenis kendala";
    }

    // Validate hindrance
    if (selectedHindrance === "custom") {
      if (!customHindrance.trim()) {
        newErrors.customHindrance = "Deskripsi kendala wajib diisi";
      } else if (customHindrance.trim().length < 10) {
        newErrors.customHindrance = "Minimal 10 karakter";
      }
    } else if (!selectedHindrance) {
      newErrors.hindrance = "Pilih kendala";
    }

    // Validate photos
    if (uploadedMediaIds.length === 0) {
      newErrors.photos = "Minimal 1 foto bukti harus diupload";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    
    if (!validateForm()) {
      showToast.error("Mohon lengkapi semua field yang wajib diisi");
      return;
    }

    setIsSubmitting(true);

    try {
      const hindranceValue = selectedHindrance === "custom" 
        ? customHindrance.trim() 
        : selectedHindrance;

      const payload = {
        exca_hull_no: excaHullNo,
        date,
        shift,
        hour_data: hourData,
        hindrance_category: selectedCategory,
        hindrance: hindranceValue,
        hindrance_id: selectedHindrance === "custom" ? null : selectedHindranceId,
        description: description.trim() || null,
        evidence: uploadedMediaIds,
      };

      let result;
      if (mode === "edit" && currentKendala?.id) {
        result = await hindranceService.updateHindrance(currentKendala.id, payload);
      } else {
        result = await hindranceService.createHindrance(payload);
      }

      if (result.success) {
        showToast.success(
          mode === "edit" 
            ? "Kendala berhasil diperbarui" 
            : "Kendala berhasil ditambahkan"
        );
        
        // Call parent callback
        if (onSave) {
          onSave(result.data);
        }
        
        // Close modal and reset
        handleClose();
      } else {
        throw new Error(result.message || "Gagal menyimpan kendala");
      }
    } catch (error) {
      console.error("❌ Submit failed:", error);
      showToast.error(error.message || "Gagal menyimpan kendala");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (!isSubmitting && !isUploading) {
      resetForm();
      onClose();
    }
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleSubmit}
      title={`${mode === "edit" ? "Edit" : "Tambah"} Kendala - Jam ${formattedHour}`}
      description={
        mode === "edit" 
          ? "Perbarui informasi kendala yang telah tercatat"
          : "Lengkapi informasi kendala yang menyebabkan produksi tidak mencapai target"
      }
      confirmLabel={mode === "edit" ? "Perbarui" : "Simpan"}
      cancelLabel="Batal"
      variant="default"
      isProcessing={isSubmitting}
      icon={AlertTriangle}
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin px-1">
        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
          <div className="flex gap-2">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-800 dark:text-blue-300">
              <p className="font-medium">Unit: {excaHullNo}</p>
              <p>Tanggal: {new Date(date).toLocaleDateString('id-ID')}</p>
              <p>Shift: {shift}</p>
              <p>Jam Operasi: {formattedHour}</p>
            </div>
          </div>
        </div>

        {/* Jenis Kendala (Category) */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-200">
            Jenis Kendala <span className="text-red-500">*</span>
          </label>
          {isLoadingCategories ? (
            <div className="flex items-center justify-center py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-neutral-50 dark:bg-gray-800">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin mr-2" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Memuat kategori...</span>
            </div>
          ) : (
            <>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setErrors(prev => ({ ...prev, category: null }));
                }}
                className={`w-full px-3 py-2 border rounded-md bg-neutral-50 dark:bg-gray-800 dark:text-gray-200 transition-colors ${
                  errors.category 
                    ? 'border-red-500 dark:border-red-500' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                required
                disabled={isSubmitting}
              >
                <option value="">Pilih Jenis Kendala</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.category}</p>
              )}
            </>
          )}
        </div>

        {/* Kendala (Hindrance) - Only show when category is selected */}
        {selectedCategory && (
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">
              Kendala <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedHindrance}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedHindrance(value);
                
                if (value !== "custom") {
                  const hindranceItem = hindranceOptions.find(
                    item => item.attributes?.hindrance === value
                  );
                  setSelectedHindranceId(hindranceItem?.id || null);
                  setCustomHindrance("");
                } else {
                  setSelectedHindranceId(null);
                }
                
                setErrors(prev => ({ ...prev, hindrance: null }));
              }}
              className={`w-full px-3 py-2 border rounded-md bg-neutral-50 dark:bg-gray-800 dark:text-gray-200 transition-colors ${
                errors.hindrance 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              required
              disabled={isSubmitting}
            >
              <option value="">Pilih Kendala</option>
              {hindranceOptions.map((item) => (
                <option key={item.id} value={item.attributes.hindrance}>
                  {item.attributes.hindrance}
                </option>
              ))}
              <option value="custom">Lainnya (Tulis Manual)</option>
            </select>
            {errors.hindrance && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.hindrance}</p>
            )}
            
            {/* Show count of available hindrances */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {hindranceOptions.length} kendala tersedia untuk kategori {selectedCategory}
            </p>
          </div>
        )}

        {/* Custom Hindrance */}
        {selectedHindrance === "custom" && (
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">
              Deskripsi Kendala <span className="text-red-500">*</span>
            </label>
            <textarea
              value={customHindrance}
              onChange={(e) => {
                setCustomHindrance(e.target.value);
                setErrors(prev => ({ ...prev, customHindrance: null }));
              }}
              className={`w-full px-3 py-2 border rounded-md bg-neutral-50 dark:bg-gray-800 dark:text-gray-200 min-h-24 transition-colors ${
                errors.customHindrance 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Jelaskan kendala yang menyebabkan produksi tidak mencapai target..."
              required
              minLength={10}
              disabled={isSubmitting}
            />
            <div className="flex justify-between mt-1">
              <p className={`text-xs ${customHindrance.length < 10 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {customHindrance.length}/10 karakter minimum
              </p>
              {errors.customHindrance && (
                <p className="text-xs text-red-600 dark:text-red-400">{errors.customHindrance}</p>
              )}
            </div>
          </div>
        )}

        {/* Keterangan Tambahan */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-200">
            Keterangan Tambahan (Opsional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-neutral-50 dark:bg-gray-800 dark:text-gray-200 min-h-20"
            placeholder="Informasi tambahan atau solusi yang telah dilakukan..."
            disabled={isSubmitting}
          />
        </div>

        {/* Foto Bukti */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-200">
            Foto Bukti <span className="text-red-500">*</span>
          </label>
          
          {/* Upload Button */}
          {photos.length < 3 && (
            <div className="mb-3">
              <label
                htmlFor="photo-upload"
                className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed rounded-md transition-colors bg-neutral-50 dark:bg-gray-800 ${
                  isUploading || isSubmitting
                    ? "border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-50"
                    : errors.photos
                    ? "border-red-500 dark:border-red-500 cursor-pointer hover:border-red-600 dark:hover:border-red-600"
                    : "border-gray-300 dark:border-gray-600 cursor-pointer hover:border-blue-500 dark:hover:border-blue-400"
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Mengupload...
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Pilih Foto ({photos.length}/3)
                    </span>
                  </>
                )}
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading || isSubmitting}
                />
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Format: JPG, PNG, WebP • Maksimal 5MB per foto • Minimal 1 foto, maksimal 3 foto
              </p>
              {errors.photos && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.photos}</p>
              )}
            </div>
          )}

          {/* Preview Grid */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((preview, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-md overflow-hidden border border-gray-300 dark:border-gray-600 group"
                >
                  <img
                    src={typeof preview === 'string' ? preview : preview.url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error(`❌ Failed to load image ${index}:`, preview);
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5HYWdhbCBtZW11YXQgZ2FtYmFyPC90ZXh0Pjwvc3ZnPg==';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center truncate">
                    {photos[index]?.name?.length > 15
                      ? photos[index]?.name.substring(0, 15) + "..."
                      : photos[index]?.name || `Foto ${index + 1}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {previews.length === 0 && (
            <div className={`flex flex-col items-center justify-center py-6 border-2 border-dashed rounded-md ${
              errors.photos 
                ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                : 'border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20'
            }`}>
              <AlertTriangle className={`w-8 h-8 mb-2 ${
                errors.photos 
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-orange-500 dark:text-orange-400'
              }`} />
              <p className={`text-sm font-medium ${
                errors.photos 
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-orange-700 dark:text-orange-300'
              }`}>
                Minimal 1 foto bukti harus diupload
              </p>
              <p className={`text-xs mt-1 ${
                errors.photos 
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-orange-600 dark:text-orange-400'
              }`}>
                Foto diperlukan untuk dokumentasi kendala
              </p>
            </div>
          )}
        </div>
      </div>
    </ConfirmDialog>
  );
};

export default KendalaModal;