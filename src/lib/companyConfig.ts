/**
 * Company configuration - fixed data for PDFs and documents
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

const STORAGE_KEY = 'autos_serra_company_config';

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
  legalRepresentative: {
    name: 'JACKSON DELFES DE MORAES',
    nationality: 'Brasileiro',
    maritalStatus: 'solteiro(a)',
    occupation: 'Empresário',
    rg: '3047601',
    cpf: '875.174.417-87',
  },
};

export function getCompanyConfig(): CompanyConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_COMPANY, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_COMPANY;
}

export function saveCompanyConfig(config: Partial<CompanyConfig>): void {
  const current = getCompanyConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function formatCompanyAddress(): string {
  const config = getCompanyConfig();
  return `${config.address.street}, ${config.address.neighborhood} - ${config.address.city}/${config.address.state} - CEP ${config.address.zipCode}`;
}

export function formatCompanyShortAddress(): string {
  const config = getCompanyConfig();
  return `${config.address.city} - ${config.address.state}`;
}
