import React, { forwardRef } from "react";
import logoptba from "/logo_ptba.png";
import { formatDate, formatTime } from "@/shared/utils/date";
import { getFirstTruthyValue } from "@/shared/utils/object";
import { formatWeight } from "@/shared/utils/number";

const RitaseTicket = forwardRef(({ data }, ref) => {
  if (!data) {
    return (
      <div
        ref={ref}
        style={{
          width: "11cm",
          height: "16cm",
          padding: "20px",
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px dashed #ccc",
        }}
      >
        <div>
          <p style={{ fontSize: "16px", color: "#666" }}>
            ⚠️ Data tidak tersedia
          </p>
          <p style={{ fontSize: "12px", color: "#999", marginTop: "8px" }}>
            Tidak ada data untuk dicetak
          </p>
        </div>
      </div>
    );
  }

  const ticketData = {
    hullNo: getFirstTruthyValue(
      data,
      "hull_no",
      "dumptruck",
      "unit_dump_truck",
    ),
    excavator: getFirstTruthyValue(
      data,
      "fleet_excavator",
      "unit_exca",
      "excavator",
    ),
    operator: getFirstTruthyValue(data, "operator", "operator_name"),
    loadingLocation: getFirstTruthyValue(
      data,
      "fleet_loading",
      "loading_location",
    ),
    dumpingLocation: getFirstTruthyValue(
      data,
      "fleet_dumping",
      "dumping_location",
    ),
    netWeight: parseFloat(data.net_weight || data.tonnage || 0),
    tareWeight: parseFloat(data.tare_weight || 0),
    grossWeight: parseFloat(
      data.gross_weight ||
        parseFloat(data.net_weight || data.tonnage || 0) +
          parseFloat(data.tare_weight || 0),
    ),
  };

  return (
    <div
      ref={ref}
      style={{
        width: "11cm",
        height: "16cm",
        border: "2px solid black",
        padding: "0.8cm",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontSize: "12px",
        backgroundColor: "white",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #000",
          padding: "4px 16px 4px 16px",
        }}
      >
        <div style={{ width: "35%" }} className="ml-4">
          <img
            src={logoptba}
            alt="PTBA Logo"
            style={{ width: "3.3cm" }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>
        <div style={{ width: "65%", textAlign: "left" }}>
          <div>No. Dok. : BAMSF:PAB:8.5.1:02:17</div>
          <div>No. Rev. : 5</div>
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          textAlign: "center",
          fontWeight: "bold",
          fontSize: "18px",
          borderBottom: "1px solid #000",
          marginBottom: "0.5cm",
          padding: "8px 0",
        }}
      >
        KARCIS TIMBANGAN ISI / KOSONG
      </div>

      {/* Body */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "180px 10px 1fr",
          rowGap: "2px",
          lineHeight: "1.8",
          padding: "0 16px 0 16px",
        }}
      >
        <div>Tanggal</div>
        <div>:</div>
        <div>{formatDate(data.createdAt || data.date || data.tanggal)}</div>

        <div>No DT</div>
        <div>:</div>
        <div>
          <strong>{ticketData.hullNo}</strong>
        </div>

        <div>Nama Pengemudi</div>
        <div>:</div>
        <div>{ticketData.operator}</div>

        <div>Alat Loading</div>
        <div>:</div>
        <div>{ticketData.excavator}</div>

        <div>Lokasi Dumping</div>
        <div>:</div>
        <div>{ticketData.dumpingLocation}</div>

        <div>Lokasi Loading</div>
        <div>:</div>
        <div>{ticketData.loadingLocation}</div>

        <div style={{ marginTop: "0.5cm" }}>Jam</div>
        <div style={{ marginTop: "0.5cm" }}>:</div>
        <div style={{ marginTop: "0.5cm" }}>
          {formatTime(data.createdAt || data.timestamp)}
        </div>

        <div>Berat Kotor</div>
        <div>:</div>
        <div>
          <strong>{formatWeight(ticketData.grossWeight)} ton</strong>
        </div>

        <div>Berat Kosong</div>
        <div>:</div>
        <div>{formatWeight(ticketData.tareWeight)} ton</div>

        <div>Berat Bersih</div>
        <div>:</div>
        <div>
          <strong>{formatWeight(ticketData.netWeight)} ton</strong>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "16px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div style={{ marginTop: "1.5rem" }}>
          <br />
          KONSUMEN
        </div>
        <div style={{ textAlign: "center" }}>
          TIMBANGAN CDP <br /> <br />
          PTBA
        </div>
      </div>
    </div>
  );
});

RitaseTicket.displayName = "RitaseTicket";
export default RitaseTicket;
