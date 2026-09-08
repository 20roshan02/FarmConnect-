// pages/VerifyEmail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import axios from "axios";

const VerifyEmail = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function verify() {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/user/verify-email/${token}`
        );
        setStatus("success");
        setMessage(res.data.message);

        setTimeout(() => navigate("/login"), 2000);
      } catch (error: any) {
        setStatus("error");
        setMessage(
          error?.response?.data?.message || "Verification failed"
        );
      }
    }

    if (token) verify();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-tr from-pink-400 to-indigo-600">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center space-y-4">
        {status === "loading" && <p>Verifying your email...</p>}
        {status === "success" && (
          <>
            <p className="text-green-600 font-semibold">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-red-600 font-semibold">{message}</p>
            <Link to="/login" className="text-blue-500 underline">
              Go to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;