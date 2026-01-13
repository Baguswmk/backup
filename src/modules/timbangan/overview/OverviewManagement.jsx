import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Truck, Hammer, Weight, RefreshCw } from 'lucide-react';
import OverviewTable from '@/modules/timbangan/overview/components/OverviewTable';
import OverviewDetailModal from '@/modules/timbangan/overview/components/OverviewDetailModal';
import HourDetailModal from '@/modules/timbangan/overview/components/HourDetailModal';
import { exportToPDF } from '@/shared/utils/pdf';
import { showToast } from '@/shared/utils/toast';
import { useDashboardDaily } from "@/modules/timbangan/dashboard/hooks/useDashboardDaily";

const OverviewManagement = () => {
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      from: today,
      to: today
    };
  });

  const [shift, setShift] = useState('All');
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cachedData, setCachedData] = useState(null);

  // Filter States
  const [selectedMitra, setSelectedMitra] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Advanced Filter State
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [selectedExcavators, setSelectedExcavators] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedDumpPoints, setSelectedDumpPoints] = useState([]);

  // Detail Modal State
  const [detailModal, setDetailModal] = useState({
    isOpen: false,
    data: null
  });

  // Hour Detail Modal State
  const [hourDetailModal, setHourDetailModal] = useState({
    isOpen: false,
    data: null,
    hour: null
  });

  // ✅ Use hook dengan memoized params
  const hookParams = useMemo(() => ({
    startDate: dateRange.from,
    endDate: dateRange.to,
    shift: shift
  }), [dateRange.from, dateRange.to, shift]);

  const {
    data: dashboardData,
    isLoading,
    error,
    refresh,
    summaryData: hookSummaryData,
    tableData: hookTableData
  } = useDashboardDaily(hookParams, true);

  // ✅ Update loading states berdasarkan kondisi
  useEffect(() => {
    if (isLoading) {
      // Jika belum pernah ada data, ini initial load
      if (!cachedData) {
        setIsRefreshing(false);
      } else {
        // Jika sudah ada data, ini refresh
        setIsRefreshing(true);
      }
    } else {
      // Selesai loading
      setIsRefreshing(false);
      
      // Cache data baru
      if (dashboardData) {
        setCachedData(dashboardData);
      }
    }
  }, [isLoading, dashboardData, cachedData]);

  // ✅ Handle body scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = detailModal.isOpen || hourDetailModal.isOpen;
    
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [detailModal.isOpen, hourDetailModal.isOpen]);

  // ✅ Memoized table data - gunakan cached data saat refreshing
  const tableData = useMemo(() => {
    // Saat refreshing, gunakan cached data
    if (isRefreshing && cachedData) {
      const sourceData = hookTableData?.length > 0 ? hookTableData : cachedData.data?.tableData;
      if (!sourceData) return [];
      
      return sourceData.map(item => ({
        ...item,
        ritases: item.ritases?.map(ritase => ({
          ...ritase,
          createdAt: ritase.created_at
        })) || []
      }));
    }

    // Initial load atau error
    if (isLoading && !cachedData) return [];
    if (error) return [];
    
    // Data tersedia
    if (hookTableData && hookTableData.length > 0) {
      return hookTableData.map(item => ({
        ...item,
        ritases: item.ritases?.map(ritase => ({
          ...ritase,
          createdAt: ritase.created_at
        })) || []
      }));
    }

    if (!dashboardData?.data?.tableData) return [];
    
    return dashboardData.data.tableData.map(item => ({
      ...item,
      ritases: item.ritases?.map(ritase => ({
        ...ritase,
        createdAt: ritase.created_at
      })) || []
    }));
  }, [hookTableData, dashboardData, isLoading, isRefreshing, cachedData, error]);

  // Extract unique values
  const uniqueExcavators = useMemo(() => {
    return [...new Set(tableData.map(r => r.unit_exca))]
      .filter(Boolean)
      .map(v => ({ value: v, label: v }));
  }, [tableData]);

  const uniqueLoadings = useMemo(() => {
    return [...new Set(tableData.map(r => r.loading_location))]
      .filter(Boolean)
      .map(v => ({ value: v, label: v }));
  }, [tableData]);

  const uniqueDumpings = useMemo(() => {
    return [...new Set(tableData.map(r => r.dumping_location))]
      .filter(Boolean)
      .map(v => ({ value: v, label: v }));
  }, [tableData]);

  // Filter data with search
  const filteredTableData = useMemo(() => {
    return tableData.filter(item => {
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const matchSearch = 
          item.unit_exca?.toLowerCase().includes(search) ||
          item.loading_location?.toLowerCase().includes(search) ||
          item.dumping_location?.toLowerCase().includes(search) ||
          item.company?.toLowerCase().includes(search);
        
        if (!matchSearch) return false;
      }

      const matchMitra = selectedMitra === 'All' || item.company === selectedMitra;
      const matchExca = selectedExcavators.length === 0 || selectedExcavators.includes(item.unit_exca);
      const matchLoading = selectedLocations.length === 0 || selectedLocations.includes(item.loading_location);
      const matchDumping = selectedDumpPoints.length === 0 || selectedDumpPoints.includes(item.dumping_location);
      
      return matchMitra && matchExca && matchLoading && matchDumping;
    });
  }, [tableData, searchQuery, selectedMitra, selectedExcavators, selectedLocations, selectedDumpPoints]);

  // Summary data dengan default 0
  const summaryData = useMemo(() => {
    const defaultSummary = {
      activeDumptrucks: 0,
      activeExcavators: 0,
      totalTonnage: '0.00',
      shift1Tonnage: '0.00',
      shift2Tonnage: '0.00',
      companyBreakdown: []
    };

    // Gunakan cached summary saat refreshing
    if (isRefreshing && cachedData?.data?.summaryData) {
      const cached = cachedData.data.summaryData;
      const companyBreakdown = {};
      tableData.forEach(item => {
        if (item.company) {
          if (!companyBreakdown[item.company]) {
            companyBreakdown[item.company] = new Set();
          }
          item.ritases?.forEach(r => {
            if (r.unit_dump_truck) {
              companyBreakdown[item.company].add(r.unit_dump_truck);
            }
          });
        }
      });

      return {
        activeDumptrucks: cached.activeDumptrucks || 0,
        activeExcavators: cached.activeExcavators || 0,
        totalTonnage: (cached.totalTonnage || 0).toFixed(2),
        shift1Tonnage: (cached.shift1Tonnage || 0).toFixed(2),
        shift2Tonnage: (cached.shift2Tonnage || 0).toFixed(2),
        companyBreakdown: Object.entries(companyBreakdown).map(([company, trucks]) => ({
          company,
          count: trucks.size
        }))
      };
    }

    if (!hookSummaryData || error) {
      return defaultSummary;
    }

    const companyBreakdown = {};
    tableData.forEach(item => {
      if (item.company) {
        if (!companyBreakdown[item.company]) {
          companyBreakdown[item.company] = new Set();
        }
        item.ritases?.forEach(r => {
          if (r.unit_dump_truck) {
            companyBreakdown[item.company].add(r.unit_dump_truck);
          }
        });
      }
    });

    return {
      activeDumptrucks: hookSummaryData.activeDumptrucks || 0,
      activeExcavators: hookSummaryData.activeExcavators || 0,
      totalTonnage: (hookSummaryData.totalTonnage || 0).toFixed(2),
      shift1Tonnage: (hookSummaryData.shift1Tonnage || 0).toFixed(2),
      shift2Tonnage: (hookSummaryData.shift2Tonnage || 0).toFixed(2),
      companyBreakdown: Object.entries(companyBreakdown).map(([company, trucks]) => ({
        company,
        count: trucks.size
      }))
    };
  }, [hookSummaryData, tableData, error, isRefreshing, cachedData]);

  // Sort table data
  const sortedTableData = useMemo(() => {
    if (!sortConfig.key) return filteredTableData;
    
    return [...filteredTableData].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (sortConfig.key === 'totalTonase') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTableData, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(sortedTableData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedTableData.slice(start, start + itemsPerPage);
  }, [sortedTableData, currentPage, itemsPerPage]);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedExcavators([]);
    setSelectedLocations([]);
    setSelectedDumpPoints([]);
    setSelectedMitra('All');
    setCurrentPage(1);
    
    const today = new Date().toISOString().split('T')[0];
    setDateRange({ from: today, to: today });
    setShift('All');
  }, []);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleDateRangeChange = useCallback((newDateRange) => {
    setDateRange(newDateRange);
    setCurrentPage(1);
  }, []);

  const handleShiftChange = useCallback((newShift) => {
    setShift(newShift);
    setCurrentPage(1);
  }, []);

  const hasActiveFilters = searchQuery || 
                           selectedExcavators.length > 0 || 
                           selectedLocations.length > 0 || 
                           selectedDumpPoints.length > 0;

  const openDetailModal = useCallback((rowData) => {
    setDetailModal({
      isOpen: true,
      data: rowData
    });
  }, []);

  const closeDetailModal = useCallback(() => {
    setDetailModal({
      isOpen: false,
      data: null
    });
  }, []);

  const openHourDetailModal = useCallback((rowData, hour) => {
    setHourDetailModal({
      isOpen: true,
      data: rowData,
      hour: hour
    });
  }, []);

  const closeHourDetailModal = useCallback(() => {
    setHourDetailModal({
      isOpen: false,
      data: null,
      hour: null
    });
  }, []);

  const handleExportPDF = useCallback((rowData) => {
    try {
      const success = exportToPDF(rowData);
      if (success) {
        showToast.success('PDF berhasil dibuat. Silakan cek tab baru.');
      } else {
        showToast.error('Gagal membuat PDF. Silakan coba lagi atau aktifkan popup pada browser Anda.');
      }
    } catch (error) {
      console.error('PDF Export Error:', error);
      showToast.error('Terjadi kesalahan saat membuat PDF');
    }
  }, []);

  const filterGroups = useMemo(() => [
    {
      id: 'excavator',
      label: 'Excavator',
      options: uniqueExcavators,
      value: selectedExcavators,
      onChange: (newValue) => {
        setSelectedExcavators(newValue);
        setCurrentPage(1);
      },
      placeholder: 'Pilih Excavator'
    },
    {
      id: 'loading',
      label: 'Loading Point',
      options: uniqueLoadings,
      value: selectedLocations,
      onChange: (newValue) => {
        setSelectedLocations(newValue);
        setCurrentPage(1);
      },
      placeholder: 'Pilih Loading Point'
    },
    {
      id: 'dumping',
      label: 'Dumping Point',
      options: uniqueDumpings,
      value: selectedDumpPoints,
      onChange: (newValue) => {
        setSelectedDumpPoints(newValue);
        setCurrentPage(1);
      },
      placeholder: 'Pilih Dumping Point'
    }
  ], [uniqueExcavators, uniqueLoadings, uniqueDumpings, selectedExcavators, selectedLocations, selectedDumpPoints]);

  return (
    <div className="space-y-6 p-4 md:p-6 min-h-screen">
      {/* ✅ Summary Cards - Loading indicator di header card, tidak menutupi konten */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow dark:text-gray-200 border-none dark:shadow-gray-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600 dark:text-gray-200">
              <Truck className="w-4 h-4" />
              Active Dump Truck
              {isRefreshing && (
                <RefreshCw className="w-3 h-3 animate-spin text-blue-600 ml-auto" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 mb-3">
              {summaryData.activeDumptrucks}
            </div>
            {summaryData.companyBreakdown.length > 0 ? (
              <div className="space-y-1">
                {summaryData.companyBreakdown.map(({ company, count }) => (
                  <div key={company} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">{company}:</span>
                    <span className="font-medium">{count} unit</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-400">
                Tidak ada data
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow dark:text-gray-200 border-none dark:shadow-gray-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600 dark:text-gray-200">
              <Hammer className="w-4 h-4" />
              Active Excavator
              {isRefreshing && (
                <RefreshCw className="w-3 h-3 animate-spin text-blue-600 ml-auto" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 mb-3">
              {summaryData.activeExcavators}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {summaryData.activeExcavators === 0 ? 'Tidak ada data' : 'Total unit beroperasi'}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow dark:text-gray-200 border-none dark:shadow-gray-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600 dark:text-gray-200">
              <Weight className="w-4 h-4" />
              Total Tonnage
              {isRefreshing && (
                <RefreshCw className="w-3 h-3 animate-spin text-blue-600 ml-auto" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600 mb-3">
              {summaryData.totalTonnage} <span className="text-lg">Ton</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Shift 1:</span>
                <span className="font-medium">{summaryData.shift1Tonnage} Ton</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Shift 2:</span>
                <span className="font-medium">{summaryData.shift2Tonnage} Ton</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ Table Component - Loading indicator di Card Title table */}
      <OverviewTable
        data={paginatedData}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        sortConfig={sortConfig}
        onSort={handleSort}
        onPageChange={handlePageChange}
        onViewDetail={openDetailModal}
        onViewHourDetail={openHourDetailModal}
        onExportPDF={handleExportPDF}
        isLoading={isRefreshing}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        shift={shift}
        onShiftChange={handleShiftChange}
        isFilterExpanded={isFilterExpanded}
        onToggleFilter={() => setIsFilterExpanded(!isFilterExpanded)}
        filterGroups={filterGroups}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={handleResetFilters}
        onRefresh={handleRefresh}
        searchQuery={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Cari excavator, loading, dumping, mitra..."
      />

      {/* Detail Modals */}
      <OverviewDetailModal
        isOpen={detailModal.isOpen}
        data={detailModal.data}
        onClose={closeDetailModal}
      />

      <HourDetailModal
        isOpen={hourDetailModal.isOpen}
        data={hourDetailModal.data}
        hour={hourDetailModal.hour}
        onClose={closeHourDetailModal}
      />
    </div>
  );
};

export default OverviewManagement;