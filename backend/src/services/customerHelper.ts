import prisma from "../config/db";

export interface CustomerStats {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: Date;
  totalSpend: number;
  orderCount: number;
  lastPurchaseDate: Date | null;
  daysSinceLastPurchase: number | null;
}

export interface SegmentFilterConfig {
  lastPurchaseDaysAgo?: number;
  maxPurchaseDaysAgo?: number;
  minTotalSpend?: number;
  maxTotalSpend?: number;
  minOrders?: number;
  maxOrders?: number;
}

export async function computeAllCustomerStats(): Promise<CustomerStats[]> {
  const customers = await prisma.customer.findMany({
    include: {
      orders: {
        where: {
          status: "COMPLETED"
        },
        orderBy: {
          purchaseDate: "desc"
        }
      }
    }
  });

  const now = new Date();

  return customers.map((customer) => {
    const orders = customer.orders;
    const totalSpend = orders.reduce((sum, order) => sum + Number(order.amount), 0);
    const orderCount = orders.length;
    const lastPurchaseDate = orders.length > 0 ? orders[0].purchaseDate : null;

    let daysSinceLastPurchase: number | null = null;
    if (lastPurchaseDate) {
      const diffTime = Math.abs(now.getTime() - lastPurchaseDate.getTime());
      daysSinceLastPurchase = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      createdAt: customer.createdAt,
      totalSpend: Number(totalSpend.toFixed(2)),
      orderCount,
      lastPurchaseDate,
      daysSinceLastPurchase
    };
  });
}

export function filterCustomersByConfig(customers: CustomerStats[], config: SegmentFilterConfig): CustomerStats[] {
  return customers.filter((customer) => {
    // 1. lastPurchaseDaysAgo filter (last purchase must be AT LEAST N days ago)
    if (config.lastPurchaseDaysAgo !== undefined && config.lastPurchaseDaysAgo !== null) {
      if (customer.daysSinceLastPurchase === null) {
        // If they have never purchased, should they be included?
        // Usually, yes, if they haven't purchased in 60 days, they haven't purchased ever either.
        // Let's count never-purchased as Infinity days ago.
      } else if (customer.daysSinceLastPurchase < config.lastPurchaseDaysAgo) {
        return false;
      }
    }

    // 2. maxPurchaseDaysAgo filter (last purchase must be AT MOST N days ago)
    if (config.maxPurchaseDaysAgo !== undefined && config.maxPurchaseDaysAgo !== null) {
      if (customer.daysSinceLastPurchase === null || customer.daysSinceLastPurchase > config.maxPurchaseDaysAgo) {
        return false;
      }
    }

    // 3. minTotalSpend filter
    if (config.minTotalSpend !== undefined && config.minTotalSpend !== null) {
      if (customer.totalSpend < config.minTotalSpend) {
        return false;
      }
    }

    // 4. maxTotalSpend filter
    if (config.maxTotalSpend !== undefined && config.maxTotalSpend !== null) {
      if (customer.totalSpend > config.maxTotalSpend) {
        return false;
      }
    }

    // 5. minOrders filter
    if (config.minOrders !== undefined && config.minOrders !== null) {
      if (customer.orderCount < config.minOrders) {
        return false;
      }
    }

    // 6. maxOrders filter
    if (config.maxOrders !== undefined && config.maxOrders !== null) {
      if (customer.orderCount > config.maxOrders) {
        return false;
      }
    }

    return true;
  });
}
