import { jsPDF } from 'jspdf';
import { formatCurrency, formatCPF, numberToWords } from './formatters';
import { formatDateDisplay, formatDateFullPtBr } from './dateUtils';
import { getPDFColors, getBankConfigByName } from './bankConfig';
import type { Receipt, Proposal, Client, Vehicle } from '@/types';
import { clientStorage, vehicleStorage, userStorage } from './storage';

/**
 * Professional PDF Generator for Receipts and Proposals
 * with dynamic bank/company branding
 */

const COMPANY_NAME = 'AUTOS DA SERRA';
const COMPANY_TAGLINE = 'Multimarcas';
const COMPANY_LOCATION = 'Lages - SC';
const COMPANY_CNPJ = '00.000.000/0001-00'; // Placeholder
const COMPANY_ADDRESS = 'Av. Principal, 1000 - Centro - Lages/SC';
const COMPANY_PHONE = '(49) 9999-9999';

interface PDFOptions {
  bankName?: string;
}

/**
 * Draw professional header with company/bank branding
 */
function drawHeader(doc: jsPDF, options: PDFOptions = {}): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const colors = getPDFColors(options.bankName);
  const bankConfig = options.bankName ? getBankConfigByName(options.bankName) : undefined;
  
  // Header background
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Yellow accent bar for Autos da Serra
  if (colors.isOwn) {
    doc.setFillColor(...colors.secondary);
    doc.rect(0, 45, pageWidth, 4, 'F');
  }
  
  // Company name
  doc.setTextColor(...colors.text);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_NAME, 20, 22);
  
  // Tagline
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_TAGLINE, 20, 30);
  
  // Contact info on the right
  doc.setFontSize(9);
  doc.text(COMPANY_LOCATION, pageWidth - 20, 18, { align: 'right' });
  doc.text(COMPANY_PHONE, pageWidth - 20, 25, { align: 'right' });
  
  // Bank badge if applicable
  if (bankConfig && !bankConfig.isOwn) {
    doc.setFontSize(8);
    doc.text(`Financiamento: ${bankConfig.name}`, pageWidth - 20, 35, { align: 'right' });
  }
  
  return colors.isOwn ? 60 : 55;
}

/**
 * Draw professional footer
 */
function drawFooter(doc: jsPDF, documentType: string): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Footer line
  doc.setDrawColor(200, 200, 200);
  doc.line(20, pageHeight - 25, pageWidth - 20, pageHeight - 25);
  
  // Footer text
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `${COMPANY_NAME} | CNPJ: ${COMPANY_CNPJ} | ${COMPANY_ADDRESS}`,
    pageWidth / 2,
    pageHeight - 18,
    { align: 'center' }
  );
  doc.text(
    `Documento gerado eletronicamente - ${documentType}`,
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' }
  );
}

/**
 * Draw a styled section box
 */
function drawSectionBox(
  doc: jsPDF,
  y: number,
  title: string,
  colors: ReturnType<typeof getPDFColors>
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title bar
  doc.setFillColor(...colors.primary);
  doc.rect(15, y, pageWidth - 30, 8, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(title, 20, y + 5.5);
  
  return y + 12;
}

/**
 * Draw info row
 */
function drawInfoRow(doc: jsPDF, label: string, value: string, x: number, y: number): void {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(label, x, y);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(value, x + 50, y);
}

/**
 * Generate professional Receipt PDF
 */
export function generateReceiptPDF(receipt: Receipt): void {
  const client = clientStorage.getById(receipt.clientId);
  const vehicle = receipt.vehicleId ? vehicleStorage.getById(receipt.vehicleId) : null;
  const vendor = userStorage.getById(receipt.vendorId);
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const colors = getPDFColors(); // Always use company colors for receipts
  
  // Header
  let y = drawHeader(doc);
  
  // Document title
  doc.setFillColor(...colors.secondary);
  doc.rect(15, y, pageWidth - 30, 12, 'F');
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('RECIBO DE PAGAMENTO', pageWidth / 2, y + 8.5, { align: 'center' });
  y += 20;
  
  // Receipt number and date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Nº ${receipt.number}`, 20, y);
  doc.text(`Data: ${formatDateDisplay(receipt.paymentDate)}`, pageWidth - 20, y, { align: 'right' });
  y += 15;
  
  // Amount box with prominent styling
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(1);
  doc.rect(15, y, pageWidth - 30, 28, 'FD');
  
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.text('Valor recebido:', 25, y + 10);
  
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(formatCurrency(receipt.amount), 25, y + 22);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  const amountWords = `(${numberToWords(receipt.amount)})`;
  const wordsLines = doc.splitTextToSize(amountWords, pageWidth - 100);
  doc.text(wordsLines, 100, y + 14);
  
  y += 38;
  
  // Payment reference badge
  const paymentRefLabels: Record<string, string> = {
    entrada: 'ENTRADA',
    sinal: 'SINAL',
    parcial: 'PAGAMENTO PARCIAL',
    quitacao: 'QUITAÇÃO',
  };
  const paymentMethodLabels: Record<string, string> = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    transferencia: 'Transferência Bancária',
    cartao: 'Cartão',
  };
  
  doc.setFillColor(...colors.primary);
  const refText = paymentRefLabels[receipt.reference] || receipt.reference.toUpperCase();
  const refWidth = doc.getTextWidth(refText) + 16;
  doc.roundedRect(15, y, refWidth, 8, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(refText, 23, y + 5.5);
  y += 15;
  
  // Receipt body text
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  
  const bodyText = `Recebi(emos) de ${receipt.payerName}, portador(a) do CPF ${formatCPF(receipt.payerCpf)}, a importância de ${formatCurrency(receipt.amount)} (${numberToWords(receipt.amount)}), referente a ${paymentRefLabels[receipt.reference]?.toLowerCase() || receipt.reference}${vehicle ? ` do veículo ${vehicle.brand} ${vehicle.model} ano ${vehicle.year}` : ''}.`;
  
  const bodyLines = doc.splitTextToSize(bodyText, pageWidth - 40);
  doc.text(bodyLines, 20, y);
  y += bodyLines.length * 6 + 15;
  
  // Payment details box
  y = drawSectionBox(doc, y, 'DETALHES DO PAGAMENTO', colors);
  
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 25, 'F');
  
  drawInfoRow(doc, 'Forma de Pagamento:', paymentMethodLabels[receipt.paymentMethod] || receipt.paymentMethod, 20, y + 8);
  drawInfoRow(doc, 'Data do Pagamento:', formatDateDisplay(receipt.paymentDate), 20, y + 16);
  drawInfoRow(doc, 'Local:', receipt.location, 120, y + 8);
  
  y += 35;
  
  // Description if exists
  if (receipt.description) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Observações:', 20, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(receipt.description, pageWidth - 40);
    doc.text(descLines, 20, y);
    y += descLines.length * 5 + 10;
  }
  
  // Signatures section
  y = Math.max(y + 10, 200);
  
  // Signature boxes
  const sigBoxWidth = 75;
  const sigBoxHeight = 40;
  const leftSigX = 25;
  const rightSigX = pageWidth - 25 - sigBoxWidth;
  
  // Client signature
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.rect(leftSigX, y, sigBoxWidth, sigBoxHeight, 'S');
  
  if (receipt.clientSignature) {
    try {
      doc.addImage(receipt.clientSignature, 'PNG', leftSigX + 5, y + 2, sigBoxWidth - 10, sigBoxHeight - 10);
    } catch (e) {
      console.error('Error adding client signature:', e);
    }
  }
  
  doc.line(leftSigX, y + sigBoxHeight + 3, leftSigX + sigBoxWidth, y + sigBoxHeight + 3);
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('Assinatura do Pagador', leftSigX + sigBoxWidth / 2, y + sigBoxHeight + 10, { align: 'center' });
  doc.setFontSize(8);
  doc.text(receipt.payerName, leftSigX + sigBoxWidth / 2, y + sigBoxHeight + 16, { align: 'center' });
  
  // Vendor signature
  doc.rect(rightSigX, y, sigBoxWidth, sigBoxHeight, 'S');
  
  if (receipt.vendorSignature) {
    try {
      doc.addImage(receipt.vendorSignature, 'PNG', rightSigX + 5, y + 2, sigBoxWidth - 10, sigBoxHeight - 10);
    } catch (e) {
      console.error('Error adding vendor signature:', e);
    }
  }
  
  doc.line(rightSigX, y + sigBoxHeight + 3, rightSigX + sigBoxWidth, y + sigBoxHeight + 3);
  doc.text('Assinatura do Recebedor', rightSigX + sigBoxWidth / 2, y + sigBoxHeight + 10, { align: 'center' });
  if (vendor) {
    doc.text(vendor.name, rightSigX + sigBoxWidth / 2, y + sigBoxHeight + 16, { align: 'center' });
  }
  
  // Legal text
  const legalY = y + sigBoxHeight + 25;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(
    'Para maior clareza, firmo(amos) o presente recibo para que produza os seus devidos efeitos legais.',
    pageWidth / 2,
    legalY,
    { align: 'center' }
  );
  doc.text(
    `${receipt.location}, ${formatDateFullPtBr(receipt.paymentDate)}`,
    pageWidth / 2,
    legalY + 6,
    { align: 'center' }
  );
  
  // Footer
  drawFooter(doc, 'Recibo de Pagamento');
  
  doc.save(`recibo-${receipt.number}.pdf`);
}

/**
 * Generate professional Proposal PDF
 */
export function generateProposalPDF(proposal: Proposal): void {
  const client = clientStorage.getById(proposal.clientId);
  const vehicle = vehicleStorage.getById(proposal.vehicleId);
  const vendor = userStorage.getById(proposal.vendorId);
  
  if (!client || !vehicle) return;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const colors = getPDFColors(proposal.bank);
  const bankConfig = proposal.bank ? getBankConfigByName(proposal.bank) : undefined;
  
  // Header with bank branding if applicable
  let y = drawHeader(doc, { bankName: proposal.bank });
  
  // Document title
  doc.setFillColor(...colors.secondary);
  doc.rect(15, y, pageWidth - 30, 12, 'F');
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.isOwn ? 30 : 255, colors.isOwn ? 30 : 255, colors.isOwn ? 30 : 255);
  doc.text('PROPOSTA DE VENDA', pageWidth / 2, y + 8.5, { align: 'center' });
  y += 20;
  
  // Proposal number and date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Proposta Nº ${proposal.number}`, 20, y);
  doc.text(`Data: ${formatDateDisplay(proposal.createdAt)}`, pageWidth - 20, y, { align: 'right' });
  y += 15;
  
  // Client section
  y = drawSectionBox(doc, y, 'DADOS DO CLIENTE', colors);
  
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 20, 'F');
  
  drawInfoRow(doc, 'Nome:', client.name, 20, y + 8);
  drawInfoRow(doc, 'CPF:', formatCPF(client.cpf), 20, y + 16);
  if (client.phone) {
    drawInfoRow(doc, 'Telefone:', client.phone, 120, y + 8);
  }
  
  y += 28;
  
  // Vehicle section
  y = drawSectionBox(doc, y, 'DADOS DO VEÍCULO', colors);
  
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 30, 'F');
  
  drawInfoRow(doc, 'Veículo:', `${vehicle.brand} ${vehicle.model}`, 20, y + 8);
  drawInfoRow(doc, 'Ano:', String(vehicle.year), 20, y + 16);
  drawInfoRow(doc, 'Cor:', vehicle.color, 20, y + 24);
  drawInfoRow(doc, 'Combustível:', vehicle.fuel, 120, y + 8);
  drawInfoRow(doc, 'Câmbio:', vehicle.transmission, 120, y + 16);
  if (vehicle.plate) {
    drawInfoRow(doc, 'Placa:', vehicle.plate, 120, y + 24);
  }
  
  y += 38;
  
  // Financial section
  y = drawSectionBox(doc, y, 'CONDIÇÕES DE PAGAMENTO', colors);
  
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 45, 'F');
  
  // Left column
  drawInfoRow(doc, 'Valor do Veículo:', formatCurrency(proposal.vehiclePrice), 20, y + 10);
  drawInfoRow(doc, 'Entrada:', formatCurrency(proposal.downPayment), 20, y + 20);
  drawInfoRow(doc, 'Valor Financiado:', formatCurrency(proposal.financedAmount), 20, y + 30);
  
  // Right column
  drawInfoRow(doc, 'Parcelas:', `${proposal.installments}x de ${formatCurrency(proposal.installmentValue)}`, 105, y + 10);
  if (proposal.bank) {
    drawInfoRow(doc, 'Financiamento:', proposal.bank, 105, y + 20);
  }
  
  // Total highlight
  doc.setFillColor(...colors.primary);
  doc.rect(105, y + 28, 80, 12, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`Total: ${formatCurrency(proposal.totalValue)}`, 145, y + 36, { align: 'center' });
  
  y += 55;
  
  // Notes if exists
  if (proposal.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Observações:', 20, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(proposal.notes, pageWidth - 40);
    doc.text(notesLines, 20, y);
    y += notesLines.length * 5 + 10;
  }
  
  // Signatures section
  y = Math.max(y + 10, 200);
  
  const sigBoxWidth = 75;
  const sigBoxHeight = 40;
  const leftSigX = 25;
  const rightSigX = pageWidth - 25 - sigBoxWidth;
  
  // Client signature
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.rect(leftSigX, y, sigBoxWidth, sigBoxHeight, 'S');
  
  if (proposal.clientSignature) {
    try {
      doc.addImage(proposal.clientSignature, 'PNG', leftSigX + 5, y + 2, sigBoxWidth - 10, sigBoxHeight - 10);
    } catch (e) {
      console.error('Error adding client signature:', e);
    }
  }
  
  doc.line(leftSigX, y + sigBoxHeight + 3, leftSigX + sigBoxWidth, y + sigBoxHeight + 3);
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('Assinatura do Cliente', leftSigX + sigBoxWidth / 2, y + sigBoxHeight + 10, { align: 'center' });
  doc.setFontSize(8);
  doc.text(client.name, leftSigX + sigBoxWidth / 2, y + sigBoxHeight + 16, { align: 'center' });
  
  // Vendor signature
  doc.rect(rightSigX, y, sigBoxWidth, sigBoxHeight, 'S');
  
  if (proposal.vendorSignature) {
    try {
      doc.addImage(proposal.vendorSignature, 'PNG', rightSigX + 5, y + 2, sigBoxWidth - 10, sigBoxHeight - 10);
    } catch (e) {
      console.error('Error adding vendor signature:', e);
    }
  }
  
  doc.line(rightSigX, y + sigBoxHeight + 3, rightSigX + sigBoxWidth, y + sigBoxHeight + 3);
  doc.text('Assinatura do Vendedor', rightSigX + sigBoxWidth / 2, y + sigBoxHeight + 10, { align: 'center' });
  if (vendor) {
    doc.text(vendor.name, rightSigX + sigBoxWidth / 2, y + sigBoxHeight + 16, { align: 'center' });
  }
  
  // Legal text
  const legalY = y + sigBoxHeight + 25;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(
    'Esta proposta tem validade de 5 dias úteis e está sujeita a aprovação de crédito.',
    pageWidth / 2,
    legalY,
    { align: 'center' }
  );
  doc.text(
    `${COMPANY_LOCATION}, ${formatDateFullPtBr(proposal.createdAt)}`,
    pageWidth / 2,
    legalY + 6,
    { align: 'center' }
  );
  
  // Footer
  drawFooter(doc, 'Proposta de Venda');
  
  doc.save(`proposta-${proposal.number}.pdf`);
}
