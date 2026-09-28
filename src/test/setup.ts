import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Глобальные функции Vitest не включены, поэтому автоочистка Testing Library
// не регистрируется сама — делаем это явно.
afterEach(cleanup)
