import { describe, expect, it } from 'vitest'

import { formatPhone, normalizePhone } from './phone'

describe('normalizePhone', () => {
  it('принимает номер в международном формате', () => {
    expect(normalizePhone('79991234567')).toEqual({ ok: true, digits: '79991234567' })
  })

  it('убирает пробелы, дефисы и скобки', () => {
    expect(normalizePhone('+7 (999) 123-45-67')).toEqual({ ok: true, digits: '79991234567' })
  })

  it('заменяет начальную 8 на 7', () => {
    expect(normalizePhone('8 999 123 45 67')).toEqual({ ok: true, digits: '79991234567' })
  })

  it('принимает номера Беларуси', () => {
    expect(normalizePhone('375291234567')).toEqual({ ok: true, digits: '375291234567' })
  })

  it('отклоняет пустое значение', () => {
    expect(normalizePhone('   ')).toMatchObject({ ok: false })
  })

  it('отклоняет слишком короткий номер', () => {
    expect(normalizePhone('9991234')).toMatchObject({ ok: false })
  })

  it('отклоняет неподдерживаемую страну', () => {
    expect(normalizePhone('14155552671')).toMatchObject({ ok: false })
  })
})

describe('formatPhone', () => {
  it('группирует российский номер', () => {
    expect(formatPhone('79991234567')).toBe('+7 (999) 123-45-67')
  })

  it('группирует белорусский номер', () => {
    expect(formatPhone('375291234567')).toBe('+375 (29) 123-45-67')
  })
})
