"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronRight, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { deleteProduct, listProducts, setProductActive } from "@/lib/services/products.service";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/lib/services/categories.service";
import { Category, Product } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCLP } from "@/lib/utils/format";

const CAN_MANAGE_ROLES = ["owner", "admin", "warehouse"];

export default function InventarioPage() {
  const { profile } = useAuth();
  const [supabase] = useState(() => createClient());

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["__none__"]));

  // Edición inline de categoría
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Nueva categoría
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📦");
  const [isCreating, setIsCreating] = useState(false);

  const canManage = !!profile && CAN_MANAGE_ROLES.includes(profile.role);

  useEffect(() => {
    listCategories(supabase).then(({ categories }) => {
      setCategories(categories);
      setExpandedIds(new Set(categories.map((c) => c.id)));
    });
    listProducts(supabase, { includeInactive: canManage }).then(({ products }) => {
      setProducts(products);
      setIsLoading(false);
    });
  }, [supabase]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.marca.toLowerCase().includes(q) ||
      p.talla.toLowerCase().includes(q)
    );
  }, [products, search]);

  const byCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of filtered) {
      const key = p.categoryId || "__none__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [filtered]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon);
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return;
    setIsSavingEdit(true);
    await updateCategory(supabase, editingId, editName.trim(), editIcon.trim() || "📦");
    setCategories((prev) =>
      prev.map((c) =>
        c.id === editingId ? { ...c, name: editName.trim(), icon: editIcon.trim() || "📦" } : c
      )
    );
    setIsSavingEdit(false);
    setEditingId(null);
  }

  async function handleDeleteCategory(cat: Category) {
    if (!window.confirm(`¿Eliminar la categoría "${cat.name}"?\n\nLos productos de esta categoría quedarán sin categoría.`)) return;
    await deleteCategory(supabase, cat.id);
    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
  }

  async function handleDeleteProduct(product: Product) {
    if (!window.confirm(`¿Eliminar el producto "${product.name}"?\n\nEsta acción no se puede deshacer.`)) return;
    await deleteProduct(supabase, product.id);
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
  }

  async function handleToggleActive(product: Product) {
    await setProductActive(supabase, product.id, !product.isActive);
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, isActive: !p.isActive } : p))
    );
  }

  async function handleCreateCategory() {
    if (!newName.trim()) return;
    setIsCreating(true);
    const { category } = await createCategory(supabase, newName.trim(), newIcon.trim() || "📦");
    if (category) {
      setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
      setExpandedIds((prev) => new Set([...prev, category.id]));
    }
    setNewName("");
    setNewIcon("📦");
    setShowNewForm(false);
    setIsCreating(false);
  }

  if (profile && !canManage) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
        <h1 className="text-xl font-bold text-gray-900">Acceso restringido</h1>
        <p className="mt-2 text-gray-500">Tu rol no tiene acceso al módulo de inventario.</p>
      </div>
    );
  }

  const noneProducts = byCategory.get("__none__") ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-500">Organizado por categorías.</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            <Plus size={16} /> Nueva categoría
          </button>
        )}
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto por nombre..."
          className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-11 pr-4 text-base text-gray-900 focus:border-brand-500 focus:outline-2 focus:outline-brand-100"
        />
      </div>

      {/* Formulario nueva categoría */}
      {showNewForm && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Emoji / Ícono</label>
            <input
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              className="w-20 rounded-xl border border-gray-300 bg-white px-3 py-2 text-center text-lg focus:border-brand-400 focus:outline-none"
              maxLength={4}
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-40">
            <label className="text-xs font-medium text-gray-600">Nombre de la categoría</label>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateCategory(); if (e.key === "Escape") setShowNewForm(false); }}
              placeholder="Nombre de la categoría"
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            />
          </div>
          <button
            onClick={handleCreateCategory}
            disabled={isCreating || !newName.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Check size={15} /> Crear
          </button>
          <button
            onClick={() => setShowNewForm(false)}
            className="rounded-xl bg-gray-100 px-4 py-2 text-sm text-gray-600 hover:bg-gray-200"
          >
            Cancelar
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-400">
          Cargando inventario...
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map((cat) => {
            const catProducts = byCategory.get(cat.id) ?? [];
            const isExpanded = expandedIds.has(cat.id);
            const isEditing = editingId === cat.id;

            return (
              <div key={cat.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                {/* Cabecera de categoría */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  {isEditing ? (
                    <>
                      <input
                        value={editIcon}
                        onChange={(e) => setEditIcon(e.target.value)}
                        className="w-12 rounded-lg border border-gray-300 bg-white px-2 py-1 text-center text-lg focus:border-brand-400 focus:outline-none"
                        maxLength={4}
                      />
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold focus:border-brand-400 focus:outline-none"
                      />
                      <button onClick={saveEdit} disabled={isSavingEdit} className="rounded-lg bg-brand-600 p-1.5 text-white hover:bg-brand-700 disabled:opacity-50">
                        <Check size={15} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="rounded-lg bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200">
                        <X size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => toggleExpand(cat.id)}
                        className="flex flex-1 items-center gap-2.5 text-left"
                      >
                        <span className="text-xl">{cat.icon}</span>
                        <span className="font-semibold text-gray-900">{cat.name}</span>
                        <span className="text-sm text-gray-400">({catProducts.length})</span>
                        <span className="ml-auto text-gray-400">
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </span>
                      </button>
                      {canManage && (
                        <div className="flex items-center gap-1 ml-2">
                          <Link
                            href={`/inventario/nuevo?categoryId=${cat.id}`}
                            className="flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
                          >
                            <Plus size={13} /> Agregar
                          </Link>
                          <button
                            onClick={() => startEdit(cat)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                            title="Editar categoría"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Eliminar categoría"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Productos de la categoría */}
                {isExpanded && (
                  <div>
                    {catProducts.length === 0 ? (
                      <p className="px-4 py-4 text-sm text-gray-400">
                        Sin productos en esta categoría.{" "}
                        {canManage && (
                          <Link href={`/inventario/nuevo?categoryId=${cat.id}`} className="text-brand-600 hover:underline">
                            Agregar el primero
                          </Link>
                        )}
                      </p>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {catProducts.map((p) => (
                          <ProductRow
                            key={p.id}
                            product={p}
                            canManage={canManage}
                            onToggleActive={handleToggleActive}
                            onDelete={handleDeleteProduct}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Sin categoría */}
          {(noneProducts.length > 0 || search) && (
            <div className="overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-white">
              <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <button
                  onClick={() => toggleExpand("__none__")}
                  className="flex flex-1 items-center gap-2.5 text-left"
                >
                  <span className="text-xl">📦</span>
                  <span className="font-semibold text-gray-500">Sin categoría</span>
                  <span className="text-sm text-gray-400">({noneProducts.length})</span>
                  <span className="ml-auto text-gray-400">
                    {expandedIds.has("__none__") ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </span>
                </button>
              </div>
              {expandedIds.has("__none__") && noneProducts.length > 0 && (
                <ul className="divide-y divide-gray-100">
                  {noneProducts.map((p) => (
                    <ProductRow
                      key={p.id}
                      product={p}
                      canManage={canManage}
                      onToggleActive={handleToggleActive}
                      onDelete={handleDeleteProduct}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}

          {categories.length === 0 && !isLoading && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-400">
              <p className="text-lg font-semibold">No hay categorías todavía</p>
              <p className="mt-1 text-sm">Crea la primera categoría para empezar a organizar tu inventario.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProductRow({
  product,
  canManage,
  onToggleActive,
  onDelete,
}: {
  product: Product;
  canManage: boolean;
  onToggleActive: (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
          {!product.isActive && (
            <Badge tone="neutral">Inactivo</Badge>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {product.salePrice > 0 ? formatCLP(product.salePrice) : "Sin precio"}
        </p>
      </div>

      {/* Columna Clasificación */}
      <div className="hidden sm:flex flex-col items-start min-w-[110px]">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Clasificación</p>
        {product.marca || product.talla ? (
          <>
            {product.marca && <p className="text-xs text-gray-700"><span className="text-gray-400">Marca:</span> {product.marca}</p>}
            {product.talla && <p className="text-xs text-gray-700"><span className="text-gray-400">Talla:</span> {product.talla}</p>}
          </>
        ) : (
          <p className="text-xs text-gray-300">—</p>
        )}
      </div>
      <Badge tone={product.stock === 0 ? "danger" : product.stock <= product.minStock ? "warning" : "success"}>
        {product.stock} {product.unitType === "weight" ? "kg" : "u."}
      </Badge>
      {canManage && (
        <div className="flex items-center gap-1 shrink-0">
          <Link href={`/inventario/${product.id}`}>
            <button className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              Editar
            </button>
          </Link>
          <button
            onClick={() => onToggleActive(product)}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {product.isActive ? "Desactivar" : "Activar"}
          </button>
          <button
            onClick={() => onDelete(product)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Eliminar producto"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </li>
  );
}
