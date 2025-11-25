import { create } from "zustand";

export const useOrderStore = create((set, get) => ({
    orderItems: {},

    // add/replace one product
    setItem: (productId, item) =>
        set(state => ({
            orderItems: {
                ...state.orderItems,
                [productId]: item,
            },
        })),

    // update few fields of one product
    updateItem: (productId, partial) =>
        set(state => ({
            orderItems: {
                ...state.orderItems,
                [productId]: {
                    ...state.orderItems[productId],
                    ...partial,
                },
            },
        })),

    removeItem: productId =>
        set(state => {
            const copy = { ...state.orderItems };
            delete copy[productId];
            return { orderItems: copy };
        }),

    // Fixed: use set function instead of returning object
    clear: () =>
        set({
            orderItems: {},
            selectedBrokerId: null,
            selectedTransportId: null,
        }),

    // Get total items count
    getTotalItems: () => {
        const state = get();
        return Object.values(state.orderItems).reduce(
            (sum, item) => sum + (item.qty || 0),
            0,
        );
    },

    // Get total amount
    getTotalAmount: (productData = []) => {
        const state = get();
        return Object.values(state.orderItems)
            .filter(item => item.qty > 0 && item.rate > 0)
            .reduce((sum, item) => {
                const product = productData.find(
                    p => p.Product_Id === item.Product_Id,
                );
                const packWeight = parseFloat(product?.PackGet || 0);
                const totalWeight = item.qty * packWeight;
                const itemTotal = totalWeight * item.rate;
                return sum + itemTotal;
            }, 0);
    },

    // filters / selections
    selectedBrokerId: null,
    setSelectedBrokerId: id => set({ selectedBrokerId: id }),

    selectedTransportId: null,
    setSelectedTransportId: id => set({ selectedTransportId: id }),

    // Reset all selections
    resetSelections: () =>
        set({
            selectedBrokerId: null,
            selectedTransportId: null,
        }),

    // Reset everything
    resetAll: () =>
        set({
            orderItems: {},
            selectedBrokerId: null,
            selectedTransportId: null,
        }),
}));
