import { API } from "../Config/Endpoint";

export const fetchRoutes = async () => {
    const res = await fetch(API.routes());
    const json = await res.json();

    if (!json.success) throw new Error(json.message);
    return json.data;
};

export const fetchAreas = async () => {
    const res = await fetch(API.areas());
    const json = await res.json();

    if (!json.success) throw new Error(json.message);
    return json.data;
};

export const fetchState = async () => {
    const res = await fetch(API.state());
    const json = await res.json();

    if (!json.success) throw new Error(json.message);
    return json.data;
};

export const fetchDistrict = async () => {
    const res = await fetch(API.district());
    const json = await res.json();

    if (!json.success) throw new Error(json.message);
    return json.data;
};

export const fetchdistributors = async () => {
    const res = await fetch(API.distributors());
    const json = await res.json();

    if (!json.success) throw new Error(json.message);
    return json.data;
};

export const fetchRetailers = async companyId => {
    const res = await fetch(`${API.retailers()}${companyId}`);
    const json = await res.json();

    if (!json.success) throw new Error(json.message);
    return json.data;
};

export const fetchRetailersName = async () => {
    const res = await fetch(API.retailerName());
    const json = await res.json();

    if (!json.success) throw new Error(json.message);
    return json.data;
};

export const fetchRetailerInfo = async retailerId => {
    const res = await fetch(`${API.retailerInfo()}${retailerId}`);
    const json = await res.json();

    if (!json.success) throw new Error(json.message);
    return json;
};

export const fetchRetailersClosingDropDown = async () => {
    const res = await fetch(API.retailersClosingStockDropDown());
    const json = await res.json();

    if (!json.success) throw new Error(json.message);
    return json.data;
};

export const fetchRetailerClosingInfo = async (retailerId, from, to) => {
    const res = await fetch(
        `${API.retailerClosingDetailedInfo()}${retailerId}&Fromdate=${from}&Todate=${to}`,
    );
    const json = await res.json();

    if (!json.success) throw new Error(json.message);
    return json;
};

// soldItemsForRetailer
export const fetchRetailerSoldItems = async () => {
    const res = await fetch(API.soldItemsForRetailer());
    const json = await res.json();

    if (!json.success) throw new Error(json.message);
    return json;
};

export const fetchProductsAvailableInRetailer = async (itemId, from, to) => {
    const res = await fetch(
        `${API.itemAvailableInRetailer()}${itemId}&Fromdate=${from}&Todate=${to}`,
    );
    const json = await res.json();

    if (!json.success) throw new Error(json.message);
    return json;
};

export const fetchRetailerClosingStock = async retailerId => {
    const res = await fetch(`${API.retailerwiseClosingStock()}${retailerId}`);
    const json = await res.json();

    if (!json.success) throw new Error(json.message);
    return json.data;
};

export const putRetailer = async ({
    formValues,
    currentPhoto,
    originalPhoto,
}) => {
    const formData = new FormData();

    Object.entries(formValues).forEach(([key, value]) => {
        if (key === "Profile_Pic") {
            if (
                currentPhoto &&
                (!originalPhoto || currentPhoto.uri !== originalPhoto)
            ) {
                formData.append(key, currentPhoto);
            }
        } else {
            formData.append(key, value);
        }
    });

    const res = await fetch(`${API.retailers()}${formValues.Company_Id}`, {
        method: "PUT",
        headers: { "Content-Type": "multipart/form-data" },
        body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
        throw new Error(data.message || "Update failed");
    }
    return data;
};

export const postRetailer = async ({ formValues, imageUri }) => {
    const formData = new FormData();

    Object.entries(formValues).forEach(([key, value]) => {
        formData.append(key, value);
    });

    if (imageUri) {
        formData.append("Profile_Pic", {
            uri: `file://${imageUri}`,
            name: "photo.jpg",
            type: "image/jpeg",
        });
    }

    const res = await fetch(`${API.retailers()}${formValues.Company_Id}`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) throw new Error("Retailer creation failed");
    return res.text();
};

export const updateRetailerLocation = async ({ userId, location, item }) => {
    const res = await fetch(API.retailerLocation(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            EntryBy: userId,
            Latitude: location.latitude.toString(),
            Longitude: location.longitude.toString(),
            Retailer_Id: item.Retailer_Id,
        }),
    });
    const json = await res.json();

    if (!json.success) throw new Error(json.message);
    return json;
};

export const visitEntryLog = async ({ toDate, uId }) => {
    const url = `${API.visitedLog()}?reqDate=${toDate}&UserId=${uId}`;
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

export const visitEntry = async ({
    formValues,
    imageUri,
    selectedValue,
    selectedRetail,
    location,
    userId,
    capturedPhotoPath,
}) => {
    const formData = new FormData();

    formData.append("Mode", selectedValue === "exist" ? 1 : 2);

    if (selectedValue === "exist") {
        formData.append("Retailer_Id", selectedRetail);
    } else {
        formData.append("Reatailer_Name", formValues.Retailer_Name);
        formData.append("Contact_Person", formValues.Contact_Person);
        formData.append("Contact_Mobile", formValues.Mobile_No);
        formData.append("Location_Address", formValues.Location_Address);
    }
    if (location.latitude && location.longitude) {
        formData.append("Latitude", location.latitude);
        formData.append("Longitude", location.longitude);
    }
    formData.append("Narration", formValues.Narration);
    formData.append("EntryBy", userId);

    if (imageUri) {
        formData.append("Location_Image", {
            uri: `file://${imageUri}`,
            type: "image/jpeg",
            name: capturedPhotoPath.split("/").pop() || "photo.jpg",
        });
    }

    const res = await fetch(API.visitedLog(), {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
        body: formData,
    });

    const data = await res.json();
    console.log(data);
    if (!data.success) throw new Error(data.message);

    return data;
};

export const fetchRoutePathData = async (date, userId) => {
    const url = `${API.setRoutePath()}?date=${date}&User_Id=${userId}`;
    const res = await fetch(url);
    const json = await res.json();

    if (!json.success) throw new Error(json.message);
    return json.data;
};

export const deleteRoutePathData = async id => {
    const res = await fetch(`${API.setRoutePath()}?Id=${id}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ Id: id }),
    });
    const json = await res.json();

    if (!json.success) throw new Error(json.message);
    return json.data;
};
