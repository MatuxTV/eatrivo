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
        return 'bg-green-100 text-green-800 '
      case 'completed':
        return 'bg-blue-100 text-blue-800 '
      case 'cancelled':
        return 'bg-red-100 text-red-800 '
      default:
        return 'bg-gray-100 text-gray-800 '
    }
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      // Use explicit GET request to download endpoint
      const response = await fetch(`/api/shopping-lists/${id}/download`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to generate download link')
      }

      const data = await response.json()
      console.log('Download response:', data)

      // Validate response data
      if (!data.downloadUrl) {
        throw new Error('Invalid response: missing download URL')
      }
      
      // Create temporary link and trigger download
      const link = document.createElement('a')
      link.href = data.downloadUrl
      link.download = data.filename || `${title}.pdf`
      link.target = '_blank' // Add target blank for better compatibility
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Váš nákupný zoznam sa sťahuje!')
    } catch (error) {
      console.error('Download failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Nepodarilo sa stiahnuť nákupný zoznam'
      toast.error(errorMessage)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleView = async () => {
    setIsViewing(true)
    try {
      const response = await fetch(`/api/shopping-lists/${id}/download`)
      
      if (!response.ok) {
        throw new Error('Failed to generate view link')
      }

      const data = await response.json()
      
      // Open in new tab for viewing
      window.open(data.downloadUrl, '_blank')

      toast.success('Váš nákupný zoznam sa otvoril v novom okne')
    } catch (error) {
      console.error('View failed:', error)
      toast.error('Nepodarilo sa otvoriť nákupný zoznam')
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
            size="sm"
            onClick={handleView}
            disabled={isViewing}
            className="flex-1 bg-secondary-foreground hover:scale-105 hover:border-1 text-primary-text/60"
          >
            <Eye className="w-4 h-4 mr-2" />
            {isViewing ? 'Opening...' : 'View'}
          </Button>
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 hover:scale-105"
          >
            <Download className="w-4 h-4 mr-2" />
            {isDownloading ? 'Downloading...' : 'Download'}
          </Button>
        </div>
      </div>
    </Card>
  )
}