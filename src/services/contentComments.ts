import apiClient from '@/lib/axios'

export type CommentContentType = 'ARTICLE' | 'VIDEO' | 'SEMINAR'

export interface AdminCommentUser {
  id: number
  email: string
  nickname: string
  isAdmin: boolean
}

export interface AdminCommentReply {
  id: number
  user: AdminCommentUser
  text: string
  created_at: string | null
  is_deleted: boolean
}

export interface AdminCommentItem extends AdminCommentReply {
  replies: AdminCommentReply[]
}

export interface AdminStaffMember {
  member_sid: number
  nickname: string
  email: string
}

export async function fetchAdminComments(params: { contentType: CommentContentType; contentId: number }) {
  const res = await apiClient.get('/comments', { params })
  const data = res.data as any
  const list = data?.IndeAPIResponse?.Result?.list
  if (!Array.isArray(list)) throw new Error(data?.IndeAPIResponse?.Message || '댓글을 불러오지 못했습니다.')
  return data.IndeAPIResponse.Result as { list: AdminCommentItem[]; total: number; staffMembers?: AdminStaffMember[] }
}

export async function createAdminReply(payload: { parentId: number; commentText: string; adminMemberSid?: number }) {
  const res = await apiClient.post('/comments', {
    parent_id: payload.parentId,
    comment_text: payload.commentText,
    ...(payload.adminMemberSid ? { admin_member_sid: payload.adminMemberSid } : {}),
  })
  const data = res.data as any
  const id = data?.IndeAPIResponse?.Result?.id
  if (!id) throw new Error(data?.IndeAPIResponse?.Message || '대댓글 작성에 실패했습니다.')
  return { id: Number(id) }
}

export async function updateAdminReply(payload: { commentId: number; commentText: string }) {
  const res = await apiClient.patch(`/comments/${payload.commentId}`, { comment_text: payload.commentText })
  const data = res.data as any
  const id = data?.IndeAPIResponse?.Result?.id
  if (!id) throw new Error(data?.IndeAPIResponse?.Message || '대댓글 수정에 실패했습니다.')
}

export async function deleteAdminComment(commentId: number) {
  const res = await apiClient.delete(`/comments/${commentId}`)
  const data = res.data as any
  const id = data?.IndeAPIResponse?.Result?.id
  if (!id) throw new Error(data?.IndeAPIResponse?.Message || '댓글 삭제에 실패했습니다.')
}

