/**
 * Company configuration - fixed data for PDFs and documents
 * Note: Legal representative data is now stored in Supabase (company_settings table)
 * Use the useLegalRepresentative hook for the latest data
 */

export interface LegalRepresentative {
  name: string;
  nationality: string;
  maritalStatus: string;
  occupation: string;
  rg: string;
  cpf: string;
  signature?: string; // Assinatura/rubrica em base64
}

export interface CompanyConfig {
  name: string;
  fantasyName: string;
  cnpj: string;
  address: {
    street: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  phone?: string;
  email?: string;
  logo?: string;
  legalRepresentative?: LegalRepresentative;
}

// Default legal representative (Jackson Delfes de Moraes)
export const DEFAULT_LEGAL_REPRESENTATIVE: LegalRepresentative = {
  name: 'Jackson Delfes de Moraes',
  nationality: 'Brasileiro',
  maritalStatus: 'casado(a)',
  occupation: 'Empresário',
  rg: '4.663.620',
  cpf: '039.855.889-05',
  signature: '',
};

const DEFAULT_COMPANY: CompanyConfig = {
  name: 'Autos da Serra',
  fantasyName: 'AUTO DA SERRA MULTIMARCAS',
  cnpj: '29.030.365/0001-40',
  address: {
    street: 'Av. Dom Pedro II',
    neighborhood: 'São Cristóvão',
    city: 'Lages',
    state: 'SC',
    zipCode: '88509-001',
  },
  phone: '(49) 9999-9999',
  email: 'jacksonautomoveislages@gmail.com',
  legalRepresentative: DEFAULT_LEGAL_REPRESENTATIVE,
};

export function getCompanyConfig(): CompanyConfig {
  return DEFAULT_COMPANY;
}

/**
 * Get company config with a specific legal representative
 * Used by PDF generators that fetch the legal rep from Supabase
 */
export function getCompanyConfigWithLegalRep(legalRep?: LegalRepresentative): CompanyConfig {
  return {
    ...DEFAULT_COMPANY,
    legalRepresentative: legalRep || DEFAULT_LEGAL_REPRESENTATIVE,
  };
}

export function formatCompanyAddress(): string {
  const config = getCompanyConfig();
  return `${config.address.street}, ${config.address.neighborhood} - ${config.address.city}/${config.address.state} - CEP ${config.address.zipCode}`;
}

export function formatCompanyShortAddress(): string {
  const config = getCompanyConfig();
  return `${config.address.city} - ${config.address.state}`;
}
