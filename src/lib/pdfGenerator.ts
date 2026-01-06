import { jsPDF } from 'jspdf';
import { formatCurrency, formatCPF, numberToWords } from './formatters';
import { formatDateDisplay, formatDateFullPtBr } from './dateUtils';
import { getPDFColors, getBankConfigByName } from './bankConfig';
import { getCompanyConfig, formatCompanyAddress, formatCompanyShortAddress } from './companyConfig';
import type { Receipt, Proposal } from '@/types';
import { clientStorage, vehicleStorage, userStorage } from './storage';

/**
 * Professional PDF Generator for Receipts and Proposals
 * with dynamic bank/company branding
 */

const COMPANY_CONFIG = getCompanyConfig();

interface PDFOptions {
  bankName?: string;
  privacyMode?: boolean;
}

// Payment reference labels
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

/**
 * Draw professional header with company/bank branding
 */
function drawHeader(doc: jsPDF, options: PDFOptions = {}): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const colors = getPDFColors(options.bankName);
  const bankConfig = options.bankName ? getBankConfigByName(options.bankName) : undefined;
  const company = getCompanyConfig();
  
  // Header background
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 42, 'F');
  
  // Yellow accent bar for Autos da Serra
  if (colors.isOwn) {
    doc.setFillColor(...colors.secondary);
    doc.rect(0, 42, pageWidth, 4, 'F');
  }
  
  // Company name
  doc.setTextColor(...colors.text);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(company.fantasyName, 20, 20);
  
  // Tagline
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Multimarcas', 20, 28);
  
  // CNPJ
  doc.setFontSize(8);
  doc.text(`CNPJ: ${company.cnpj}`, 20, 36);
  
  // Contact info on the right
  doc.setFontSize(9);
  doc.text(formatCompanyShortAddress(), pageWidth - 20, 18, { align: 'right' });
  if (company.phone) {
    doc.text(company.phone, pageWidth - 20, 25, { align: 'right' });
  }
  
  // Bank badge if applicable
  if (bankConfig && !bankConfig.isOwn) {
    doc.setFontSize(8);
    doc.setFillColor(255, 255, 255);
    const badgeWidth = 70;
    doc.roundedRect(pageWidth - 20 - badgeWidth, 30, badgeWidth, 8, 2, 2, 'F');
    doc.setTextColor(...colors.primary);
    doc.text(`Financiamento: ${bankConfig.name}`, pageWidth - 20 - badgeWidth / 2, 35.5, { align: 'center' });
  }
  
  return colors.isOwn ? 56 : 52;
}

/**
 * Draw professional footer
 */
function drawFooter(doc: jsPDF, documentType: string): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const company = getCompanyConfig();
  
  // Footer line
  doc.setDrawColor(200, 200, 200);
  doc.line(20, pageHeight - 28, pageWidth - 20, pageHeight - 28);
  
  // Footer text
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `${company.fantasyName} | CNPJ: ${company.cnpj}`,
    pageWidth / 2,
    pageHeight - 21,
    { align: 'center' }
  );
  doc.text(
    formatCompanyAddress(),
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  );
  doc.text(
    `Documento gerado eletronicamente - ${documentType}`,
    pageWidth / 2,
    pageHeight - 9,
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
export function generateReceiptPDF(receipt: Receipt, options: PDFOptions = {}): void {
  const client = clientStorage.getById(receipt.clientId);
  const vehicle = receipt.vehicleId ? vehicleStorage.getById(receipt.vehicleId) : null;
  const vendor = userStorage.getById(receipt.vendorId);
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const colors = getPDFColors(); // Always use company colors for receipts
  
  // Privacy mode handling
  const privacyMode = options.privacyMode || false;
  const displayAmount = privacyMode ? 'R$ *****,**' : formatCurrency(receipt.amount);
  const displayCPF = privacyMode ? '***.***.***-**' : formatCPF(receipt.payerCpf);
  const displayName = privacyMode ? receipt.payerName.split(' ')[0] + ' ***' : receipt.payerName;
  const amountInWords = privacyMode ? '(valor oculto)' : numberToWords(receipt.amount);
  
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
  doc.text(`Nº ${privacyMode ? '****' : receipt.number}`, 20, y);
  doc.text(`Data: ${formatDateDisplay(receipt.paymentDate)}`, pageWidth - 20, y, { align: 'right' });
  y += 12;
  
  // Payment reference badge
  const refText = paymentRefLabels[receipt.reference] || receipt.reference.toUpperCase();
  const refWidth = Math.max(doc.getTextWidth(refText) + 16, 50);
  doc.setFillColor(...colors.primary);
  doc.roundedRect(15, y, refWidth, 8, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(refText, 15 + refWidth / 2, y + 5.5, { align: 'center' });
  y += 18;
  
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
  doc.text(displayAmount, 25, y + 22);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  const wordsText = `(${amountInWords})`;
  const wordsLines = doc.splitTextToSize(wordsText, pageWidth - 100);
  doc.text(wordsLines, 100, y + 14);
  
  y += 38;
  
  // Receipt body text
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  
  const bodyText = `Recebi(emos) de ${displayName}, portador(a) do CPF ${displayCPF}, a importância de ${displayAmount} (${amountInWords}), referente a ${paymentRefLabels[receipt.reference]?.toLowerCase() || receipt.reference}${vehicle ? ` do veículo ${vehicle.brand} ${vehicle.model} ano ${vehicle.year}` : ''}.`;
  
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
  if (vendor) {
    drawInfoRow(doc, 'Atendido por:', vendor.name, 120, y + 16);
  }
  
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
  
  // Signature boxes - clean style without gray background
  const sigBoxWidth = 75;
  const sigBoxHeight = 35;
  const leftSigX = 25;
  const rightSigX = pageWidth - 25 - sigBoxWidth;
  
  // Client signature
  if (receipt.clientSignature && !privacyMode) {
    try {
      doc.addImage(receipt.clientSignature, 'PNG', leftSigX + 5, y + 2, sigBoxWidth - 10, sigBoxHeight - 8);
    } catch (e) {
      console.error('Error adding client signature:', e);
    }
  }
  
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.5);
  doc.line(leftSigX, y + sigBoxHeight, leftSigX + sigBoxWidth, y + sigBoxHeight);
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('Assinatura do Pagador', leftSigX + sigBoxWidth / 2, y + sigBoxHeight + 8, { align: 'center' });
  doc.setFontSize(8);
  doc.text(displayName, leftSigX + sigBoxWidth / 2, y + sigBoxHeight + 14, { align: 'center' });
  
  // Vendor signature
  if (receipt.vendorSignature && !privacyMode) {
    try {
      doc.addImage(receipt.vendorSignature, 'PNG', rightSigX + 5, y + 2, sigBoxWidth - 10, sigBoxHeight - 8);
    } catch (e) {
      console.error('Error adding vendor signature:', e);
    }
  }
  
  doc.line(rightSigX, y + sigBoxHeight, rightSigX + sigBoxWidth, y + sigBoxHeight);
  doc.text('Assinatura do Recebedor', rightSigX + sigBoxWidth / 2, y + sigBoxHeight + 8, { align: 'center' });
  if (vendor) {
    doc.text(vendor.name, rightSigX + sigBoxWidth / 2, y + sigBoxHeight + 14, { align: 'center' });
  }
  
  // Legal text
  const legalY = y + sigBoxHeight + 24;
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
export function generateProposalPDF(proposal: Proposal, options: PDFOptions = {}): void {
  const client = clientStorage.getById(proposal.clientId);
  const vehicle = vehicleStorage.getById(proposal.vehicleId);
  const vendor = userStorage.getById(proposal.vendorId);
  
  if (!client || !vehicle) return;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const colors = getPDFColors(proposal.bank);
  const bankConfig = proposal.bank ? getBankConfigByName(proposal.bank) : undefined;
  
  // Privacy mode handling
  const privacyMode = options.privacyMode || false;
  const displayClientName = privacyMode ? client.name.split(' ')[0] + ' ***' : client.name;
  const displayCPF = privacyMode ? '***.***.***-**' : formatCPF(client.cpf);
  const displayPhone = privacyMode ? '(**) *****-****' : client.phone;
  const displayPrice = privacyMode ? 'R$ *****,**' : formatCurrency(proposal.vehiclePrice);
  const displayDown = privacyMode ? 'R$ *****,**' : formatCurrency(proposal.downPayment);
  const displayFinanced = privacyMode ? 'R$ *****,**' : formatCurrency(proposal.financedAmount);
  const displayInstallment = privacyMode ? 'R$ *****,**' : formatCurrency(proposal.installmentValue);
  const displayTotal = privacyMode ? 'R$ *****,**' : formatCurrency(proposal.totalValue);
  
  // Header with bank branding if applicable
  let y = drawHeader(doc, { bankName: proposal.bank });
  
  // Document title
  const titleBgColor = colors.isOwn ? colors.secondary : colors.primary;
  const titleTextColor = colors.isOwn ? [30, 30, 30] : [255, 255, 255];
  
  doc.setFillColor(...titleBgColor);
  doc.rect(15, y, pageWidth - 30, 12, 'F');
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(titleTextColor[0], titleTextColor[1], titleTextColor[2]);
  doc.text('PROPOSTA DE VENDA', pageWidth / 2, y + 8.5, { align: 'center' });
  y += 20;
  
  // Proposal number and date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Proposta Nº ${privacyMode ? '****' : proposal.number}`, 20, y);
  doc.text(`Data: ${formatDateDisplay(proposal.createdAt)}`, pageWidth - 20, y, { align: 'right' });
  
  // Vendor info
  if (vendor) {
    y += 6;
    doc.setFontSize(9);
    doc.text(`Vendedor: ${vendor.name}`, 20, y);
  }
  y += 12;
  
  // Client section
  y = drawSectionBox(doc, y, 'DADOS DO CLIENTE', colors);
  
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 20, 'F');
  
  drawInfoRow(doc, 'Nome:', displayClientName, 20, y + 8);
  drawInfoRow(doc, 'CPF:', displayCPF, 20, y + 16);
  if (client.phone) {
    drawInfoRow(doc, 'Telefone:', displayPhone, 120, y + 8);
  }
  
  y += 28;
  
  // Vehicle section
  y = drawSectionBox(doc, y, 'DADOS DO VEÍCULO', colors);
  
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 28, 'F');
  
  drawInfoRow(doc, 'Veículo:', `${vehicle.brand} ${vehicle.model}`, 20, y + 8);
  drawInfoRow(doc, 'Ano:', String(vehicle.year), 20, y + 16);
  drawInfoRow(doc, 'Cor:', vehicle.color, 20, y + 24);
  drawInfoRow(doc, 'Combustível:', vehicle.fuel, 120, y + 8);
  drawInfoRow(doc, 'Câmbio:', vehicle.transmission, 120, y + 16);
  if (vehicle.plate && !privacyMode) {
    drawInfoRow(doc, 'Placa:', vehicle.plate, 120, y + 24);
  }
  
  y += 36;
  
  // Financial section
  y = drawSectionBox(doc, y, 'CONDIÇÕES DE PAGAMENTO', colors);
  
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 45, 'F');
  
  // Left column
  drawInfoRow(doc, 'Valor do Veículo:', displayPrice, 20, y + 10);
  drawInfoRow(doc, 'Entrada:', displayDown, 20, y + 20);
  drawInfoRow(doc, 'Valor Financiado:', displayFinanced, 20, y + 30);
  
  // Right column
  drawInfoRow(doc, 'Parcelas:', `${proposal.installments}x de ${displayInstallment}`, 105, y + 10);
  if (proposal.bank) {
    const finType = bankConfig?.isOwn ? 'Financiamento Direto' : `Banco: ${proposal.bank}`;
    drawInfoRow(doc, 'Tipo:', finType, 105, y + 20);
  }
  
  // Total highlight
  doc.setFillColor(...colors.primary);
  doc.roundedRect(105, y + 28, 80, 12, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`Total: ${displayTotal}`, 145, y + 36, { align: 'center' });
  
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
  
  // Signatures section - clean style without boxes
  y = Math.max(y + 10, 200);
  
  const sigBoxWidth = 75;
  const sigBoxHeight = 35;
  const leftSigX = 25;
  const rightSigX = pageWidth - 25 - sigBoxWidth;
  
  // Client signature
  if (proposal.clientSignature && !privacyMode) {
    try {
      doc.addImage(proposal.clientSignature, 'PNG', leftSigX + 5, y + 2, sigBoxWidth - 10, sigBoxHeight - 8);
    } catch (e) {
      console.error('Error adding client signature:', e);
    }
  }
  
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.5);
  doc.line(leftSigX, y + sigBoxHeight, leftSigX + sigBoxWidth, y + sigBoxHeight);
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('Assinatura do Cliente', leftSigX + sigBoxWidth / 2, y + sigBoxHeight + 8, { align: 'center' });
  doc.setFontSize(8);
  doc.text(displayClientName, leftSigX + sigBoxWidth / 2, y + sigBoxHeight + 14, { align: 'center' });
  
  // Vendor signature
  if (proposal.vendorSignature && !privacyMode) {
    try {
      doc.addImage(proposal.vendorSignature, 'PNG', rightSigX + 5, y + 2, sigBoxWidth - 10, sigBoxHeight - 8);
    } catch (e) {
      console.error('Error adding vendor signature:', e);
    }
  }
  
  doc.line(rightSigX, y + sigBoxHeight, rightSigX + sigBoxWidth, y + sigBoxHeight);
  doc.text('Assinatura do Vendedor', rightSigX + sigBoxWidth / 2, y + sigBoxHeight + 8, { align: 'center' });
  if (vendor) {
    doc.text(vendor.name, rightSigX + sigBoxWidth / 2, y + sigBoxHeight + 14, { align: 'center' });
  }
  
  // Legal text
  const legalY = y + sigBoxHeight + 24;
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
    `${formatCompanyShortAddress()}, ${formatDateFullPtBr(proposal.createdAt)}`,
    pageWidth / 2,
    legalY + 6,
    { align: 'center' }
  );
  
  // Footer
  drawFooter(doc, 'Proposta de Venda');
  
  doc.save(`proposta-${proposal.number}.pdf`);
}
