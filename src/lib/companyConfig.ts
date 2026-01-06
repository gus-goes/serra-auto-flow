/**
 * Company configuration - fixed data for PDFs and documents
 */

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
}

const STORAGE_KEY = 'autos_serra_company_config';

const DEFAULT_COMPANY: CompanyConfig = {
  name: 'Autos da Serra',
  fantasyName: 'AUTOS DA SERRA',
  cnpj: '29.030.365/0001-40',
  address: {
    street: 'Av. Dom Pedro II',
    neighborhood: 'São Cristóvão',
    city: 'Lages',
    state: 'SC',
    zipCode: '88.509-000',
  },
  phone: '(49) 9999-9999',
  email: 'contato@autosdoserra.com.br',
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
