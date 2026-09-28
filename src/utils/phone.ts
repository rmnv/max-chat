const RUSSIAN_CODE = '7'
const RUSSIAN_LENGTH = 11
const BELARUSIAN_CODE = '375'
const BELARUSIAN_LENGTH = 12

export type PhoneParseResult = { ok: true; digits: string } | { ok: false; error: string }

export function normalizePhone(input: string): PhoneParseResult {
  let digits = input.replace(/\D/g, '')

  if (digits === '') {
    return { ok: false, error: 'Введите номер телефона получателя.' }
  }

  if (digits.length === RUSSIAN_LENGTH && digits.startsWith('8')) {
    digits = `${RUSSIAN_CODE}${digits.slice(1)}`
  }

  if (digits.startsWith(RUSSIAN_CODE) && digits.length === RUSSIAN_LENGTH) {
    return { ok: true, digits }
  }

  if (digits.startsWith(BELARUSIAN_CODE) && digits.length === BELARUSIAN_LENGTH) {
    return { ok: true, digits }
  }

  return {
    ok: false,
    error: 'Нужен номер в международном формате: 11 цифр для России (7...) или 12 цифр для Беларуси (375...).',
  }
}

export function formatPhone(digits: string): string {
  if (digits.startsWith(BELARUSIAN_CODE) && digits.length === BELARUSIAN_LENGTH) {
    const rest = digits.slice(BELARUSIAN_CODE.length)
    return `+${BELARUSIAN_CODE} (${rest.slice(0, 2)}) ${rest.slice(2, 5)}-${rest.slice(5, 7)}-${rest.slice(7)}`
  }

  if (digits.startsWith(RUSSIAN_CODE) && digits.length === RUSSIAN_LENGTH) {
    const rest = digits.slice(RUSSIAN_CODE.length)
    return `+${RUSSIAN_CODE} (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6, 8)}-${rest.slice(8)}`
  }

  return `+${digits}`
}
