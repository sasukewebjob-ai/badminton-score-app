// ============================================================
// エクスポートユーティリティ（PDF・画像出力）
// ============================================================

// キャプチャ時にoff-screen要素を一時的に可視位置へ移動（モバイル対応）
async function captureElement(elementId) {
  const { default: html2canvas } = await import('html2canvas');
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found');

  const parent = element.parentElement;
  const originalStyle = parent.style.cssText;
  parent.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none;z-index:-1;';

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    return canvas;
  } finally {
    parent.style.cssText = originalStyle;
  }
}

export async function exportAsImage(elementId, filename = 'scoresheet') {
  try {
    const canvas = await captureElement(elementId);
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    return true;
  } catch (err) {
    console.error('画像エクスポートエラー:', err);
    return false;
  }
}

export async function exportAsPDF(elementId, filename = 'scoresheet') {
  try {
    const { jsPDF } = await import('jspdf');
    const canvas = await captureElement(elementId);

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // A4横向き（297×210mm）にフィット
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
    pdf.save(`${filename}.pdf`);
    return true;
  } catch (err) {
    console.error('PDFエクスポートエラー:', err);
    return false;
  }
}
