import { API } from "../Config/Endpoint";

export const fetchDeliveryTripSheet = async ({ from, to, uId }) => {
    const response = await fetch(
        `${API.deliveryTripSheet()}${from}&Todate=${to}&User_Id=${uId}`,
    );
    const data = await response.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};

export const fetchPendingDeliveryList = async (fromDate, toDate, branchId) => {
    try {
        const url = `${API.todayDelivery()}Fromdate=${fromDate}&Todate=${toDate}&Branch_Id=${branchId}`;
        const response = await fetch(url);

        const data = await response.json();

        if (!data.success) throw new Error(data.message);
        return data.data;
    } catch (err) {
        console.error(err);
    }
};

export const fetchPendingSalesList = async (fromDate, toDate, branchId) => {
    try {
        const url = `${API.saleOrder()}?Fromdate=${fromDate}&Todate=${toDate}&Branch_Id=${branchId}`;
        const response = await fetch(url);

        const data = await response.json();

        if (!data.success) throw new Error(data.message);
        return data.data;
    } catch (err) {
        console.error(err);
    }
};

export const fetchDeliveryReturnList = async (fromDate, toDate, branchId) => {
    try {
        const url = `${API.deliveryReturn()}${fromDate}&Todate=${toDate}&Branch_Id=${branchId}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.success && data.message !== "Record not found") {
            throw new Error(data.message);
        }
        return data.data || [];
    } catch (err) {
        console.error(err);
    }
};
