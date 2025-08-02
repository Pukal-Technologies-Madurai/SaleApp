import { API } from "../Config/Endpoint";

export const fetchAccountsMaster = async () => {
    const url = API.accountsMaster();

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
};

export const fetchDefaultAccountMaster = async () => {
    const url = API.defaultAccountMaster();

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
};

export const fetchDebitLiveSale = async () => {
    const url = API.defaultDebitLiveSales();

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
};

export const fetchCreditLiveSale = async () => {
    const url = API.defaultCreditAccountMaster();

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
};

export const fetchPendingSalesInvoiceReceipt = async ({ accId }) => {
    try {
        const url = `${API.pendingSalesInvoice()}${accId}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data.success) throw new Error(data.message);
        return data.data;
    } catch (error) {
        console.error("Error fetching pending sales invoice receipt:", error);
    }
};

export const createReceipt = async receiptData => {
    const url = API.createReceipt();

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(receiptData),
        });

        if (!response.ok) {
            console.error("HTTP Error:", response.status);
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            console.error("API Error:", data.message);
            throw new Error(data.message);
        }

        return data.data;
    } catch (error) {
        console.error("createReceipt Error:", error);
        throw error;
    }
};

export const fetchUserInvolvedReceipts = async (
    userID,
    selectedFromDate,
    selectedToDate,
) => {
    try {
        // Format dates to YYYY-MM-DD format
        const formatDate = date => {
            if (!(date instanceof Date) || isNaN(date)) {
                return new Date().toISOString().split("T")[0];
            }
            return date.toISOString().split("T")[0];
        };

        const fromDate = formatDate(selectedFromDate);
        const toDate = formatDate(selectedToDate);

        const url = `${API.userInvoltedReceipts()}${userID}&Fromdate=${fromDate}&Todate=${toDate}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        return data.data;
    } catch (err) {
        console.error("Error fetching user involved receipts:", err);
        throw err;
    }
};

export const createLiveSales = async resBody => {
    try {
        const url = API.salesLive();

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(resBody),
        });
        if (!response.ok) {
            console.error("HTTP Error:", response.status);
            throw new Error(`HTTP Error: ${response.status}`);
        }
        const data = await response.json();
        if (!data.success) {
            console.error("API Error:", data.message);
            throw new Error(data.message);
        }
        return data.data;
    } catch (err) {
        console.error("Error creating live sales:", err);
        throw err;
    }
};
