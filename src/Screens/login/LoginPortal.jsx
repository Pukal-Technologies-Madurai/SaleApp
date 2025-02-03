import {
    StyleSheet,
    TextInput,
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    Alert,
    StatusBar,
    ImageBackground,
    Image,
    ToastAndroid,
} from "react-native";
import React, { useState } from "react";
import CryptoJS from "react-native-crypto-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { API, setBaseUrl } from "../../Config/Endpoint";
import { storeInfo } from "../../Config/AuthContext";
import { customColors, typography } from "../../Config/helper";
import assetImages from "../../Config/Image";

const LoginPortal = () => {
    const { setAuthInfo } = storeInfo();
    const navigation = useNavigation();
    const [userName, setUserName] = useState("");
    const [password, setPassword] = useState("");
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [step, setStep] = useState(1);
    const [modalVisible, setModalVisible] = useState(false);

    const handleContinue = async () => {
        // console.log(`${API.userPortal()}${userName}`);
        try {
            const response = await fetch(`${API.userPortal()}${userName}`);
            const jsonData = await response.json();
            // console.log("jsonData", jsonData);
            if (jsonData.success && jsonData.data) {
                const companies = jsonData.data;
                setCompanies(companies);

                if (companies.length === 1) {
                    setSelectedCompany(companies[0]);
                    setStep(2);
                } else {
                    setStep(2);
                }
            } else {
                ToastAndroid.show(jsonData.message, ToastAndroid.LONG);
            }
        } catch (err) {
            console.log(err);
        }
    };

    const handleCompanySelect = company => {
        setSelectedCompany(company);
        setModalVisible(false);
    };

    const CompanyItem = ({ item, onSelect }) => (
        <TouchableOpacity style={styles.item} onPress={() => onSelect(item)}>
            <Text style={styles.companyText}> {item.Company_Name} </Text>
        </TouchableOpacity>
    );

    const handleLogin = async () => {
        if (!selectedCompany) {
            ToastAndroid.show("Please select a company.", ToastAndroid.LONG);
            return;
        }

        try {
            const passHash = CryptoJS.AES.encrypt(
                password,
                "ly4@&gr$vnh905RyB>?%#@-(KSMT",
            ).toString();

            // console.log("logg", API.userPortalLogin());
            const response = await fetch(API.userPortalLogin(), {
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

            const data = await response.json();
            // console.log(data);

            if (data.success) {
                getUserAuth(data.data.Web_Api, data.data.Autheticate_Id);
            } else {
                ToastAndroid.show(data.message, ToastAndroid.LONG);
            }
        } catch (err) {
            console.log(err);
            Alert.alert(data.message);
        }
    };

    const getUserAuth = async (webApi, userAuth) => {
        try {
            setBaseUrl(webApi);

            const url = `${webApi}api/authorization/userAuthmobile`;
            // console.log("Auth URL:", url);

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `${userAuth}`,
                },
            });

            const data = await response.json();
            // console.log("data", data);

            if (data.success) {
                const authData = data.user;

                await AsyncStorage.setItem(
                    "userToken",
                    authData.Autheticate_Id,
                );
                await setData(authData);
                setAuthInfo(authData);
                navigation.replace("HomeScreen");
                ToastAndroid.show(data.message, ToastAndroid.LONG);
            } else {
                ToastAndroid.show(data.message, ToastAndroid.LONG);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleLoginOld = async () => {
        if (!selectedCompany) {
            ToastAndroid.show("Please select a company.", ToastAndroid.LONG);
            return;
        }

        try {
            const passHash = CryptoJS.AES.encrypt(
                password,
                "ly4@&gr$vnh905RyB>?%#@-(KSMT",
            ).toString();
            const response = await fetch(API.login(), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: userName,
                    password: passHash,
                }),
            });

            const data = await response.json();
            if (data.success) {
                await AsyncStorage.setItem(
                    "userToken",
                    data.user.Autheticate_Id,
                );
                await setData(data.user);
                setAuthInfo(data.user);
                navigation.replace("HomeScreen");
                ToastAndroid.show(data.message, ToastAndroid.LONG);
            } else {
                ToastAndroid.show(data.message, ToastAndroid.LONG);
            }
        } catch (err) {
            console.log(err);
            Alert.alert(data.message);
        }
    };

    const setData = async data => {
        try {
            await AsyncStorage.setItem("userToken", data.Autheticate_Id);
            await AsyncStorage.setItem("UserId", data.UserId);
            await AsyncStorage.setItem("Company_Id", String(data.Company_id));
            await AsyncStorage.setItem("userName", data.UserName);
            await AsyncStorage.setItem("Name", data.Name);
            await AsyncStorage.setItem("branchId", String(data.BranchId));
            await AsyncStorage.setItem("branchName", data.BranchName);
            await AsyncStorage.setItem("userType", data.UserType);
            await AsyncStorage.setItem("userTypeId", data.UserTypeId);
        } catch (err) {
            console.error("Error storing data: ", err);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar backgroundColor={customColors.background} />
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}
                resizeMode="cover">
                <View style={styles.overlay}>
                    <View style={styles.container}>
                        <View style={styles.logoContainer}>
                            <Image source={assetImages.logo} />
                        </View>

                        {step === 1 && (
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your username"
                                    placeholderTextColor="#a0a0a0"
                                    value={userName}
                                    onChangeText={setUserName}
                                />
                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={handleContinue}>
                                    <Text style={styles.buttonText}>
                                        {" "}
                                        Continue{" "}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {step === 2 && (
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your username"
                                    placeholderTextColor="#a0a0a0"
                                    keyboardType="default"
                                    value={userName}
                                    onChangeText={setUserName}
                                />
                                {companies.length > 1 && (
                                    <TouchableOpacity
                                        style={styles.selectButton}
                                        onPress={() => setModalVisible(true)}>
                                        <Text style={styles.selectButtonText}>
                                            {selectedCompany
                                                ? selectedCompany.Company_Name
                                                : "Select your company"}
                                        </Text>
                                        <Icon
                                            name="chevron-down"
                                            size={24}
                                            color={customColors.white}
                                        />
                                    </TouchableOpacity>
                                )}

                                <Modal
                                    animationType="slide"
                                    transparent={true}
                                    visible={modalVisible}
                                    onRequestClose={() =>
                                        setModalVisible(false)
                                    }>
                                    <View style={styles.modalView}>
                                        <Text style={styles.modalTitle}>
                                            {" "}
                                            Select Company{" "}
                                        </Text>
                                        <FlatList
                                            data={companies}
                                            renderItem={({ item }) => (
                                                <CompanyItem
                                                    item={item}
                                                    onSelect={
                                                        handleCompanySelect
                                                    }
                                                />
                                            )}
                                            keyExtractor={item =>
                                                item.Global_Id.toString()
                                            }
                                        />
                                        <TouchableOpacity
                                            style={styles.closeButton}
                                            onPress={() =>
                                                setModalVisible(false)
                                            }>
                                            <Text
                                                style={styles.closeButtonText}>
                                                {" "}
                                                Close{" "}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </Modal>

                                {selectedCompany && (
                                    <>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter your password"
                                            placeholderTextColor="#a0a0a0"
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry
                                        />
                                        <TouchableOpacity
                                            style={styles.button}
                                            onPress={handleLogin}>
                                            <Text style={styles.buttonText}>
                                                {" "}
                                                Login{" "}
                                            </Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </ImageBackground>
        </SafeAreaView>
    );
};

export default LoginPortal;

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        height: "100%",
        backgroundColor: customColors.background,
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    logoContainer: {
        alignItems: "center",
        marginBottom: 50,
    },
    inputContainer: {
        width: "100%",
        maxWidth: 300,
    },
    input: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: 5,
        padding: 15,
        marginBottom: 15,
        ...typography.body1(),
        color: customColors.white,
    },
    button: {
        backgroundColor: customColors.secondary,
        borderRadius: 5,
        padding: 15,
        alignItems: "center",
    },
    buttonText: {
        ...typography.button(),
        color: customColors.black,
        fontWeight: "bold",
    },
    selectButton: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: 5,
        padding: 15,
        marginBottom: 15,
    },
    selectButtonText: {
        ...typography.h6(),
        color: customColors.white,
    },
    modalView: {
        flex: 1,
        justifyContent: "center",
        backgroundColor: customColors.white,
        margin: 20,
        borderRadius: 20,
        padding: 35,
        shadowColor: customColors.black,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        ...typography.h5(),
        color: customColors.black,
        fontWeight: "bold",
        marginBottom: 15,
        textAlign: "center",
    },
    item: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    companyText: {
        ...typography.body1(),
        color: customColors.black,
    },
    closeButton: {
        backgroundColor: customColors.secondary,
        borderRadius: 5,
        padding: 10,
        alignItems: "center",
        marginTop: 20,
    },
    closeButtonText: {
        ...typography.button(),
        color: customColors.black,
        fontWeight: "bold",
    },
});
