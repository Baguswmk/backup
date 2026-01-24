import React, { useState, useEffect } from "react";
import { AlertTriangle, Upload, X, Image, Loader2 } from "lucide-react";
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
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [hindranceOptions, setHindranceOptions] = useState([]);
  const [selectedHindrance, setSelectedHindrance] = useState("");
  const [customHindrance, setCustomHindrance] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploadedMediaIds, setUploadedMediaIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Load data saat mode edit
  useEffect(() => {
    if (isOpen && mode === "edit" && currentKendala) {
      loadKendalaData(currentKendala);
    } else if (isOpen && mode === "create") {
      resetForm();
    }
  }, [isOpen, mode, currentKendala]);

  // Fetch categories
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  // Update hindrance options saat category berubah
  useEffect(() => {
    if (selectedCategory) {
      const category = categories.find(cat => cat.category_name === selectedCategory);
      setHindranceOptions(category?.hindrances || []);
      
      // Reset hindrance selection jika bukan mode edit atau category berubah
      if (mode === "create") {
        setSelectedHindrance("");
        setCustomHindrance("");
      }
    } else {
      setHindranceOptions([]);
    }
  }, [selectedCategory, categories, mode]);

  const loadKendalaData = (kendala) => {
    
    setSelectedCategory(kendala.hindrance_category || "");
    
    // Check if hindrance exists in predefined options
    // If not, set to custom
    const isCustomHindrance = !categories.some(cat => 
      cat.category_name === kendala.hindrance_category &&
      cat.hindrances?.some(h => h.hindrance === kendala.hindrance)
    );
    
    if (isCustomHindrance) {
      setSelectedHindrance("custom");
      setCustomHindrance(kendala.hindrance || "");
    } else {
      setSelectedHindrance(kendala.hindrance || "");
      setCustomHindrance("");
    }
    
    setDescription(kendala.description || "");
    
    // Load existing photos/evidence
    if (kendala.evidence) {
      let evidenceData = [];
      
      if (typeof kendala.evidence === 'string') {
        try {
          evidenceData = JSON.parse(kendala.evidence);
        } catch (e) {
          console.error('Failed to parse evidence string:', e);
          evidenceData = [];
        }
      } else if (Array.isArray(kendala.evidence)) {
        evidenceData = kendala.evidence;
      }
      
      
      if (evidenceData.length > 0) {
        // Extract media IDs
        const mediaIds = evidenceData.map(media => {
          // Handle both object with id and direct id
          return typeof media === 'object' ? media.id : media;
        }).filter(Boolean);
        
        // Extract URLs for preview
        const urls = evidenceData.map(media => {
          if (typeof media === 'object') {
            // Try different URL patterns
            if (media.url) {
              // Add base path if needed
              if (media.url.startsWith('http')) return media.url;
              if (media.url.startsWith('/timbangan-internal')) return media.url;
              if (media.url.startsWith('/uploads')) return `/timbangan-internal${media.url}`;
              return `/timbangan-internal/uploads/${media.url}`;
            }
            // Check formats for thumbnail
            if (media.formats?.thumbnail?.url) {
              const thumbUrl = media.formats.thumbnail.url;
              if (thumbUrl.startsWith('http')) return thumbUrl;
              if (thumbUrl.startsWith('/timbangan-internal')) return thumbUrl;
              if (thumbUrl.startsWith('/uploads')) return `/timbangan-internal${thumbUrl}`;
              return `/timbangan-internal/uploads/${thumbUrl}`;
            }
          }
          return null;
        }).filter(Boolean);
        
        
        setUploadedMediaIds(mediaIds);
        setPreviews(urls);
        setPhotos(evidenceData); // Store full media objects
      } else {
        console.warn('⚠️ No evidence data found');
        setUploadedMediaIds([]);
        setPreviews([]);
        setPhotos([]);
      }
    } else {
      console.warn('⚠️ No evidence field in kendala');
      setUploadedMediaIds([]);
      setPreviews([]);
      setPhotos([]);
    }
  };

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const result = await hindranceService.getHindranceCategories();
      if (result.success) {
        setCategories(result.data);
        
        // Set default category untuk mode create
        if (mode === "create" && result.data.length > 0 && !selectedCategory) {
          setSelectedCategory(result.data[0].category_name);
        }
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      showToast.error(error.message || "Gagal memuat kategori kendala");
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    
    // Validasi maksimal 3 foto
    if (photos.length + files.length > 3) {
      showToast.error("Maksimal 3 foto");
      return;
    }

    // Validasi ukuran file
    const invalidFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      showToast.error("Ukuran file maksimal 5MB per foto");
      return;
    }

    // Validasi tipe file
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidTypes = files.filter(file => !validTypes.includes(file.type));
    if (invalidTypes.length > 0) {
      showToast.error("Hanya file JPG, PNG, dan WebP yang diperbolehkan");
      return;
    }

    setIsUploading(true);

    try {
      const uploadPromises = files.map(file => 
        hindranceService.uploadEvidence(file)
      );

      const uploadResults = await Promise.all(uploadPromises);

      const newMediaIds = uploadResults.map(result => result.data.id);
      const newUrls = uploadResults.map(result => result.data.url);
      const newMediaObjects = uploadResults.map(result => result.data);
      
      setUploadedMediaIds(prev => [...prev, ...newMediaIds]);
      setPhotos(prev => [...prev, ...newMediaObjects]);

      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => [...prev, reader.result]);
        };
        reader.readAsDataURL(file);
      });

      showToast.success(`${files.length} foto berhasil diupload`);
    } catch (error) {
      console.error("Upload error:", error);
      showToast.error(error.message || "Gagal mengupload foto");
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setUploadedMediaIds(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCategory) {
      showToast.error("Kategori kendala harus dipilih");
      return;
    }

    const hindranceText = selectedHindrance === "custom" ? customHindrance : selectedHindrance;
    if (!hindranceText || hindranceText.trim().length < 10) {
      showToast.error("Deskripsi kendala minimal 10 karakter");
      return;
    }

    if (uploadedMediaIds.length === 0) {
      showToast.error("Minimal 1 foto bukti harus diupload");
      return;
    }

    if (!excaHullNo || !date || !shift) {
      showToast.error("Data excavator, tanggal, dan shift tidak lengkap");
      return;
    }

    setIsSubmitting(true);

    try {
      const startTime = `${hour.toString().padStart(2, '0')}:00:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00:00`;
      const hourDate = `${hour.toString().padStart(2, '0')}:00:00`;

      const payload = {
        hindrance_category: selectedCategory,
        hindrance: hindranceText,
        description: description || "",
        evidence: uploadedMediaIds,
        exca_hull_no: excaHullNo,
        shift: shift,
        date: date,
        start_time: startTime,
        end_time: endTime,
        hour_data: hourDate,
      };

      let result;
      
      if (mode === "edit" && currentKendala?.id) {
        // Update existing kendala
        result = await hindranceService.updateHindrance(currentKendala.id, payload);
        showToast.success("Kendala berhasil diperbarui");
      } else {
        // Create new kendala
        result = await hindranceService.createHindrance(payload);
        showToast.success("Kendala berhasil disimpan");
      }

      if (result.success) {
        onSave({
          id: result.data.id,
          kategori: selectedCategory,
          kendala: hindranceText,
          description,
          photos: uploadedMediaIds,
          hour,
          ...result.data,
        });

        resetForm();
        onClose();
      }
    } catch (error) {
      console.error("Submit error:", error);
      showToast.error(error.message || `Gagal ${mode === "edit" ? "memperbarui" : "menyimpan"} kendala`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedCategory("");
    setSelectedHindrance("");
    setCustomHindrance("");
    setDescription("");
    setPhotos([]);
    setPreviews([]);
    setUploadedMediaIds([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const isEditMode = mode === "edit";

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleSubmit}
      title={`${isEditMode ? "Edit" : "Input"} Kendala Jam ${hour}:00`}
      confirmLabel={isSubmitting ? (isEditMode ? "Memperbarui..." : "Menyimpan...") : (isEditMode ? "Perbarui Kendala" : "Simpan Kendala")}
      cancelLabel="Batal"
      variant="default"
      icon={AlertTriangle}
      isConfirmDisabled={isSubmitting || isUploading || isLoadingCategories}
    >
      <div className="space-y-4">
        {/* Info Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Excavator:</span>
              <span className="ml-2 font-medium dark:text-gray-200">{excaHullNo}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Tanggal:</span>
              <span className="ml-2 font-medium dark:text-gray-200">{date}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Jam:</span>
              <span className="ml-2 font-medium dark:text-gray-200">{hour}:00 - {hour + 1}:00</span>
            </div>
            {shift && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Shift:</span>
                <span className="ml-2 font-medium dark:text-gray-200">{shift}</span>
              </div>
            )}
          </div>
        </div>

        {/* Kategori Kendala */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-200">
            Kategori Kendala <span className="text-red-500">*</span>
          </label>
          {isLoadingCategories ? (
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-neutral-50 dark:bg-gray-800">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Memuat kategori...</span>
            </div>
          ) : (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-neutral-50 dark:bg-gray-800 dark:text-gray-200"
              required
              disabled={isSubmitting}
            >
              <option value="">Pilih Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.category_name}>
                  {cat.category_name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Jenis Kendala */}
        {selectedCategory && (
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">
              Jenis Kendala <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedHindrance}
              onChange={(e) => setSelectedHindrance(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-neutral-50 dark:bg-gray-800 dark:text-gray-200"
              required
              disabled={isSubmitting}
            >
              <option value="">Pilih Jenis Kendala</option>
              {hindranceOptions.map((hindrance) => (
                <option key={hindrance.id} value={hindrance.hindrance}>
                  {hindrance.hindrance}
                </option>
              ))}
              <option value="custom">Lainnya (Tulis Manual)</option>
            </select>
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
              onChange={(e) => setCustomHindrance(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-neutral-50 dark:bg-gray-800 dark:text-gray-200 min-h-24"
              placeholder="Jelaskan kendala yang menyebabkan produksi tidak mencapai target..."
              required
              minLength={10}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {customHindrance.length}/10 karakter minimum
            </p>
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
            </div>
          )}

          {/* Preview Grid */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((preview, index) => {
                return (
                  <div
                    key={index}
                    className="relative aspect-square rounded-md overflow-hidden border border-gray-300 dark:border-gray-600 group"
                  >
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error(`❌ Failed to load image ${index}:`, preview);
                        e.target.onerror = null; // Prevent infinite loop
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5HYWdhbCBtZW11YXQgZ2FtYmFyPC90ZXh0Pjwvc3ZnPg==';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
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
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {previews.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-orange-300 dark:border-orange-600 rounded-md bg-orange-50 dark:bg-orange-900/20">
              <AlertTriangle className="w-8 h-8 text-orange-500 dark:text-orange-400 mb-2" />
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Minimal 1 foto bukti harus diupload
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
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