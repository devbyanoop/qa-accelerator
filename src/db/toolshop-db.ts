import { createConnection } from 'mysql2/promise';
import type { Connection, RowDataPacket } from 'mysql2/promise';

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  billing_country: string;
  status: string;
  total: string;
}

export interface InvoiceItemRow {
  product_id: string;
  quantity: number;
  unit_price: string;
}

export interface PaymentRow {
  payment_method: string;
}

export interface UserRow {
  id: string;
  email: string;
  password: string | null;
  role: string;
}

/**
 * Read-only view of the application's database, for checks the API cannot answer: what was really stored.
 * Tests never write through it, so the application stays the only thing that changes data.
 */
export class ToolshopDb {
  private constructor(private readonly connection: Connection) {}

  static async connect(config: DbConfig): Promise<ToolshopDb> {
    return new ToolshopDb(await createConnection(config));
  }

  async close(): Promise<void> {
    await this.connection.end();
  }

  private async rows<T>(sql: string, params: unknown[]): Promise<T[]> {
    const [rows] = await this.connection.execute<RowDataPacket[]>(sql, params as never[]);
    return rows as T[];
  }

  async invoiceByNumber(invoiceNumber: string): Promise<InvoiceRow | undefined> {
    const [row] = await this.rows<InvoiceRow>(
      'SELECT id, invoice_number, billing_country, status, total FROM invoices WHERE invoice_number = ?',
      [invoiceNumber],
    );
    return row;
  }

  invoiceItems(invoiceId: string): Promise<InvoiceItemRow[]> {
    return this.rows<InvoiceItemRow>(
      'SELECT product_id, quantity, unit_price FROM invoice_items WHERE invoice_id = ?',
      [invoiceId],
    );
  }

  payments(invoiceId: string): Promise<PaymentRow[]> {
    return this.rows<PaymentRow>('SELECT payment_method FROM payments WHERE invoice_id = ?', [invoiceId]);
  }

  async userByEmail(email: string): Promise<UserRow | undefined> {
    const [row] = await this.rows<UserRow>('SELECT id, email, password, role FROM users WHERE email = ?', [
      email,
    ]);
    return row;
  }

  async productCount(name: string): Promise<number> {
    const [row] = await this.rows<{ total: number }>(
      'SELECT COUNT(*) AS total FROM products WHERE name = ?',
      [name],
    );
    return Number(row?.total ?? 0);
  }
}
