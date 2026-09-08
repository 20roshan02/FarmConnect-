/**
 * mlApi.ts  v2
 * Fully-typed Axios client for all advanced ML endpoints at /api/v1/ml
 */

import axios, { type AxiosResponse } from "axios";

const BASE = `${import.meta.env.VITE_API_URL}/ml`;

export const mlApi = axios.create({ baseURL: BASE });

mlApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─────────────────────────────────────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductSummary {
  _id: string;
  title: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
  images?: string;
  location?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ML Overview
// ─────────────────────────────────────────────────────────────────────────────

export interface MLOverview {
  churn: {
    high: number; medium: number; low: number; total: number; avgChurnScore: number;
  };
  segments: {
    count: number; silhouette: number; optimalK: number;
    breakdown: { label: string; count: number }[];
  };
  cf: {
    activeCustomers: number; totalCustomers: number;
    cfCoverage: number; uniqueProductsPurchased: number;
  };
  catalog: { topCategory: string };
}

export interface MLOverviewResponse {
  success: boolean;
  overview: MLOverview;
}

export const fetchMLOverview = (): Promise<AxiosResponse<MLOverviewResponse>> =>
  mlApi.get("/overview");

// ─────────────────────────────────────────────────────────────────────────────
// Churn Prediction
// ─────────────────────────────────────────────────────────────────────────────

export interface FeatureContribution {
  feature: string;
  contribution: number;
  rawScore: number;
}

export interface SubModelScores {
  recencyModel: number;
  engagementModel: number;
  valueModel: number;
}

export interface ChurnFeatures {
  recencyScore: number;
  frequencyScore: number;
  monetaryScore: number;
  avgValueScore: number;
  abandonmentScore: number;
  ageScore: number;
}

export interface ChurnPrediction {
  userId: string;
  name: string;
  email: string;
  churnScore: number;
  churnRisk: "High" | "Medium" | "Low";
  recencyDays: number;
  orderCount: number;
  totalSpend: number;
  avgOrderValue: number;
  accountAgeDays: number;
  recommendedAction: string;
  trendSignal: "worsening" | "stable" | "improving";
  subModelScores: SubModelScores;
  featureContributions: FeatureContribution[];
  features: ChurnFeatures;
}

export interface PlatformFeatureImportance {
  feature: string;
  importance: number;
}

export interface ChurnSummary {
  high: number; medium: number; low: number; total: number; avgScore: number;
}

export interface ChurnResponse {
  success: boolean;
  predictions: ChurnPrediction[];
  summary: ChurnSummary;
  trendDist: Record<string, number>;
  platformFeatureImportance: PlatformFeatureImportance[];
  message?: string;
}

export const fetchChurnPredictions = (): Promise<AxiosResponse<ChurnResponse>> =>
  mlApi.get("/churn");

export const fetchFeatureImportance = (): Promise<AxiosResponse<{ success: boolean; featureImportance: PlatformFeatureImportance[] }>> =>
  mlApi.get("/feature-importance");

// ─────────────────────────────────────────────────────────────────────────────
// K-Means Customer Segments
// ─────────────────────────────────────────────────────────────────────────────

export interface RadarPoint { recency: number; frequency: number; monetary: number; retention: number; }

export interface SegmentedCustomer {
  userId: string; name: string; email: string;
  recencyDays: number; orderCount: number; totalSpend: number;
  avgOrderValue: number; cluster: number; segmentLabel: string;
}

export interface CustomerSegment {
  cluster: number; label: string;
  customers: SegmentedCustomer[];
  radar?: RadarPoint;
}

export interface SegmentSummary {
  label: string; count: number;
  avgSpend: number; avgRecency: number; avgOrders: number;
  radar?: RadarPoint;
}

export interface RadarData extends RadarPoint { label: string; }

export interface SegmentsResponse {
  success: boolean;
  segments: CustomerSegment[];
  summary: SegmentSummary[];
  radarData: RadarData[];
  centroids: number[][];
  silhouette: number;
  optimalK: number;
  inertia: number;
  message?: string;
}

export const fetchCustomerSegments = (k?: number): Promise<AxiosResponse<SegmentsResponse>> =>
  mlApi.get(k !== undefined ? `/segments?k=${k}` : "/segments");

// ─────────────────────────────────────────────────────────────────────────────
// Collaborative Filtering — Recommendations
// ─────────────────────────────────────────────────────────────────────────────

export interface Recommendation {
  productId: string; score: number;
  uniqueBuyers?: number;
  source?: string;
  product: ProductSummary | null;
}

export interface CategoryBreakdown { category: string; count: number; }

export interface RecommendationsResponse {
  success: boolean;
  recommendations: Recommendation[];
  categoryBreakdown?: CategoryBreakdown[];
  userId?: string;
  method?: string;
  categoryAffinity?: Record<string, number>;
  message?: string;
}

export interface MyRecommendationsResponse {
  success: boolean;
  recommendations: Recommendation[];
  method: string;
  categoryAffinity: Record<string, number>;
  isPersonalised: boolean;
  message?: string;
}

export const fetchMyRecommendations = (topN = 8): Promise<AxiosResponse<MyRecommendationsResponse>> =>
  mlApi.get(`/my-recommendations?topN=${topN}`);

export const fetchPlatformRecommendations = (topN = 12): Promise<AxiosResponse<RecommendationsResponse>> =>
  mlApi.get(`/recommendations?topN=${topN}`);

export const fetchUserRecommendations = (userId: string, topN = 10): Promise<AxiosResponse<RecommendationsResponse>> =>
  mlApi.get(`/user-recommendations/${userId}?topN=${topN}`);

// ─────────────────────────────────────────────────────────────────────────────
// Gradient Boosting — Demand Forecasting
// ─────────────────────────────────────────────────────────────────────────────

export interface MonthlySale { month: string; unitsSold: number; revenue: number; }

export interface ForecastPoint {
  month: string;
  predictedUnits: number;
  lowerBound: number;
  upperBound: number;
  seasonalIndex?: number;
  method: "gradient_boosting" | "moving_average";
}

export interface TrendInfo {
  slope: number;
  direction: "increasing" | "decreasing" | "stable";
  r2: number;
}

export interface SeasonalityPoint { month: string; seasonalIndex: number; }

export type StockStatus = "healthy" | "low" | "critical" | "out_of_stock";

export interface DemandForecastResult {
  product: ProductSummary;
  historicalSales: MonthlySale[];
  forecast: ForecastPoint[];
  modelAccuracy: number | null;
  rmse: number | null;
  featureImportance: Record<string, number>;
  seasonality: SeasonalityPoint[];
  trend: TrendInfo | null;
  trainLoss?: number[];
  stockStatus: StockStatus;
  totalForecastDemand: number;
  method: "gradient_boosting" | "moving_average";
}

export interface PortfolioSummary {
  alertCount: number;
  totalForecastRevenue: number;
  trendingUp: number;
  trendingDown: number;
}

export interface SingleDemandResponse extends DemandForecastResult { success: boolean; }

export interface FarmerDemandResponse {
  success: boolean;
  forecasts: DemandForecastResult[];
  forecastMonths: number;
  portfolio: PortfolioSummary;
  message?: string;
}

export const fetchProductDemandForecast = (productId: string, months = 3): Promise<AxiosResponse<SingleDemandResponse>> =>
  mlApi.get(`/demand/${productId}?months=${months}`);

export const fetchFarmerDemandForecasts = (months = 3): Promise<AxiosResponse<FarmerDemandResponse>> =>
  mlApi.get(`/farmer-demand?months=${months}`);
