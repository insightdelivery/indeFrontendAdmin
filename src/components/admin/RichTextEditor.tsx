'use client'

import { useRef, useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

// 이미지 총 용량 제한: 8MB
const MAX_IMAGE_SIZE = 8 * 1024 * 1024 // 8MB in bytes

export function RichTextEditor({
  value,
  onChange,
  placeholder = '본문 내용을 입력하세요',
  className = '',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const isComposingRef = useRef(false)
  const { toast } = useToast()
  const [totalImageSize, setTotalImageSize] = useState(0)

  // 본문 내용에서 모든 base64 이미지의 총 크기 계산
  const calculateImageSize = (html: string): number => {
    if (!html) return 0
    
    const imgRegex = /<img[^>]+src="data:image\/[^;]+;base64,([^"]+)"/g
    let totalSize = 0
    let match

    while ((match = imgRegex.exec(html)) !== null) {
      const base64Data = match[1]
      // base64 데이터의 실제 크기 = base64 문자열 길이 * 3/4 (base64는 약 33% 오버헤드)
      const size = (base64Data.length * 3) / 4
      totalSize += size
    }

    return totalSize
  }

  // value가 변경될 때마다 이미지 크기 계산
  useEffect(() => {
    const size = calculateImageSize(value)
    setTotalImageSize(size)
  }, [value])

  useEffect(() => {
    if (!editorRef.current) return

    const editor = editorRef.current
    editor.contentEditable = 'true'
    editor.innerHTML = value || ''

    const handleInput = () => {
      if (!isComposingRef.current && editor.innerHTML !== value) {
        onChange(editor.innerHTML)
      }
    }

    const handleCompositionStart = () => {
      isComposingRef.current = true
    }

    const handleCompositionEnd = () => {
      isComposingRef.current = false
      onChange(editor.innerHTML)
    }

    editor.addEventListener('input', handleInput)
    editor.addEventListener('compositionstart', handleCompositionStart)
    editor.addEventListener('compositionend', handleCompositionEnd)

    return () => {
      editor.removeEventListener('input', handleInput)
      editor.removeEventListener('compositionstart', handleCompositionStart)
      editor.removeEventListener('compositionend', handleCompositionEnd)
    }
  }, [])

  // 외부에서 value가 변경되면 에디터 내용 업데이트
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value])

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    onChange(editorRef.current?.innerHTML || '')
  }

  const insertImage = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        // 현재 이미지 총 크기 확인
        const currentSize = calculateImageSize(value)
        
        // 새 이미지 추가 시 예상 크기
        const newImageSize = file.size
        const expectedTotalSize = currentSize + newImageSize

        if (expectedTotalSize > MAX_IMAGE_SIZE) {
          toast({
            title: '이미지 용량 초과',
            description: `본문 내 이미지 총 용량이 8MB를 초과할 수 없습니다. (현재: ${formatBytes(currentSize)}, 추가 예정: ${formatBytes(newImageSize)})`,
            variant: 'destructive',
            duration: 5000,
          })
          return
        }

        const reader = new FileReader()
        reader.onload = (event) => {
          const imageUrl = event.target?.result as string
          execCommand('insertImage', imageUrl)
          
          // 이미지 삽입 후 크기 업데이트
          const newValue = editorRef.current?.innerHTML || ''
          const newSize = calculateImageSize(newValue)
          setTotalImageSize(newSize)
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  // 바이트를 읽기 쉬운 형식으로 변환
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className={`rich-text-editor border border-gray-300 rounded-md overflow-hidden ${className}`}>
      {/* 툴바 */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className="px-3 py-1.5 text-sm font-semibold hover:bg-gray-200 rounded"
          title="굵게"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className="px-3 py-1.5 text-sm italic hover:bg-gray-200 rounded"
          title="기울임"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          className="px-3 py-1.5 text-sm underline hover:bg-gray-200 rounded"
          title="밑줄"
        >
          <u>U</u>
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<h1>')}
          className="px-3 py-1.5 text-sm hover:bg-gray-200 rounded"
          title="제목 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<h2>')}
          className="px-3 py-1.5 text-sm hover:bg-gray-200 rounded"
          title="제목 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<h3>')}
          className="px-3 py-1.5 text-sm hover:bg-gray-200 rounded"
          title="제목 3"
        >
          H3
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          className="px-3 py-1.5 text-sm hover:bg-gray-200 rounded"
          title="글머리 기호"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          className="px-3 py-1.5 text-sm hover:bg-gray-200 rounded"
          title="번호 매기기"
        >
          1.
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => execCommand('justifyLeft')}
          className="px-3 py-1.5 text-sm hover:bg-gray-200 rounded"
          title="왼쪽 정렬"
        >
          ⬅
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyCenter')}
          className="px-3 py-1.5 text-sm hover:bg-gray-200 rounded"
          title="가운데 정렬"
        >
          ⬌
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyRight')}
          className="px-3 py-1.5 text-sm hover:bg-gray-200 rounded"
          title="오른쪽 정렬"
        >
          ➡
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => {
            const url = prompt('링크 URL을 입력하세요:')
            if (url) execCommand('createLink', url)
          }}
          className="px-3 py-1.5 text-sm hover:bg-gray-200 rounded"
          title="링크"
        >
          🔗
        </button>
        <button
          type="button"
          onClick={insertImage}
          className="px-3 py-1.5 text-sm hover:bg-gray-200 rounded"
          title="이미지"
        >
          🖼
        </button>
        <button
          type="button"
          onClick={() => execCommand('removeFormat')}
          className="px-3 py-1.5 text-sm hover:bg-gray-200 rounded"
          title="서식 제거"
        >
          ✂
        </button>
      </div>

      {/* 에디터 영역 */}
      <div
        ref={editorRef}
        className="min-h-[300px] p-4 focus:outline-none prose prose-sm max-w-none"
        style={{
          minHeight: '300px',
        }}
        data-placeholder={placeholder}
      />

      {/* 이미지 용량 표시 */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-300 flex items-center justify-between text-xs">
        <span className="text-gray-600">
          본문 내 이미지 총 용량: <span className={`font-semibold ${totalImageSize > MAX_IMAGE_SIZE ? 'text-red-600' : totalImageSize > MAX_IMAGE_SIZE * 0.8 ? 'text-yellow-600' : 'text-gray-700'}`}>
            {formatBytes(totalImageSize)}
          </span>
          {' / '}
          <span className="text-gray-500">{formatBytes(MAX_IMAGE_SIZE)}</span>
        </span>
        {totalImageSize > MAX_IMAGE_SIZE && (
          <span className="text-red-600 font-semibold">
            ⚠️ 용량 초과 (8MB 제한)
          </span>
        )}
        {totalImageSize > MAX_IMAGE_SIZE * 0.8 && totalImageSize <= MAX_IMAGE_SIZE && (
          <span className="text-yellow-600 font-semibold">
            ⚠️ 용량이 거의 가득 찼습니다
          </span>
        )}
      </div>
      
      <style jsx global>{`
        .rich-text-editor [contenteditable="true"]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .rich-text-editor [contenteditable="true"] {
          outline: none;
        }
        .rich-text-editor [contenteditable="true"]:focus {
          outline: none;
        }
        .rich-text-editor [contenteditable="true"] img {
          max-width: 100%;
          height: auto;
        }
        .rich-text-editor [contenteditable="true"] a {
          color: #2563eb;
          text-decoration: underline;
        }
      `}</style>
    </div>
  )
}
