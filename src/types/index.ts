export type UserRole = 'admin' | 'vendedor';
export type UserStatus = 'ativo' | 'inativo';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string; // Added vendor phone
  role: UserRole;
  status: UserStatus;
  passwordHash?: string;
  avatar?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuel: 'Gasolina' | 'Etanol' | 'Flex' | 'Diesel' | 'Elétrico' | 'Híbrido';
  transmission: 'Manual' | 'Automático' | 'CVT' | 'Automatizado';
  color: string;
  plate?: string;
  chassis?: string; // Número do chassi (17 caracteres)
  renavam?: string; // Código Renavam (11 dígitos)
  crv?: string; // Número do CRV (Certificado de Registro de Veículo)
  status: 'disponivel' | 'reservado' | 'vendido';
  images: string[]; // Base64 encoded images
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type MaritalStatus = 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'uniao_estavel';

export interface Client {
  id: string;
  name: string;
  rg: string; // Required
  cpf: string; // Required
  phone: string;
  email: string; // Required
  maritalStatus: MaritalStatus; // Required
  birthDate?: string; // Optional - YYYY-MM-DD
  occupation?: string; // Optional
  address: { // Required
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  deliveryAddress?: { // Optional - different delivery address
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  notes?: string;
  vendorId: string;
  funnelStage: FunnelStage;
  createdAt: string;
  updatedAt: string;
}

export type FunnelStage = 'lead' | 'atendimento' | 'simulacao' | 'proposta' | 'vendido' | 'perdido';

export interface Bank {
  id: string;
  name: string;
  slug?: string;
  color?: string;
  colorHex?: string;
  logo?: string;
  rates: {
    12: number;
    24: number;
    36: number;
    48: number;
    60: number;
  };
  commission: number;
  active: boolean;
}

export interface Simulation {
  id: string;
  vehicleId: string;
  clientId: string;
  vendorId: string;
  vehiclePrice: number;
  downPayment: number;
  financedAmount: number;
  bank: string;
  installments: number;
  rate: number;
  installmentValue: number;
  totalValue: number;
  cet: number;
  vendorCommission: number;
  storeMargin: number;
  createdAt: string;
}

export type ProposalStatus = 'negociacao' | 'enviada' | 'aprovada' | 'reprovada' | 'vendida';
export type ProposalType = 'bancario' | 'direto' | 'avista';

export interface Proposal {
  id: string;
  number: string;
  clientId: string;
  vehicleId: string;
  vendorId: string;
  simulationId?: string;
  status: ProposalStatus;
  type: ProposalType; // New: proposal type
  bank?: string; // Only for bancario type
  vehiclePrice: number;
  cashPrice?: number; // Only for avista type
  downPayment: number;
  financedAmount: number;
  installments: number;
  installmentValue: number;
  totalValue: number;
  isOwnFinancing?: boolean; // Deprecated, use type === 'direto'
  clientSignature?: string;
  vendorSignature?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'transferencia' | 'cartao';
export type PaymentReference = 'entrada' | 'sinal' | 'parcial' | 'quitacao';

export interface Receipt {
  id: string;
  number: string;
  clientId: string;
  vehicleId?: string;
  proposalId?: string;
  vendorId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference: PaymentReference;
  payerName: string;
  payerCpf: string;
  paymentDate: string; // YYYY-MM-DD format
  description?: string;
  location: string;
  clientSignature?: string;
  vendorSignature?: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  proposalId: string;
  vehicleId: string;
  clientId: string;
  vendorId: string;
  totalValue: number;
  commission: number;
  saleDate: string; // YYYY-MM-DD format
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
}

// ===== DOCUMENTOS =====

// Contrato de Compra e Venda
export interface Contract {
  id: string;
  number: string;
  proposalId?: string;
  clientId: string;
  vehicleId: string;
  vendorId: string;
  vehiclePrice: number;
  paymentType: 'avista' | 'parcelado';
  downPayment?: number;
  installments?: number;
  installmentValue?: number;
  deliveryDate?: string;
  clientSignature?: string;
  vendorSignature?: string;
  witness1?: { name: string; rg: string; cpf: string };
  witness2?: { name: string; rg: string; cpf: string };
  createdAt: string;
}

// Termo de Garantia
export interface Warranty {
  id: string;
  number: string;
  contractId?: string;
  clientId: string;
  vehicleId: string;
  vendorId: string;
  warrantyPeriod: string; // Ex: "3 meses" ou "90 dias"
  warrantyCoverage: string; // Ex: "motor" ou "motor e câmbio"
  warrantyKm?: number; // Km limite
  conditions: string;
  clientSignature?: string;
  createdAt: string;
}

// Autorização de Transferência (ATPV)
export interface TransferAuthorization {
  id: string;
  number: string;
  contractId?: string;
  clientId: string;
  vehicleId: string;
  vendorId: string;
  vehicleValue: number;
  transferDate: string;
  location: string;
  vendorSignature?: string;
  clientSignature?: string;
  createdAt: string;
}

// Declaração de Desistência
export interface WithdrawalDeclaration {
  id: string;
  number: string;
  clientId: string;
  vehicleId: string;
  vendorId: string;
  reason?: string;
  declarationDate: string;
  clientSignature?: string;
  createdAt: string;
}

// Termo de Reserva
export type ReservationStatus = 'ativa' | 'convertida' | 'cancelada' | 'expirada';

export interface Reservation {
  id: string;
  number: string;
  clientId: string;
  vehicleId: string;
  vendorId: string;
  depositAmount?: number;
  reservationDate: string;
  validUntil: string; // 10 dias padrão
  status: ReservationStatus;
  clientSignature?: string;
  createdAt: string;
}
