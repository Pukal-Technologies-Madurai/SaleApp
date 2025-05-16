import { API } from "../Config/Endpoint";

export const startDay = async ({
    UserId,
    Start_KM,
    Latitude,
    Longitude,
    Start_KM_Pic,
}) => {
    const formData = new FormData();

    formData.append("UserId", UserId);
    formData.append("Start_KM", Start_KM);
    formData.append("Latitude", Latitude);
    formData.append("Longitude", Longitude);
    formData.append("Start_KM_Pic", {
        uri: `file://${Start_KM_Pic}`,
        name: "photo.jpg",
        type: "image/jpeg",
    });

    const res = await fetch(API.attendance(), {
        method: "POST",
        headers: {
            "Content-Type": "multipart/form-data",
        },
        body: formData,
    });

    // console.log(res);
    const data = await res.json();
    // console.log(data);

    if (!res.ok) {
        throw new Error(data.message);
    }

    return data;
};

export const getAttendance = async userId => {
    const res = await fetch(`${API.MyLastAttendance()}${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};

export const closeDay = async ({ Id, End_KM, End_KM_Pic }) => {
    const formData = new FormData();

    formData.append("Id", Id);
    formData.append("End_KM", End_KM);
    formData.append("End_KM_Pic", {
        uri: `file://${End_KM_Pic}`,
        name: "photo.jpg",
        type: "image/jpeg",
    });

    const response = await fetch(API.attendance(), {
        method: "PUT",
        headers: { "Content-Type": "multipart/form-data" },
        body: formData,
    });

    const responseData = await response.json();
    if (!response.ok)
        throw new Error(responseData.message || "Failed to post data");

    return responseData;
};

export const attendanceHistory = async ({ fromDay, toDay, id, uid }) => {
    // console.log(fromDay, toDay, id, uid);
    const res = await fetch(
        `${API.attendanceHistory()}From=${fromDay}&To=${toDay}&UserTypeID=${id}&UserId=${uid}`,
        {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        },
    );
    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};

export const fetchSalePerson = async companyId => {
    const response = await fetch(`${API.salesPerson()}${companyId}`);
    const data = await response.json();

    if (!data.success) throw new Error(data.message);
    return data.data;
};
