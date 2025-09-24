"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Eye, Calendar, FileText } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface MealPlanCardProps {
  id: string
  title: string
  description?: string
  weekStartDate: string
  weekEndDate: string
  status: 'active' | 'completed' | 'cancelled'
  cloudinaryPublicId: string
}

export default function MealPlanCard({
  id,
  title,
  description,
  weekStartDate,
  weekEndDate,
  status,
  cloudinaryPublicId
}: MealPlanCardProps) {
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
        return 'bg-green-100 text-green-800 border-green-200'
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktívny'
      case 'completed': return 'Dokončený'
      case 'cancelled': return 'Zrušený'
      default: return status
    }
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      // Use explicit GET request to download endpoint
      const response = await fetch(`/api/meal-plans/${id}/download`, {
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

      toast.success('Jedálny plán sa sťahuje!')
    } catch (error) {
      console.error('Download failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Nepodarilo sa stiahnuť jedálny plán'
      toast.error(errorMessage)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleView = async () => {
    setIsViewing(true)
    try {
      const response = await fetch(`/api/meal-plans/${id}/download`)
      
      if (!response.ok) {
        throw new Error('Failed to generate view link')
      }

      const data = await response.json()
      
      // Open in new tab for viewing
      window.open(data.downloadUrl, '_blank')
      
      toast.success('Jedálny plán sa otvoril v novom okne')
    } catch (error) {
      console.error('View failed:', error)
      toast.error('Nepodarilo sa otvoriť jedálny plán')
    } finally {
      setIsViewing(false)
    }
  }

  return (
    <Card className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-sm transition-shadow duration-200">
      {/* Header with icon and title */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-eatrivo-purple/10 rounded-2xl flex items-center justify-center flex-shrink-0">
          <FileText className="w-6 h-6 text-eatrivo-purple" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-base truncate">
              {title}
            </h3>
            <Badge className={`text-xs px-2 py-1 ${getStatusColor(status)}`}>
              {getStatusText(status)}
            </Badge>
          </div>
          {description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Date Range */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Calendar className="w-4 h-4" />
        <span>
          {formatDate(weekStartDate)} - {formatDate(weekEndDate)}
        </span>
      </div>

      {/* Bottom section with view count and download */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleView}
          disabled={isViewing}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Eye className="w-4 h-4" />
          <span>{isViewing ? 'Otvára sa...' : 'Zobraziť'}</span>
        </button>
        
        <Button
          onClick={handleDownload}
          disabled={isDownloading}
          className="bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white px-4 py-2 text-sm font-medium rounded-xl"
        >
          <Download className="w-4 h-4 mr-2" />
          {isDownloading ? 'Sťahuje sa...' : 'Stiahnuť'}
        </Button>
      </div>
    </Card>
  )
}