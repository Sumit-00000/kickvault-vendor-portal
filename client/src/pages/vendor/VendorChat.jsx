import { useAuth } from '../../auth'
import ChatThread from '../../components/ChatThread'

export default function VendorChat() {
  const { user } = useAuth()
  return (
    <div className="page-narrow chat-page">
      <div className="page-head">
        <h2>Chat with KickVault</h2>
      </div>
      <div className="card chat-card">
        <ChatThread vendorId={user.id} />
      </div>
    </div>
  )
}
