import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Keyboard, X, Info } from "lucide-react";

const ShortcutHelp = ({ onClose }) => {
  const shortcuts = [
    { label: "Fokus ke Nomor DT", keys: "Alt + D" },
    { label: "Insert Weight", keys: "Alt + I" },
    { label: "Simpan Form", keys: "Alt + S" },
    { label: "Reset Form", keys: "Alt + R" },
    { label: "Bantuan Shortcuts", keys: "Alt + H" },
    { label: "Batal/Tutup", keys: "Esc" },
  ];

  const dropdownNavigation = [
    { label: "Navigasi Atas/Bawah", keys: "↑ ↓" },
    { label: "Pilih Item", keys: "Enter" },
    { label: "Ketik untuk Cari", keys: "A-Z" },
  ];

  return (
    <Card className="border-purple-200 bg-purple-50 mt-2 py-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base text-purple-800">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="cursor-pointer hover:bg-gray-200"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-white rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <span className="text-gray-700">{shortcut.label}</span>
                <Badge variant="outline" className="font-mono">
                  {shortcut.keys}
                </Badge>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-purple-200">
            <p className="text-sm font-semibold text-purple-800 mb-2">
              📋 Navigasi Dropdown:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {dropdownNavigation.map((nav, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-purple-50 rounded"
                >
                  <span className="text-gray-700">{nav.label}</span>
                  <Badge variant="outline" className="font-mono">
                    {nav.keys}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-purple-200">
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <Info className="w-3 h-3" />
              <strong>Tips:</strong> Setelah <strong>Alt + D</strong>, gunakan{" "}
              <strong>↑↓</strong> untuk navigasi dan <strong>Enter</strong>{" "}
              untuk memilih
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShortcutHelp;