import { ECurrency} from '../enums/currency'
import { ELocale } from '../enums/locale'

export function formatToCurrency(currency: ECurrency, amount: number): string {
  let locale = ELocale.VIETNAMESE

  if (currency === ECurrency.VND) {
    locale = ELocale.VIETNAMESE
  } else {
    locale = ELocale.ENGLISH
  }

  return new Intl.NumberFormat(locale.toString(), {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount)
}

export function getCurrencySymbol(currency: ECurrency): string {
  let locale = ELocale.VIETNAMESE

  if (currency === ECurrency.VND) {
    locale = ELocale.VIETNAMESE
  } else {
    locale = ELocale.ENGLISH
  }

  const formatted = new Intl.NumberFormat(locale.toString(), {
    style: 'currency',
    currency,
  }).format(0)

  return formatted.replace(/[\d\s.,]/g, '').trim()
}

export function formatToVND(amount: number): string {
  return new Intl.NumberFormat(ELocale.VIETNAMESE, {
    style: 'currency',
    currency: ECurrency.VND,
  }).format(amount)
}

export function convertCurrency(
  amount: number,
  fromCurrency: ECurrency,
  toCurrency: ECurrency,
  rates: Record<string, number>,
): number {
  if (fromCurrency === toCurrency) {
    return amount
  }

  const rate = rates[toCurrency.toLowerCase()]
  if (!rate) {
    throw new Error(`No exchange rate found for ${fromCurrency} -> ${toCurrency}`)
  }

  return amount * rate
}

type CurrencyRates = {
  usd?: number
  vnd?: number
  php?: number
}

type ConvertedPrices = {
  usd: number
  vnd: number
  php: number
}

export function convertToAllCurrencies(
  amount: number,
  baseCurrency: ECurrency,
  realTimeRates?: CurrencyRates
): ConvertedPrices {
  const convert = (targetCurrency: ECurrency): number => {
    if (baseCurrency === targetCurrency) {
      return amount
    }

    const targetKey = targetCurrency.toLowerCase() as keyof CurrencyRates
    const rate = realTimeRates?.[targetKey]

    if (rate === undefined) {
      throw new Error(`No exchange rate found for ${baseCurrency} -> ${targetCurrency}`)
    }

    return amount * rate
  }

  return {
    usd: convert(ECurrency.USD),
    vnd: convert(ECurrency.VND),
    php: convert(ECurrency.PHP),
  }
}