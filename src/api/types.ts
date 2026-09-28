export interface Credentials {
  idInstance: string
  apiTokenInstance: string
  apiUrl: string
}

export type InstanceState =
  | 'authorized'
  | 'notAuthorized'
  | 'blocked'
  | 'starting'
  | 'suspended'
  | 'pendingPassword'

export interface GetStateInstanceResponse {
  stateInstance: InstanceState
}

export type CheckAccountResponse =
  | { exist: true; chatId: string; fromCache: boolean }
  | { exist: false; chatId: ''; fromCache: boolean }
  | { status: false; reason: string }

export interface SendMessageResponse {
  idMessage: string
}

export interface DeleteNotificationResponse {
  result: boolean
  reason?: string
}

export interface ReceiveNotificationResponse {
  receiptId: number
  body: NotificationBody | null
}

export interface InstanceData {
  idInstance: number
  wid: string
  typeInstance: string
}

export interface SenderData {
  chatId: string
  chatName?: string
  chatType?: 'user' | 'group' | string
  sender: string
  senderName?: string
  senderType?: 'user' | string
  senderContactName?: string
  senderPhoneNumber?: number | string
}

export interface MessageData {
  typeMessage: string
  textMessageData?: {
    textMessage: string
    isForwarded?: boolean
    forwardingScore?: number
  }
  quotedMessage?: {
    stanzaId: string
    participant: string
  }
}

export type OutgoingMessageStatus = 'delivered' | 'read' | 'failed' | 'noAccount' | 'notInGroup'

export type Switch = 'yes' | 'no'

export interface InstanceSettings {
  wid: string
  typeInstance: string
  webhookUrl: string
  webhookUrlToken: string
  delaySendMessagesMilliseconds: number
  markIncomingMessagesReaded: Switch
  markIncomingMessagesReadedOnReply: Switch
  outgoingWebhook: Switch
  outgoingMessageWebhook: Switch
  outgoingAPIMessageWebhook: Switch
  stateWebhook: Switch
  incomingWebhook: Switch
  editedMessageWebhook: Switch
  deletedMessageWebhook: Switch
  pollMessageWebhook: Switch
  downloadUrlJpeg: Switch
}

export interface SetSettingsResponse {
  saveSettings: boolean
}

/** Настройки, без которых работать нельзя. */
export const REQUIRED_SETTINGS = {
  incomingWebhook: 'yes',
  outgoingWebhook: 'yes',
  outgoingMessageWebhook: 'yes',
  outgoingAPIMessageWebhook: 'yes',
  stateWebhook: 'yes',
  webhookUrl: '',
} as const satisfies Partial<InstanceSettings>


export type WebhookType =
  | 'incomingMessageReceived'
  | 'outgoingMessageReceived'
  | 'outgoingAPIMessageReceived'
  | 'outgoingMessageStatus'
  | 'stateInstanceChanged'
  | 'quotaExceeded'

export interface NotificationBody {
  typeWebhook: WebhookType | string
  instanceData?: InstanceData
  timestamp: number
  idMessage?: string
  senderData?: SenderData
  messageData?: MessageData
  chatId?: string
  status?: OutgoingMessageStatus | string
  description?: string
}
