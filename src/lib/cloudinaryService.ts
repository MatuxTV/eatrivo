import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export class CloudinaryPDFService {
  // Upload PDF meal plan
  static async uploadMealPlanPDF(file: File, userProfileId: string, weekDate: string) {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'eatrivo/meal-plans',
            public_id: `meal_plan_${userProfileId}_${weekDate}`,
            resource_type: 'raw', // Use 'raw' for PDFs
            format: 'pdf',
          },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          }
        ).end(buffer)
      })

      return result
    } catch (error) {
      console.log('Cloudinary upload error:', error)
      throw new Error('Failed to upload PDF')
    }
  }

  // Get signed PDF URL for secure download
  static getSignedPDFUrl(publicId: string, userMembership: string) {
    const isPremium = userMembership === 'premium' || userMembership === 'trainer'
    
    if (!isPremium) {
      // Basic users get watermarked version
      return cloudinary.url(publicId, {
        resource_type: 'raw',
        format: 'pdf',
        transformation: [
          { overlay: 'text:Arial_60:BASIC MEMBERSHIP', color: '#00000080', gravity: 'center' }
        ]
      })
    }

    // Premium users get clean version with expiring signature
    return cloudinary.url(publicId, {
      resource_type: 'raw',
      format: 'pdf',
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    })
  }

  // Generate download URL with proper filename
  static getDownloadUrl(publicId: string, filename: string) {
    return cloudinary.url(publicId, {
      resource_type: 'raw', // Use 'raw' for PDFs to ensure proper handling
      flags: 'attachment',
      attachment: filename, // Set the download filename
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 300, // 5 minutes for download
    })
  }
}