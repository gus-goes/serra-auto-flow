import { formatDateDisplay, formatDateTimeDisplay } from './dateUtils';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
}

/**
 * @deprecated Use formatDateDisplay from dateUtils.ts instead
 */
export function formatDate(date: string | Date): string {
  return formatDateDisplay(date);
}

/**
 * @deprecated Use formatDateTimeDisplay from dateUtils.ts instead
 */
export function formatDateTime(date: string | Date): string {
  return formatDateTimeDisplay(date);
}

export function formatMileage(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value) + ' km';
}

export function formatPercent(value: number): string {
  return value.toFixed(2).replace('.', ',') + '%';
}

/**
 * Convert a number to words in Portuguese (Brazilian)
 * Fixed implementation to handle all edge cases without undefined
 */
export function numberToWords(value: number): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'zero reais';
  }

  const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  if (value === 0) return 'zero reais';

  const intPart = Math.floor(Math.abs(value));
  const decPart = Math.round((Math.abs(value) - intPart) * 100);

  let result = '';

  // Handle millions
  if (intPart >= 1000000) {
    const millions = Math.floor(intPart / 1000000);
    if (millions === 1) {
      result += 'um milhão';
    } else {
      result += convertHundreds(millions, units, teens, tens, hundreds) + ' milhões';
    }
  }

  // Handle thousands
  const thousandsPart = Math.floor((intPart % 1000000) / 1000);
  if (thousandsPart > 0) {
    if (result) result += ' ';
    if (thousandsPart === 1) {
      result += 'mil';
    } else {
      result += convertHundreds(thousandsPart, units, teens, tens, hundreds) + ' mil';
    }
  }

  // Handle hundreds, tens, and units
  const remainder = intPart % 1000;
  if (remainder > 0) {
    if (result) {
      result += ' e ';
    }
    if (remainder === 100) {
      result += 'cem';
    } else {
      result += convertHundreds(remainder, units, teens, tens, hundreds);
    }
  }

  // Handle case where intPart is 0 but we have decimals
  if (intPart === 0 && decPart > 0) {
    result = '';
  } else if (intPart > 0) {
    result += intPart === 1 ? ' real' : ' reais';
  }

  // Handle cents
  if (decPart > 0) {
    if (intPart > 0) {
      result += ' e ';
    }
    if (decPart < 10) {
      result += units[decPart] || '';
    } else if (decPart < 20) {
      result += teens[decPart - 10] || '';
    } else {
      const t = Math.floor(decPart / 10);
      const u = decPart % 10;
      result += (tens[t] || '') + (u > 0 ? ' e ' + (units[u] || '') : '');
    }
    result += decPart === 1 ? ' centavo' : ' centavos';
  }

  // Capitalize first letter
  const finalResult = result.trim();
  if (!finalResult) return 'zero reais';
  
  return finalResult.charAt(0).toUpperCase() + finalResult.slice(1);
}

/**
 * Helper function to convert numbers up to 999 to words
 */
function convertHundreds(
  num: number,
  units: string[],
  teens: string[],
  tens: string[],
  hundreds: string[]
): string {
  let result = '';

  // Hundreds
  if (num >= 100) {
    const h = Math.floor(num / 100);
    const remainder = num % 100;
    if (num === 100) {
      return 'cem';
    }
    result += hundreds[h] || '';
    if (remainder > 0) {
      result += ' e ';
    }
  }

  // Tens and units
  const tensUnits = num % 100;
  if (tensUnits > 0) {
    if (tensUnits < 10) {
      result += units[tensUnits] || '';
    } else if (tensUnits < 20) {
      result += teens[tensUnits - 10] || '';
    } else {
      const t = Math.floor(tensUnits / 10);
      const u = tensUnits % 10;
      result += (tens[t] || '') + (u > 0 ? ' e ' + (units[u] || '') : '');
    }
  }

  return result;
}

export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function isValidCPF(cpf: string): boolean {
  const cleaned = cleanCPF(cpf);
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  if (parseInt(cleaned.charAt(9)) !== digit) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  if (parseInt(cleaned.charAt(10)) !== digit) return false;

  return true;
}

/**
 * Mask sensitive data for privacy mode
 */
export function maskCPF(cpf: string): string {
  return '***.***.***-**';
}

export function maskPhone(phone: string): string {
  return '(**) *****-****';
}

export function maskCurrency(value: number): string {
  return 'R$ *****,**';
}

export function maskName(name: string): string {
  if (!name) return '';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].charAt(0) + '.';
  const first = parts[0];
  const lastInitials = parts.slice(1).map(p => p.charAt(0) + '.').join(' ');
  return `${first} ${lastInitials}`;
}

export function maskNumber(num: string): string {
  return '****';
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function formatRG(rg: string): string {
  // RG can have different formats, just clean and return formatted
  return rg.replace(/[^\w]/g, '').toUpperCase();
}

export function cleanRG(rg: string): string {
  return rg.replace(/[^\w]/g, '').toUpperCase();
}

export const maritalStatusLabels: Record<string, string> = {
  solteiro: 'Solteiro(a)',
  casado: 'Casado(a)',
  divorciado: 'Divorciado(a)',
  viuvo: 'Viúvo(a)',
  uniao_estavel: 'União Estável',
};
