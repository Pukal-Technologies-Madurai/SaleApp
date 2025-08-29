import { API } from "../Config/Endpoint";

export const fetchDeliveryTripSheet = async ({ from, to, uId }) => {
    const response = await fetch(
        `${API.deliveryTripSheet()}${from}&Todate=${to}&User_Id=${uId}`,
    );
    const data = await response.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};

export const fetchPendingDeliveryList = async (fromDate, toDate) => {
    try {
        const url = `${API.pendingDeliveryList()}${fromDate}&Todate=${toDate}`;
        const response = await fetch(url);

        const data = await response.json();

        if (!data.success) throw new Error(data.message);
        return data.data;
    } catch (err) {
        console.error(err);
    }
};

export const fetchPendingSalesList = async (fromDate, toDate) => {
    try {
        const url = `${API.pendingSalesOrder()}${fromDate}&Todate=${toDate}`;
        const response = await fetch(url);

        const data = await response.json();

        if (!data.success) throw new Error(data.message);
        return data.data;
    } catch (err) {
        console.error(err);
    }
};
