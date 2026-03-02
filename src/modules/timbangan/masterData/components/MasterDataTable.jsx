import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Edit, Trash2, Scale, Database, Lock } from "lucide-react";
import LoadingContent from "@/shared/components/LoadingContent";
import Pagination from "@/shared/components/Pagination";

const MasterDataTable = ({
  data,
  columns,
  onEdit,
  onDelete,
  onWeigh,
  isLoading,
  rowStart = 0,
  category,
  canEdit = false,
  canDelete = false,
  canWeigh = false,
  // Pagination props
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
}) => {
  if (isLoading) {
    return <LoadingContent />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-full mb-3">
          <Database className="w-7 h-7 text-gray-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          Tidak ada Data
        </h3>
        <p className="text-sm text-gray-500">
          Belum ada data untuk ditampilkan
        </p>
      </div>
    );
  }

  const showTareWeight = category === "units";

  const hasAnyAction = canEdit || canDelete || (showTareWeight && canWeigh);

  return (
    <>
      {/* Mobile List */}
      <MobileList
        data={data}
        rowStart={rowStart}
        columns={columns}
        showTareWeight={showTareWeight}
        onEdit={onEdit}
        onDelete={onDelete}
        onWeigh={onWeigh}
        canEdit={canEdit}
        canDelete={canDelete}
        canWeigh={canWeigh}
        hasAnyAction={hasAnyAction}
      />

      {/* Desktop Table */}
      <DesktopTable
        data={data}
        rowStart={rowStart}
        columns={columns}
        showTareWeight={showTareWeight}
        onEdit={onEdit}
        onDelete={onDelete}
        onWeigh={onWeigh}
        canEdit={canEdit}
        canDelete={canDelete}
        canWeigh={canWeigh}
        hasAnyAction={hasAnyAction}
      />

      {/* Pagination */}
      {totalPages > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          isLoading={isLoading}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={onItemsPerPageChange}
          totalItems={totalItems}
        />
      )}
    </>
  );
};

const MobileList = ({
  data,
  rowStart,
  columns,
  showTareWeight,
  onEdit,
  onDelete,
  onWeigh,
  canEdit,
  canDelete,
  canWeigh,
  hasAnyAction,
}) => (
  <div className="space-y-3 md:hidden">
    {data.map((row, idx) => (
      <div
        key={row.id ?? `row-${rowStart + idx}`}
        className="rounded-xl bg-neutral-50 dark:bg-gray-700 dark:text-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
      >
        {/* Header with Actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-200">No</p>
            <p className="text-base font-semibold">{rowStart + idx + 1}</p>
          </div>

          {/* ✅ Action Buttons - Conditional Rendering */}
          {hasAnyAction && (
            <div className="flex items-center gap-1">
              {/* Tare Weight Button */}
              {showTareWeight && canWeigh && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onWeigh(row)}
                  className="h-8 w-8 hover:bg-purple-50 hover:text-purple-600 cursor-pointer"
                  title="Timbang Berat Kosong"
                >
                  <Scale className="w-4 h-4" />
                </Button>
              )}

              {/* Edit Button */}
              {canEdit ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(row)}
                  className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled
                  className="h-8 w-8 opacity-40 cursor-not-allowed"
                  title="Tidak ada akses edit"
                >
                  <Lock className="w-4 h-4" />
                </Button>
              )}

              {/* Delete Button */}
              {canDelete ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(row)}
                  className="h-8 w-8 text-red-600 hover:bg-red-50 cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled
                  className="h-8 w-8 opacity-40 cursor-not-allowed"
                  title="Tidak ada akses delete"
                >
                  <Lock className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}

          {/* ✅ No Actions Available Badge */}
          {!hasAnyAction && (
            <Badge variant="secondary" className="text-xs">
              <Lock className="w-3 h-3 mr-1" />
              Read Only
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="mt-3 grid grid-cols-1 gap-3 ">
          {columns
            .filter((c) => c.key !== "__no__")
            .map((col) => (
              <div key={`${row.id}-${col.key}`} className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-200">
                  {col.label}
                </p>
                <div className="text-sm text-gray-900 dark:text-gray-400  ">
                  {col.render
                    ? col.render(row[col.key], row)
                    : row[col.key] || "-"}
                </div>
              </div>
            ))}
        </div>
      </div>
    ))}
  </div>
);

const DesktopTable = ({
  data,
  rowStart,
  columns,
  showTareWeight,
  onEdit,
  onDelete,
  onWeigh,
  canEdit,
  canDelete,
  canWeigh,
  hasAnyAction,
}) => (
  <div className="hidden md:block overflow-x-auto scrollbar-thin">
    <table className="min-w-full text-sm">
      <thead className="bg-gray-50 shadow-sm dark:bg-gray-900 ">
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-200"
            >
              {col.label}
            </th>
          ))}
          {/* ✅ Only show Actions column if user has any permission */}
          {hasAnyAction && (
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-200">
              Actions
            </th>
          )}
        </tr>
      </thead>
      <tbody className="bg-neutral-50 dark:bg-gray-800 ">
        {data.map((row, idx) => (
          <tr
            key={row.id ?? `row-${rowStart + idx}`}
            className="hover:bg-gray-50 transition-colors dark:hover:bg-gray-700 "
          >
            {columns.map((col) => (
              <td
                key={col.key}
                className="px-4 py-3 text-gray-900 dark:text-gray-300"
              >
                {col.key === "__no__"
                  ? rowStart + idx + 1
                  : col.render
                    ? col.render(row[col.key], row)
                    : row[col.key] || "-"}
              </td>
            ))}

            {/* ✅ Action Buttons - Conditional Rendering */}
            {hasAnyAction && (
              <td className="px-4 py-3 text-right space-x-1">
                {/* Tare Weight Button */}
                {showTareWeight && canWeigh && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onWeigh(row)}
                    className="h-8 w-8 p-0 hover:bg-purple-50 hover:text-purple-600 cursor-pointer"
                    title="Timbang Berat Kosong"
                  >
                    <Scale className="w-4 h-4" />
                  </Button>
                )}

                {/* Edit Button */}
                {canEdit ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(row)}
                    className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    className="h-8 w-8 p-0 opacity-40 cursor-not-allowed"
                    title="Tidak ada akses edit"
                  >
                    <Lock className="w-4 h-4" />
                  </Button>
                )}

                {/* Delete Button */}
                {canDelete ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(row)}
                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    className="h-8 w-8 p-0 opacity-40 cursor-not-allowed"
                    title="Tidak ada akses delete"
                  >
                    <Lock className="w-4 h-4" />
                  </Button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default MasterDataTable;
