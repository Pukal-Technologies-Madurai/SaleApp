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

export const fetchUOM = async () => {
    const res = await fetch(API.uom());
    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};

export const fetchGroupedProducts = async company => {
    // console.log("fetchGroupedProducts", `${API.groupedProducts()}${company}`);
    const res = await fetch(`${API.groupedProducts()}${company}`);
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

export const fetchRetailerClosingStock = async Retailer_Id => {
    const res = await fetch(`${API.productClosingStock()}${Retailer_Id}`);
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
