/**
 * Article 관련 Zod 스키마 정의
 */
import * as z from 'zod'

export const articleSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.'),
  subtitle: z.string().optional(),
  content: z.string().min(1, '본문 내용을 입력해주세요.'),
  category: z.string().min(1, '카테고리를 선택해주세요.'),
  author: z.string().min(1, '작성자를 입력해주세요.'),
  authorAffiliation: z.string().optional(),
  visibility: z.string().min(1, '공개 범위를 선택해주세요.'), // sysCodeSid를 받도록 변경
  status: z.string().min(1, '발행 상태를 선택해주세요.'), // sysCodeSid를 받도록 변경
  isEditorPick: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  questions: z.array(z.string()).optional(),
  previewLength: z.number().min(0).max(100).optional(),
  scheduledAt: z.string().optional(),
})

export type ArticleFormData = z.infer<typeof articleSchema>

