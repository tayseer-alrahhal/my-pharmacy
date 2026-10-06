import { create } from 'zustand';
import { CartItem } from '@/types';

export interface CartSession {
  id: string;
  items: CartItem[];
  customer_id: string | null;
  customer_name: string | null;
  global_discount: number;
  global_discount_type: 'percent' | 'amount';
  payment_method: 'cash' | 'credit' | 'mixed';
  paid_amount: number;
}

function emptySession(id: string): CartSession {
  return {
    id,
    items: [],
    customer_id: null,
    customer_name: null,
    global_discount: 0,
    global_discount_type: 'percent',
    payment_method: 'cash',
    paid_amount: 0,
  };
}

interface CartStore {
  carts: CartSession[];
  activeCartId: string;

  createCart: () => void;
  switchCart: (id: string) => void;
  removeCart: (id: string) => void;

  addItem: (item: CartItem) => void;
  updateQuantity: (product_id: string, batch_id: string, qty: number) => void;
  removeItem: (product_id: string, batch_id: string) => void;
  updateDiscount: (product_id: string, batch_id: string, discount: number) => void;
  updatePrice: (product_id: string, batch_id: string, price: number) => void;
  setCustomer: (id: string | null, name: string | null) => void;
  setGlobalDiscount: (amount: number, type: 'percent' | 'amount') => void;
  setPaymentMethod: (method: 'cash' | 'credit' | 'mixed') => void;
  setPaidAmount: (amount: number) => void;
  clearCart: () => void;

  getActiveCart: () => CartSession;
  getSubtotal: () => number;
  getDiscount: () => number;
  getTotal: () => number;
}

const FIRST_ID = 'cart-1';

export const useCartStore = create<CartStore>()((set, get) => ({
  carts: [emptySession(FIRST_ID)],
  activeCartId: FIRST_ID,

  createCart: () => {
    const id = `cart-${Date.now()}`;
    set((state) => ({
      carts: [...state.carts, emptySession(id)],
      activeCartId: id,
    }));
  },

  switchCart: (id) => set({ activeCartId: id }),

  removeCart: (id) => {
    set((state) => {
      const remaining = state.carts.filter((c) => c.id !== id);
      if (remaining.length === 0) {
        const newId = `cart-${Date.now()}`;
        return { carts: [emptySession(newId)], activeCartId: newId };
      }
      const nextActive =
        state.activeCartId === id ? remaining[remaining.length - 1].id : state.activeCartId;
      return { carts: remaining, activeCartId: nextActive };
    });
  },

  getActiveCart: () => {
    const { carts, activeCartId } = get();
    return carts.find((c) => c.id === activeCartId) || carts[0];
  },

  addItem: (item) =>
    set((state) => ({
      carts: state.carts.map((c) => {
        if (c.id !== state.activeCartId) return c;
        const existing = c.items.find(
          (i) => i.product_id === item.product_id && i.batch_id === item.batch_id
        );
        return {
          ...c,
          items: existing
            ? c.items.map((i) =>
                i.product_id === item.product_id && i.batch_id === item.batch_id
                  ? { ...i, quantity: Math.min(i.quantity + 1, i.available_qty) }
                  : i
              )
            : [...c.items, item],
        };
      }),
    })),

  updateQuantity: (product_id, batch_id, qty) =>
    set((state) => ({
      carts: state.carts.map((c) =>
        c.id !== state.activeCartId
          ? c
          : {
              ...c,
              items: c.items.map((i) =>
                i.product_id === product_id && i.batch_id === batch_id
                  ? { ...i, quantity: Math.max(1, Math.min(qty, i.available_qty)) }
                  : i
              ),
            }
      ),
    })),

  removeItem: (product_id, batch_id) =>
    set((state) => ({
      carts: state.carts.map((c) =>
        c.id !== state.activeCartId
          ? c
          : {
              ...c,
              items: c.items.filter(
                (i) => !(i.product_id === product_id && i.batch_id === batch_id)
              ),
            }
      ),
    })),

  updateDiscount: (product_id, batch_id, discount) =>
    set((state) => ({
      carts: state.carts.map((c) =>
        c.id !== state.activeCartId
          ? c
          : {
              ...c,
              items: c.items.map((i) =>
                i.product_id === product_id && i.batch_id === batch_id
                  ? { ...i, discount_amount: discount }
                  : i
              ),
            }
      ),
    })),

  updatePrice: (product_id, batch_id, price) =>
    set((state) => ({
      carts: state.carts.map((c) =>
        c.id !== state.activeCartId
          ? c
          : {
              ...c,
              items: c.items.map((i) =>
                i.product_id === product_id && i.batch_id === batch_id
                  ? { ...i, unit_price: Math.max(0, price) }
                  : i
              ),
            }
      ),
    })),

  setCustomer: (id, name) =>
    set((state) => ({
      carts: state.carts.map((c) =>
        c.id !== state.activeCartId ? c : { ...c, customer_id: id, customer_name: name }
      ),
    })),

  setGlobalDiscount: (amount, type) =>
    set((state) => ({
      carts: state.carts.map((c) =>
        c.id !== state.activeCartId
          ? c
          : { ...c, global_discount: amount, global_discount_type: type }
      ),
    })),

  setPaymentMethod: (method) =>
    set((state) => ({
      carts: state.carts.map((c) =>
        c.id !== state.activeCartId ? c : { ...c, payment_method: method }
      ),
    })),

  setPaidAmount: (amount) =>
    set((state) => ({
      carts: state.carts.map((c) =>
        c.id !== state.activeCartId ? c : { ...c, paid_amount: amount }
      ),
    })),

  clearCart: () =>
    set((state) => ({
      carts: state.carts.map((c) =>
        c.id !== state.activeCartId ? c : emptySession(c.id)
      ),
    })),

  getSubtotal: () => {
    const cart = get().getActiveCart();
    return cart.items.reduce(
      (sum, i) => sum + i.unit_price * i.quantity - i.discount_amount,
      0
    );
  },

  getDiscount: () => {
    const cart = get().getActiveCart();
    const subtotal = get().getSubtotal();
    if (cart.global_discount_type === 'percent') {
      return (subtotal * cart.global_discount) / 100;
    }
    return cart.global_discount;
  },

  getTotal: () => get().getSubtotal() - get().getDiscount(),
}));
