'use client'

import { useRef, useEffect, useState, useMemo, forwardRef, useImperativeHandle } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import { mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Heading from '@tiptap/extension-heading'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'

/** 이미지 노드에 textAlign 적용: 래퍼 div로 감싸서 정렬이 보이도록 함 */
const ImageWithAlign = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      textAlign: {
        default: null,
        parseHTML: (el) => {
          const dom = el as HTMLElement
          return dom.style?.textAlign || dom.parentElement?.style?.textAlign || null
        },
        renderHTML: (attrs) => {
          if (!attrs.textAlign) return {}
          return { style: `text-align: ${attrs.textAlign}` }
        },
      },
    }
  },
  renderHTML({ node, HTMLAttributes }) {
    const align = node.attrs.textAlign
    const imgAttrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)
    if (align) {
      return ['div', { style: `text-align: ${align}` }, ['img', imgAttrs]]
    }
    return ['img', imgAttrs]
  },
})
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { BackgroundColor } from '@tiptap/extension-text-style/background-color'
import { FontFamily } from '@tiptap/extension-font-family'
import { Extension } from '@tiptap/core'
import { Divider, type DividerStyle } from '@/components/editor/extensions/Divider'

/** TextStyle 마크에 fontSize 속성 추가 (폰트 크기) */
const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => (element as HTMLElement).style?.fontSize ?? null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {}
              return { style: `font-size: ${attributes.fontSize}` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }: { chain: () => { setMark: (a: string, b: Record<string, unknown>) => { run: () => boolean } } }) =>
          chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ commands }: { commands: { updateAttributes: (a: string, b: Record<string, unknown>) => boolean } }) =>
          commands.updateAttributes('textStyle', { fontSize: null }),
    }
  },
})
import { useToast } from '@/hooks/use-toast'
import {
  Undo2,
  Redo2,
  List,
  ListOrdered,
  Quote,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Underline as UnderlineIcon,
  Highlighter,
  Link as LinkIcon,
  ImagePlus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ChevronDown,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Eraser,
  Minus,
} from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/** www 앵커 링크용 등 id 속성 보존 */
const HeadingWithAnchorId = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('id'),
        renderHTML: (attributes) => {
          if (!attributes.id) return {}
          return { id: attributes.id as string }
        },
      },
    }
  },
})

export type RichTextEditorHandle = {
  /** 현재 커서 위치에 HTML 삽입 (포커스 후 삽입) */
  insertContentAtCursor: (html: string) => void
}

const MAX_IMAGE_SIZE = 8 * 1024 * 1024 // 8MB

function calculateImageSize(html: string): number {
  if (!html) return 0
  const imgRegex = /<img[^>]+src="data:image\/[^;]+;base64,([^"]+)"/g
  let totalSize = 0
  let match
  while ((match = imgRegex.exec(html)) !== null) {
    const base64Data = match[1]
    totalSize += (base64Data.length * 3) / 4
  }
  return totalSize
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const HIGHLIGHT_COLORS = [
  '#fef08a', '#bbf7d0', '#bae6fd', '#e9d5ff', '#fed7aa', '#fbcfe8', '#ffffff',
]

const FONT_FAMILIES = [
  { label: '기본', value: '' },
  { label: '굴림', value: 'Gulim, 굴림, sans-serif' },
  { label: '맑은 고딕', value: 'Malgun Gothic, 맑은 고딕, sans-serif' },
  { label: '바탕', value: 'Batang, 바탕, serif' },
  { label: '궁서', value: 'Gungsuh, 궁서, serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman, Times, serif' },
]

const FONT_SIZES = [
  { label: '기본', value: '' },
  { label: '10px', value: '10px' },
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
]

const DIVIDER_OPTIONS: { label: string; style: DividerStyle }[] = [
  { label: '기본 구분선', style: 'solid' },
  { label: '점선 구분선', style: 'dashed' },
  { label: '더블 구분선', style: 'double' },
  { label: '그라데이션 구분선', style: 'gradient' },
]

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(function RichTextEditor(
  {
    value,
    onChange,
    placeholder = '본문 내용을 입력하세요',
    className = '',
  },
  ref
) {
  const { toast } = useToast()
  const [totalImageSize, setTotalImageSize] = useState(0)
  const [mounted, setMounted] = useState(false)
  const valueRef = useRef(value)
  const editorRef = useRef<Editor | null>(null)
  const [headingOpen, setHeadingOpen] = useState(false)
  const [highlightOpen, setHighlightOpen] = useState(false)
  const [fontFamilyOpen, setFontFamilyOpen] = useState(false)
  const [fontSizeOpen, setFontSizeOpen] = useState(false)
  const [dividerOpen, setDividerOpen] = useState(false)

  valueRef.current = value

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setTotalImageSize(calculateImageSize(value))
  }, [value])

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        horizontalRule: false,
        // v3 StarterKit에 link·underline이 포함됨 → 별도 확장과 이중 등록 시 경고 발생
        link: false,
      }),
      HeadingWithAnchorId.configure({ levels: [1, 2, 3] }),
      Divider,
      Superscript,
      Subscript,
      TextAlign.configure({ types: ['heading', 'paragraph', 'image'] }),
      TextStyle,
      Color,
      BackgroundColor,
      FontFamily.configure({ types: ['textStyle'] }),
      FontSize,
      Link.configure({ openOnClick: false }),
      ImageWithAlign.configure({ allowBase64: true }),
      Placeholder.configure({ placeholder }),
    ],
    [placeholder]
  )

  const editor = useEditor({
    extensions,
    content: value || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[300px] p-4 focus:outline-none',
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items
        if (!items) return false
        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            event.preventDefault()
            const file = item.getAsFile()
            if (file) {
              const currentSize = calculateImageSize(valueRef.current)
              if (currentSize + file.size > MAX_IMAGE_SIZE) {
                toast({
                  title: '이미지 용량 초과',
                  description: `본문 내 이미지 총 용량이 8MB를 초과할 수 없습니다.`,
                  variant: 'destructive',
                  duration: 5000,
                })
                return true
              }
              const reader = new FileReader()
              reader.onload = (e) => {
                const url = e.target?.result as string
                editorRef.current?.chain().focus().setImage({ src: url }).run()
              }
              reader.readAsDataURL(file)
            }
            return true
          }
        }
        return false
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files
        if (!files?.length) return false
        const file = files[0]
        if (file.type.indexOf('image') === -1) return false
        event.preventDefault()
        const currentSize = calculateImageSize(valueRef.current)
        if (currentSize + file.size > MAX_IMAGE_SIZE) {
          toast({
            title: '이미지 용량 초과',
            description: `본문 내 이미지 총 용량이 8MB를 초과할 수 없습니다.`,
            variant: 'destructive',
            duration: 5000,
          })
          return true
        }
        const reader = new FileReader()
        reader.onload = (e) => {
          const url = e.target?.result as string
          editorRef.current?.chain().focus().setImage({ src: url }).run()
        }
        reader.readAsDataURL(file)
        return true
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html === '<p></p>' ? '' : html)
    },
  }, [])

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  useImperativeHandle(
    ref,
    () => ({
      insertContentAtCursor: (html: string) => {
        if (!editor || !html.trim()) return
        editor.chain().focus().insertContent(html).run()
      },
    }),
    [editor]
  )

  useEffect(() => {
    if (!editor || !mounted) return
    const current = editor.getHTML()
    if (value !== current && value !== undefined) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value, mounted, editor])

  const addImage = () => {
    const currentSize = calculateImageSize(valueRef.current)
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      if (currentSize + file.size > MAX_IMAGE_SIZE) {
        toast({
          title: '이미지 용량 초과',
          description: `본문 내 이미지 총 용량이 8MB를 초과할 수 없습니다. (현재: ${formatBytes(currentSize)}, 추가 예정: ${formatBytes(file.size)})`,
          variant: 'destructive',
          duration: 5000,
        })
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        const url = e.target?.result as string
        editor?.chain().focus().setImage({ src: url }).run()
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const setLink = () => {
    const url = window.prompt('링크 URL을 입력하세요:')
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run()
    }
  }

  if (!mounted) {
    return (
      <div
        className={`flex min-h-[300px] items-center justify-center border border-gray-300 rounded-md bg-gray-50 ${className}`}
      >
        <span className="text-sm text-gray-500">에디터 로딩 중...</span>
      </div>
    )
  }

  if (!editor) {
    return null
  }

  return (
    <div className={`rich-text-editor border border-gray-300 rounded-md overflow-hidden ${className}`}>
      {/* 툴바 */}
      <div className="bg-white border-b border-gray-200 p-2 flex flex-wrap gap-0.5 items-center">
        {/* Undo / Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          title="실행 취소"
        >
          <Undo2 className="w-4 h-4 text-gray-600" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          title="다시 실행"
        >
          <Redo2 className="w-4 h-4 text-gray-600" />
        </button>
        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* 제목/문단 드롭다운 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setHeadingOpen((v) => !v)}
            className="flex items-center gap-0.5 px-2 py-1.5 rounded hover:bg-gray-100 text-sm text-gray-700 min-w-[72px]"
            title="제목/문단"
          >
            <span>
              {editor.isActive('heading', { level: 1 })
                ? 'H1'
                : editor.isActive('heading', { level: 2 })
                  ? 'H2'
                  : editor.isActive('heading', { level: 3 })
                    ? 'H3'
                    : '문단'}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>
          {headingOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setHeadingOpen(false)} aria-hidden />
              <div className="absolute left-0 top-full mt-0.5 py-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 min-w-[100px]">
                {[
                  { label: '문단', run: () => editor.chain().focus().setParagraph().run() },
                  { label: '제목 1', run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
                  { label: '제목 2', run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
                  { label: '제목 3', run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
                ].map(({ label, run }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      run()
                      setHeadingOpen(false)
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 폰트 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setFontFamilyOpen((v) => !v); setFontSizeOpen(false); }}
            className="flex items-center gap-0.5 px-2 py-1.5 rounded hover:bg-gray-100 text-sm text-gray-700 min-w-[88px]"
            title="글꼴"
          >
            <span className="truncate max-w-[72px]">
              {FONT_FAMILIES.find((f) => editor.isActive('textStyle', { fontFamily: f.value }))?.label ?? '글꼴'}
            </span>
            <ChevronDown className="w-4 h-4 shrink-0" />
          </button>
          {fontFamilyOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFontFamilyOpen(false)} aria-hidden />
              <div className="absolute left-0 top-full mt-0.5 py-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 min-w-[120px] max-h-[240px] overflow-y-auto">
                {FONT_FAMILIES.map(({ label, value }) => (
                  <button
                    key={label || 'default'}
                    type="button"
                    onClick={() => {
                      value ? editor.chain().focus().setFontFamily(value).run() : editor.chain().focus().unsetFontFamily().run()
                      setFontFamilyOpen(false)
                    }}
                    className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 ${editor.isActive('textStyle', { fontFamily: value }) ? 'bg-gray-100 font-medium' : ''}`}
                    style={value ? { fontFamily: value } : undefined}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => { setFontSizeOpen((v) => !v); setFontFamilyOpen(false); }}
            className="flex items-center gap-0.5 px-2 py-1.5 rounded hover:bg-gray-100 text-sm text-gray-700 min-w-[64px]"
            title="글자 크기"
          >
            <span>
              {FONT_SIZES.find((f) => editor.isActive('textStyle', { fontSize: f.value }))?.label ?? '크기'}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>
          {fontSizeOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFontSizeOpen(false)} aria-hidden />
              <div className="absolute left-0 top-full mt-0.5 py-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 min-w-[90px]">
                {FONT_SIZES.map(({ label, value }) => (
                  <button
                    key={label || 'default'}
                    type="button"
                    onClick={() => {
                      value ? editor.chain().focus().setFontSize(value).run() : editor.chain().focus().unsetFontSize().run()
                      setFontSizeOpen(false)
                    }}
                    className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 ${editor.isActive('textStyle', { fontSize: value }) ? 'bg-gray-100 font-medium' : ''}`}
                    style={value ? { fontSize: value } : undefined}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* 글머리 / 번호 / 인용 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded ${editor.isActive('bulletList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="글머리 기호"
        >
          <List className="w-4 h-4 text-gray-600" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded ${editor.isActive('orderedList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="번호 매기기"
        >
          <ListOrdered className="w-4 h-4 text-gray-600" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded ${editor.isActive('blockquote') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="인용구"
        >
          <Quote className="w-4 h-4 text-gray-600" />
        </button>
        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* 굵게 / 기울임 / 취소선 / 코드 / 밑줄 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded ${editor.isActive('bold') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="굵게"
        >
          <Bold className="w-4 h-4 text-gray-600" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded ${editor.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="기울임"
        >
          <Italic className="w-4 h-4 text-gray-600" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded ${editor.isActive('strike') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="취소선"
        >
          <Strikethrough className="w-4 h-4 text-gray-600" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-2 rounded ${editor.isActive('code') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="코드"
        >
          <Code className="w-4 h-4 text-gray-600" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded ${editor.isActive('underline') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="밑줄"
        >
          <UnderlineIcon className="w-4 h-4 text-gray-600" />
        </button>

        {/* 하이라이트(배경색) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setHighlightOpen((v) => !v)}
            className={`p-2 rounded ${highlightOpen ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            title="텍스트 배경색"
          >
            <Highlighter className="w-4 h-4 text-gray-600" />
          </button>
          {highlightOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setHighlightOpen(false)} aria-hidden />
              <div className="absolute left-0 top-full mt-0.5 p-2 bg-white border border-gray-200 rounded-md shadow-lg z-20 flex flex-wrap gap-1">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      color === '#ffffff'
                        ? editor.chain().focus().unsetBackgroundColor().run()
                        : editor.chain().focus().setBackgroundColor(color).run()
                      setHighlightOpen(false)
                    }}
                    className="w-6 h-6 rounded border border-gray-300 hover:ring-2 hover:ring-gray-400"
                    style={{ backgroundColor: color }}
                    title={color === '#ffffff' ? '제거' : '배경색'}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* 링크 / 위첨자 / 아래첨자 */}
        <button
          type="button"
          onClick={setLink}
          className={`p-2 rounded ${editor.isActive('link') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="링크"
        >
          <LinkIcon className="w-4 h-4 text-gray-600" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          className={`p-2 rounded ${editor.isActive('superscript') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="위 첨자"
        >
          <SuperscriptIcon className="w-4 h-4 text-gray-600" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          className={`p-2 rounded ${editor.isActive('subscript') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="아래 첨자"
        >
          <SubscriptIcon className="w-4 h-4 text-gray-600" />
        </button>
        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* 정렬: 왼쪽 / 가운데 / 오른쪽 / 양쪽 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-2 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="왼쪽 정렬"
        >
          <AlignLeft className="w-4 h-4 text-gray-600" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-2 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="가운데 정렬"
        >
          <AlignCenter className="w-4 h-4 text-gray-600" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-2 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="오른쪽 정렬"
        >
          <AlignRight className="w-4 h-4 text-gray-600" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={`p-2 rounded ${editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="양쪽 정렬"
        >
          <AlignJustify className="w-4 h-4 text-gray-600" />
        </button>
        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* 구분선 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setDividerOpen((v) => !v); setFontFamilyOpen(false); setFontSizeOpen(false); }}
            className="flex items-center gap-0.5 px-2 py-1.5 rounded hover:bg-gray-100 text-sm text-gray-700 min-w-[72px]"
            title="구분선"
          >
            <Minus className="w-4 h-4" />
            <span>구분선</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          {dividerOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDividerOpen(false)} aria-hidden />
              <div className="absolute left-0 top-full mt-0.5 py-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 min-w-[160px]">
                {DIVIDER_OPTIONS.map(({ label, style }) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().insertDivider(style).run()
                      setDividerOpen(false)
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* 미디어 추가 */}
        <button
          type="button"
          onClick={addImage}
          className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-gray-100 text-sm text-gray-600"
          title="이미지 추가"
        >
          <ImagePlus className="w-4 h-4" />
          <span>Add</span>
        </button>
        <div className="w-px h-5 bg-gray-200 mx-0.5" />
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className="p-2 rounded hover:bg-gray-100"
          title="서식 제거"
        >
          <Eraser className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <EditorContent editor={editor} />

      <div className="px-4 py-2 bg-gray-50 border-t border-gray-300 flex items-center justify-between text-xs">
        <span className="text-gray-600">
          본문 내 이미지 총 용량:{' '}
          <span
            className={`font-semibold ${
              totalImageSize > MAX_IMAGE_SIZE
                ? 'text-red-600'
                : totalImageSize > MAX_IMAGE_SIZE * 0.8
                  ? 'text-yellow-600'
                  : 'text-gray-700'
            }`}
          >
            {formatBytes(totalImageSize)}
          </span>
          {' / '}
          <span className="text-gray-500">{formatBytes(MAX_IMAGE_SIZE)}</span>
        </span>
        {totalImageSize > MAX_IMAGE_SIZE && (
          <span className="text-red-600 font-semibold">⚠️ 용량 초과 (8MB 제한)</span>
        )}
        {totalImageSize > MAX_IMAGE_SIZE * 0.8 && totalImageSize <= MAX_IMAGE_SIZE && (
          <span className="text-yellow-600 font-semibold">⚠️ 용량이 거의 가득 찼습니다</span>
        )}
      </div>

      <style jsx global>{`
        .rich-text-editor .ProseMirror img {
          max-width: 100%;
          height: auto;
        }
        .rich-text-editor .ProseMirror div[style*="text-align"] img {
          display: block;
        }
        .rich-text-editor .ProseMirror div[style*="text-align: center"] img {
          margin-left: auto;
          margin-right: auto;
        }
        .rich-text-editor .ProseMirror div[style*="text-align: right"] img {
          margin-left: auto;
        }
        .rich-text-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        .rich-text-editor .ProseMirror:focus {
          outline: none;
        }
        .rich-text-editor .ProseMirror blockquote {
          border-left: 5px solid #03c75a;
          padding: 12px 16px;
          margin: 20px 0;
          background: #f6fff8;
          color: #222;
          font-size: 15px;
        }
        .rich-text-editor .ProseMirror hr.divider-solid,
        .tiptap hr.divider-solid {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 32px 0;
        }
        .rich-text-editor .ProseMirror hr.divider-dashed,
        .tiptap hr.divider-dashed {
          border: none;
          border-top: 1px dashed #d1d5db;
          margin: 32px 0;
        }
        .rich-text-editor .ProseMirror hr.divider-double,
        .tiptap hr.divider-double {
          border: none;
          border-top: 3px double #d1d5db;
          margin: 32px 0;
        }
        .rich-text-editor .ProseMirror hr.divider-gradient,
        .tiptap hr.divider-gradient {
          border: none;
          height: 1px;
          background: linear-gradient(to right, transparent, #9ca3af, transparent);
          margin: 40px 0;
        }
      `}</style>
    </div>
  )
})

RichTextEditor.displayName = 'RichTextEditor'
