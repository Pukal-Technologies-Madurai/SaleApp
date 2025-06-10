import {
    StyleSheet,
    TextInput,
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    StatusBar,
    Image,
    ToastAndroid,
} from "react-native";
import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import CryptoJS from "react-native-crypto-js";
import Icon from "react-native-vector-icons/Ionicons";
import AntIcon from "react-native-vector-icons/AntDesign";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import FontAwesomeIcon from "react-native-vector-icons/FontAwesome6";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { storeInfo } from "../../Config/AuthContext";
import { API, setBaseUrl } from "../../Config/Endpoint";
import { customColors, shadows, typography } from "../../Config/helper";
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
        try {
            const response = await fetch(`${API.userPortal()}${userName}`);
            const jsonData = await response.json();

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
            console.error(err);
        }
    };

    const handleCompanySelect = company => {
        setSelectedCompany(company);
        setModalVisible(false);
    };

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

            if (data.success) {
                getUserAuth(data.data.Web_Api, data.data.Autheticate_Id);
            } else {
                ToastAndroid.show(data.message, ToastAndroid.LONG);
            }
        } catch (err) {
            Alert.alert("Login Error", "An error occurred during login.");
            console.error(err);
        }
    };

    const getUserAuth = async (webApi, userAuth) => {
        try {
            setBaseUrl(webApi);

            const url = `${webApi}api/authorization/userAuthmobile`;

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `${userAuth}`,
                },
            });

            const data = await response.json();

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
            await AsyncStorage.setItem("companyName", data.Company_Name);
        } catch (err) {
            console.error("Error storing data: ", err);
        }
    };

    const handleReset = () => {
        setUserName("");
        setPassword("");
        setSelectedCompany(null);
        setCompanies([]);
        setStep(1);
        setModalVisible(false);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar backgroundColor={customColors.primaryDark} />
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Image source={assetImages.logo} style={styles.logo} />

                    {step === 1 && (
                        <View style={styles.inputContainer}>
                            <View style={styles.inputWrapper}>
                                <AntIcon
                                    name="user"
                                    size={22}
                                    color={customColors.grey500}
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Username"
                                    placeholderTextColor="#a0a0a0"
                                    value={userName}
                                    onChangeText={setUserName}
                                />
                            </View>
                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleContinue}>
                                <AntIcon
                                    name="login"
                                    size={22}
                                    color={customColors.white}
                                    style={styles.inputIcon}
                                />
                                <Text style={styles.buttonText}>Continue</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.resetButton}
                                onPress={handleReset}>
                                <Text style={styles.resetButtonText}>
                                    Reset
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {step === 2 && (
                        <View style={styles.inputContainer}>
                            <View style={styles.inputWrapper}>
                                <AntIcon
                                    name="user"
                                    size={22}
                                    color={customColors.grey500}
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Username"
                                    placeholderTextColor="#a0a0a0"
                                    value={userName}
                                    onChangeText={setUserName}
                                />
                            </View>
                            {companies.length > 1 && (
                                <TouchableOpacity
                                    style={styles.selectButton}
                                    onPress={() => setModalVisible(true)}>
                                    <FontAwesomeIcon
                                        name="building-shield"
                                        size={22}
                                        color={customColors.grey500}
                                    />
                                    <Text style={styles.selectButtonText}>
                                        {selectedCompany
                                            ? selectedCompany.Company_Name
                                            : "Select your company"}
                                    </Text>
                                    <Icon
                                        name="chevron-down"
                                        size={22}
                                        color="#888"
                                    />
                                </TouchableOpacity>
                            )}

                            <Modal
                                animationType="slide"
                                transparent={true}
                                visible={modalVisible}
                                onRequestClose={() => setModalVisible(false)}>
                                <View style={styles.modalView}>
                                    <Text style={styles.modalTitle}>
                                        Select Company
                                    </Text>
                                    <FlatList
                                        data={companies}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={styles.companyItem}
                                                onPress={() =>
                                                    handleCompanySelect(item)
                                                }>
                                                <FontAwesome
                                                    name="building-o"
                                                    size={22}
                                                    color={customColors.grey500}
                                                />
                                                <Text
                                                    style={styles.companyText}>
                                                    {item.Company_Name}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        keyExtractor={item =>
                                            item.Global_Id.toString()
                                        }
                                    />
                                    <TouchableOpacity
                                        style={styles.closeButton}
                                        onPress={() => setModalVisible(false)}>
                                        <Text style={styles.closeButtonText}>
                                            Close
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </Modal>

                            {selectedCompany && (
                                <>
                                    <View style={styles.inputWrapper}>
                                        <Icon
                                            name="shield-checkmark-outline"
                                            size={22}
                                            color={customColors.grey500}
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Password"
                                            placeholderTextColor="#a0a0a0"
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry
                                        />
                                    </View>
                                    <TouchableOpacity
                                        style={styles.button}
                                        onPress={handleLogin}>
                                        <Icon
                                            name="log-in"
                                            size={22}
                                            color={customColors.white}
                                            style={styles.inputIcon}
                                        />
                                        <Text style={styles.buttonText}>
                                            Login
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.resetButton}
                                        onPress={handleReset}>
                                        <Text style={styles.resetButtonText}>
                                            Reset
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
};

export default LoginPortal;

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    overlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    card: {
        width: "100%",
        maxWidth: 400,
        backgroundColor: customColors.primary,
        borderRadius: 25,
        padding: 32,
        alignItems: "center",
        ...shadows.medium,
    },
    logo: {
        width: "60%",
        height: 120,
        resizeMode: "contain",
        marginBottom: 24,
    },
    inputContainer: {
        width: "100%",
        gap: 16,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.grey100,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: 52,
        ...typography.body1(),
        backgroundColor: "transparent",
        color: "#1f2937",
    },
    button: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: customColors.primaryDark,
        borderRadius: 12,
        height: 52,
        marginTop: 8,
        paddingHorizontal: 20,
    },
    buttonText: {
        ...typography.body1(),
        color: customColors.white,
        fontWeight: "600",
        marginLeft: 8,
    },
    selectButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.grey100,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    selectButtonText: {
        flex: 1,
        ...typography.body1(),
        color: "#1f2937",
        marginLeft: 12,
    },
    modalView: {
        marginTop: "40%",
        marginHorizontal: 20,
        backgroundColor: customColors.white,
        borderRadius: 20,
        padding: 24,
        alignItems: "center",
        maxHeight: "60%",
        ...shadows.medium,
    },
    modalTitle: {
        ...typography.h6(),
        color: "#1f2937",
        fontWeight: "600",
        marginBottom: 20,
    },
    companyItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey100,
        width: "100%",
    },
    companyText: {
        marginLeft: 12,
        ...typography.body1(),
        color: "#1f2937",
    },
    closeButton: {
        marginTop: 24,
        backgroundColor: customColors.grey100,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    closeButtonText: {
        color: customColors.primaryDark,
        fontWeight: "600",
        ...typography.body1(),
    },
    resetButton: {
        marginTop: 16,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        height: 52,
        backgroundColor: customColors.white,
        borderWidth: 1,
        borderColor: customColors.grey200,
        width: "100%",
    },
    resetButtonText: {
        color: customColors.primaryDark,
        fontWeight: "600",
        ...typography.body1(),
    },
});
