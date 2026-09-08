/**
 * myProducts.tsx — Modern redesign
 * Full CRUD for farmer's own products with polished table + edit modal.
 */
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { HiOutlineMenu, HiX } from "react-icons/hi";
import { HiOutlinePencilSquare, HiOutlineTrash, HiOutlineXMark } from "react-icons/hi2";
import FarmerSidebar from "./FarmerSidebar";

type Product = {
  _id: string; title: string; price: number; stock: number;
  location: string; description: string; category: string; images?: string;
};

const CAT_COLOR: Record<string, string> = {
  vegetables:"#16a34a", fruits:"#d97706", grains:"#92400e", dairy:"#2563eb", other:"#7c3aed",
};

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 placeholder:text-slate-300";

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[1,2,3,4,5].map(i => <td key={i} className="px-4 py-3.5"><div className="h-4 bg-slate-100 rounded-full" /></td>)}
    </tr>
  );
}

export default function MyProducts() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [editing,  setEditing]  = useState<Product | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    if (!u?._id) { navigate("/login"); return; }
    if (u.role !== "farmer") { navigate("/"); return; }
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/product/my-products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data?.products || []);
    } catch { toast.error("Failed to load products"); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product permanently?")) return;
    setDeleting(id);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/product/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(prev => prev.filter(p => p._id !== id));
      toast.success("Product deleted");
    } catch { toast.error("Delete failed"); }
    finally { setDeleting(null); }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/product/${editing._id}`,
        { title: editing.title, price: editing.price, stock: editing.stock, location: editing.location, description: editing.description, category: editing.category },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProducts(prev => prev.map(p => p._id === editing._id ? res.data.product : p));
      setEditing(null);
      toast.success("Product updated ✅");
    } catch { toast.error("Update failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* Mobile bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b bg-white/90 px-4 py-3 backdrop-blur-md md:hidden">
        <span className="font-bold text-slate-800">My Products</span>
        <button onClick={() => setMobileOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-600">
          <HiOutlineMenu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="flex h-full w-72 flex-col bg-[#0f1f17] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <span className="font-bold text-white">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:text-white"><HiX size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4"><FarmerSidebar /></div>
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <FarmerSidebar />

      <main className="mt-14 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 md:mt-0">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Products</h1>
            <p className="text-sm text-slate-500">{products.length} listing{products.length !== 1 ? "s" : ""} in your storefront</p>
          </div>
          <button onClick={() => navigate("/farmerDashboard")}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700">
            + Add Product
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Product", "Category", "Price", "Stock", "Location", "Actions"].map(h => (
                    <th key={h} className="border-b border-slate-200 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && [1,2,3].map(i => <SkeletonRow key={i} />)}
                {!loading && products.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400 text-sm">
                      No products listed yet.
                      <button onClick={() => navigate("/farmerDashboard")} className="ml-2 font-semibold text-emerald-600 underline">Add one now</button>
                    </td>
                  </tr>
                )}
                {!loading && products.map((p, i) => {
                  const cc = CAT_COLOR[p.category] || "#6b7280";
                  return (
                    <tr key={p._id} className={`transition hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {p.images ? (
                            <img src={p.images} alt={p.title} className="h-9 w-9 rounded-xl object-cover shrink-0" />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base" style={{ backgroundColor: cc + "18" }}>🌿</div>
                          )}
                          <span className="font-semibold text-slate-900 line-clamp-1">{p.title}</span>
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize" style={{ color: cc, backgroundColor: cc + "18" }}>
                          {p.category}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5 font-semibold text-slate-800">Rs {p.price.toLocaleString()}</td>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <span className={`font-semibold ${p.stock === 0 ? "text-red-500" : p.stock <= 5 ? "text-amber-500" : "text-slate-700"}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5 text-slate-500">{p.location}</td>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditing(p)}
                            className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[12px] font-semibold text-blue-700 transition hover:bg-blue-100">
                            <HiOutlinePencilSquare size={13} /> Edit
                          </button>
                          <button onClick={() => handleDelete(p._id)} disabled={deleting === p._id}
                            className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50">
                            <HiOutlineTrash size={13} /> {deleting === p._id ? "…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="font-bold text-slate-900">Edit Product</h2>
              <button onClick={() => setEditing(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                <HiOutlineXMark size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Product Name</label>
                <input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Price (Rs)</label>
                  <input type="number" value={editing.price} onChange={e => setEditing({ ...editing, price: Number(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Stock</label>
                  <input type="number" value={editing.stock} onChange={e => setEditing({ ...editing, stock: Number(e.target.value) })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Category</label>
                <select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} className={inputCls}>
                  {["vegetables","fruits","grains","dairy","other"].map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Location</label>
                <input value={editing.location} onChange={e => setEditing({ ...editing, location: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Description</label>
                <textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={3} className={inputCls + " resize-none"} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <button onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancel</button>
              <button onClick={handleUpdate} disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60">
                {saving ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Saving…</> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
