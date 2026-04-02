import apiClient from '@/lib/axios'

type ApiWrap<T> = {
  IndeAPIResponse?: {
    ErrorCode?: string
    Message?: string
    Result?: T
  }
}

function unwrapResult<T>(data: unknown): T {
  const d = data as ApiWrap<T> & { Result?: T }
  if (d?.IndeAPIResponse?.Result !== undefined) return d.IndeAPIResponse.Result
  if (d?.Result !== undefined) return d.Result
  return data as T
}

export type MessageDetailPayload = {
  receiver_name?: string
  receiver_phone?: string
  receiver_email?: string
  template_id?: number | null
  template_name?: string
  variables?: Record<string, string>
  final_content?: string
  status?: 'success' | 'fail' | 'excluded'
}

export type MessageBatch = {
  id: number
  type: 'sms' | 'kakao' | 'email'
  sender: string
  title: string
  content: string
  total_count: number
  success_count: number
  fail_count: number
  excluded_count: number
  status: 'scheduled' | 'processing' | 'completed' | 'failed' | 'canceled'
  requested_at: string
  scheduled_at?: string | null
  completed_at?: string | null
  created_at: string
  details?: Array<{
    id: number
    receiver_phone?: string
    receiver_email?: string
    final_content: string
    status: 'success' | 'fail' | 'excluded'
  }>
}

export async function getMessageBatches(params?: { status?: string; type?: string }) {
  const { data } = await apiClient.get('/messages/batches', { params })
  return unwrapResult<MessageBatch[]>(data)
}

export async function getMessageBatch(id: number) {
  const { data } = await apiClient.get(`/messages/batches/${id}`)
  return unwrapResult<MessageBatch>(data)
}

export async function createMessageBatch(payload: {
  type: 'sms' | 'kakao' | 'email'
  sender: string
  title?: string
  content?: string
  status?: 'scheduled' | 'processing' | 'completed' | 'failed' | 'canceled'
  scheduled_at?: string | null
  request_snapshot?: Record<string, unknown>
  details: MessageDetailPayload[]
}) {
  const { data } = await apiClient.post('/messages/batches', payload)
  return unwrapResult<MessageBatch>(data)
}

export async function cancelMessageBatch(batchId: number) {
  const { data } = await apiClient.post(`/messages/batches/${batchId}/cancel`)
  return unwrapResult<MessageBatch>(data)
}

export async function resendFailed(batchId: number) {
  const { data } = await apiClient.post(`/messages/batches/${batchId}/resend-failed`)
  return unwrapResult<MessageBatch>(data)
}

export type SenderNumber = {
  id: number
  sender_number: string
  manager_name: string
  comment: string
  request_type: string
  status: 'pending' | 'approved' | 'rejected'
  reject_reason: string
  requested_at: string
  processed_at?: string | null
}

export async function getSenderNumbers(params?: { status?: string }) {
  const { data } = await apiClient.get('/messages/sender-numbers', { params })
  return unwrapResult<SenderNumber[]>(data)
}

export async function createSenderNumber(payload: {
  sender_number: string
  manager_name: string
  comment: string
  request_type?: string
  status?: 'pending' | 'approved' | 'rejected'
}) {
  const { data } = await apiClient.post('/messages/sender-numbers', payload)
  return unwrapResult<SenderNumber>(data)
}

export async function deleteSenderNumber(senderId: number) {
  const { data } = await apiClient.delete(`/messages/sender-numbers/${senderId}`)
  return unwrapResult<null>(data)
}

export type SenderEmail = {
  id: number
  sender_email: string
  manager_name: string
  comment: string
  request_type: string
  status: 'pending' | 'approved' | 'rejected'
  reject_reason: string
  requested_at: string
  processed_at?: string | null
}

export async function getSenderEmails(params?: { status?: string }) {
  const { data } = await apiClient.get('/messages/sender-emails', { params })
  return unwrapResult<SenderEmail[]>(data)
}

export async function createSenderEmail(payload: {
  sender_email: string
  manager_name: string
  comment: string
  request_type?: string
  status?: 'pending' | 'approved' | 'rejected'
}) {
  const { data } = await apiClient.post('/messages/sender-emails', payload)
  return unwrapResult<SenderEmail>(data)
}

export async function deleteSenderEmail(senderId: number) {
  const { data } = await apiClient.delete(`/messages/sender-emails/${senderId}`)
  return unwrapResult<null>(data)
}

export type MessageTemplate = {
  id: number
  channel: 'sms' | 'kakao' | 'email'
  template_name: string
  content: string
  is_active: boolean
}

export async function getMessageTemplates(params?: { channel?: 'sms' | 'kakao' | 'email' }) {
  const { data } = await apiClient.get('/messages/templates', { params })
  return unwrapResult<MessageTemplate[]>(data)
}

export async function createMessageTemplate(payload: {
  channel: 'sms' | 'kakao' | 'email'
  template_name: string
  content: string
}) {
  const { data } = await apiClient.post('/messages/templates', payload)
  return unwrapResult<MessageTemplate>(data)
}

export async function updateMessageTemplate(
  templateId: number,
  payload: {
    template_name?: string
    content?: string
  }
) {
  const { data } = await apiClient.put(`/messages/templates/${templateId}`, payload)
  return unwrapResult<MessageTemplate>(data)
}

export async function deleteMessageTemplate(templateId: number) {
  const { data } = await apiClient.delete(`/messages/templates/${templateId}`)
  return unwrapResult<null>(data)
}

export async function getAligoRemain() {
  const { data } = await apiClient.get('/messages/remain')
  return unwrapResult<{ sms_cnt: number; lms_cnt: number; mms_cnt: number }>(data)
}

export async function syncMessageBatchResult(batchId: number) {
  const { data } = await apiClient.post(`/messages/batches/${batchId}/sync-result`)
  return unwrapResult<{
    batch_id: number
    updated_count: number
    pending_count: number
    success_count: number
    fail_count: number
    excluded_count: number
  }>(data)
}
