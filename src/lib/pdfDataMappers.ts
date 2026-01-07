/**
 * PDF Data Mappers
 * Mapeia dados do Supabase para tipos esperados pelos geradores de PDF
 */

import type { Client, Vehicle, User, Contract, Warranty, TransferAuthorization, WithdrawalDeclaration, Reservation, Proposal, Receipt, MaritalStatus } from '@/types';
import type { Tables } from '@/integrations/supabase/types';

// Map marital status from DB to type
const maritalStatusMap: Record<string, MaritalStatus> = {
  solteiro: 'solteiro',
  casado: 'casado',
  divorciado: 'divorciado',
  viuvo: 'viuvo',
  uniao_estavel: 'uniao_estavel',
};

// Map fuel type from DB to display
const fuelDisplayMap: Record<string, string> = {
  flex: 'Flex',
  gasolina: 'Gasolina',
  etanol: 'Etanol',
  diesel: 'Diesel',
  eletrico: 'Elétrico',
  hibrido: 'Híbrido',
};

// Map transmission from DB to display
const transmissionDisplayMap: Record<string, string> = {
  manual: 'Manual',
  automatico: 'Automático',
  cvt: 'CVT',
  automatizado: 'Automatizado',
};

export function mapClientFromDB(dbClient: Tables<'clients'>): Client {
  return {
    id: dbClient.id,
    name: dbClient.name,
    rg: dbClient.rg || '',
    cpf: dbClient.cpf || '',
    phone: dbClient.phone || '',
    email: dbClient.email || '',
    maritalStatus: maritalStatusMap[dbClient.marital_status || ''] || 'solteiro',
    birthDate: dbClient.birth_date || undefined,
    occupation: dbClient.occupation || undefined,
    address: {
      street: dbClient.address || '',
      number: '',
      neighborhood: '',
      city: dbClient.city || '',
      state: dbClient.state || '',
      zipCode: dbClient.zip_code || '',
    },
    notes: dbClient.notes || undefined,
    vendorId: dbClient.seller_id || '',
    funnelStage: dbClient.funnel_stage as any,
    createdAt: dbClient.created_at,
    updatedAt: dbClient.updated_at,
  };
}

export function mapVehicleFromDB(dbVehicle: Tables<'vehicles'> & { vehicle_photos?: Tables<'vehicle_photos'>[] }): Vehicle {
  return {
    id: dbVehicle.id,
    brand: dbVehicle.brand,
    model: dbVehicle.model,
    year: dbVehicle.year_model,
    price: Number(dbVehicle.price),
    mileage: dbVehicle.mileage || 0,
    fuel: fuelDisplayMap[dbVehicle.fuel] as Vehicle['fuel'] || 'Flex',
    transmission: transmissionDisplayMap[dbVehicle.transmission] as Vehicle['transmission'] || 'Manual',
    color: dbVehicle.color,
    plate: dbVehicle.plate || undefined,
    chassis: dbVehicle.chassi || undefined,
    renavam: dbVehicle.renavam || undefined,
    crv: dbVehicle.crv_number || undefined,
    status: dbVehicle.status,
    images: dbVehicle.vehicle_photos?.map(p => p.photo_url) || [],
    description: dbVehicle.description || undefined,
    createdAt: dbVehicle.created_at,
    updatedAt: dbVehicle.updated_at,
  };
}

export function mapUserFromDB(dbProfile: Tables<'profiles'>): User {
  return {
    id: dbProfile.id,
    name: dbProfile.name,
    email: dbProfile.email,
    phone: dbProfile.phone || undefined,
    role: 'vendedor',
    status: 'ativo',
    createdAt: dbProfile.created_at,
  };
}

export function mapContractFromDB(dbContract: Tables<'contracts'>): Contract {
  const clientData = dbContract.client_data as any;
  const vehicleData = dbContract.vehicle_data as any;
  const witness1 = dbContract.witness1 as any;
  const witness2 = dbContract.witness2 as any;

  return {
    id: dbContract.id,
    number: dbContract.contract_number,
    proposalId: dbContract.proposal_id || undefined,
    clientId: dbContract.client_id || '',
    vehicleId: dbContract.vehicle_id || '',
    vendorId: dbContract.seller_id || '',
    vehiclePrice: Number(dbContract.vehicle_price) || 0,
    paymentType: dbContract.payment_type === 'parcelado' ? 'parcelado' : 'avista',
    downPayment: Number(dbContract.down_payment) || undefined,
    installments: dbContract.installments || undefined,
    installmentValue: Number(dbContract.installment_value) || undefined,
    dueDay: dbContract.due_day || undefined,
    firstDueDate: dbContract.first_due_date || undefined,
    deliveryPercentage: Number(dbContract.delivery_percentage) || 50,
    clientSignature: dbContract.client_signature || undefined,
    vendorSignature: dbContract.seller_signature || undefined,
    witness1: witness1 || undefined,
    witness2: witness2 || undefined,
    clientData: clientData || undefined,
    vehicleData: vehicleData || undefined,
    createdAt: dbContract.created_at,
  };
}

export function mapWarrantyFromDB(dbWarranty: Tables<'warranties'>): Warranty {
  return {
    id: dbWarranty.id,
    number: dbWarranty.warranty_number,
    contractId: dbWarranty.contract_id || undefined,
    clientId: dbWarranty.client_id || '',
    vehicleId: dbWarranty.vehicle_id || '',
    vendorId: dbWarranty.seller_id || '',
    warrantyPeriod: dbWarranty.warranty_period,
    warrantyCoverage: dbWarranty.warranty_coverage,
    warrantyKm: dbWarranty.warranty_km || undefined,
    conditions: dbWarranty.conditions || '',
    clientSignature: dbWarranty.client_signature || undefined,
    createdAt: dbWarranty.created_at,
  };
}

export function mapTransferFromDB(dbTransfer: Tables<'transfer_authorizations'>): TransferAuthorization {
  return {
    id: dbTransfer.id,
    number: dbTransfer.authorization_number,
    contractId: dbTransfer.contract_id || undefined,
    clientId: dbTransfer.client_id || '',
    vehicleId: dbTransfer.vehicle_id || '',
    vendorId: dbTransfer.seller_id || '',
    vehicleValue: Number(dbTransfer.vehicle_value) || 0,
    transferDate: dbTransfer.transfer_date,
    location: dbTransfer.location,
    vendorSignature: dbTransfer.vendor_signature || undefined,
    clientSignature: dbTransfer.client_signature || undefined,
    createdAt: dbTransfer.created_at,
  };
}

export function mapWithdrawalFromDB(dbWithdrawal: Tables<'withdrawal_declarations'>): WithdrawalDeclaration {
  return {
    id: dbWithdrawal.id,
    number: dbWithdrawal.declaration_number,
    clientId: dbWithdrawal.client_id || '',
    vehicleId: dbWithdrawal.vehicle_id || '',
    vendorId: dbWithdrawal.seller_id || '',
    reason: dbWithdrawal.reason || undefined,
    declarationDate: dbWithdrawal.declaration_date,
    clientSignature: dbWithdrawal.client_signature || undefined,
    createdAt: dbWithdrawal.created_at,
  };
}

export function mapReservationFromDB(dbReservation: Tables<'reservations'>): Reservation {
  return {
    id: dbReservation.id,
    number: dbReservation.reservation_number || '',
    clientId: dbReservation.client_id || '',
    vehicleId: dbReservation.vehicle_id || '',
    vendorId: dbReservation.seller_id || '',
    depositAmount: Number(dbReservation.deposit_amount) || undefined,
    reservationDate: dbReservation.reservation_date,
    validUntil: dbReservation.valid_until || '',
    status: dbReservation.status as any,
    clientSignature: dbReservation.client_signature || undefined,
    createdAt: dbReservation.created_at,
  };
}

export function mapProposalFromDB(dbProposal: Tables<'proposals'>, bankName?: string): Proposal {
  const typeMap: Record<string, 'bancario' | 'direto' | 'avista'> = {
    financiamento_bancario: 'bancario',
    financiamento_direto: 'direto',
    a_vista: 'avista',
  };

  return {
    id: dbProposal.id,
    number: dbProposal.proposal_number,
    clientId: dbProposal.client_id || '',
    vehicleId: dbProposal.vehicle_id || '',
    vendorId: dbProposal.seller_id || '',
    status: dbProposal.status as any,
    type: typeMap[dbProposal.type] || 'avista',
    bank: bankName || undefined,
    vehiclePrice: Number(dbProposal.vehicle_price) || 0,
    cashPrice: Number(dbProposal.cash_price) || undefined,
    downPayment: Number(dbProposal.down_payment) || 0,
    financedAmount: Number(dbProposal.financed_amount) || 0,
    installments: dbProposal.installments || 1,
    installmentValue: Number(dbProposal.installment_value) || 0,
    totalValue: Number(dbProposal.total_amount) || 0,
    isOwnFinancing: dbProposal.is_own_financing || false,
    clientSignature: dbProposal.client_signature || undefined,
    vendorSignature: dbProposal.vendor_signature || undefined,
    notes: dbProposal.notes || undefined,
    createdAt: dbProposal.created_at,
    updatedAt: dbProposal.updated_at,
  };
}

export function mapReceiptFromDB(dbReceipt: Tables<'receipts'>): Receipt {
  return {
    id: dbReceipt.id,
    number: dbReceipt.receipt_number,
    clientId: dbReceipt.client_id || '',
    vehicleId: dbReceipt.vehicle_id || undefined,
    proposalId: dbReceipt.proposal_id || undefined,
    vendorId: dbReceipt.seller_id || '',
    amount: Number(dbReceipt.amount) || 0,
    paymentMethod: dbReceipt.payment_method as any,
    reference: dbReceipt.payment_reference as any,
    payerName: dbReceipt.payer_name || '',
    payerCpf: dbReceipt.payer_cpf || '',
    paymentDate: dbReceipt.payment_date,
    description: dbReceipt.description || undefined,
    location: dbReceipt.location || 'Lages - SC',
    clientSignature: dbReceipt.client_signature || undefined,
    vendorSignature: dbReceipt.vendor_signature || undefined,
    createdAt: dbReceipt.created_at,
  };
}
