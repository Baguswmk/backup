import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import SearchableSelect from "@/shared/components/SearchableSelect";
import { Truck, Search, CreditCard, AlertCircle } from "lucide-react";

const HullNoInput = ({
  value,
  options,
  error,
  dtIndex,
  rfidMode,
  rfidWaitingSubmit,
  autoSubmitting,
  isLoading,
  onChange,
}) => {
  const selectedDT = value && dtIndex[value.replace(/\s+/g, "").toUpperCase()];
  console.log("HullNoInput Rendered with selectedDT:", value);
  return (
    <Card className="shadow-none border-none dark:bg-gray-800 dark:text-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="w-4 h-4" />
          Input Data Ritase
          {rfidMode && (
            <Badge className="bg-purple-600 text-xs ml-2 animate-pulse">
              <CreditCard className="w-3 h-3 mr-1" />
              RFID Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label
            htmlFor="hull_no_select"
            className="flex items-center gap-2 mb-2"
          >
            <Search className="w-4 h-4" />
            Nomor Lambung / Nomor DT *
            <Badge variant="outline" className="text-xs font-mono">
              Alt+D
            </Badge>
            {rfidMode && (
              <Badge
                variant="outline"
                className="text-xs font-mono bg-purple-50 dark:text-black"
              >
                <CreditCard className="w-3 h-3 mr-1" />
                Tap RFID
              </Badge>
            )}
          </Label>

          <div id="hull-no-select-wrapper">
            <SearchableSelect
              id="hull_no_select"
              items={options}
              value={value}
              onChange={onChange}
              placeholder="Cari nomor lambung atau tap RFID..."
              emptyText="Nomor lambung tidak ditemukan"
              disabled={isLoading || rfidWaitingSubmit || autoSubmitting}
              error={!!error}
              allowClear={true}
            />
          </div>

          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}

          <p className="text-xs text-gray-500 mt-1">
            {rfidMode
              ? "🔷 Tap kartu RFID atau pilih manual dari dropdown"
              : "Pilih dari daftar atau ketik untuk mencari. Gunakan ↑↓ untuk navigasi, Enter untuk memilih."}
          </p>
        </div>

        {/* Alerts for invalid hull no */}
        {value && selectedDT?.isHidden && (
          <Alert variant="warning">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <p className="font-medium mb-1">
                ⚠️ Dump truck sudah ditimbang
              </p>
              <p className="text-sm">
                Nomor lambung <strong>{value}</strong> sudah disubmit dan tidak
                bisa digunakan kembali.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {value && !selectedDT && (
          <Alert variant="destructive ">
            <AlertCircle className="w-4 h-4 dark:text-gray-700" />
            <AlertDescription>
              <p className="font-medium mb-1 dark:text-gray-700">
                ❌ Nomor lambung tidak ditemukan
              </p>
              <p className="text-sm dark:text-gray-800">
                Pastikan nomor DT terdaftar di fleet aktif.
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default HullNoInput;