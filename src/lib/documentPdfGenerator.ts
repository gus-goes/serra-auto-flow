import { jsPDF } from 'jspdf';
import { formatCurrency, formatCPF, formatPhone, formatRG, maritalStatusLabels } from './formatters';
import { formatDateDisplay, formatDateFullPtBr } from './dateUtils';
import { getPDFColors } from './bankConfig';
import { getCompanyConfig, formatCompanyAddress } from './companyConfig';
import type { Contract, Warranty, TransferAuthorization, WithdrawalDeclaration, Reservation, Client, Vehicle } from '@/types';
import { clientStorage, vehicleStorage, userStorage } from './storage';
import companyLogo from '@/assets/logo.png';

/**
 * Document PDF Generator for Contracts, Warranties, ATPV, Withdrawals, and Reservations
 */

// ===== HELPER FUNCTIONS =====

function drawDocumentHeader(doc: jsPDF, title: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const colors = getPDFColors();
  const company = getCompanyConfig();
  
  // Header background
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Yellow accent bar
  doc.setFillColor(...colors.secondary);
  doc.rect(0, 40, pageWidth, 4, 'F');
  
  // Logo
  try {
    doc.addImage(companyLogo, 'PNG', 15, 6, 28, 28);
  } catch (e) {
    console.error('Error adding logo:', e);
  }
  
  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(company.fantasyName, 50, 18);
  
  // CNPJ and address
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`CNPJ: ${company.cnpj}`, 50, 26);
  doc.text(formatCompanyAddress(), 50, 33);
  
  let y = 52;
  
  // Document title
  doc.setFillColor(...colors.secondary);
  doc.rect(15, y, pageWidth - 30, 12, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(title, pageWidth / 2, y + 8.5, { align: 'center' });
  
  return y + 20;
}

function drawSectionTitle(doc: jsPDF, y: number, title: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const colors = getPDFColors();
  
  doc.setFillColor(...colors.primary);
  doc.rect(15, y, pageWidth - 30, 8, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(title, 20, y + 5.5);
  
  return y + 12;
}

function drawInfoRow(doc: jsPDF, label: string, value: string, x: number, y: number, labelWidth: number = 45): void {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(label, x, y);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(value || '-', x + labelWidth, y);
}

// ===== CONTRACT PDF =====

export function generateContractPDF(contract: Contract): void {
  const client = clientStorage.getById(contract.clientId);
  const vehicle = vehicleStorage.getById(contract.vehicleId);
  const vendor = userStorage.getById(contract.vendorId);
  const company = getCompanyConfig();
  
  if (!client || !vehicle) return;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  let y = drawDocumentHeader(doc, 'CONTRATO DE COMPRA E VENDA DE VEÍCULO');
  
  // Contract number and date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Contrato Nº ${contract.number}`, 20, y);
  doc.text(`Data: ${formatDateDisplay(contract.createdAt)}`, pageWidth - 20, y, { align: 'right' });
  y += 10;
  
  // VENDEDOR section
  y = drawSectionTitle(doc, y, 'VENDEDOR');
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 24, 'F');
  
  drawInfoRow(doc, 'Razão Social:', company.fantasyName, 20, y + 7, 45);
  drawInfoRow(doc, 'CNPJ:', company.cnpj, 20, y + 14, 45);
  drawInfoRow(doc, 'Endereço:', formatCompanyAddress(), 20, y + 21, 45);
  y += 30;
  
  // COMPRADOR section
  y = drawSectionTitle(doc, y, 'COMPRADOR');
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 32, 'F');
  
  drawInfoRow(doc, 'Nome:', client.name, 20, y + 7, 35);
  drawInfoRow(doc, 'CPF:', formatCPF(client.cpf), 110, y + 7, 25);
  drawInfoRow(doc, 'RG:', formatRG(client.rg), 20, y + 14, 35);
  drawInfoRow(doc, 'Estado Civil:', maritalStatusLabels[client.maritalStatus] || '', 110, y + 14, 40);
  
  const addressStr = client.address ? 
    `${client.address.street}, ${client.address.number} - ${client.address.neighborhood}, ${client.address.city}/${client.address.state}` : '';
  const addrLines = doc.splitTextToSize(addressStr, pageWidth - 80);
  drawInfoRow(doc, 'Endereço:', '', 20, y + 21, 35);
  doc.setFontSize(8);
  doc.text(addrLines, 55, y + 21);
  
  if (client.email) {
    drawInfoRow(doc, 'E-mail:', client.email, 20, y + 28, 35);
  }
  y += 38;
  
  // VEÍCULO section
  y = drawSectionTitle(doc, y, 'VEÍCULO');
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 28, 'F');
  
  drawInfoRow(doc, 'Marca/Modelo:', `${vehicle.brand} ${vehicle.model}`, 20, y + 7, 45);
  drawInfoRow(doc, 'Ano:', String(vehicle.year), 120, y + 7, 20);
  drawInfoRow(doc, 'Cor:', vehicle.color, 20, y + 14, 45);
  drawInfoRow(doc, 'Placa:', vehicle.plate || '-', 120, y + 14, 20);
  drawInfoRow(doc, 'Chassi:', vehicle.chassis || '-', 20, y + 21, 45);
  drawInfoRow(doc, 'CRV:', vehicle.crv || '-', 120, y + 21, 20);
  y += 34;
  
  // PAGAMENTO section
  y = drawSectionTitle(doc, y, 'PREÇO E FORMA DE PAGAMENTO');
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 24, 'F');
  
  drawInfoRow(doc, 'Valor Total:', formatCurrency(contract.vehiclePrice), 20, y + 7, 40);
  
  if (contract.paymentType === 'avista') {
    drawInfoRow(doc, 'Forma:', 'À Vista', 110, y + 7, 30);
  } else {
    drawInfoRow(doc, 'Entrada:', formatCurrency(contract.downPayment || 0), 20, y + 14, 40);
    drawInfoRow(doc, 'Parcelas:', `${contract.installments}x de ${formatCurrency(contract.installmentValue || 0)}`, 110, y + 14, 35);
  }
  y += 30;
  
  // CLÁUSULAS
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('CLÁUSULAS CONTRATUAIS', 20, y);
  y += 8;
  
  const clauses = [
    '1. O VENDEDOR se compromete a entregar o veículo em perfeitas condições de uso.',
    '2. O COMPRADOR declara ter examinado o veículo e aceita-o no estado em que se encontra.',
    '3. A transferência de propriedade será realizada após a quitação total do valor acordado.',
    '4. Em caso de atraso no pagamento, será cobrada multa de 5% sobre o valor da parcela.',
    '5. Incidirão juros de 1% ao mês sobre parcelas em atraso.',
    '6. A multa por rescisão unilateral do contrato é de 15% do valor total.',
    '7. O veículo será entregue com documentação em dia e livre de débitos até a data da venda.',
    '8. O COMPRADOR assume a responsabilidade por multas e infrações a partir da entrega.',
    '9. Fica eleito o foro da comarca de Lages/SC para dirimir quaisquer dúvidas.',
  ];
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  
  clauses.forEach((clause) => {
    const lines = doc.splitTextToSize(clause, pageWidth - 45);
    if (y + lines.length * 4 > pageHeight - 60) {
      doc.addPage();
      y = 20;
    }
    doc.text(lines, 20, y);
    y += lines.length * 4 + 2;
  });
  
  y += 10;
  
  // Check if we need a new page for signatures
  if (y > pageHeight - 80) {
    doc.addPage();
    y = 30;
  }
  
  // ASSINATURAS
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Lages/SC, ${formatDateFullPtBr(contract.createdAt)}`, pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // Signature boxes
  const sigWidth = 75;
  const leftX = 25;
  const rightX = pageWidth - 25 - sigWidth;
  
  // Client signature
  if (contract.clientSignature) {
    try {
      doc.addImage(contract.clientSignature, 'PNG', leftX + 5, y, sigWidth - 10, 20);
    } catch (e) {}
  }
  doc.setDrawColor(80, 80, 80);
  doc.line(leftX, y + 25, leftX + sigWidth, y + 25);
  doc.setFontSize(8);
  doc.text('COMPRADOR', leftX + sigWidth / 2, y + 30, { align: 'center' });
  doc.text(client.name, leftX + sigWidth / 2, y + 35, { align: 'center' });
  
  // Vendor signature
  if (contract.vendorSignature) {
    try {
      doc.addImage(contract.vendorSignature, 'PNG', rightX + 5, y, sigWidth - 10, 20);
    } catch (e) {}
  }
  doc.line(rightX, y + 25, rightX + sigWidth, y + 25);
  doc.text('VENDEDOR', rightX + sigWidth / 2, y + 30, { align: 'center' });
  doc.text(vendor?.name || company.fantasyName, rightX + sigWidth / 2, y + 35, { align: 'center' });
  
  y += 50;
  
  // Witnesses
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TESTEMUNHAS:', 20, y);
  y += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  // Witness 1
  doc.line(leftX, y + 15, leftX + sigWidth, y + 15);
  if (contract.witness1) {
    doc.text(`Nome: ${contract.witness1.name}`, leftX, y + 20);
    doc.text(`RG: ${contract.witness1.rg} | CPF: ${formatCPF(contract.witness1.cpf)}`, leftX, y + 25);
  } else {
    doc.text('Nome:', leftX, y + 20);
    doc.text('RG:                    CPF:', leftX, y + 25);
  }
  
  // Witness 2
  doc.line(rightX, y + 15, rightX + sigWidth, y + 15);
  if (contract.witness2) {
    doc.text(`Nome: ${contract.witness2.name}`, rightX, y + 20);
    doc.text(`RG: ${contract.witness2.rg} | CPF: ${formatCPF(contract.witness2.cpf)}`, rightX, y + 25);
  } else {
    doc.text('Nome:', rightX, y + 20);
    doc.text('RG:                    CPF:', rightX, y + 25);
  }
  
  doc.save(`contrato-${contract.number}.pdf`);
}

// ===== WARRANTY PDF =====

export function generateWarrantyPDF(warranty: Warranty): void {
  const client = clientStorage.getById(warranty.clientId);
  const vehicle = vehicleStorage.getById(warranty.vehicleId);
  const company = getCompanyConfig();
  
  if (!client || !vehicle) return;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  let y = drawDocumentHeader(doc, 'TERMO DE GARANTIA');
  
  // Warranty number and date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Termo Nº ${warranty.number}`, 20, y);
  doc.text(`Data: ${formatDateDisplay(warranty.createdAt)}`, pageWidth - 20, y, { align: 'right' });
  y += 10;
  
  // DADOS DO VEÍCULO
  y = drawSectionTitle(doc, y, 'DADOS DO VEÍCULO');
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 36, 'F');
  
  // Table style layout
  const col1 = 20, col2 = 60, col3 = 110, col4 = 150;
  
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Ano:', col1, y + 8);
  doc.text('Marca:', col1, y + 16);
  doc.text('Placa:', col1, y + 24);
  doc.text('Chassi:', col1, y + 32);
  
  doc.text('Modelo:', col3, y + 8);
  doc.text('Cor:', col3, y + 16);
  doc.text('Tipo:', col3, y + 24);
  doc.text('KM:', col3, y + 32);
  
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  
  doc.text(String(vehicle.year), col2, y + 8);
  doc.text(vehicle.brand, col2, y + 16);
  doc.text(vehicle.plate || '-', col2, y + 24);
  doc.text(vehicle.chassis || '-', col2, y + 32);
  
  doc.text(vehicle.model, col4, y + 8);
  doc.text(vehicle.color, col4, y + 16);
  doc.text(vehicle.fuel, col4, y + 24);
  doc.text(vehicle.mileage.toLocaleString('pt-BR') + ' km', col4, y + 32);
  
  y += 44;
  
  // CLIENTE
  y = drawSectionTitle(doc, y, 'DADOS DO CLIENTE');
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 18, 'F');
  
  drawInfoRow(doc, 'Nome:', client.name, 20, y + 8, 30);
  drawInfoRow(doc, 'CPF:', formatCPF(client.cpf), 120, y + 8, 25);
  drawInfoRow(doc, 'Telefone:', formatPhone(client.phone), 20, y + 14, 30);
  
  y += 26;
  
  // GARANTIA
  y = drawSectionTitle(doc, y, 'CONDIÇÕES DE GARANTIA');
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 20, 'F');
  
  drawInfoRow(doc, 'Período:', warranty.warrantyPeriod, 20, y + 8, 35);
  drawInfoRow(doc, 'Cobertura:', warranty.warrantyCoverage, 90, y + 8, 40);
  if (warranty.warrantyKm) {
    drawInfoRow(doc, 'KM Limite:', warranty.warrantyKm.toLocaleString('pt-BR') + ' km', 20, y + 15, 35);
  }
  
  y += 28;
  
  // Condições detalhadas
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('CONDIÇÕES:', 20, y);
  y += 8;
  
  const conditions = [
    '1. A garantia cobre exclusivamente os itens especificados acima.',
    '2. Não cobre peças de desgaste natural (freios, embreagem, pneus, bateria).',
    '3. A garantia é anulada em caso de mau uso, negligência ou modificações.',
    '4. Reparos devem ser realizados em oficina autorizada pela loja.',
    '5. O cliente deve apresentar este termo para acionar a garantia.',
  ];
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  
  conditions.forEach((cond) => {
    doc.text(cond, 20, y);
    y += 6;
  });
  
  y += 10;
  
  // Observações adicionais
  if (warranty.conditions) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', 20, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const condLines = doc.splitTextToSize(warranty.conditions, pageWidth - 40);
    doc.text(condLines, 20, y);
    y += condLines.length * 4 + 10;
  }
  
  // Location and date
  y += 15;
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Lages/SC, ${formatDateFullPtBr(warranty.createdAt)}`, pageWidth / 2, y, { align: 'center' });
  y += 20;
  
  // Client signature
  if (warranty.clientSignature) {
    try {
      doc.addImage(warranty.clientSignature, 'PNG', pageWidth / 2 - 35, y, 70, 20);
    } catch (e) {}
  }
  doc.setDrawColor(80, 80, 80);
  doc.line(pageWidth / 2 - 40, y + 25, pageWidth / 2 + 40, y + 25);
  doc.setFontSize(8);
  doc.text('Assinatura do Cliente', pageWidth / 2, y + 30, { align: 'center' });
  doc.text(client.name, pageWidth / 2, y + 35, { align: 'center' });
  
  doc.save(`garantia-${warranty.number}.pdf`);
}

// ===== ATPV PDF (IDENTICAL TO OFFICIAL DETRAN FORMAT) =====

export function generateTransferAuthPDF(transfer: TransferAuthorization): void {
  const client = clientStorage.getById(transfer.clientId);
  const vehicle = vehicleStorage.getById(transfer.vehicleId);
  const vendor = userStorage.getById(transfer.vendorId);
  const company = getCompanyConfig();
  
  if (!client || !vehicle) return;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // OFFICIAL DETRAN STYLE - No company header
  let y = 25;
  
  // Title - Official format
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('AUTORIZAÇÃO PARA TRANSFERÊNCIA DE', pageWidth / 2, y, { align: 'center' });
  y += 7;
  doc.text('PROPRIEDADE DE VEÍCULO', pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // Introductory text
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const introText = 'Autorizo a transferência de propriedade do veículo abaixo identificado para:';
  doc.text(introText, pageWidth / 2, y, { align: 'center' });
  y += 12;
  
  // Main table with borders
  const tableX = 15;
  const tableWidth = pageWidth - 30;
  const cellHeight = 12;
  const labelWidth = 45;
  
  // Draw table cells
  const drawTableRow = (label: string, value: string, rowY: number, fullWidth: boolean = true) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    
    // Label cell
    doc.rect(tableX, rowY, labelWidth, cellHeight);
    doc.setFillColor(240, 240, 240);
    doc.rect(tableX, rowY, labelWidth, cellHeight, 'F');
    doc.rect(tableX, rowY, labelWidth, cellHeight);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(label, tableX + 3, rowY + 8);
    
    // Value cell
    const valueWidth = fullWidth ? tableWidth - labelWidth : (tableWidth - labelWidth) / 2;
    doc.rect(tableX + labelWidth, rowY, valueWidth, cellHeight);
    
    doc.setFont('helvetica', 'normal');
    doc.text(value || '', tableX + labelWidth + 3, rowY + 8);
  };
  
  const drawTableRowDouble = (label1: string, value1: string, label2: string, value2: string, rowY: number) => {
    const halfWidth = (tableWidth - labelWidth) / 2;
    const label2Width = 30;
    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    
    // First label cell
    doc.setFillColor(240, 240, 240);
    doc.rect(tableX, rowY, labelWidth, cellHeight, 'F');
    doc.rect(tableX, rowY, labelWidth, cellHeight);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(label1, tableX + 3, rowY + 8);
    
    // First value cell
    doc.rect(tableX + labelWidth, rowY, halfWidth - label2Width, cellHeight);
    doc.setFont('helvetica', 'normal');
    doc.text(value1 || '', tableX + labelWidth + 3, rowY + 8);
    
    // Second label cell
    doc.setFillColor(240, 240, 240);
    doc.rect(tableX + labelWidth + halfWidth - label2Width, rowY, label2Width, cellHeight, 'F');
    doc.rect(tableX + labelWidth + halfWidth - label2Width, rowY, label2Width, cellHeight);
    
    doc.setFont('helvetica', 'bold');
    doc.text(label2, tableX + labelWidth + halfWidth - label2Width + 3, rowY + 8);
    
    // Second value cell
    doc.rect(tableX + labelWidth + halfWidth, rowY, halfWidth, cellHeight);
    doc.setFont('helvetica', 'normal');
    doc.text(value2 || '', tableX + labelWidth + halfWidth + 3, rowY + 8);
  };
  
  // Row 1: Valor
  drawTableRow('VALOR (R$):', formatCurrency(transfer.vehicleValue), y);
  y += cellHeight;
  
  // Row 2: Nome do Comprador
  drawTableRow('NOME:', client.name.toUpperCase(), y);
  y += cellHeight;
  
  // Row 3: RG and CPF
  drawTableRowDouble('RG:', formatRG(client.rg), 'CPF/CNPJ:', formatCPF(client.cpf), y);
  y += cellHeight;
  
  // Row 4: Endereço
  const clientAddress = client.address ? 
    `${client.address.street}, ${client.address.number}${client.address.complement ? ` - ${client.address.complement}` : ''}, ${client.address.neighborhood}` : '';
  drawTableRow('ENDEREÇO:', clientAddress.toUpperCase(), y);
  y += cellHeight;
  
  // Row 5: Cidade/UF and CEP
  const cityState = client.address ? `${client.address.city}/${client.address.state}` : '';
  drawTableRowDouble('CIDADE/UF:', cityState.toUpperCase(), 'CEP:', client.address?.zipCode || '', y);
  y += cellHeight;
  
  // Row 6: Placa and Chassi
  drawTableRowDouble('PLACA:', vehicle.plate?.toUpperCase() || '', 'CHASSI:', vehicle.chassis?.toUpperCase() || '', y);
  y += cellHeight;
  
  // Row 7: Local e Data
  drawTableRow('LOCAL E DATA:', `LAGES/SC, ${formatDateFullPtBr(transfer.transferDate).toUpperCase()}`, y);
  y += cellHeight + 15;
  
  // Seller signature section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ASSINATURA DO PROPRIETÁRIO (VENDEDOR):', 20, y);
  y += 25;
  
  // Signature line
  if (transfer.vendorSignature) {
    try {
      doc.addImage(transfer.vendorSignature, 'PNG', pageWidth / 2 - 40, y - 20, 80, 18);
    } catch (e) {}
  }
  doc.setDrawColor(0, 0, 0);
  doc.line(40, y, pageWidth - 40, y);
  y += 5;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('(Assinatura igual ao documento)', pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // Legal observations box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(15, y, pageWidth - 30, 45);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('OBSERVAÇÕES IMPORTANTES:', 20, y + 8);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  const obs1 = 'Art. 134 do CTB: No caso de transferência de propriedade, o proprietário antigo deverá encaminhar ao órgão executivo de trânsito do Estado, no prazo de 30 (trinta) dias, cópia autenticada do comprovante de transferência de propriedade, devidamente assinado e datado, sob pena de ter que se responsabilizar solidariamente pelas penalidades impostas e suas reincidências até a data da comunicação.';
  
  const obs2 = 'Art. 223 do CTB: Deixar de comunicar ao órgão de registro, no prazo de 30 dias, a aquisição, transferência ou mudança de categoria, cor ou característica de veículo: Infração: grave; Penalidade: multa.';
  
  const lines1 = doc.splitTextToSize(obs1, pageWidth - 45);
  doc.text(lines1, 20, y + 15);
  
  const lines2 = doc.splitTextToSize(obs2, pageWidth - 45);
  doc.text(lines2, 20, y + 32);
  
  y += 55;
  
  // Buyer signature section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ASSINATURA DO COMPRADOR:', 20, y);
  y += 25;
  
  // Buyer signature line
  if (transfer.clientSignature) {
    try {
      doc.addImage(transfer.clientSignature, 'PNG', pageWidth / 2 - 40, y - 20, 80, 18);
    } catch (e) {}
  }
  doc.line(40, y, pageWidth - 40, y);
  y += 5;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('(Assinatura igual ao documento)', pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // Recognition of firm
  doc.setFontSize(9);
  doc.text('RECONHECIMENTO DE FIRMA:', 20, y);
  y += 5;
  doc.setDrawColor(0, 0, 0);
  doc.rect(15, y, pageWidth - 30, 25);
  doc.setFontSize(7);
  doc.text('Espaço reservado para reconhecimento de firma em cartório', 20, y + 14);
  
  doc.save(`atpv-${transfer.number}.pdf`);
}

// ===== WITHDRAWAL DECLARATION PDF =====

export function generateWithdrawalPDF(declaration: WithdrawalDeclaration): void {
  const client = clientStorage.getById(declaration.clientId);
  const vehicle = vehicleStorage.getById(declaration.vehicleId);
  const company = getCompanyConfig();
  
  if (!client || !vehicle) return;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  let y = drawDocumentHeader(doc, 'DECLARAÇÃO DE DESISTÊNCIA DE COMPRA');
  
  // Document number
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Declaração Nº ${declaration.number}`, 20, y);
  doc.text(`Data: ${formatDateDisplay(declaration.declarationDate)}`, pageWidth - 20, y, { align: 'right' });
  y += 15;
  
  // Declaration text
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  
  const declarationText = `Eu, ${client.name}, portador(a) do CPF: ${formatCPF(client.cpf)}, RG: ${formatRG(client.rg)}, residente e domiciliado(a) em ${client.address?.street || ''}, ${client.address?.number || ''}, ${client.address?.neighborhood || ''}, ${client.address?.city || 'Lages'}/${client.address?.state || 'SC'}, declaro para os devidos fins que DESISTO da compra do veículo abaixo especificado:`;
  
  const textLines = doc.splitTextToSize(declarationText, pageWidth - 40);
  doc.text(textLines, 20, y);
  y += textLines.length * 6 + 15;
  
  // Vehicle data
  y = drawSectionTitle(doc, y, 'DADOS DO VEÍCULO');
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 24, 'F');
  
  drawInfoRow(doc, 'Veículo:', `${vehicle.brand} ${vehicle.model}`, 20, y + 8, 35);
  drawInfoRow(doc, 'Ano:', String(vehicle.year), 120, y + 8, 20);
  drawInfoRow(doc, 'Placa:', vehicle.plate || '-', 20, y + 15, 35);
  drawInfoRow(doc, 'Chassi:', vehicle.chassis || '-', 120, y + 15, 30);
  
  y += 32;
  
  // Reason
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  
  const reasonText = declaration.reason || 'motivos pessoais';
  const reasonLine = `Motivo da desistência: ${reasonText}.`;
  doc.text(reasonLine, 20, y);
  y += 15;
  
  // Additional text
  const additionalText = `Esta declaração é feita de livre e espontânea vontade, sem qualquer tipo de coação, para que produza os efeitos legais necessários perante a empresa ${company.fantasyName}.`;
  const addLines = doc.splitTextToSize(additionalText, pageWidth - 40);
  doc.text(addLines, 20, y);
  y += addLines.length * 6 + 25;
  
  // Location and date
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Lages/SC, ${formatDateFullPtBr(declaration.declarationDate)}`, pageWidth / 2, y, { align: 'center' });
  y += 30;
  
  // Signature
  if (declaration.clientSignature) {
    try {
      doc.addImage(declaration.clientSignature, 'PNG', pageWidth / 2 - 40, y - 5, 80, 20);
    } catch (e) {}
  }
  doc.setDrawColor(80, 80, 80);
  doc.line(pageWidth / 2 - 50, y + 20, pageWidth / 2 + 50, y + 20);
  doc.setFontSize(9);
  doc.text('Assinatura do Declarante', pageWidth / 2, y + 27, { align: 'center' });
  doc.text(client.name, pageWidth / 2, y + 33, { align: 'center' });
  doc.text(`CPF: ${formatCPF(client.cpf)}`, pageWidth / 2, y + 39, { align: 'center' });
  
  y += 55;
  
  // Note
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Obs.: Esta declaração deve ser reconhecida em cartório para ter validade jurídica.', 20, y);
  
  doc.save(`desistencia-${declaration.number}.pdf`);
}

// ===== RESERVATION PDF =====

export function generateReservationPDF(reservation: Reservation): void {
  const client = clientStorage.getById(reservation.clientId);
  const vehicle = vehicleStorage.getById(reservation.vehicleId);
  const company = getCompanyConfig();
  
  if (!client || !vehicle) return;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  let y = drawDocumentHeader(doc, 'TERMO DE SOLICITAÇÃO DE RESERVA DE VEÍCULO');
  
  // Document info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Termo Nº ${reservation.number}`, 20, y);
  doc.text(`Data: ${formatDateDisplay(reservation.reservationDate)}`, pageWidth - 20, y, { align: 'right' });
  y += 10;
  
  // DADOS DO SOLICITANTE
  y = drawSectionTitle(doc, y, 'DADOS DO SOLICITANTE');
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 36, 'F');
  
  drawInfoRow(doc, 'Nome:', client.name, 20, y + 7, 30);
  drawInfoRow(doc, 'RG:', formatRG(client.rg), 20, y + 14, 30);
  drawInfoRow(doc, 'CPF:', formatCPF(client.cpf), 100, y + 14, 25);
  
  const addressStr = client.address ? 
    `${client.address.street}, ${client.address.number} - ${client.address.neighborhood}` : '';
  drawInfoRow(doc, 'Endereço:', addressStr, 20, y + 21, 35);
  
  const cityStr = client.address ? `${client.address.city}/${client.address.state}` : '';
  drawInfoRow(doc, 'Cidade/UF:', cityStr, 20, y + 28, 35);
  drawInfoRow(doc, 'Telefone:', formatPhone(client.phone), 100, y + 28, 35);
  
  if (client.email) {
    drawInfoRow(doc, 'E-mail:', client.email, 20, y + 35, 30);
  }
  
  y += 44;
  
  // DADOS DO VEÍCULO
  y = drawSectionTitle(doc, y, 'VEÍCULO SOLICITADO');
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 24, 'F');
  
  drawInfoRow(doc, 'Veículo:', `${vehicle.brand} ${vehicle.model}`, 20, y + 8, 35);
  drawInfoRow(doc, 'Ano:', String(vehicle.year), 120, y + 8, 20);
  drawInfoRow(doc, 'Placa:', vehicle.plate || '-', 20, y + 16, 35);
  drawInfoRow(doc, 'Chassi:', vehicle.chassis || '-', 120, y + 16, 30);
  
  y += 32;
  
  // Deposit if any
  if (reservation.depositAmount && reservation.depositAmount > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(`Valor do Sinal: ${formatCurrency(reservation.depositAmount)}`, 20, y);
    y += 10;
  }
  
  // CLÁUSULAS
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('CONDIÇÕES DA RESERVA:', 20, y);
  y += 8;
  
  const clauses = [
    `1. A reserva terá validade de 10 (dez) dias corridos a partir desta data, expirando em ${formatDateDisplay(reservation.validUntil)}.`,
    '2. Durante o período de reserva, o veículo não poderá ser vendido a terceiros.',
    '3. O valor da reserva/sinal será abatido do valor total do veículo no ato da compra.',
    '4. Caso o solicitante desista da compra, o valor do sinal NÃO será devolvido.',
    '5. Caso a loja não possa entregar o veículo, o valor do sinal será devolvido integralmente.',
    '6. Este termo tem força de contrato entre as partes.',
  ];
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  
  clauses.forEach((clause) => {
    const lines = doc.splitTextToSize(clause, pageWidth - 45);
    doc.text(lines, 20, y);
    y += lines.length * 5 + 3;
  });
  
  y += 15;
  
  // Location and date
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Lages/SC, ${formatDateFullPtBr(reservation.reservationDate)}`, pageWidth / 2, y, { align: 'center' });
  y += 25;
  
  // Signatures
  const sigWidth = 75;
  const leftX = 25;
  const rightX = pageWidth - 25 - sigWidth;
  
  // Client signature
  if (reservation.clientSignature) {
    try {
      doc.addImage(reservation.clientSignature, 'PNG', leftX + 5, y, sigWidth - 10, 20);
    } catch (e) {}
  }
  doc.setDrawColor(80, 80, 80);
  doc.line(leftX, y + 25, leftX + sigWidth, y + 25);
  doc.setFontSize(8);
  doc.text('SOLICITANTE', leftX + sigWidth / 2, y + 30, { align: 'center' });
  doc.text(client.name, leftX + sigWidth / 2, y + 35, { align: 'center' });
  
  // Store signature
  doc.line(rightX, y + 25, rightX + sigWidth, y + 25);
  doc.text('LOJA', rightX + sigWidth / 2, y + 30, { align: 'center' });
  doc.text(company.fantasyName, rightX + sigWidth / 2, y + 35, { align: 'center' });
  
  doc.save(`reserva-${reservation.number}.pdf`);
}
