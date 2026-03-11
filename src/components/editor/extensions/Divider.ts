import { Node } from '@tiptap/core'

export const DIVIDER_STYLES = ['solid', 'dashed', 'double', 'gradient'] as const
export type DividerStyle = (typeof DIVIDER_STYLES)[number]

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    divider: {
      insertDivider: (style: DividerStyle) => ReturnType
    }
  }
}

export const Divider = Node.create({
  name: 'divider',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      style: {
        default: 'solid' as DividerStyle,
        parseHTML: (element) => {
          const el = element as HTMLElement
          const cls = el.getAttribute('class') ?? ''
          const match = cls.match(/divider-(solid|dashed|double|gradient)/)
          return (match?.[1] as DividerStyle) ?? 'solid'
        },
        renderHTML: (attrs) => ({
          class: `divider-${attrs.style}`,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'hr[class*="divider-"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['hr', { ...this.options.HTMLAttributes, ...HTMLAttributes }]
  },

  addCommands() {
    return {
      insertDivider:
        (style: DividerStyle) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ chain }: any) =>
          chain().focus().insertContent({ type: this.name, attrs: { style } }).run(),
    }
  },
})
