export class AnalyticsService {
  constructor(private db: D1Database) {}

  async getDashboardOverview() {
    // 1. Total revenue from confirmed orders
    const revenueResult = await this.db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) AS totalRevenue
      FROM orders
      WHERE status IN ('confirmed', 'processing', 'shipped', 'delivered')
    `).first<{ totalRevenue: number }>()

    // 2. Total orders and breakdown by status
    const orderStats = await this.db.prepare(`
      SELECT
        COUNT(*) AS totalOrders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingOrders,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmedOrders,
        SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) AS shippedOrders,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS deliveredOrders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelledOrders,
        SUM(CASE WHEN status = 'payment_failed' THEN 1 ELSE 0 END) AS failedOrders
      FROM orders
    `).first<any>()

    // 3. Total customers
    const customerCount = await this.db.prepare(`
      SELECT COUNT(*) AS totalCustomers
      FROM users
      WHERE role = 'customer'
    `).first<{ totalCustomers: number }>()

    // 4. Products count & inventory totals
    const inventoryStats = await this.db.prepare(`
      SELECT
        COUNT(p.id) AS totalProducts,
        SUM(CASE WHEN p.status = 'active' THEN 1 ELSE 0 END) AS activeProducts,
        COALESCE(SUM(i.on_hand), 0) AS totalOnHand,
        COALESCE(SUM(i.reserved), 0) AS totalReserved,
        COALESCE(SUM(i.on_hand - i.reserved), 0) AS totalAvailable
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id
    `).first<any>()

    // 5. Low-stock products (available < 5)
    const lowStockResult = await this.db.prepare(`
      SELECT
        p.id,
        p.name,
        p.sku,
        COALESCE(i.on_hand, 0) AS onHand,
        COALESCE(i.reserved, 0) AS reserved,
        COALESCE(i.on_hand - i.reserved, 0) AS available
      FROM products p
      JOIN inventory i ON i.product_id = p.id
      WHERE p.status = 'active' AND (i.on_hand - i.reserved) < 5
      ORDER BY (i.on_hand - i.reserved) ASC
      LIMIT 10
    `).all<any>()

    // 6. Best-selling products
    const topProducts = await this.db.prepare(`
      SELECT
        oi.product_id AS productId,
        oi.product_name AS productName,
        SUM(oi.quantity) AS unitsSold,
        SUM(oi.subtotal) AS totalSales
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status IN ('confirmed', 'processing', 'shipped', 'delivered')
      GROUP BY oi.product_id, oi.product_name
      ORDER BY unitsSold DESC
      LIMIT 5
    `).all<any>()

    // 7. Recent orders
    const recentOrders = await this.db.prepare(`
      SELECT
        o.id,
        o.order_number AS orderNumber,
        o.status,
        o.total_amount AS totalAmount,
        o.created_at AS createdAt,
        u.name AS customerName,
        u.email AS customerEmail
      FROM orders o
      JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
      LIMIT 8
    `).all<any>()

    // 8. Revenue trends (grouped by date)
    const revenueTrends = await this.db.prepare(`
      SELECT date, revenue, orderCount
      FROM (
        SELECT
          substr(o.created_at, 1, 10) AS date,
          SUM(o.total_amount) AS revenue,
          COUNT(o.id) AS orderCount
        FROM orders o
        WHERE o.status IN ('confirmed', 'processing', 'shipped', 'delivered')
        GROUP BY substr(o.created_at, 1, 10)
        ORDER BY date DESC
        LIMIT 14
      )
      ORDER BY date ASC
    `).all<any>()

    return {
      revenue: {
        totalPaise: revenueResult?.totalRevenue ?? 0,
        totalRupees: (revenueResult?.totalRevenue ?? 0) / 100
      },
      orders: {
        total: orderStats?.totalOrders ?? 0,
        pending: orderStats?.pendingOrders ?? 0,
        confirmed: orderStats?.confirmedOrders ?? 0,
        shipped: orderStats?.shippedOrders ?? 0,
        delivered: orderStats?.deliveredOrders ?? 0,
        cancelled: orderStats?.cancelledOrders ?? 0,
        failed: orderStats?.failedOrders ?? 0
      },
      customers: {
        total: customerCount?.totalCustomers ?? 0
      },
      inventory: {
        totalProducts: inventoryStats?.totalProducts ?? 0,
        activeProducts: inventoryStats?.activeProducts ?? 0,
        totalOnHand: inventoryStats?.totalOnHand ?? 0,
        totalReserved: inventoryStats?.totalReserved ?? 0,
        totalAvailable: inventoryStats?.totalAvailable ?? 0
      },
      lowStockProducts: lowStockResult.results,
      bestSellers: topProducts.results,
      recentOrders: recentOrders.results,
      revenueTrends: revenueTrends.results
    }
  }
}
