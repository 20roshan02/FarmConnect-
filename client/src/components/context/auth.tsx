import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import toast from "react-hot-toast";
import axios from "axios";
import { useDispatch } from "react-redux";
import { login } from "../../utils/userSlice";

// 🔥 Type for form state
interface AuthData {
  name: string;
  email: string;
  password: string;
}

// 🔥 Props type
interface AuthProps {
  type: "signup" | "signin";
}

const Auth = ({ type }: AuthProps) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [data, setData] = useState<AuthData>({
    name: "",
    email: "",
    password: "",
  });

  function handleForm(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    setData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/user/${type}`,
        data
      );

      toast.success(res.data.message);

      if (type === "signin") {
        dispatch(login(res.data.user));
        navigate("/");
      } else {
        navigate("/signin");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Something went wrong");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white text-gray-500 max-w-85 w-full mx-4 md:p-6 p-4 py-8 text-left text-sm rounded-lg shadow-[0px_0px_10px_0px] shadow-black/10"
    >
      <h2 className="text-2xl font-bold mb-9 text-center text-gray-800">
        {type === "signup" ? "Sign Up" : "Sign In"}
      </h2>

      {/* NAME FIELD (only signup) */}
      {type === "signup" && (
        <div className="flex items-center my-2 border bg-indigo-500/5 border-gray-500/10 rounded gap-1 pl-2">
          <input
            className="w-full outline-none bg-transparent py-2.5"
            type="text"
            name="name"
            placeholder="Username"
            onChange={handleForm}
            required
          />
        </div>
      )}

      {/* EMAIL */}
      <div className="flex items-center my-2 border bg-indigo-500/5 border-gray-500/10 rounded gap-1 pl-2">
        <input
          className="w-full outline-none bg-transparent py-2.5"
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleForm}
          required
        />
      </div>

      {/* PASSWORD */}
      <div className="flex items-center mt-2 mb-8 border bg-indigo-500/5 border-gray-500/10 rounded gap-1 pl-2">
        <input
          className="w-full outline-none bg-transparent py-2.5"
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleForm}
          required
        />
      </div>

      {/* BUTTON */}
      <button className="w-full mb-3 bg-indigo-500 hover:bg-indigo-600 transition-all active:scale-95 py-2.5 rounded text-white font-medium">
        {type === "signup" ? "Create Account" : "Login Account"}
      </button>

      {/* LINKS */}
      {type === "signup" ? (
        <p className="text-center mt-4">
          Already have an account?{" "}
          <Link to="/signin" className="text-blue-500 underline">
            Log In
          </Link>
        </p>
      ) : (
        <p className="text-center mt-4">
          Don't have an account?{" "}
          <Link to="/signup" className="text-blue-500 underline">
            Create Account
          </Link>
        </p>
      )}
    </form>
  );
};

export default Auth;