import { API } from "../Config/Endpoint";

export const fetchPaymentReceipts = async ({ from, to, uId }) => {
    const response = await fetch(
        `${API.paymentCollection()}?Fromdate=${from}&Todate=${to}&collected_by=${uId}`,
    );
    const data = await response.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};
