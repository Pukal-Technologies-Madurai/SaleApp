import { API } from "../Config/Endpoint";

export const fetchMonthlyAttance = async (from, to, userId, userTypeId) => {
    const url = `${API.attendanceHistory()}From=${from}&To=${to}&UserId=${userId}&UserTypeID=${userTypeId}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};

export const fetchMonthlySalesOrder = async (from, to, userId) => {
    const url = `${API.saleOrder()}?Fromdate=${from}&Todate=${to}&Sales_Person_Id=${userId}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
}

export const fetchMonthlySalesInvoice = async (from, to, userId) => {
    const url = `${API.getSaleInvoice()}${from}&Todate=${to}&Created_by=${userId}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
}

export const fetchMonthlyCollection = async (from, to, userId) => {
    const url = `${API.getReceipt()}${from}&Todate=${to}&createdBy=${userId}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
}

export const fetchMonthlyDelivery = async (userId, from, to) => {
    const url = `${API.delivery()}${userId}&Fromdate=${from}&Todate=${to}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
}

export const fetchSalesPerson = async () => {
    const url = `${API.salesPerson()}`;
    // console.log("fetchSalesPerson URL:", url); // Debugging line
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
}