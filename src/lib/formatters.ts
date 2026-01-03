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
  // Import the proper function from dateUtils
  const { formatDateDisplay } = require('./dateUtils');
  return formatDateDisplay(date);
}

/**
 * @deprecated Use formatDateTimeDisplay from dateUtils.ts instead
 */
export function formatDateTime(date: string | Date): string {
  const { formatDateTimeDisplay } = require('./dateUtils');
  return formatDateTimeDisplay(date);
}

export function formatMileage(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value) + ' km';
}

export function formatPercent(value: number): string {
  return value.toFixed(2).replace('.', ',') + '%';
}

export function numberToWords(value: number): string {
  const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  if (value === 0) return 'zero reais';
  if (value === 100) return 'cem reais';

  const intPart = Math.floor(value);
  const decPart = Math.round((value - intPart) * 100);

  let result = '';

  // Thousands
  if (intPart >= 1000) {
    const thousands = Math.floor(intPart / 1000);
    if (thousands === 1) {
      result += 'mil';
    } else if (thousands < 10) {
      result += units[thousands] + ' mil';
    } else if (thousands < 20) {
      result += teens[thousands - 10] + ' mil';
    } else {
      const t = Math.floor(thousands / 10);
      const u = thousands % 10;
      result += tens[t] + (u > 0 ? ' e ' + units[u] : '') + ' mil';
    }
  }

  // Hundreds
  const remainder = intPart % 1000;
  if (remainder >= 100) {
    if (result) result += ' ';
    const h = Math.floor(remainder / 100);
    if (remainder === 100) {
      result += 'cem';
    } else {
      result += hundreds[h];
    }
  }

  // Tens and units
  const tensUnits = remainder % 100;
  if (tensUnits > 0) {
    if (result && remainder >= 100) result += ' e ';
    else if (result) result += ' e ';

    if (tensUnits < 10) {
      result += units[tensUnits];
    } else if (tensUnits < 20) {
      result += teens[tensUnits - 10];
    } else {
      const t = Math.floor(tensUnits / 10);
      const u = tensUnits % 10;
      result += tens[t] + (u > 0 ? ' e ' + units[u] : '');
    }
  }

  result += intPart === 1 ? ' real' : ' reais';

  if (decPart > 0) {
    result += ' e ';
    if (decPart < 10) {
      result += units[decPart];
    } else if (decPart < 20) {
      result += teens[decPart - 10];
    } else {
      const t = Math.floor(decPart / 10);
      const u = decPart % 10;
      result += tens[t] + (u > 0 ? ' e ' + units[u] : '');
    }
    result += decPart === 1 ? ' centavo' : ' centavos';
  }

  return result.charAt(0).toUpperCase() + result.slice(1);
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
