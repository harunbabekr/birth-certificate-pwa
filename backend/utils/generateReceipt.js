import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export default function generateReceipt({ requestNumber, name, paymentMethod }) {
  return new Promise((resolve, reject) => {
    const receiptsDir = path.join(process.cwd(), "receipts");
    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }

    const filePath = path.join(receiptsDir, `receipt-${requestNumber}.pdf`);
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    doc.fontSize(20).text("إيصال دفع رسمي", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`رقم الطلب: ${requestNumber}`);
    doc.text(`اسم المولود / مقدم الطلب: ${name || "غير محدد"}`);
    doc.text(`طريقة الدفع: ${paymentMethod}`);
    doc.text(`تاريخ الإصدار: ${new Date().toLocaleDateString("ar-EG")}`);
    doc.moveDown();
    doc.fontSize(12).text("هذا المستند صادر إلكترونياً من السجل المدني.", { align: "center" });

    doc.end();

    stream.on("finish", () => resolve(filePath));
    stream.on("error", (err) => {
      console.error("PDF generation stream error:", err);
      reject(err);
    });
  });
}