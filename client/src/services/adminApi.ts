import axios, { type AxiosResponse } from "axios";

/* =========================
   Base API
========================= */
const API = `${import.meta.env.VITE_API_URL}/admin`;

/* =========================
   Axios instance with auth
========================= */
export const adminApi = axios.create({ baseURL: API });

adminApi.interceptors.request.use((config) => {
  // Adjust "token" to whatever key you actually save it under after login
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* =========================
   Types
========================= */

export interface User {
  _id: string;
  name: string;
  email: string;
}

export interface Product {
  _id: string;
  title: string;
  status: "pending" | "approved" | "rejected";
  farmer?: User;
}

/* Generic API response types */

interface ProductsResponse {
  success: boolean;
  products: Product[];
}

interface UsersResponse<T> {
  success: boolean;
  farmers?: T[];
  customers?: T[];
}

/* =========================
   Products API
========================= */

export const fetchPendingProducts = (): Promise<
  AxiosResponse<ProductsResponse>
> => adminApi.get("/products/pending");

export const fetchApprovedProducts = (): Promise<
  AxiosResponse<ProductsResponse>
> => adminApi.get("/products/approved");

export const fetchRejectedProducts = (): Promise<
  AxiosResponse<ProductsResponse>
> => adminApi.get("/products/rejected");

export const approveProduct = (id: string): Promise<AxiosResponse<Product>> =>
  adminApi.put(`/products/${id}/approve`);

export const rejectProduct = (id: string): Promise<AxiosResponse<Product>> =>
  adminApi.put(`/products/${id}/reject`);

/* =========================
   Users API
========================= */

export const fetchFarmers = (): Promise<
  AxiosResponse<UsersResponse<User>>
> => adminApi.get("/farmers");

export const fetchCustomers = (): Promise<
  AxiosResponse<UsersResponse<User>>
> => adminApi.get("/customers");

/* =========================
   Farmer Approval API
========================= */

export type FarmerApprovalStatus = "pending" | "approved" | "rejected";

export interface FarmerUser extends User {
  approvalStatus: FarmerApprovalStatus;
  createdAt?: string;
}

interface FarmersResponse {
  success: boolean;
  farmers: FarmerUser[];
}

export const fetchFarmersByStatus = (
  status: FarmerApprovalStatus
): Promise<AxiosResponse<FarmersResponse>> =>
  adminApi.get(`/farmers/status/${status}`);

export const approveFarmer = (id: string): Promise<AxiosResponse> =>
  adminApi.put(`/farmers/${id}/approve`);

export const rejectFarmer = (id: string): Promise<AxiosResponse> =>
  adminApi.put(`/farmers/${id}/reject`);

/* =========================
   Business Insights API
========================= */

export interface SalesRankingItem {
  rank: number;
  productId: string;
  title: string;
  category: string;
  totalQty: number;
  totalRevenue: number;
  totalBuyers: number;
}

export interface BusinessChurnCustomer {
  userId: string;
  name: string;
  email: string;
  lastPaidPurchase: string | null;
  daysSinceLastPurchase: number | null;
  totalOrders: number;
  totalSpend: number;
  status: "Active" | "At Risk" | "Churned" | "Never Purchased";
}

export interface BusinessChurnSummary {
  Active: number;
  "At Risk": number;
  Churned: number;
  "Never Purchased": number;
}

export interface BusinessRecommendation {
  productId: string;
  title: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
  images?: string;
  purchaseCount: number;
  totalBuyers: number;
  reason: string;
}

export const fetchBusinessSalesRanking = (): Promise<AxiosResponse<{
  success: boolean;
  rankings: SalesRankingItem[];
}>> => adminApi.get("/business-insights/sales-ranking");

export const fetchBusinessChurn = (): Promise<AxiosResponse<{
  success: boolean;
  summary: BusinessChurnSummary;
  customers: BusinessChurnCustomer[];
}>> => adminApi.get("/business-insights/churn");

export const fetchBusinessRecommendations = (): Promise<AxiosResponse<{
  success: boolean;
  recommendations: BusinessRecommendation[];
  categories: { category: string; purchaseCount: number }[];
}>> => adminApi.get("/business-insights/recommendations");