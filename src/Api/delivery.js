import { API } from "../Config/Endpoint";

export const fetchPendingDeliveryList = async ( fromDate, toDate, branchId, salesPersonId ) => {
    try {
        const url = `${API.todayDelivery()}Fromdate=${fromDate}&Todate=${toDate}&Branch_Id=${branchId}&Sales_Person_Id=${salesPersonId}`;
        // console.log("Fetching Pending Delivery List from URL:", url);
        const response = await fetch(url);
        const data = await response.json();

        if (!data.success) throw new Error(data.message);
        return data.data;
    } catch (err) {
        console.error(err);
        // throw err;
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

export const fetchCreditNoteList = async (fromDate, toDate) => {
    try {
        const url = `${API.getCreditNoteList()}${fromDate}&Todate=${toDate}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.success && data.message !== "Record not found") {
            throw new Error(data.message);
        }
        return data.data || [];
    } catch (err) {
        console.error("fetchCreditNoteList error:", err);
        return [];
    }
};
