'use client'

import React, { useEffect, useCallback, useState } from 'react'

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  action: () => void
  description: string
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 忽略输入框中的快捷键
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement) {
      return
    }

    for (const shortcut of shortcuts) {
      if (
        event.key.toLowerCase() === shortcut.key.toLowerCase() &&
        !!event.ctrlKey === !!shortcut.ctrlKey &&
        !!event.shiftKey === !!shortcut.shiftKey &&
        !!event.altKey === !!shortcut.altKey &&
        !!event.metaKey === !!shortcut.metaKey
      ) {
        event.preventDefault()
        shortcut.action()
        break
      }
    }
  }, [shortcuts])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// 预定义的快捷键组合
export const SHORTCUTS = {
  SAVE: { key: 's', ctrlKey: true, description: '保存设置' },
  REFRESH: { key: 'r', ctrlKey: true, description: '刷新数据' },
  NEW_TRADE: { key: 'n', ctrlKey: true, description: '新建交易' },
  SEARCH: { key: 'f', ctrlKey: true, description: '搜索' },
  HELP: { key: 'h', ctrlKey: true, description: '帮助' },
  DARK_MODE: { key: 'd', ctrlKey: true, description: '切换暗色模式' },
  FULLSCREEN: { key: 'f11', description: '全屏' },
  ESCAPE: { key: 'Escape', description: '取消/关闭' },
  ENTER: { key: 'Enter', description: '确认' },
  SPACE: { key: ' ', description: '暂停/播放' }
} as const

// 快捷键帮助组件
export function ShortcutsHelp({ shortcuts }: { shortcuts: KeyboardShortcut[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        键盘快捷键
      </h3>
      <div className="space-y-2">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {shortcut.description}
            </span>
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
              {[
                shortcut.ctrlKey && 'Ctrl',
                shortcut.shiftKey && 'Shift',
                shortcut.altKey && 'Alt',
                shortcut.metaKey && 'Cmd',
                shortcut.key
              ].filter(Boolean).join(' + ')}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  )
}

// 拖拽排序Hook
export function useDragAndDrop<T>(
  items: T[],
  onReorder: (newItems: T[]) => void
) {
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString())
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'))
    
    if (dragIndex === dropIndex) return

    const newItems = [...items]
    const [draggedItem] = newItems.splice(dragIndex, 1)
    newItems.splice(dropIndex, 0, draggedItem)
    
    onReorder(newItems)
  }, [items, onReorder])

  return {
    handleDragStart,
    handleDragOver,
    handleDrop
  }
}

// 触摸手势支持Hook
export function useTouchGestures() {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)

  const minSwipeDistance = 50

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }, [])

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return

    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY)

    if (isHorizontalSwipe) {
      if (Math.abs(distanceX) > minSwipeDistance) {
        if (distanceX > 0) {
          // 向左滑动
          console.log('向左滑动')
        } else {
          // 向右滑动
          console.log('向右滑动')
        }
      }
    } else {
      if (Math.abs(distanceY) > minSwipeDistance) {
        if (distanceY > 0) {
          // 向上滑动
          console.log('向上滑动')
        } else {
          // 向下滑动
          console.log('向下滑动')
        }
      }
    }
  }, [touchStart, touchEnd])

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  }
} 