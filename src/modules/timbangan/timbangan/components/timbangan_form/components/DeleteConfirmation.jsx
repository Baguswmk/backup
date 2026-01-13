import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const DeleteConfirmation = ({ editingItem, onConfirm, onCancel, isSubmitting }) => {
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          Konfirmasi Hapus
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {editingItem && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Waktu:</span>
              <span className="font-medium">
                {format(
                  new Date(editingItem.createdAt),
                  "dd MMM yyyy HH:mm:ss",
                  {
                    locale: localeId,
                  }
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">No Lambung:</span>
              <span className="font-medium">{editingItem.hull_no}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Net Weight:</span>
              <span className="font-medium">
                {editingItem.net_weight || "-"} ton
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting && (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            )}
            Hapus Data
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Batal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeleteConfirmation;