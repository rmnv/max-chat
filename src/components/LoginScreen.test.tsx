import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { LoginScreen } from './LoginScreen'

describe('LoginScreen', () => {
  it('не отправляет форму с нечисловым номером инстанса', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<LoginScreen initialCredentials={null} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('idInstance'), 'не-число')
    await user.type(screen.getByLabelText('apiTokenInstance'), 'secret-token-value')
    await user.click(screen.getByRole('button', { name: 'Подключить инстанс' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/состоит из цифр/)).toBeInTheDocument()
  })

  it('проверяет длину ключа доступа', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<LoginScreen initialCredentials={null} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('idInstance'), '3100000001')
    await user.type(screen.getByLabelText('apiTokenInstance'), '123')
    await user.click(screen.getByRole('button', { name: 'Подключить инстанс' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/Проверьте apiTokenInstance/)).toBeInTheDocument()
  })

  it('передаёт учётные данные без пробелов по краям', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<LoginScreen initialCredentials={null} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('idInstance'), '3100000001')
    await user.type(screen.getByLabelText('apiTokenInstance'), '  secret-token-value  ')
    await user.click(screen.getByRole('button', { name: 'Подключить инстанс' }))

    expect(onSubmit).toHaveBeenCalledWith({
      idInstance: '3100000001',
      apiTokenInstance: 'secret-token-value',
      apiUrl: 'https://api.green-api.com',
    })
  })

  it('подставляет сохранённые данные', () => {
    render(
      <LoginScreen
        initialCredentials={{
          idInstance: '3100000009',
          apiTokenInstance: 'saved-token',
          apiUrl: 'https://3100.api.green-api.com',
        }}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('idInstance')).toHaveValue('3100000009')
    expect(screen.getByLabelText('apiTokenInstance')).toHaveValue('saved-token')
  })
})
