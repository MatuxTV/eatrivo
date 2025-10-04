import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { db } from "@/index";
import { shoppingLists } from "@/db/schema";
import { nanoid } from "nanoid";


// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const weekStartDate = formData.get('weekStartDate') as string;
    const weekEndDate = formData.get('weekEndDate') as string;
    const status = formData.get('status') as 'active' | 'completed' | 'cancelled';
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!title || !weekStartDate || !weekEndDate) {
      return NextResponse.json(
        { error: 'Missing required fields: title, weekStartDate, weekEndDate' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique ID for the shopping list
    const shoppingListId = nanoid();
    
    // Create public ID for Cloudinary
    const publicId = `${shoppingListId}`;

    // Upload to Cloudinary
    const uploadResult = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          public_id: publicId,
          folder: "eatrivo/shopping-lists",
          format: "pdf",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as CloudinaryUploadResult);
        }
      ).end(buffer);
    });

    if (!uploadResult) {
      return NextResponse.json(
        { error: 'Failed to upload file to Cloudinary' },
        { status: 500 }
      );
    }

    // Store shopping list data in database
    // Note: For now, we'll use a default userProfileId since this is beta without authentication
    const defaultUserProfileId = "00000000-0000-0000-0000-000000000000"; // You may want to create a system user
    
    const shoppingListData = {
      title,
      description: description || null,
      weekStartDate: new Date(weekStartDate),
      weekEndDate: new Date(weekEndDate),
      status,
      cloudinaryPublicId: publicId,
      pdfUrl: uploadResult.secure_url,
      userProfileId: userId || defaultUserProfileId,
    };

    const insertedShoppingList = await db.insert(shoppingLists).values(shoppingListData).returning();

    return NextResponse.json({
      success: true,
      message: 'Shopping list uploaded successfully',
      data: {
        shoppingList: insertedShoppingList[0],
        cloudinaryUrl: uploadResult.secure_url,
      },
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



