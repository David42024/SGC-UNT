const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const COLOR_PRIMARIO = rgb(0.02, 0.35, 0.65);
const COLOR_GRIS = rgb(0.5, 0.5, 0.5);
const COLOR_NEGRO = rgb(0, 0, 0);
const COLOR_BLANCO = rgb(1, 1, 1);
const COLOR_FONDO = rgb(0.95, 0.97, 1.0);

const estadoColor = (estado) => {
  const colores = {
    vigente: rgb(0.13, 0.55, 0.13),
    aprobado: rgb(0.13, 0.45, 0.13),
    revision: rgb(0.85, 0.55, 0.05),
    borrador: rgb(0.5, 0.5, 0.5),
    obsoleto: rgb(0.7, 0.1, 0.1)
  };
  return colores[estado] || COLOR_GRIS;
};

const generarPDFDocumento = async (documento) => {
  const pdfDoc = await PDFDocument.create();
  const pagina = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = pagina.getSize();
  const fuenteNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fuenteNegrilla = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // ── Encabezado ────────────────────────────────────────────
  pagina.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: COLOR_PRIMARIO });
  pagina.drawText('UNIVERSIDAD NACIONAL DE TRUJILLO', {
    x: 20, y: height - 35, size: 14, font: fuenteNegrilla, color: COLOR_BLANCO
  });
  pagina.drawText('Sistema de Gestión de la Calidad — SGC-UNT', {
    x: 20, y: height - 55, size: 10, font: fuenteNormal, color: rgb(0.8, 0.9, 1.0)
  });
  pagina.drawText('FICHA DE DOCUMENTO', {
    x: width - 170, y: height - 45, size: 11, font: fuenteNegrilla, color: COLOR_BLANCO
  });

  // ── Info del documento ────────────────────────────────────
  let y = height - 110;
  const dibujarFila = (etiqueta, valor, yPos) => {
    pagina.drawText(etiqueta + ':', { x: 20, y: yPos, size: 9, font: fuenteNegrilla, color: COLOR_PRIMARIO });
    pagina.drawText(valor || '—', { x: 160, y: yPos, size: 9, font: fuenteNormal, color: COLOR_NEGRO });
  };

  // Código y estado en la misma línea
  pagina.drawText('CÓDIGO:', { x: 20, y, size: 9, font: fuenteNegrilla, color: COLOR_PRIMARIO });
  pagina.drawText(documento.codigo || '—', { x: 160, y, size: 9, font: fuenteNormal, color: COLOR_NEGRO });

  const estadoLabel = (documento.estado || '').toUpperCase();
  const anchoEstado = 80;
  pagina.drawRectangle({ x: width - anchoEstado - 20, y: y - 4, width: anchoEstado, height: 16, color: estadoColor(documento.estado) });
  pagina.drawText(estadoLabel, {
    x: width - anchoEstado - 20 + 8, y: y, size: 8, font: fuenteNegrilla, color: COLOR_BLANCO
  });

  y -= 20; dibujarFila('TÍTULO', documento.titulo, y);
  y -= 20; dibujarFila('CATEGORÍA', documento.categoria_nombre, y);
  y -= 20; dibujarFila('VERSIÓN', documento.version_actual, y);
  y -= 20; dibujarFila('RESPONSABLE', documento.responsable_nombre, y);
  y -= 20; dibujarFila('REVISOR', documento.revisor_nombre, y);
  y -= 20; dibujarFila('FECHA EMISIÓN', documento.fecha_emision ? new Date(documento.fecha_emision).toLocaleDateString('es-PE') : '—', y);
  y -= 20; dibujarFila('FECHA VENCIMIENTO', documento.fecha_vencimiento ? new Date(documento.fecha_vencimiento).toLocaleDateString('es-PE') : '—', y);

  // ── Descripción ───────────────────────────────────────────
  y -= 35;
  pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 20, color: COLOR_PRIMARIO });
  pagina.drawText('DESCRIPCIÓN', { x: 28, y: y + 2, size: 10, font: fuenteNegrilla, color: COLOR_BLANCO });

  y -= 25;
  pagina.drawRectangle({ x: 20, y: y - 80, width: width - 40, height: 90, color: COLOR_FONDO });
  const descripcion = documento.descripcion || 'Sin descripción registrada.';
  const palabras = descripcion.split(' ');
  let linea = '';
  let yTexto = y - 10;
  for (const palabra of palabras) {
    const prueba = linea ? linea + ' ' + palabra : palabra;
    if (fuenteNormal.widthOfTextAtSize(prueba, 9) > width - 60) {
      pagina.drawText(linea, { x: 28, y: yTexto, size: 9, font: fuenteNormal, color: COLOR_NEGRO });
      linea = palabra;
      yTexto -= 13;
    } else {
      linea = prueba;
    }
  }
  if (linea) pagina.drawText(linea, { x: 28, y: yTexto, size: 9, font: fuenteNormal, color: COLOR_NEGRO });

  // ── Pie de página ─────────────────────────────────────────
  pagina.drawLine({ start: { x: 20, y: 50 }, end: { x: width - 20, y: 50 }, thickness: 1, color: COLOR_PRIMARIO });
  pagina.drawText(`Generado el: ${new Date().toLocaleString('es-PE')}`, {
    x: 20, y: 35, size: 8, font: fuenteNormal, color: COLOR_GRIS
  });
  pagina.drawText('SGC-UNT — Documento Oficial', {
    x: width - 180, y: 35, size: 8, font: fuenteNormal, color: COLOR_GRIS
  });

  return await pdfDoc.save();
};

module.exports = { generarPDFDocumento };
