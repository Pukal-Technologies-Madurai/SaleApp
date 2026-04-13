import { API } from "../Config/Endpoint";

export const fetchProducts = async userId => {
    const response = await fetch(`${API.products()}${userId}`);
    // console.log('fetchProducts', `${API.products()}${userId}`);
    const data = await response.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};

export const fetchPosOrderBranch = async () => {
    try {
        const url = API.posOrderBranch();
        const response = await fetch(url);

        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        return data.data;
    } catch (err) {
        console.error("Error fetching pos order branch:", err);
    }
};

export const fetchCostCenter = async () => {
    try {
        const url = API.costCenterData();
        const response = await fetch(url);

        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        return data.data;
    } catch (err) {
        console.error("Error fetching cost center:", err);
    }
};

export const fetchProductsWithStockValue = async () => {
    try {
        const url = API.stockValueWithProduct();
        // console.log("fetchProductsWithStockValue", url);
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });
        // console.log("fetchProducts", `${API.products()}${userId}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.message);
        return data.data;
    } catch (err) {
        console.error("Error fetching products with stock value:", err);
    }
};

export const fetchPosAllProducts = async () => {
    try {
        const url = API.posProducts();
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });
        // console.log("fetchProducts", `${API.products()}${userId}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.message);
        return data.data;
    } catch (err) {
        console.error("Error fetching products with stock value:", err);
    }
};

export const fetchPosProductStockValue = async () => {
    try {
        const url = API.posProductsWithStockValue();
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });
        // console.log("fetchProducts", `${API.products()}${userId}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.message);
        return data.data.Pos_Product[0].Product_Entry;
    } catch (err) {
        console.error("Error fetching pos products with stock:", err);
    }
}

export const fetchUOM = async () => {
    const res = await fetch(API.uom());
    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};

export const fetchGoDownwiseStockValue = async (goDownId) => {
    const url = `${API.goDownwiseStockValue()}${goDownId}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};

export const fetchClosingStock = async ({ id, day }) => {
    const url = `${API.closingStockReport()}${id}&reqDate=${day}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};

export const fetchGoDownStackInHand = async ({ from, to }) => {
    const url = `${API.godownWiseStackInHand()}Fromdate=${from}&Todate=${to}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};

export const fetchGoDownExpenseReport = async ({ from, to, productId, goDownId }) => {
    const url = `${API.godownExpenseReport()}fromDate=${from}&toDate=${to}&Product_Id=${productId}&Godown_Id=${goDownId}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};

// Not Used API
export const fetchGroupedProducts = async company => {
    // console.log("fetchGroupedProducts", `${API.groupedProducts()}${company}`);
    const res = await fetch(`${API.groupedProducts()}${company}`);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};

export const fetchRetailerClosingStock = async Retailer_Id => {
    const res = await fetch(`${API.productClosingStock()}${Retailer_Id}`);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};

export const fetchProductPack = async company => {
    const res = await fetch(`${API.productPacks()}${company}`);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};