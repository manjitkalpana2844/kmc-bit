import jsPDF from "jspdf";
import { SEMESTER_ORDINAL } from "./curriculum";

export interface ReceiptData {
  requestId: string;
  userName: string;
  userEmail: string;
  plan: "semester_pass" | "monthly_all_access";
  semester: number | null;
  amount: number;
  transactionId: string | null;
  approvedAt: string; // ISO
  expiresAt?: string | null;
}

export function downloadReceiptPdf(r: ReceiptData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;

  // Header band
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, W, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Payment Receipt", M, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("BCA Past Papers", M, 70);

  // Status pill
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(W - M - 90, 30, 90, 28, 14, 14, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("APPROVED", W - M - 75, 48);

  // Body
  doc.setTextColor(20, 20, 20);
  let y = 130;
  const planLabel =
    r.plan === "monthly_all_access"
      ? "Monthly All-Access Pass"
      : `${SEMESTER_ORDINAL(r.semester ?? 1)} Semester Pass`;

  const rows: [string, string][] = [
    ["Receipt ID", r.requestId.slice(0, 8).toUpperCase()],
    ["Issued to", r.userName],
    ["Email", r.userEmail],
    ["Plan", planLabel],
    ["Amount paid", `Rs ${r.amount}`],
    ["Transaction ID", r.transactionId || "—"],
    ["Approved on", new Date(r.approvedAt).toLocaleString()],
    ["Valid until", r.expiresAt ? new Date(r.expiresAt).toLocaleString() : "No expiry"],
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Details", M, y);
  y += 16;
  doc.setDrawColor(229, 231, 235);
  doc.line(M, y, W - M, y);
  y += 14;

  doc.setFontSize(11);
  rows.forEach(([k, v]) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(k, M, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(String(v), M + 160, y);
    y += 22;
  });

  // Footer note
  y += 20;
  doc.setDrawColor(229, 231, 235);
  doc.line(M, y, W - M, y);
  y += 22;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(
    "Thank you for your payment. Keep this receipt as proof of access.",
    M,
    y,
  );
  y += 14;
  doc.text(
    "For queries, contact the admin via the app.",
    M,
    y,
  );

  doc.save(`receipt-${r.requestId.slice(0, 8)}.pdf`);
}