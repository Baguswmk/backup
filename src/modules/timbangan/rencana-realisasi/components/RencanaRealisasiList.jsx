import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
import { Trash2, Edit, Eye, Package, ListTodo } from "lucide-react";
import { format } from "date-fns";
import TableToolbar from "@/shared/components/TableToolbar";
import Pagination from "@/shared/components/Pagination";

export default function RencanaRealisasiList({
  data,
  onEdit,
  onDelete,
  onDetail,
  isLoading,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data;
    
    const lowerQuery = searchQuery.toLowerCase();
    return data.filter((item) => {
      return (
        item.loading_location?.toLowerCase().includes(lowerQuery) ||
        item.dumping_location?.toLowerCase().includes(lowerQuery) ||
        item.pic_work_unit?.toLowerCase().includes(lowerQuery)
      );
    });
  }, [data, searchQuery]);

  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-none shadow-none">
         <CardContent className="pt-6">
          <div className="text-center py-12">
             <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
             <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Memuat data...</p>
          </div>
         </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-none shadow-none">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Belum ada data rencana & realisasi.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800 border-none shadow-none">
      <CardHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
            <ListTodo className="w-4 h-4" />
            Daftar Rencana
          </CardTitle>
          <Badge
            variant="secondary"
            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            {data.length} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 overflow-x-auto scrollbar-thin">
        <div className="mb-4">
          <TableToolbar
            activeDateRange={false}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            searchPlaceholder="Cari lokasi, PIC..."
            canSearch={!isLoading}
          />
        </div>
        <Table className="text-xs w-full">
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-900/50">
              <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-1.5">No</TableHead>
              <TableHead className="text-gray-700 dark:text-gray-300 font-semibold py-1.5">Waktu Dibuat</TableHead>
              <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">Lokasi Loading</TableHead>
              <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">Lokasi Dumping</TableHead>
              <TableHead className="text-right text-gray-700 dark:text-gray-300 font-semibold">Jumlah Fleet</TableHead>
              <TableHead className="text-right text-gray-700 dark:text-gray-300 font-semibold">Total Tonase</TableHead>
              <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">PIC</TableHead>
              <TableHead className="text-center text-gray-700 dark:text-gray-300 font-semibold w-[150px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item, index) => (
                <TableRow key={item.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 h-8">
                  <TableCell className="text-gray-700 dark:text-gray-300">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </TableCell>
                  <TableCell className="text-gray-700 dark:text-gray-300">
                  {item.createdAt 
                    ? format(new Date(item.createdAt), "dd MMM yyyy, HH:mm")
                    : "-"}
                </TableCell>
                <TableCell className="text-gray-700 dark:text-gray-300">{item.loading_location}</TableCell>
                <TableCell className="text-gray-700 dark:text-gray-300">{item.dumping_location}</TableCell>
                <TableCell className="text-right text-gray-700 dark:text-gray-300">{item.total_fleet}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant="secondary"
                    className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  >
                    {item.total_tonase?.toLocaleString("id-ID") || "0"} ton
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-700 dark:text-gray-300">{item.pic_work_unit}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDetail(item)}
                      title="Riwayat / Detail"
                      className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <Eye className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(item)}
                      title="Ubah Rencana"
                      className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <Edit className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(item.id)}
                      title="Hapus"
                      className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  Tidak ada data yang sesuai dengan pencarian.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {totalItems > 0 && (
          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(val) => {
                setItemsPerPage(val);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
