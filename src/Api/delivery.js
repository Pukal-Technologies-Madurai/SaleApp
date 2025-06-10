import { API } from "../Config/Endpoint";

export const fetchDeliveryTripSheet = async ({ from, to, uId }) => {
    const response = await fetch(
        `${API.deliveryTripSheet()}${from}&Todate=${to}&User_Id=${uId}`,
    );
    const data = await response.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};
