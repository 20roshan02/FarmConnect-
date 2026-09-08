import { XCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router";

type FailureState = { message?: string };

export default function KhaltiFailure() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as FailureState | null;

  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-red-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg sm:p-10">
        <XCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
        <h1 className="text-2xl font-bold text-red-600">Payment Failed</h1>
        <p className="mt-3 text-gray-500">
          {state?.message || "Your payment was not confirmed. No payment was completed."}
        </p>
        <p className="mt-2 text-sm text-gray-400">
          Your cart is unchanged, so you can try again whenever you are ready.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => navigate("/cart")}
            className="flex-1 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
          >
            Retry Payment
          </button>
          <button
            onClick={() => navigate("/cart")}
            className="flex-1 rounded-xl bg-gray-100 px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-200"
          >
            Back to Cart
          </button>
        </div>
      </section>
    </main>
  );
}