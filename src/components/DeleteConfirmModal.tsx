'use client'

import { useState } from 'react'

interface DeleteConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => Promise<void>
  onCancel: () => void
  isDeleting?: boolean
}

export default function DeleteConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isDeleting = false
}: DeleteConfirmModalProps) {
  if (!isOpen) return null

  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          </div>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-500">{message}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:space-x-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            {isDeleting ? '删除中...' : '确认删除'}
          </button>
        </div>
      </div>
    </div>
  )
}