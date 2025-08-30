import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST(_request: NextRequest) {
  if (env.NODE_ENV !== "development") {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  // Simulate API call to fetch coupon list from external service
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Define coupon type for better type safety
  type CouponData = {
    code: string;
    type: "percentage" | "fixed";
    value: number;
    minAmount: number;
    maxDiscount: number;
    validFrom: string;
    validUntil: string;
    usageLimit: number;
    usedCount: number;
    restrictions: string[];
    category: string;
    description: string;
  };

  // Simulate comprehensive coupon database
  const allCoupons: Record<string, CouponData> = {
    WELCOME20: {
      code: "WELCOME20",
      type: "percentage",
      value: 20,
      minAmount: 50,
      maxDiscount: 100,
      validFrom: "2024-01-01",
      validUntil: "2024-12-31",
      usageLimit: 1000,
      usedCount: 342,
      restrictions: ["new_customers_only"],
      category: "Welcome",
      description: "20% off for new customers",
    },
    SAVE50: {
      code: "SAVE50",
      type: "fixed",
      value: 50,
      minAmount: 200,
      maxDiscount: 50,
      validFrom: "2024-01-01",
      validUntil: "2024-06-30",
      usageLimit: 500,
      usedCount: 189,
      restrictions: ["enterprise_plans_only"],
      category: "Enterprise",
      description: "$50 off enterprise plans",
    },
    FLASH25: {
      code: "FLASH25",
      type: "percentage",
      value: 25,
      minAmount: 100,
      maxDiscount: 200,
      validFrom: "2024-01-15",
      validUntil: "2024-01-20",
      usageLimit: 200,
      usedCount: 156,
      restrictions: ["flash_sale"],
      category: "Flash Sale",
      description: "25% off flash sale items",
    },
    LOYALTY10: {
      code: "LOYALTY10",
      type: "percentage",
      value: 10,
      minAmount: 0,
      maxDiscount: 50,
      validFrom: "2024-01-01",
      validUntil: "2024-12-31",
      usageLimit: 10000,
      usedCount: 2341,
      restrictions: ["returning_customers"],
      category: "Loyalty",
      description: "10% off for returning customers",
    },
    STUDENT15: {
      code: "STUDENT15",
      type: "percentage",
      value: 15,
      minAmount: 25,
      maxDiscount: 75,
      validFrom: "2024-01-01",
      validUntil: "2024-12-31",
      usageLimit: 2000,
      usedCount: 892,
      restrictions: ["student_verification_required"],
      category: "Student",
      description: "15% off for verified students",
    },
    BULK30: {
      code: "BULK30",
      type: "percentage",
      value: 30,
      minAmount: 500,
      maxDiscount: 300,
      validFrom: "2024-01-01",
      validUntil: "2024-12-31",
      usageLimit: 100,
      usedCount: 23,
      restrictions: ["bulk_orders_only"],
      category: "Bulk Orders",
      description: "30% off bulk orders over $500",
    },
    HOLIDAY40: {
      code: "HOLIDAY40",
      type: "percentage",
      value: 40,
      minAmount: 150,
      maxDiscount: 400,
      validFrom: "2024-12-01",
      validUntil: "2024-12-31",
      usageLimit: 300,
      usedCount: 67,
      restrictions: ["holiday_season"],
      category: "Holiday",
      description: "40% off holiday season specials",
    },
  };

  // Convert to array and add availability status
  const couponsList = Object.values(allCoupons).map((coupon) => {
    const now = new Date();
    const validFrom = new Date(coupon.validFrom);
    const validUntil = new Date(coupon.validUntil);

    let status = "active";
    if (now < validFrom) status = "not_yet_active";
    else if (now > validUntil) status = "expired";
    else if (coupon.usedCount >= coupon.usageLimit) status = "usage_limit_reached";

    return {
      ...coupon,
      status,
      usageLeft: coupon.usageLimit - coupon.usedCount,
      isExpired: now > validUntil,
      isActive: now >= validFrom && now <= validUntil && coupon.usedCount < coupon.usageLimit,
    };
  });

  // Sort by category and then by value
  couponsList.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return b.value - a.value;
  });

  return NextResponse.json({
    success: true,
    data: {
      totalCoupons: couponsList.length,
      activeCoupons: couponsList.filter((c) => c.isActive).length,
      coupons: couponsList,
      categories: [...new Set(couponsList.map((c) => c.category))],
      fetchTime: "600ms (simulated)",
      cached: false,
    },
  });
}
