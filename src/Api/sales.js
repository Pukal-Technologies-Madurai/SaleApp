import { API } from "../Config/Endpoint";

export const createSaleOrder = async ({ orderData }) => {
    const res = await fetch(API.saleOrder(), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
    });

    const data = await res.json();
    if (!data.success)
        throw new Error(data.message || "Failed to submit order");
    return data;
};

export const fetchSaleOrder = async ({ from, to, company, userId }) => {
    const url = `${API.saleOrder()}?Fromdate=${from}&Todate=${to}&Company_Id=${company}&Created_by=${userId}&Sales_Person_Id=${userId}`;
    // console.log("fetchSaleOrder url:", url);
    const res = await fetch(url);

    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};

export const fetchSaleOrderRetilerWise = async ({ retailerId, from, to }) => {
    const response = await fetch(
        `${API.saleOrder()}?Retailer_Id=${retailerId}&Fromdate=${from}&Todate=${to}`,
    );
    const data = await response.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};
