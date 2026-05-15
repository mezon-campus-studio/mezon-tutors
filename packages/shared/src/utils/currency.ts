import { CURRENCY_RATE_API_URLS } from '../constants/currency';
import { ECurrency } from '../enums/currency';
import { ELocale } from '../enums/locale';

export function formatToCurrency(currency: ECurrency, amount: number): string {
  let locale = ELocale.VIETNAMESE;

  if (currency === ECurrency.VND) {
    locale = ELocale.VIETNAMESE;
  } else {
    locale = ELocale.ENGLISH;
  }

  return new Intl.NumberFormat(locale.toString(), {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
}

function amountGroupingLocale(currency: ECurrency): string {
  if (currency === ECurrency.VND) {
    return ELocale.VIETNAMESE;
  }
  if (currency === ECurrency.PHP) {
    return 'en-PH';
  }
  return ELocale.ENGLISH;
}

export function toCanonicalCurrencyAmountInput(raw: string, currency: ECurrency): string {
  const t = raw.replace(/\s/g, '');
  if (!t) {
    return '';
  }
  if (currency === ECurrency.VND) {
    const noCommas = t.replace(/,/g, '');
    const parts = noCommas.split('.');
    if (parts.length === 1) {
      return parts[0].replace(/\D/g, '');
    }
    const last = parts[parts.length - 1].replace(/\D/g, '');
    const heads = parts.slice(0, -1).map((p) => p.replace(/\D/g, ''));
    if (parts.length === 2 && heads[0] !== '') {
      if (last.length > 0 && last.length <= 2) {
        return `${heads[0]}.${last}`;
      }
      if (last.length === 0) {
        return `${heads[0]}.`;
      }
    }
    return [...heads, last].join('');
  }
  const cleaned = t.replace(/,/g, '').replace(/[^\d.]/g, '');
  if (!cleaned) {
    return '';
  }
  const dot = cleaned.indexOf('.');
  const intDigits = (dot === -1 ? cleaned : cleaned.slice(0, dot)).replace(/\D/g, '');
  const fracDigits =
    dot === -1
      ? ''
      : cleaned
          .slice(dot + 1)
          .replace(/\D/g, '')
          .slice(0, 2);
  if (dot !== -1) {
    if (fracDigits.length > 0) {
      return `${intDigits}.${fracDigits}`;
    }
    return intDigits === '' && cleaned.startsWith('.') ? '0.' : `${intDigits}.`;
  }
  return intDigits;
}

export function formatCurrencyAmountInputDisplay(currency: ECurrency, canonical: string): string {
  const t = canonical.trim();
  if (!t) {
    return '';
  }
  const hasTrailingDot = t.endsWith('.') && t !== '.';
  const parseStr = hasTrailingDot ? t.slice(0, -1) : t;
  const n = Number.parseFloat(parseStr);
  if (Number.isNaN(n)) {
    return canonical;
  }
  const formatted = new Intl.NumberFormat(amountGroupingLocale(currency), {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(n);
  return hasTrailingDot ? `${formatted}.` : formatted;
}

export function getCurrencySymbol(currency: ECurrency): string {
  let locale = ELocale.VIETNAMESE;

  if (currency === ECurrency.VND) {
    locale = ELocale.VIETNAMESE;
  } else {
    locale = ELocale.ENGLISH;
  }

  const formatted = new Intl.NumberFormat(locale.toString(), {
    style: 'currency',
    currency,
  }).format(0);

  return formatted.replace(/[\d\s.,]/g, '').trim();
}

export function formatToVND(amount: number): string {
  return new Intl.NumberFormat(ELocale.VIETNAMESE, {
    style: 'currency',
    currency: ECurrency.VND,
  }).format(amount);
}

export function convertCurrency(
  amount: number,
  fromCurrency: ECurrency,
  toCurrency: ECurrency,
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rate = rates[toCurrency.toLowerCase()];
  if (!rate) {
    throw new Error(`No exchange rate found for ${fromCurrency} -> ${toCurrency}`);
  }

  return amount * rate;
}

export async function fetchCurrencyRates(baseCurrency: ECurrency): Promise<Record<string, number>> {
  const base = baseCurrency.toLowerCase();
  const urls = CURRENCY_RATE_API_URLS.map((url) => `${url}/${base}.json`);
  let lastError: unknown;
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = (await response.json()) as Record<string, Record<string, number>>;
      const rates = data[base];
      if (!rates || typeof rates !== 'object') {
        throw new Error(`Invalid response format for ${baseCurrency}`);
      }
      return rates;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Failed to fetch exchange rates for ${baseCurrency}: ${String(lastError)}`);
}

type CurrencyRates = {
  usd?: number;
  vnd?: number;
  php?: number;
};

type ConvertedPrices = {
  usd: number;
  vnd: number;
  php: number;
};

export function convertToAllCurrencies(
  amount: number,
  baseCurrency: ECurrency,
  realTimeRates?: CurrencyRates
): ConvertedPrices {
  const convert = (targetCurrency: ECurrency): number => {
    if (baseCurrency === targetCurrency) {
      return amount;
    }

    const targetKey = targetCurrency.toLowerCase() as keyof CurrencyRates;
    const rate = realTimeRates?.[targetKey];

    if (rate === undefined) {
      throw new Error(`No exchange rate found for ${baseCurrency} -> ${targetCurrency}`);
    }

    return amount * rate;
  };

  return {
    usd: convert(ECurrency.USD),
    vnd: convert(ECurrency.VND),
    php: convert(ECurrency.PHP),
  };
}

export function triPricesFromMonthlyBase(
  amount: number,
  baseCurrency: ECurrency,
  rates: Record<string, number>
): ConvertedPrices {
  const r = (code: string) => {
    const v = rates[code] ?? rates[code.toLowerCase()];
    if (v === undefined || Number.isNaN(v)) {
      throw new Error(`Missing exchange rate for ${baseCurrency} -> ${code}`);
    }
    return v;
  };
  const patch: CurrencyRates = {
    usd: baseCurrency === ECurrency.USD ? undefined : r('usd'),
    vnd: baseCurrency === ECurrency.VND ? undefined : r('vnd'),
    php: baseCurrency === ECurrency.PHP ? undefined : r('php'),
  };
  return convertToAllCurrencies(amount, baseCurrency, patch);
}
