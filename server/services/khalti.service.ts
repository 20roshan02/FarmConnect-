import axios, { type AxiosError, type AxiosInstance } from "axios";

export interface KhaltiCustomerInfo {
  name?: string;
  email?: string;
  phone?: string;
}

export interface InitiatePaymentParams {
  amount: number;
  purchaseOrderId: string;
  purchaseOrderName: string;
  returnUrl: string;
  websiteUrl: string;
  customerInfo?: KhaltiCustomerInfo;
}

export interface KhaltiInitiateResponse {
  pidx: string;
  payment_url: string;
  expires_at: string;
  expires_in: number;
}

export interface KhaltiLookupResponse {
  pidx: string;
  total_amount: number;
  status: "Completed" | "Pending" | "Refunded" | "Expired" | "User canceled";
  transaction_id: string | null;
  fee_amount: number;
  refunded: boolean;
}

type KhaltiErrorResponse = {
  detail?: string;
  error_key?: string;
};

export class KhaltiService {
  private readonly publicKey: string;
  private readonly client: AxiosInstance;

  constructor(
    baseUrl = process.env.KHALTI_BASE_URL,
    publicKey = process.env.KHALTI_PUBLIC_KEY,
    secretKey = process.env.KHALTI_SECRET_KEY,
  ) {
    if (!baseUrl || !publicKey || !secretKey) {
      throw new Error(
        "Khalti configuration is incomplete. Set KHALTI_BASE_URL, KHALTI_PUBLIC_KEY, and KHALTI_SECRET_KEY.",
      );
    }

    this.publicKey = publicKey;
    this.client = axios.create({
      baseURL: baseUrl.replace(/\/$/, ""),
      headers: {
        Authorization: `Key ${secretKey}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });
  }

  async initiatePayment(
    params: InitiatePaymentParams,
  ): Promise<KhaltiInitiateResponse> {
    if (!Number.isInteger(params.amount) || params.amount <= 0) {
      throw new Error("Khalti payment amount must be a positive integer in paisa.");
    }

    try {
      const response = await this.client.post<KhaltiInitiateResponse>(
        "/epayment/initiate/",
        {
          return_url: params.returnUrl,
          website_url: params.websiteUrl,
          amount: params.amount,
          purchase_order_id: params.purchaseOrderId,
          purchase_order_name: params.purchaseOrderName,
          ...(params.customerInfo
            ? { customer_info: params.customerInfo }
            : {}),
        },
      );

      return response.data;
    } catch (error) {
      throw this.toServiceError("Khalti payment initiation failed", error);
    }
  }

  async verifyPayment(pidx: string): Promise<KhaltiLookupResponse> {
    if (!pidx.trim()) {
      throw new Error("Khalti payment verification requires a pidx.");
    }

    try {
      const response = await this.client.post<KhaltiLookupResponse>(
        "/epayment/lookup/",
        { pidx },
      );

      return response.data;
    } catch (error) {
      throw this.toServiceError("Khalti payment verification failed", error);
    }
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  private toServiceError(message: string, error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<KhaltiErrorResponse>;
      const detail =
        axiosError.response?.data?.detail ||
        axiosError.response?.data?.error_key ||
        axiosError.message;
      return new Error(`${message}: ${detail}`);
    }

    if (error instanceof Error) {
      return new Error(`${message}: ${error.message}`);
    }

    return new Error(message);
  }
}

export function getKhaltiService(): KhaltiService {
  return new KhaltiService();
}