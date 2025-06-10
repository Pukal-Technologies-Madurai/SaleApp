import CryptoJS from "react-native-crypto-js";
import { API } from "../Config/Endpoint";

export const fetchUserCompanies = async userName => {
    const res = await fetch(`${API.userPortal()}${userName}`);

    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json.data;
};

export const loginUser = async ({ selectedCompany, userName, password }) => {
    const passHash = CryptoJS.AES.encrypt(
        password,
        "ly4@&gr$vnh905RyB>?%#@-(KSMT",
    ).toString();

    const res = await fetch(API.userPortalLogin(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            Global_User_ID: selectedCompany.Global_User_ID,
            username: userName,
            Password: passHash,

            Company_Name: selectedCompany.Company_Name,
            Global_Id: selectedCompany.Global_Id,
            Local_Id: selectedCompany.Local_Id,
            Web_Api: selectedCompany.Web_Api,
        }),
    });

    const json = await res.json();
    console.log("loginUser", json);
    if (!json.success) throw new Error(json.message);
    return json.data;
};

export const fetchUserAuth = async ({ webApi, userAuth }) => {
    const res = await fetch(`${webApi}api/authorization/userAuthmobile`, {
        method: "GET",
        headers: {
            Authorization: `${userAuth}`,
        },
    });

    const json = await res.json();
    console.log("fetchUserAuth", json);
    if (!json.success) throw new Error(json.message);
    return json.user;
};
