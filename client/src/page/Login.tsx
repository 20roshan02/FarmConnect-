import axios from "axios";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useDispatch } from "react-redux";
import { login } from "../utils/userSlice";
import { notify } from "../page/toast";

type LoginProps = {
  type: "login" | "signUp";
};

type FormData = {
  name: string;
  email: string;
  password: string;
  role: "customer" | "farmer" | "admin";
};

const Login = ({ type }: LoginProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();

  const requestedRole = searchParams.get("role");
  const initialRole: FormData["role"] =
    requestedRole === "farmer" || requestedRole === "admin"
      ? requestedRole
      : "customer";

  const [data, setData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    role: initialRole,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/user/${
          type === "signUp" ? "signUp" : "login"
        }`,
        type === "login"
          ? {
              email: data.email,
              password: data.password,
            }
          : {
              name: data.name,
              email: data.email,
              password: data.password,
              role: data.role,
            }
      );

      if (type === "signUp") {
        notify.success(res.data.message);
        navigate(`/login?role=${data.role}`);
        return;
      }

      const user = res.data.user;
      if (user.role !== data.role) {
        notify.error(`Please login as a ${data.role}.`);
        return;
      }

      const normalizedUser = {
        _id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        token: user.token,
      };

      notify.success(res.data.message);
      dispatch(login(normalizedUser));
      localStorage.setItem("user", JSON.stringify(normalizedUser));
      localStorage.setItem("token", user.token);

      if (user.role === "admin") {
        navigate("/admin-dashboard");
      } else if (user.role === "farmer") {
        navigate("/farmerDashboard");
      } else {
        navigate("/");
      }
    } catch (error: any) {
      notify.error(error?.response?.data?.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  const roleOptions =
    type === "login"
      ? ["customer", "farmer", "admin"]
      : ["customer", "farmer"];

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-tr from-pink-400 to-indigo-600">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl p-10 space-y-6"
      >
        <h2 className="text-3xl font-bold text-center">
          {type === "signUp" ? "Sign Up" : "Login"}
        </h2>

        <div
          className={`grid gap-3 ${type === "login" ? "grid-cols-3" : "grid-cols-2"}`}
        >
          {roleOptions.map((role) => {
            const roleKey = role as FormData["role"];
            const isActive = data.role === roleKey;
            const styleMap: Record<FormData["role"], string> = {
              customer: "border-blue-500 bg-blue-50 text-blue-700",
              farmer: "border-green-500 bg-green-50 text-green-700",
              admin: "border-orange-500 bg-orange-50 text-orange-700",
            };

            return (
              <button
                key={role}
                type="button"
                onClick={() => setData((prev) => ({ ...prev, role: roleKey }))}
                className={`rounded-xl border px-4 py-3 font-semibold transition ${
                  isActive
                    ? styleMap[roleKey]
                    : "border-gray-200 bg-gray-50 text-gray-500"
                }`}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            );
          })}
        </div>

        {type === "signUp" && (
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            onChange={handleChange}
            className="w-full p-3 border rounded-xl"
            required
          />
        )}

        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleChange}
          className="w-full p-3 border rounded-xl"
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          className="w-full p-3 border rounded-xl"
          required
        />

        {type === "signUp" && (
          <input type="hidden" name="role" value={data.role} readOnly />
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold"
        >
          {isSubmitting ? "Loading..." : type === "signUp" ? "Sign Up" : "Login"}
        </button>

        <p className="text-center text-sm">
          {type === "signUp" ? (
            <>
              Already have an account?{" "}
              <Link to="/login" className="text-blue-500">
                Login
              </Link>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <Link to="/signUp" className="text-blue-500">
                Sign Up
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
};

export default Login;