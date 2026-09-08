import { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { CheckCircle2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { useSelector } from "react-redux";
import { CartContext } from "../components/context/CartContext";
import type { RootState } from "../utils/store";

type PaymentResult = {
  orderId: string;
  transactionId: string;
  amountPaid: number;
  paymentDate: string;
};

export default function KhaltiSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cartContext = useContext(CartContext);
  const user = useSelector((state: RootState) => state.user.user);
  const verificationStarted = useRef(false);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [loadingMessage] = useState("Verifying your payment...");

  useEffect(() => {
    if (verificationStarted.current) return;
    verificationStarted.current = true;

    const pidx = searchParams.get("pidx");
    if (!pidx || !user?.token) {
      navigate("/payment/failure", {
        replace: true,
        state: { message: !pidx ? "No Khalti payment reference was received." : "Please sign in to verify this payment." },
      });
      return;
    }

    axios
      .post(
        `${import.meta.env.VITE_API_URL}/order/khalti/verify`,
        { pidx },
        { headers: { Authorization: `Bearer ${user.token}` } },
      )
      .then((response) => {
        const data = response.data;
        setResult({
          orderId: String(data.orderId),
          transactionId: data.transactionId || "Not provided",
          amountPaid: Number(data.amountPaid || 0),
          paymentDate: data.paidAt || new Date().toISOString(),
        });
        void cartContext?.fetchCart();
      })
      .catch((requestError: unknown) => {
        const errorResponse = requestError as {
          response?: { data?: { message?: string } };
        };
        navigate("/payment/failure", {
          replace: true,
          state: {
            message:
              errorResponse.response?.data?.message ||
              "Khalti could not verify this payment.",
          },
        });
      });
  }, [cartContext, navigate, searchParams, user?.token]);

  if (!result) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-green-50 px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />
          <p className="text-gray-600">{loadingMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-green-50 px-4 py-12">
      <section className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg sm:p-10">
        <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-600" />
        <h1 className="text-2xl font-bold text-green-700">Payment Successful</h1>
        <p className="mt-2 text-gray-500">Your order has been confirmed.</p>

        <dl className="mt-8 space-y-4 rounded-xl bg-gray-50 p-5 text-left text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Order ID</dt>
            <dd className="max-w-[60%] truncate font-mono text-gray-800">{result.orderId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Transaction ID</dt>
            <dd className="max-w-[60%] truncate font-mono text-gray-800">{result.transactionId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Amount Paid</dt>
            <dd className="font-semibold text-gray-800">Rs {result.amountPaid}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Payment Date</dt>
            <dd className="text-right text-gray-800">
              {new Date(result.paymentDate).toLocaleString("en-NP")}
            </dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => navigate("/orders")}
            className="flex-1 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
          >
            View My Orders
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex-1 rounded-xl bg-gray-100 px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-200"
          >
            Continue Shopping
          </button>
        </div>
      </section>
    </main>
  );
}