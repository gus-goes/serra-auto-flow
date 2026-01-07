import { jsPDF } from 'jspdf';
import { formatCurrency, formatCPF, formatPhone, formatRG, maritalStatusLabels, numberToWords } from './formatters';
import { formatDateDisplay, formatDateFullPtBr } from './dateUtils';
import { getPDFColors } from './bankConfig';
import { getCompanyConfig, formatCompanyAddress } from './companyConfig';
import type { Contract, Warranty, TransferAuthorization, WithdrawalDeclaration, Reservation, Client, Vehicle, User } from '@/types';
import companyLogo from '@/assets/logo.png';

/**
 * PDF Data interfaces - all data must be passed directly
 */
export interface ContractPDFData {
  contract: Contract;
  client: Client;
  vehicle: Vehicle;
  vendor?: User | null;
}

export interface WarrantyPDFData {
  warranty: Warranty;
  client: Client;
  vehicle: Vehicle;
}

export interface TransferAuthPDFData {
  transfer: TransferAuthorization;
  client: Client;
  vehicle: Vehicle;
  vendor?: User | null;
}

export interface WithdrawalPDFData {
  declaration: WithdrawalDeclaration;
  client: Client;
  vehicle: Vehicle;
}

export interface ReservationPDFData {
  reservation: Reservation;
  client: Client;
  vehicle: Vehicle;
}

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
  
  // Document title - calculate width based on text
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const titleWidth = doc.getTextWidth(title);
  const rectWidth = Math.max(pageWidth - 30, titleWidth + 20);
  const rectX = (pageWidth - rectWidth) / 2;
  
  doc.setFillColor(...colors.secondary);
  doc.rect(rectX, y, rectWidth, 12, 'F');
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

// ===== CONTRACT PDF (ELABORADO) =====

export function generateContractPDF(data: ContractPDFData): void {
  const { contract, client, vehicle, vendor } = data;
  const company = getCompanyConfig();
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  
  // Helper: Check and add new page if needed
  const checkPageBreak = (neededSpace: number): number => {
    if (y + neededSpace > pageHeight - 30) {
      doc.addPage();
      return 25;
    }
    return y;
  };
  
  // Helper: Draw paragraph with justified alignment
  const drawParagraph = (text: string, indent: number = 0): number => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    lines.forEach((line: string) => {
      y = checkPageBreak(6);
      doc.text(line, marginLeft + indent, y);
      y += 5;
    });
    return y;
  };
  
  // Helper: Draw clause title
  const drawClauseTitle = (title: string): number => {
    y = checkPageBreak(15);
    y += 4;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(title, marginLeft, y);
    y += 7;
    return y;
  };
  
  // Helper: Draw sub-clause
  const drawSubClause = (number: string, text: string): number => {
    y = checkPageBreak(12);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(number, marginLeft + 5, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, contentWidth - 20);
    doc.text(lines, marginLeft + 15, y);
    y += lines.length * 5 + 2;
    return y;
  };
  
  let y = drawDocumentHeader(doc, 'CONTRATO PARTICULAR DE COMPRA E VENDA DE VEÍCULO AUTOMOTOR');
  
  // Contract number and date - right aligned
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text(`Contrato Nº ${contract.number}`, pageWidth - marginRight, y, { align: 'right' });
  y += 10;
  
  // ===== QUALIFICAÇÃO DAS PARTES =====
  // Use edited data if available, otherwise fallback to original
  const clientData = contract.clientData || {
    name: client.name,
    cpf: client.cpf,
    rg: client.rg,
    email: client.email || '',
    maritalStatus: maritalStatusLabels[client.maritalStatus] || 'estado civil não informado',
    occupation: client.occupation || '',
    address: client.address ? 
      `${client.address.street}, ${client.address.number}${client.address.complement ? ', ' + client.address.complement : ''}, ${client.address.neighborhood}, ${client.address.city}, ${client.address.state} CEP ${client.address.zipCode}` : 
      'endereço não informado',
  };
  
  const vehicleData = contract.vehicleData || {
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color,
    plate: vehicle.plate || '',
    chassis: vehicle.chassis || '',
    renavam: vehicle.renavam || '',
    fuel: vehicle.fuel,
    transmission: vehicle.transmission,
    mileage: vehicle.mileage,
  };
  
  // VENDEDOR(A)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('VENDEDOR(A):', marginLeft, y);
  y += 6;
  
  // Build vendor text with legal representative if available
  let vendedorTexto = `${company.fantasyName}, sociedade empresária inscrita no CNPJ sob o nº ${company.cnpj}, com sede na ${formatCompanyAddress()}${company.email ? `, e endereço eletrônico ${company.email}` : ''}`;
  
  if (company.legalRepresentative) {
    const rep = company.legalRepresentative;
    vendedorTexto += `, neste ato representado(a) por ${rep.name}, ${rep.nationality}, ${rep.maritalStatus}, ${rep.occupation}, portador(a) da Cédula de Identidade RG N°${rep.rg}, inscrito(a) no CPF nº ${rep.cpf}.`;
  } else {
    vendedorTexto += ', neste ato representado(a) por seu(sua) responsável legal.';
  }
  
  y = drawParagraph(vendedorTexto);
  y += 4;
  
  // COMPRADOR(A)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('COMPRADOR(A):', marginLeft, y);
  y += 6;
  
  const compradorTexto = `${clientData.name}, Brasileiro(a), inscrito(a) no CPF Nº ${formatCPF(clientData.cpf)}, portador(a) do RG Nº ${formatRG(clientData.rg)}, estado civil ${clientData.maritalStatus.toLowerCase()}${clientData.occupation ? `, ${clientData.occupation}` : ''}, residente em ${clientData.address}${clientData.email ? ` e endereço eletrônico ${clientData.email}` : ''}.`;
  y = drawParagraph(compradorTexto);
  y += 6;
  
  // Texto de ligação
  const textoLigacao = 'Têm entre si, justo e contratado, o seguinte:';
  y = drawParagraph(textoLigacao);
  y += 5;
  
  // ===== CLÁUSULA PRIMEIRA - DO OBJETO =====
  y = drawClauseTitle('CLÁUSULA PRIMEIRA – DO OBJETO');
  
  // Usa dados do veículo original para chassi/renavam se não estiverem no contrato
  const chassi = vehicleData.chassis || vehicle.chassis || 'não informado';
  const renavam = vehicleData.renavam || vehicle.renavam || 'não informado';
  const vehicleDesc = `${vehicleData.brand} ${vehicleData.model}, ano de fabricação/modelo ${vehicleData.year}, cor ${vehicleData.color}, placa ${vehicleData.plate || 'a ser emplacado'}, chassi nº ${chassi}, RENAVAM nº ${renavam}, combustível ${vehicleData.fuel}, câmbio ${vehicleData.transmission}, com ${vehicleData.mileage.toLocaleString('pt-BR')} km rodados`;
  
  y = drawSubClause('1.1.', `O(A) VENDEDOR(A) é legítimo(a) proprietário(a) e possuidor(a) do veículo: ${vehicleDesc}.`);
  
  y = drawSubClause('1.2.', 'O(A) VENDEDOR(A), pelo presente instrumento, vende, transfere e outorga ao(à) COMPRADOR(A) o veículo acima descrito, livre e desembaraçado de quaisquer ônus, dívidas, multas, impostos, taxas ou encargos de qualquer natureza, até a data da assinatura deste contrato.');
  
  y = drawSubClause('1.3.', 'O(A) COMPRADOR(A) declara ter examinado o veículo, conhecendo suas condições de uso, estado de conservação, características e funcionamento, aceitando-o no estado em que se encontra.');
  
  // ===== CLÁUSULA SEGUNDA - DO PREÇO E FORMA DE PAGAMENTO =====
  y = drawClauseTitle('CLÁUSULA SEGUNDA – DO PREÇO E FORMA DE PAGAMENTO');
  
  const valorExtenso = numberToWords(contract.vehiclePrice);
  y = drawSubClause('2.1.', `O preço total da venda é de ${formatCurrency(contract.vehiclePrice)} (${valorExtenso}), que será pago pelo(a) COMPRADOR(A) da seguinte forma:`);
  
  if (contract.paymentType === 'avista') {
    y = drawSubClause('2.2.', `Pagamento à vista, no ato da assinatura deste contrato ou conforme combinado entre as partes.`);
  } else {
    const entradaExtenso = numberToWords(contract.downPayment || 0);
    const parcelaExtenso = numberToWords(contract.installmentValue || 0);
    const dueDay = contract.dueDay || 10;
    const firstDue = contract.firstDueDate ? formatDateDisplay(contract.firstDueDate) : null;
    
    if (contract.downPayment && contract.downPayment > 0) {
      y = drawSubClause('2.2.', `Entrada no valor de ${formatCurrency(contract.downPayment)} (${entradaExtenso}).`);
    }
    
    y = drawSubClause(
      '2.3.',
      firstDue
        ? `O saldo remanescente será pago em ${contract.installments || 0} parcelas mensais e consecutivas no valor de ${formatCurrency(contract.installmentValue || 0)} (${parcelaExtenso}) cada, vencendo-se a primeira em ${firstDue} e as demais todo dia ${dueDay} de cada mês.`
        : `O saldo remanescente será pago em ${contract.installments || 0} parcelas mensais e consecutivas no valor de ${formatCurrency(contract.installmentValue || 0)} (${parcelaExtenso}) cada, com vencimento todo dia ${dueDay} de cada mês, iniciando no mês subsequente à assinatura deste contrato.`,
    );
  }
  
  y = drawSubClause('2.4.', 'O(A) VENDEDOR(A) declara ter recebido o sinal/entrada ou pagamento conforme descrito acima, dando plena e irrevogável quitação do valor correspondente.');
  
  // ===== CLÁUSULA TERCEIRA - DA TRANSFERÊNCIA =====
  y = drawClauseTitle('CLÁUSULA TERCEIRA – DA TRANSFERÊNCIA DE PROPRIEDADE');
  
  y = drawSubClause('3.1.', 'A transferência da propriedade do veículo junto ao órgão de trânsito competente (DETRAN) será realizada após a quitação integral do valor acordado.');
  
  y = drawSubClause('3.2.', 'As despesas com a transferência de propriedade, incluindo taxas, emolumentos e despachante, serão de responsabilidade do(a) VENDEDOR(A), salvo disposição em contrário acordada entre as partes.');
  
  y = drawSubClause('3.3.', 'O(A) VENDEDOR(A) compromete-se a entregar toda a documentação necessária para a transferência, incluindo CRV (Certificado de Registro de Veículo) devidamente preenchido e assinado.');
  
  // ===== CLÁUSULA QUARTA - DA ENTREGA =====
  y = drawClauseTitle('CLÁUSULA QUARTA – DA ENTREGA DO VEÍCULO');
  
  // Calcula valor exigido para entrega: se parcelado = entrada, se à vista = porcentagem customizada
  const deliveryPercentage = contract.deliveryPercentage ?? 50;
  const valorEntrega = contract.paymentType === 'parcelado' 
    ? (contract.downPayment || 0) 
    : contract.vehiclePrice * (deliveryPercentage / 100);
  const valorEntregaExtenso = numberToWords(valorEntrega);
  
  const percentText = deliveryPercentage === 50 
    ? '50% (cinquenta por cento)' 
    : `${deliveryPercentage}% (${numberToWords(deliveryPercentage).replace(' reais', '').replace(' real', '').trim()} por cento)`;
  
  y = drawSubClause('4.1.', `O veículo será transferido ao(à) COMPRADOR(A) juntamente com a entrega das chaves, sendo realizada a entrega e transporte do veículo mediante o pagamento ${contract.paymentType === 'parcelado' ? 'do valor total da entrada de' : `de ${percentText} do valor do veículo, correspondente a`} ${formatCurrency(valorEntrega)} (${valorEntregaExtenso}), pelo(a) COMPRADOR(A) ao(à) VENDEDOR(A). As despesas referentes ao registro da documentação serão de responsabilidade do(a) COMPRADOR(A).`);
  
  y = drawSubClause('4.2.', `A transferência do veículo pelo(a) COMPRADOR(A) junto ao Departamento de Trânsito está condicionada ao pagamento do valor de ${formatCurrency(valorEntrega)} (${valorEntregaExtenso}) para que seja realizada a entrega efetiva do veículo. A inobservância da referida obrigação acarretará no dever de responder por encargos, multas e demais desdobramentos decorrentes desta omissão.`);
  
  y = drawSubClause('4.3.', 'A partir da entrega do veículo, o(a) COMPRADOR(A) assume integral responsabilidade por multas de trânsito, infrações, acidentes, sinistros e quaisquer outros eventos relacionados ao uso do veículo.');
  
  y = drawSubClause('4.4.', 'O veículo será entregue com tanque de combustível conforme acordado entre as partes, juntamente com todos os acessórios e equipamentos obrigatórios.');
  
  // ===== CLÁUSULA QUINTA - DAS OBRIGAÇÕES =====
  y = drawClauseTitle('CLÁUSULA QUINTA – DAS OBRIGAÇÕES DAS PARTES');
  
  y = drawSubClause('5.1.', 'São obrigações do(a) VENDEDOR(A): a) entregar o veículo nas condições acordadas; b) fornecer toda documentação necessária para transferência; c) responder pela evicção e vícios ocultos, nos termos da lei; d) comunicar ao DETRAN a venda do veículo no prazo legal.');
  
  y = drawSubClause('5.2.', 'São obrigações do(a) COMPRADOR(A): a) efetuar o pagamento nas condições pactuadas; b) providenciar a transferência do veículo em seu nome no prazo legal de 30 (trinta) dias; c) arcar com todos os tributos e encargos incidentes sobre o veículo a partir da data da venda.');
  
  // ===== CLÁUSULA SEXTA - DO INADIMPLEMENTO =====
  y = drawClauseTitle('CLÁUSULA SEXTA – DO INADIMPLEMENTO E PENALIDADES');
  
  y = drawSubClause('6.1.', 'Em caso de atraso no pagamento de qualquer parcela, incidirá multa moratória de 2% (dois por cento) sobre o valor da parcela em atraso, acrescida de juros de 1% (um por cento) ao mês, calculados pro rata die.');
  
  y = drawSubClause('6.2.', 'O atraso superior a 30 (trinta) dias em qualquer parcela dará ao(à) VENDEDOR(A) o direito de considerar vencidas antecipadamente todas as parcelas restantes e exigir o pagamento integral do saldo devedor.');
  
  y = drawSubClause('6.3.', 'A rescisão contratual por culpa do(a) COMPRADOR(A) implicará na perda de 20% (vinte por cento) do valor total pago, a título de cláusula penal compensatória, sendo o restante devolvido em até 30 (trinta) dias.');
  
  y = drawSubClause('6.4.', 'A rescisão por culpa do(a) VENDEDOR(A) obriga à devolução integral dos valores pagos, acrescidos de correção monetária e multa de 10% (dez por cento).');
  
  // ===== CLÁUSULA SÉTIMA - GARANTIA LEGAL =====
  y = drawClauseTitle('CLÁUSULA SÉTIMA – DA GARANTIA');
  
  y = drawSubClause('7.1.', 'Por tratar-se de veículo usado, aplica-se a garantia legal de 90 (noventa) dias, conforme previsto no Código de Defesa do Consumidor, para vícios ocultos que impossibilitem o uso adequado do bem.');
  
  y = drawSubClause('7.2.', 'Eventuais garantias adicionais oferecidas pelo(a) VENDEDOR(A) serão formalizadas em Termo de Garantia específico, que integrará o presente contrato.');
  
  y = drawSubClause('7.3.', 'A garantia não cobre peças de desgaste natural, tais como: pneus, freios, embreagem, bateria, lâmpadas, correias, filtros e fluidos.');
  
  // ===== CLÁUSULA OITAVA - DECLARAÇÕES =====
  y = drawClauseTitle('CLÁUSULA OITAVA – DAS DECLARAÇÕES');
  
  y = drawSubClause('8.1.', 'O(A) VENDEDOR(A) declara que o veículo encontra-se em perfeitas condições de funcionamento, livre de quaisquer restrições judiciais, administrativas ou criminais.');
  
  y = drawSubClause('8.2.', 'O(A) COMPRADOR(A) declara estar ciente e de acordo com todas as condições do veículo, tendo realizado teste de rodagem e verificação dos itens de segurança.');
  
  y = drawSubClause('8.3.', 'Ambas as partes declaram que as informações prestadas neste contrato são verdadeiras, assumindo integral responsabilidade civil e criminal por sua veracidade.');
  
  // ===== CLÁUSULA NONA - DISPOSIÇÕES GERAIS =====
  y = drawClauseTitle('CLÁUSULA NONA – DAS DISPOSIÇÕES GERAIS');
  
  y = drawSubClause('9.1.', 'Este contrato obriga as partes e seus sucessores a qualquer título.');
  
  y = drawSubClause('9.2.', 'Qualquer tolerância ou concessão entre as partes não implica novação ou renúncia de direitos.');
  
  y = drawSubClause('9.3.', 'Eventuais alterações neste contrato somente terão validade se formalizadas por escrito e assinadas por ambas as partes.');
  
  // ===== CLÁUSULA DÉCIMA - DO FORO =====
  y = drawClauseTitle('CLÁUSULA DÉCIMA – DO FORO');
  
  y = drawSubClause('10.1.', `Fica eleito o foro da comarca de ${company.address.city}/${company.address.state} para dirimir quaisquer dúvidas ou litígios oriundos do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.`);
  
  y += 5;
  
  // ===== ENCERRAMENTO =====
  y = checkPageBreak(20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  const encerramento = `E por estarem assim justos e contratados, firmam o presente instrumento em 02 (duas) vias de igual teor e forma, na presença de 02 (duas) testemunhas, para que produza seus jurídicos e legais efeitos.`;
  const encerramentoLines = doc.splitTextToSize(encerramento, contentWidth);
  encerramentoLines.forEach((line: string) => {
    y = checkPageBreak(6);
    doc.text(line, marginLeft, y);
    y += 5;
  });
  
  y += 10;
  
  // Local e data
  y = checkPageBreak(15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(`${company.address.city}/${company.address.state}, ${formatDateFullPtBr(contract.createdAt)}.`, pageWidth / 2, y, { align: 'center' });
  y += 25;
  
  // ===== ASSINATURAS =====
  y = checkPageBreak(80);
  
  const sigWidth = 80;
  const leftX = marginLeft + 5;
  const rightX = pageWidth - marginRight - sigWidth - 5;
  
  // VENDEDOR
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('VENDEDOR(A)', leftX + sigWidth / 2, y, { align: 'center' });
  y += 5;
  
  // Signature box for vendor
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(leftX, y, sigWidth, 25);
  
  // Use vendor signature, or legal representative signature if available
  const vendorSig = contract.vendorSignature || company.legalRepresentative?.signature;
  if (vendorSig) {
    try {
      doc.addImage(vendorSig, 'PNG', leftX + 5, y + 2, sigWidth - 10, 21);
    } catch (e) {}
  }
  
  // COMPRADOR  
  doc.text('COMPRADOR(A)', rightX + sigWidth / 2, y - 5, { align: 'center' });
  doc.rect(rightX, y, sigWidth, 25);
  
  if (contract.clientSignature) {
    try {
      doc.addImage(contract.clientSignature, 'PNG', rightX + 5, y + 2, sigWidth - 10, 21);
    } catch (e) {}
  }
  
  y += 28;
  
  // Vendor info
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(company.fantasyName, leftX + sigWidth / 2, y, { align: 'center' });
  doc.text(`CNPJ: ${company.cnpj}`, leftX + sigWidth / 2, y + 4, { align: 'center' });
  
  // Client info
  doc.text(client.name.toUpperCase(), rightX + sigWidth / 2, y, { align: 'center' });
  doc.text(`CPF: ${formatCPF(client.cpf)}`, rightX + sigWidth / 2, y + 4, { align: 'center' });
  
  y += 20;
  
  // ===== TESTEMUNHAS =====
  y = checkPageBreak(50);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('TESTEMUNHAS:', marginLeft, y);
  y += 10;
  
  const witnessWidth = 75;
  
  // Testemunha 1
  doc.setDrawColor(180, 180, 180);
  doc.rect(leftX, y, witnessWidth, 20);
  y += 23;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  
  if (contract.witness1) {
    doc.text(`Nome: ${contract.witness1.name}`, leftX, y);
    doc.text(`RG: ${contract.witness1.rg}`, leftX, y + 5);
    doc.text(`CPF: ${formatCPF(contract.witness1.cpf)}`, leftX, y + 10);
  } else {
    doc.text('Nome: _________________________________', leftX, y);
    doc.text('RG: ________________', leftX, y + 5);
    doc.text('CPF: ________________', leftX, y + 10);
  }
  
  // Testemunha 2
  const witness2Y = y - 23;
  doc.rect(rightX, witness2Y, witnessWidth, 20);
  
  if (contract.witness2) {
    doc.text(`Nome: ${contract.witness2.name}`, rightX, y);
    doc.text(`RG: ${contract.witness2.rg}`, rightX, y + 5);
    doc.text(`CPF: ${formatCPF(contract.witness2.cpf)}`, rightX, y + 10);
  } else {
    doc.text('Nome: _________________________________', rightX, y);
    doc.text('RG: ________________', rightX, y + 5);
    doc.text('CPF: ________________', rightX, y + 10);
  }
  
  doc.save(`contrato-${contract.number}.pdf`);
}

// ===== WARRANTY PDF =====

export function generateWarrantyPDF(data: WarrantyPDFData): void {
  const { warranty, client, vehicle } = data;
  const company = getCompanyConfig();
  
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
  doc.text('TERMOS E CONDIÇÕES DA GARANTIA:', 20, y);
  y += 8;
  
  const warrantyTerms = [
    {
      num: '1.',
      text: `A ${company.fantasyName} concede uma cobertura de garantia para os conjuntos de motor e câmbio, para o veículo identificado acima, pelo período de 6 meses ou 200.000 km, a partir da data de entrega e quilometragem especificada, prevalecendo a condição que primeiro ocorrer.`
    },
    {
      num: '2.',
      text: 'A presente garantia se restringe a mão de obra e reposição de peças lubrificadas, dos conjuntos motor e câmbio, quando os referidos componentes apresentarem algum defeito.'
    },
    {
      num: '3.',
      text: 'A prestação de serviços e reposição de peças, objeto desta garantia, somente serão executados nas oficinas indicadas por esta empresa.'
    },
    {
      num: '4.',
      text: 'A presente garantia não cobre o pagamento ou outra forma de compensação, a qualquer título, de despesas ou danos, diretos ou indiretos, causados a pessoas ou bens em decorrência de defeito verificado no veículo.'
    },
    {
      num: '5.',
      text: 'Não estão incluídos na garantia quaisquer outros componentes que não os identificados no item acima, ficando assim expressamente excluídos: componentes de desgaste natural, sistema de arrefecimento, sistema de alimentação de combustível, sistemas eletrônicos, sistema de embreagem, sistema de sincronismo do motor, sistema de aspiração do motor, juntas homocinéticas, conjunto de suspensão, sistema de lubrificação e pressão de óleo, sistema de freio, coxins em geral, equipamentos e acessórios (rádios, compact disc, alarmes), sistema de ar-condicionado, direção hidráulica, rodas, pneus, conjunto de som e painel de instrumentos, carroceria e pintura em geral, bem como despesas de remoção.'
    },
  ];
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  
  const contentWidth = pageWidth - 40;
  
  warrantyTerms.forEach((term) => {
    doc.setFont('helvetica', 'bold');
    doc.text(term.num, 20, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(term.text, contentWidth - 10);
    doc.text(lines, 28, y);
    y += lines.length * 4 + 4;
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

export function generateTransferAuthPDF(data: TransferAuthPDFData): void {
  const { transfer, client, vehicle, vendor } = data;
  const company = getCompanyConfig();
  
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
  // Use vendor signature, or legal representative signature if available
  const vendorSig = transfer.vendorSignature || company.legalRepresentative?.signature;
  if (vendorSig) {
    try {
      doc.addImage(vendorSig, 'PNG', pageWidth / 2 - 40, y - 20, 80, 18);
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

export function generateWithdrawalPDF(data: WithdrawalPDFData): void {
  const { declaration, client, vehicle } = data;
  const company = getCompanyConfig();
  
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

export function generateReservationPDF(data: ReservationPDFData): void {
  const { reservation, client, vehicle } = data;
  const company = getCompanyConfig();
  
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
