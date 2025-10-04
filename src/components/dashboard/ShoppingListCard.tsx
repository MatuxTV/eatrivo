"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Eye, Calendar, FileText } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface ShoppingListCardProps {
  id: string
  title: string
  description?: string
  weekStartDate: string
  weekEndDate: string
  status: 'active' | 'completed' | 'cancelled'
  cloudinaryPublicId: string
}

export default function ShoppingListCard({
  id,
  title,
  description,
  weekStartDate,
  weekEndDate,
  status,
  cloudinaryPublicId
}: ShoppingListCardProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isViewing, setIsViewing] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 hover:bg-green-200'
      case 'completed':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 hover:bg-red-200'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    }
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const response = await fetch(`/api/shopping-lists/${id}/download`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Get the blob from the response
      const blob = await response.blob()
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob)
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`
      document.body.appendChild(link)
      link.click()
      
      // Clean up
      window.URL.revokeObjectURL(url)
      document.body.removeChild(link)
      
      toast.success('Shopping list downloaded successfully!')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download shopping list')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleView = async () => {
    setIsViewing(true)
    try {
      const response = await fetch(`/api/shopping-lists/${id}/download`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Get the blob from the response
      const blob = await response.blob()
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob)
      
      // Open in new window/tab for viewing
      window.open(url, '_blank')
      
      // Clean up the URL after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 1000)
      
      toast.success('Shopping list opened for viewing!')
    } catch (error) {
      console.error('View error:', error)
      toast.error('Failed to open shopping list')
    } finally {
      setIsViewing(false)
    }
  }

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {description}
              </p>
            )}
          </div>
          <Badge className={getStatusColor(status)}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>

        {/* Date Range */}
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>
            {formatDate(weekStartDate)} - {formatDate(weekEndDate)}
          </span>
        </div>

        {/* File Info */}
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <FileText className="w-4 h-4" />
          <span>PDF Document</span>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleView}
            disabled={isViewing}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            {isViewing ? 'Opening...' : 'View'}
          </Button>
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            {isDownloading ? 'Downloading...' : 'Download'}
          </Button>
        </div>
      </div>
    </Card>
  )
}