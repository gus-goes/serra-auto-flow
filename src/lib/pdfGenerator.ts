import { jsPDF } from 'jspdf';
import { formatCurrency, formatCPF, numberToWords, formatPhone } from './formatters';
import { formatDateDisplay, formatDateFullPtBr } from './dateUtils';
import { getPDFColors, getBankConfigByName } from './bankConfig';
import { getCompanyConfig, formatCompanyAddress, formatCompanyShortAddress } from './companyConfig';
import type { Receipt, Proposal, Client } from '@/types';
import { clientStorage, vehicleStorage, userStorage, bankStorage } from './storage';

/**
 * Professional PDF Generator for Receipts, Proposals and Client Registration
 * with dynamic bank/company branding
 */

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
  
  // Get bank logo from storage if available
  const storedBank = options.bankName ? bankStorage.getAll().find(b => 
    b.name.toLowerCase().includes(options.bankName!.toLowerCase()) ||
    options.bankName!.toLowerCase().includes(b.name.toLowerCase())
  ) : undefined;
  
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
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(company.fantasyName, 20, 18);
  
  // Tagline
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Multimarcas', 20, 26);
  
  // CNPJ
  doc.setFontSize(8);
  doc.text(`CNPJ: ${company.cnpj}`, 20, 33);
  
  // Address
  doc.setFontSize(7);
  doc.text(formatCompanyAddress(), 20, 40);
  
  // Contact info on the right
  doc.setFontSize(9);
  doc.text(formatCompanyShortAddress(), pageWidth - 20, 18, { align: 'right' });
  if (company.phone) {
    doc.text(company.phone, pageWidth - 20, 25, { align: 'right' });
  }
  
  // Bank logo/badge if applicable (external bank)
  if (bankConfig && !bankConfig.isOwn && storedBank) {
    // Show bank name badge
    doc.setFontSize(8);
    doc.setFillColor(255, 255, 255);
    const badgeWidth = 75;
    doc.roundedRect(pageWidth - 20 - badgeWidth, 32, badgeWidth, 10, 2, 2, 'F');
    doc.setTextColor(...colors.primary);
    doc.setFont('helvetica', 'bold');
    doc.text(`Financiamento: ${storedBank.name}`, pageWidth - 20 - badgeWidth / 2, 38.5, { align: 'center' });
  }
  
  return colors.isOwn ? 58 : 54;
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
  doc.line(20, pageHeight - 25, pageWidth - 20, pageHeight - 25);
  
  // Footer text
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `${company.fantasyName} | CNPJ: ${company.cnpj}`,
    pageWidth / 2,
    pageHeight - 18,
    { align: 'center' }
  );
  doc.text(
    formatCompanyAddress(),
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' }
  );
  doc.text(
    `Documento gerado eletronicamente - ${documentType}`,
    pageWidth / 2,
    pageHeight - 6,
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
 * Draw info row with label and value
 */
function drawInfoRow(doc: jsPDF, label: string, value: string, x: number, y: number, labelWidth: number = 45): void {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(label, x, y);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(value, x + labelWidth, y);
}

/**
 * Draw signature section with proper spacing
 */
function drawSignatureSection(
  doc: jsPDF,
  y: number,
  clientSignature: string | undefined,
  vendorSignature: string | undefined,
  clientName: string,
  vendorName: string,
  privacyMode: boolean
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const sigBoxWidth = 70;
  const sigBoxHeight = 25;
  const leftSigX = 30;
  const rightSigX = pageWidth - 30 - sigBoxWidth;
  
  // Signature label
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('ASSINATURAS', pageWidth / 2, y, { align: 'center' });
  y += 8;
  
  // Client signature box
  if (clientSignature && !privacyMode) {
    try {
      doc.addImage(clientSignature, 'PNG', leftSigX + 5, y + 2, sigBoxWidth - 10, sigBoxHeight - 4);
    } catch (e) {
      console.error('Error adding client signature:', e);
    }
  }
  
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.5);
  doc.line(leftSigX, y + sigBoxHeight, leftSigX + sigBoxWidth, y + sigBoxHeight);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Assinatura do Cliente', leftSigX + sigBoxWidth / 2, y + sigBoxHeight + 5, { align: 'center' });
  doc.setFontSize(7);
  doc.text(privacyMode ? clientName.split(' ')[0] + ' ***' : clientName, leftSigX + sigBoxWidth / 2, y + sigBoxHeight + 10, { align: 'center' });
  
  // Vendor signature box
  if (vendorSignature && !privacyMode) {
    try {
      doc.addImage(vendorSignature, 'PNG', rightSigX + 5, y + 2, sigBoxWidth - 10, sigBoxHeight - 4);
    } catch (e) {
      console.error('Error adding vendor signature:', e);
    }
  }
  
  doc.line(rightSigX, y + sigBoxHeight, rightSigX + sigBoxWidth, y + sigBoxHeight);
  doc.setFontSize(8);
  doc.text('Assinatura do Vendedor', rightSigX + sigBoxWidth / 2, y + sigBoxHeight + 5, { align: 'center' });
  doc.setFontSize(7);
  doc.text(vendorName, rightSigX + sigBoxWidth / 2, y + sigBoxHeight + 10, { align: 'center' });
  
  return y + sigBoxHeight + 15;
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
  const pageHeight = doc.internal.pageSize.getHeight();
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
  y += 18;
  
  // Receipt number and date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Nº ${privacyMode ? '****' : receipt.number}`, 20, y);
  doc.text(`Data: ${formatDateDisplay(receipt.paymentDate)}`, pageWidth - 20, y, { align: 'right' });
  y += 10;
  
  // Payment reference badge
  const refText = paymentRefLabels[receipt.reference] || receipt.reference?.toUpperCase() || 'PAGAMENTO';
  const refWidth = Math.max(doc.getTextWidth(refText) + 16, 50);
  doc.setFillColor(...colors.primary);
  doc.roundedRect(15, y, refWidth, 8, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(refText, 15 + refWidth / 2, y + 5.5, { align: 'center' });
  y += 15;
  
  // Amount box with prominent styling
  doc.setFillColor(248, 248, 248);
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(1);
  doc.rect(15, y, pageWidth - 30, 28, 'FD');
  
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text('Valor recebido:', 25, y + 10);
  
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(displayAmount, 25, y + 22);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  const wordsText = `(${amountInWords})`;
  const wordsLines = doc.splitTextToSize(wordsText, pageWidth - 100);
  doc.text(wordsLines, 100, y + 14);
  
  y += 35;
  
  // Receipt body text
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  
  const bodyText = `Recebi(emos) de ${displayName}, portador(a) do CPF ${displayCPF}, a importância de ${displayAmount} (${amountInWords}), referente a ${paymentRefLabels[receipt.reference]?.toLowerCase() || 'pagamento'}${vehicle ? ` do veículo ${vehicle.brand} ${vehicle.model} ano ${vehicle.year}` : ''}.`;
  
  const bodyLines = doc.splitTextToSize(bodyText, pageWidth - 40);
  doc.text(bodyLines, 20, y);
  y += bodyLines.length * 5 + 12;
  
  // Payment details box
  y = drawSectionBox(doc, y, 'DETALHES DO PAGAMENTO', colors);
  
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 28, 'F');
  
  drawInfoRow(doc, 'Forma:', paymentMethodLabels[receipt.paymentMethod] || receipt.paymentMethod, 20, y + 8, 35);
  drawInfoRow(doc, 'Data:', formatDateDisplay(receipt.paymentDate), 20, y + 18, 35);
  drawInfoRow(doc, 'Local:', receipt.location, 105, y + 8, 30);
  if (vendor) {
    drawInfoRow(doc, 'Atendido:', vendor.name, 105, y + 18, 30);
  }
  
  y += 35;
  
  // Vendor contact
  if (vendor?.phone) {
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Contato do Vendedor: ${formatPhone(vendor.phone)}`, 20, y);
    y += 8;
  }
  
  // Description if exists
  if (receipt.description) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Observações:', 20, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(receipt.description, pageWidth - 40);
    doc.text(descLines, 20, y);
    y += descLines.length * 4 + 8;
  }
  
  // Calculate signature position - ensure proper spacing from footer
  const footerStart = pageHeight - 30;
  const signatureHeight = 45; // Height needed for signatures
  const legalTextHeight = 15;
  const minY = Math.max(y + 10, 160); // Minimum Y position for signatures
  const maxY = footerStart - signatureHeight - legalTextHeight - 5;
  y = Math.min(minY, maxY);
  
  // Signatures
  y = drawSignatureSection(
    doc, y,
    receipt.clientSignature,
    receipt.vendorSignature,
    displayName,
    vendor?.name || '',
    privacyMode
  );
  
  // Legal text
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(
    'Para maior clareza, firmo(amos) o presente recibo para que produza os seus devidos efeitos legais.',
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  doc.text(
    `${receipt.location}, ${formatDateFullPtBr(receipt.paymentDate)}`,
    pageWidth / 2,
    y + 5,
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
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Determine if it's own financing
  const isOwnFinancing = proposal.isOwnFinancing || 
    !proposal.bank || 
    proposal.bank?.toLowerCase().includes('próprio') ||
    proposal.bank?.toLowerCase().includes('autos da serra');
  
  const colors = getPDFColors(isOwnFinancing ? undefined : proposal.bank);
  
  // Privacy mode handling
  const privacyMode = options.privacyMode || false;
  const displayClientName = privacyMode ? client.name.split(' ')[0] + ' ***' : client.name;
  const displayCPF = privacyMode ? '***.***.***-**' : formatCPF(client.cpf);
  const displayPhone = privacyMode ? '(**) *****-****' : formatPhone(client.phone);
  const displayPrice = privacyMode ? 'R$ *****,**' : formatCurrency(proposal.vehiclePrice);
  const displayCashPrice = privacyMode ? 'R$ *****,**' : formatCurrency(proposal.cashPrice || proposal.vehiclePrice);
  const displayDown = privacyMode ? 'R$ *****,**' : formatCurrency(proposal.downPayment);
  const displayFinanced = privacyMode ? 'R$ *****,**' : formatCurrency(proposal.financedAmount);
  const displayInstallment = privacyMode ? 'R$ *****,**' : formatCurrency(proposal.installmentValue);
  const displayTotal = privacyMode ? 'R$ *****,**' : formatCurrency(proposal.totalValue);
  
  // Header with bank branding if applicable
  let y = drawHeader(doc, { bankName: isOwnFinancing ? undefined : proposal.bank });
  
  // Document title
  const titleBgColor = colors.isOwn ? colors.secondary : colors.primary;
  const titleTextColor = colors.isOwn ? [30, 30, 30] : [255, 255, 255];
  
  doc.setFillColor(...titleBgColor);
  doc.rect(15, y, pageWidth - 30, 12, 'F');
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(titleTextColor[0], titleTextColor[1], titleTextColor[2]);
  doc.text('PROPOSTA DE VENDA', pageWidth / 2, y + 8.5, { align: 'center' });
  y += 18;
  
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
    doc.text(`Vendedor: ${vendor.name}${vendor.phone ? ` | Tel: ${formatPhone(vendor.phone)}` : ''}`, 20, y);
  }
  y += 10;
  
  // Client section
  y = drawSectionBox(doc, y, 'DADOS DO CLIENTE', colors);
  
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 18, 'F');
  
  drawInfoRow(doc, 'Nome:', displayClientName, 20, y + 7, 35);
  drawInfoRow(doc, 'CPF:', displayCPF, 20, y + 14, 35);
  if (client.phone) {
    drawInfoRow(doc, 'Telefone:', displayPhone, 110, y + 7, 35);
  }
  
  y += 24;
  
  // Vehicle section
  y = drawSectionBox(doc, y, 'DADOS DO VEÍCULO', colors);
  
  const vehicleBoxHeight = vehicle.images && vehicle.images.length > 0 ? 45 : 26;
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, vehicleBoxHeight, 'F');
  
  // Vehicle image if available
  if (vehicle.images && vehicle.images.length > 0 && !privacyMode) {
    try {
      doc.addImage(vehicle.images[0], 'JPEG', 18, y + 3, 40, 30);
    } catch (e) {
      console.error('Error adding vehicle image:', e);
    }
    
    drawInfoRow(doc, 'Veículo:', `${vehicle.brand} ${vehicle.model}`, 65, y + 7, 35);
    drawInfoRow(doc, 'Ano:', String(vehicle.year), 65, y + 14, 35);
    drawInfoRow(doc, 'Cor:', vehicle.color, 65, y + 21, 35);
    drawInfoRow(doc, 'Combustível:', vehicle.fuel, 130, y + 7, 40);
    drawInfoRow(doc, 'Câmbio:', vehicle.transmission, 130, y + 14, 40);
    if (vehicle.plate && !privacyMode) {
      drawInfoRow(doc, 'Placa:', vehicle.plate, 130, y + 21, 40);
    }
    y += vehicleBoxHeight + 6;
  } else {
    drawInfoRow(doc, 'Veículo:', `${vehicle.brand} ${vehicle.model}`, 20, y + 7, 35);
    drawInfoRow(doc, 'Ano:', String(vehicle.year), 20, y + 14, 35);
    drawInfoRow(doc, 'Cor:', vehicle.color, 20, y + 21, 35);
    drawInfoRow(doc, 'Combustível:', vehicle.fuel, 110, y + 7, 40);
    drawInfoRow(doc, 'Câmbio:', vehicle.transmission, 110, y + 14, 40);
    if (vehicle.plate && !privacyMode) {
      drawInfoRow(doc, 'Placa:', vehicle.plate, 110, y + 21, 40);
    }
    y += vehicleBoxHeight + 6;
  }
  
  // Cash Price section (if available)
  if (proposal.cashPrice && proposal.cashPrice > 0) {
    doc.setFillColor(...colors.secondary);
    doc.rect(15, y, pageWidth - 30, 14, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('VALOR À VISTA:', 25, y + 9);
    doc.setFontSize(14);
    doc.text(displayCashPrice, pageWidth - 25, y + 9, { align: 'right' });
    y += 20;
  }
  
  // Financial section
  y = drawSectionBox(doc, y, isOwnFinancing ? 'FINANCIAMENTO PRÓPRIO (SEM JUROS)' : 'CONDIÇÕES DE FINANCIAMENTO', colors);
  
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 42, 'F');
  
  // Left column
  drawInfoRow(doc, 'Valor do Veículo:', displayPrice, 20, y + 8, 50);
  drawInfoRow(doc, 'Entrada:', displayDown, 20, y + 16, 50);
  drawInfoRow(doc, 'Valor Financiado:', displayFinanced, 20, y + 24, 50);
  
  // Right column
  drawInfoRow(doc, 'Parcelas:', `${proposal.installments}x de ${displayInstallment}`, 105, y + 8, 35);
  
  const finType = isOwnFinancing ? 'Financiamento Próprio' : `Banco: ${proposal.bank}`;
  drawInfoRow(doc, 'Tipo:', finType, 105, y + 16, 35);
  
  // Total highlight
  doc.setFillColor(...colors.primary);
  doc.roundedRect(105, y + 26, 80, 12, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`Total: ${displayTotal}`, 145, y + 34, { align: 'center' });
  
  y += 50;
  
  // Notes if exists
  if (proposal.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Observações:', 20, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(proposal.notes, pageWidth - 40);
    doc.text(notesLines, 20, y);
    y += notesLines.length * 4 + 8;
  }
  
  // Calculate signature position - ensure proper spacing from footer
  const footerStart = pageHeight - 30;
  const signatureHeight = 45;
  const legalTextHeight = 15;
  const minY = Math.max(y + 8, 170);
  const maxY = footerStart - signatureHeight - legalTextHeight - 5;
  y = Math.min(minY, maxY);
  
  // Signatures
  y = drawSignatureSection(
    doc, y,
    proposal.clientSignature,
    proposal.vendorSignature,
    displayClientName,
    vendor?.name || '',
    privacyMode
  );
  
  // Legal text
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(
    'Esta proposta tem validade de 5 dias úteis e está sujeita a aprovação de crédito.',
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  doc.text(
    `${formatCompanyShortAddress()}, ${formatDateFullPtBr(proposal.createdAt)}`,
    pageWidth / 2,
    y + 5,
    { align: 'center' }
  );
  
  // Footer
  drawFooter(doc, 'Proposta de Venda');
  
  doc.save(`proposta-${proposal.number}.pdf`);
}

/**
 * Generate Client Registration PDF
 */
export function generateClientPDF(client: Client): void {
  const vendor = userStorage.getById(client.vendorId);
  const company = getCompanyConfig();
  const colors = getPDFColors();
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  let y = drawHeader(doc);
  
  // Document title
  doc.setFillColor(...colors.secondary);
  doc.rect(15, y, pageWidth - 30, 12, 'F');
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('FICHA DE CADASTRO DO CLIENTE', pageWidth / 2, y + 8.5, { align: 'center' });
  y += 22;
  
  // Registration date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Data de Cadastro: ${formatDateDisplay(client.createdAt)}`, 20, y);
  y += 12;
  
  // Client data section
  y = drawSectionBox(doc, y, 'DADOS PESSOAIS', colors);
  
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 32, 'F');
  
  drawInfoRow(doc, 'Nome Completo:', client.name, 20, y + 8, 50);
  drawInfoRow(doc, 'CPF:', formatCPF(client.cpf), 20, y + 16, 50);
  drawInfoRow(doc, 'Telefone:', formatPhone(client.phone), 20, y + 24, 50);
  if (client.email) {
    drawInfoRow(doc, 'E-mail:', client.email, 110, y + 8, 30);
  }
  
  y += 40;
  
  // Address section
  if (client.address) {
    y = drawSectionBox(doc, y, 'ENDEREÇO', colors);
    
    doc.setFillColor(250, 250, 250);
    doc.rect(15, y, pageWidth - 30, 28, 'F');
    
    const fullAddress = `${client.address.street}, ${client.address.number}${client.address.complement ? ` - ${client.address.complement}` : ''}`;
    drawInfoRow(doc, 'Logradouro:', fullAddress, 20, y + 8, 45);
    drawInfoRow(doc, 'Bairro:', client.address.neighborhood, 20, y + 16, 45);
    drawInfoRow(doc, 'Cidade:', `${client.address.city} - ${client.address.state}`, 110, y + 8, 30);
    if (client.address.zipCode) {
      drawInfoRow(doc, 'CEP:', client.address.zipCode, 110, y + 16, 30);
    }
    
    y += 36;
  }
  
  // Vendor section
  y = drawSectionBox(doc, y, 'RESPONSÁVEL PELO ATENDIMENTO', colors);
  
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 18, 'F');
  
  if (vendor) {
    drawInfoRow(doc, 'Vendedor:', vendor.name, 20, y + 8, 40);
    if (vendor.phone) {
      drawInfoRow(doc, 'Contato:', formatPhone(vendor.phone), 110, y + 8, 35);
    }
  }
  
  y += 26;
  
  // Notes section
  if (client.notes) {
    y = drawSectionBox(doc, y, 'OBSERVAÇÕES', colors);
    
    doc.setFillColor(250, 250, 250);
    doc.rect(15, y, pageWidth - 30, 25, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    const notesLines = doc.splitTextToSize(client.notes, pageWidth - 40);
    doc.text(notesLines, 20, y + 8);
    y += 30;
  }
  
  // Signature area for client
  y += 20;
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.5);
  
  const sigLineWidth = 80;
  const sigX = pageWidth / 2 - sigLineWidth / 2;
  doc.line(sigX, y, sigX + sigLineWidth, y);
  
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('Assinatura do Cliente', pageWidth / 2, y + 6, { align: 'center' });
  
  // Footer
  drawFooter(doc, 'Ficha de Cadastro');
  
  doc.save(`cadastro-${client.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}
