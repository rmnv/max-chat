import { useSession } from './hooks/useSession'
import { ChatScreen } from './components/ChatScreen'
import { LoginScreen } from './components/LoginScreen'

export default function App() {
  const { credentials, signIn, signOut } = useSession()

  if (!credentials) {
    return <LoginScreen initialCredentials={credentials} onSubmit={signIn} />
  }

  return <ChatScreen key={credentials.idInstance} credentials={credentials} onSignOut={signOut} />
}
