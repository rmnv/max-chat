import { describe, expect, it } from 'vitest'

import { initialsFromTitle } from './text'

describe('initialsFromTitle', () => {
  it('берёт первые буквы двух слов', () => {
    expect(initialsFromTitle('Анна Иванова')).toBe('АИ')
  })

  it('берёт две первые буквы одного слова', () => {
    expect(initialsFromTitle('Анна')).toBe('АН')
  })

  it('возвращает знак вопроса для пустой строки', () => {
    expect(initialsFromTitle('   ')).toBe('?')
  })
})
