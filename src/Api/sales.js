import { API } from "../Config/Endpoint";

export const createSaleInvoice = async (invoiceData) => {
    const res = await fetch(API.saleInvoice(), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(invoiceData),
    });

    const data = await res.json();
    if (!data.success)
        throw new Error(data.message || "Failed to create invoice");
    return data;
};

export const updateSaleInvoice = async (invoiceData) => {
    const res = await fetch(API.saleInvoice(), {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(invoiceData),
    });

    const data = await res.json();
    if (!data.success)
        throw new Error(data.message || "Failed to update invoice");
    return data;
};

export const fetchSaleInvoices = async ({ from, to, userId, branchId, retailerId }) => {
    const url = `${API.getSaleInvoice()}${from}&Todate=${to}&Created_by=${userId}&Branch_Id=${branchId}&Retailer_Id=${retailerId}`;
    // console.log("fetchSaleInvoices url:", url);
    const res = await fetch(url);

    const data = await res.json();
    
    if (!data.success) throw new Error(data.message);
    return data.data;
}

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

export const fetchSaleOrder = async ({
    from,
    to,
    company,
    userId,
    branchId,
}) => {
    const url = `${API.saleOrder()}?Fromdate=${from}&Todate=${to}&Company_Id=${company}&Created_by=${userId}&Sales_Person_Id=${userId}&Branch_Id=${branchId}`;
    // console.log("fetchSaleOrder url:", url);
    const res = await fetch(url);

    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};

// Not used Api

export const fetchSaleOrderRetilerWise = async ({ retailerId, from, to }) => {
    const response = await fetch(
        `${API.saleOrder()}?Retailer_Id=${retailerId}&Fromdate=${from}&Todate=${to}`,
    );
    const data = await response.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};
