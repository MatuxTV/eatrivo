import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import { createDiscountCoupon, stripe } from "@/lib/billing/stripe";
import { db } from "@/index";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(`user:${session.user.id}`, "standard");
    if (!rl.success) return rl.response!;

    // Check if user is admin
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const {
      name,
      percentOff,
      amountOff,
      duration = "once",
      durationInMonths,
      maxRedemptions,
    } = body as {
      name: string;
      percentOff?: number;
      amountOff?: number;
      duration?: "once" | "forever" | "repeating";
      durationInMonths?: number;
      maxRedemptions?: number;
    };

    // Validate input
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!percentOff && !amountOff) {
      return NextResponse.json(
        { error: "Either percentOff or amountOff is required" },
        { status: 400 },
      );
    }

    // Validate discount ranges
    if (percentOff !== undefined && (typeof percentOff !== "number" || percentOff < 1 || percentOff > 100)) {
      return NextResponse.json(
        { error: "percentOff must be a number between 1 and 100" },
        { status: 400 },
      );
    }
    if (amountOff !== undefined && (typeof amountOff !== "number" || amountOff < 1)) {
      return NextResponse.json(
        { error: "amountOff must be a positive number" },
        { status: 400 },
      );
    }
    if (durationInMonths !== undefined && (!Number.isInteger(durationInMonths) || durationInMonths < 1 || durationInMonths > 36)) {
      return NextResponse.json(
        { error: "durationInMonths must be a positive integer (max 36)" },
        { status: 400 },
      );
    }
    if (maxRedemptions !== undefined && (!Number.isInteger(maxRedemptions) || maxRedemptions < 1)) {
      return NextResponse.json(
        { error: "maxRedemptions must be a positive integer" },
        { status: 400 },
      );
    }

    const coupon = await createDiscountCoupon({
      name,
      percentOff,
      amountOff,
      currency: "eur",
      duration,
      durationInMonths,
      maxRedemptions,
    });

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.id,
        name: coupon.name,
        percentOff: coupon.percent_off,
        amountOff: coupon.amount_off,
        duration: coupon.duration,
      },
    });
  } catch (error) {
    console.error("Create discount error:", error);
    return NextResponse.json(
      { error: "Failed to create discount" },
      { status: 500 },
    );
  }
}

// GET - List all coupons
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const coupons = await stripe.coupons.list({ limit: 50 });

    return NextResponse.json({
      coupons: coupons.data.map((c) => ({
        id: c.id,
        name: c.name,
        percentOff: c.percent_off,
        amountOff: c.amount_off,
        duration: c.duration,
        valid: c.valid,
        timesRedeemed: c.times_redeemed,
        maxRedemptions: c.max_redemptions,
      })),
    });
  } catch (error) {
    console.error("List discounts error:", error);
    return NextResponse.json(
      { error: "Failed to list discounts" },
      { status: 500 },
    );
  }
}

// DELETE - Delete a coupon
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const couponId = searchParams.get("id");

    if (!couponId) {
      return NextResponse.json(
        { error: "Coupon ID required" },
        { status: 400 },
      );
    }

    await stripe.coupons.del(couponId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete discount error:", error);
    return NextResponse.json(
      { error: "Failed to delete discount" },
      { status: 500 },
    );
  }
}
