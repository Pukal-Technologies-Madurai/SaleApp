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
import AntIcon from "react-native-vector-icons/AntDesign";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CryptoJS from "react-native-crypto-js";
import Icon from "react-native-vector-icons/Ionicons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import FontAwesomeIcon from "react-native-vector-icons/FontAwesome6";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";
import { storeInfo } from "../../Config/AuthContext";
import { API, setBaseUrl } from "../../Config/Endpoint";
import {
    customColors,
    shadows,
    typography,
    spacing,
    radius,
    iconSizes,
    responsiveSize,
    borderWidths,
} from "../../Config/helper";
import assetImages from "../../Config/Image";
import { appVersion } from "../../Api/auth";

const APP_VERSION = appVersion();

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
            const url = `${API.userPortal()}${userName}`;
            const response = await fetch(url);
            const jsonData = await response.json();

            if (jsonData.success && jsonData.data) {
                const companies = jsonData.data;
                setCompanies(companies);

                if (companies.length === 1) {
                    setSelectedCompany(companies[0]);
                    await AsyncStorage.setItem("baseURL", companies[0].Web_Api);
                    setBaseUrl(companies[0].Web_Api);
                    setStep(2);
                } else {
                    setStep(2);
                }
            } else {
                ToastAndroid.show(
                    jsonData.message || "Username not found. Please try again.",
                    ToastAndroid.LONG,
                );
                handleUsernameReset();
            }
        } catch (err) {
            console.error(err);
            handleUsernameReset();
        }
    };

    const handleCompanySelect = async company => {
        setSelectedCompany(company);
        setModalVisible(false);

        await AsyncStorage.setItem("baseURL", company.Web_Api);
        setBaseUrl(company.Web_Api);
    };

    const handleLogin = async () => {
        if (!selectedCompany) {
            ToastAndroid.show("Please select a company.", ToastAndroid.LONG);
            return;
        }

        // console.log("baseURL before login:", selectedCompany.Web_Api);

        try {
            const passHash = CryptoJS.AES.encrypt(
                password,
                "ly4@&gr$vnh905RyB>?%#@-(KSMT",
            ).toString();

            await AsyncStorage.setItem("baseURL", selectedCompany.Web_Api);
            await setBaseUrl(selectedCompany.Web_Api);

            const url = API.userPortalLogin();

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    Global_User_ID: selectedCompany.Global_User_ID,
                    Password: passHash,
                }),
            });

            const data = await response.json();
            // console.log("Login Response:", data);

            if (data.success) {
                const loginData = data.data;
                
                // Set baseURL from login response
                await AsyncStorage.setItem("baseURL", loginData.Web_Api);
                await setBaseUrl(loginData.Web_Api);
                
                // Use LOGIN_URL to get full user details
                await getUserAuthInfo(loginData.Web_Api, loginData.Autheticate_Id);
            } else {
                ToastAndroid.show(data.message, ToastAndroid.LONG);
            }
        } catch (err) {
            console.error("Login Error:", err);
            ToastAndroid.show("An error occurred during login.", ToastAndroid.LONG);
        }
    };

    const getUserAuthInfo = async (webApi, authToken) => {
        try {
            await setBaseUrl(webApi);

            const url = `${webApi}api/authorization/userAuth`;
            // console.log("getUserAuthInfo URL:", url);
            // console.log("Authorization Token:", authToken);

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: authToken,
                },
            });

            const data = await response.json();
            // console.log("getUserAuthInfo Response:", data);

            if (data.success && data.data && data.data.length > 0) {
                const authData = data.data[0];

                await AsyncStorage.setItem("userToken", authData.Autheticate_Id);
                await AsyncStorage.setItem("password", password);
                await setData(authData);
                setAuthInfo(authData);

                navigation.replace("HomeScreen");
                ToastAndroid.show("Login Successful" || data.message, ToastAndroid.LONG);
            } else {
                ToastAndroid.show(data.message || "User not found", ToastAndroid.LONG);
            }
        } catch (err) {
            console.error("getUserAuthInfo Error:", err);
            ToastAndroid.show("Authentication error. Please try again.", ToastAndroid.LONG);
        }
    };

    const setData = async data => {
        try {
            if (data.Autheticate_Id) await AsyncStorage.setItem("userToken", data.Autheticate_Id);
            if (data.UserId) await AsyncStorage.setItem("UserId", String(data.UserId));
            if (data.Company_id) await AsyncStorage.setItem("Company_Id", String(data.Company_id));
            if (data.UserName) await AsyncStorage.setItem("userName", data.UserName);
            if (data.Name) await AsyncStorage.setItem("Name", data.Name);
            if (data.BranchId) await AsyncStorage.setItem("branchId", String(data.BranchId));
            if (data.BranchName) await AsyncStorage.setItem("branchName", data.BranchName);
            if (data.UserType) await AsyncStorage.setItem("userType", data.UserType);
            if (data.UserTypeId) await AsyncStorage.setItem("userTypeId", String(data.UserTypeId));
            if (data.Company_Name) await AsyncStorage.setItem("companyName", data.Company_Name);
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

    const handleUsernameReset = () => {
        setPassword("");
        setSelectedCompany(null);
        setCompanies([]);
        setStep(1);
        setModalVisible(false);
        // Keep the username so user can edit it
    };

    return (
        <LinearGradient
            colors={["#1976D2", "#2196F3", "#42A5F5"]}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <StatusBar
                backgroundColor="transparent"
                translucent
                barStyle="light-content"
            />

            <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
                <View style={styles.contentContainer}>
                    <View style={styles.card}>
                        {/* Logo with circular border */}
                        <View style={styles.logoContainer}>
                            <View style={styles.logoBorder}>
                                <Image
                                    source={assetImages.logoWithoutText}
                                    style={styles.logo}
                                />
                            </View>
                        </View>

                        {/* App Title */}
                        <Text style={styles.appTitle}>PUKAL VIRPANAIYAGAM</Text>
                        <Text style={styles.appSubtitle}>
                            Sales Force Automation
                        </Text>

                        {step === 1 && (
                            <View style={styles.inputContainer}>
                                {/* Username Input */}
                                <View style={styles.inputWrapper}>
                                    <AntIcon
                                        name="user"
                                        size={22}
                                        color={customColors.primary}
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Username"
                                        placeholderTextColor={
                                            customColors.grey400
                                        }
                                        value={userName}
                                        onChangeText={setUserName}
                                        autoCapitalize="none"
                                    />
                                </View>

                                {/* Continue Button */}
                                <TouchableOpacity
                                    style={styles.continueButton}
                                    onPress={handleContinue}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={[
                                            "#1565C0",
                                            "#1976D2",
                                            "#1E88E5",
                                        ]}
                                        style={styles.gradientButton}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <AntIcon
                                            name="rightcircleo"
                                            size={iconSizes.md}
                                            color={customColors.white}
                                        />
                                        <Text style={styles.continueButtonText}>
                                            Continue
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                                {/* OR Divider */}
                                <View style={styles.dividerContainer}>
                                    <View style={styles.dividerLine} />
                                    <Text style={styles.dividerText}>OR</Text>
                                    <View style={styles.dividerLine} />
                                </View>

                                {/* Reset Button */}
                                <TouchableOpacity
                                    style={styles.resetButton}
                                    onPress={handleReset}
                                    activeOpacity={0.7}
                                >
                                    <MaterialCommunityIcons
                                        name="refresh"
                                        size={iconSizes.md}
                                        color={customColors.primary}
                                    />
                                    <Text style={styles.resetButtonText}>
                                        Reset
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {step === 2 && (
                            <View style={styles.inputContainer}>
                                {/* Username Input (disabled/readonly) */}
                                <View style={styles.inputWrapper}>
                                    <AntIcon
                                        name="user"
                                        size={22}
                                        color={customColors.primary}
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Username"
                                        placeholderTextColor={
                                            customColors.grey400
                                        }
                                        value={userName}
                                        onChangeText={setUserName}
                                        autoCapitalize="none"
                                    />
                                </View>

                                {companies.length === 0 && (
                                    <TouchableOpacity
                                        style={styles.backButton}
                                        onPress={handleUsernameReset}
                                    >
                                        <AntIcon
                                            name="arrowleft"
                                            size={iconSizes.md}
                                            color={customColors.primaryDark}
                                        />
                                        <Text style={styles.backButtonText}>
                                            Change Username
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {companies.length > 1 && (
                                    <TouchableOpacity
                                        style={styles.selectButton}
                                        onPress={() => setModalVisible(true)}
                                    >
                                        <FontAwesomeIcon
                                            name="building-shield"
                                            size={iconSizes.md}
                                            color={customColors.primary}
                                        />
                                        <Text style={styles.selectButtonText}>
                                            {selectedCompany
                                                ? selectedCompany.Company_Name
                                                : "Select your company"}
                                        </Text>
                                        <Icon
                                            name="chevron-down"
                                            size={iconSizes.md}
                                            color={customColors.grey500}
                                        />
                                    </TouchableOpacity>
                                )}

                                {companies.length === 1 && selectedCompany && (
                                    <View style={styles.companyDisplayWrapper}>
                                        <FontAwesomeIcon
                                            name="building-shield"
                                            size={iconSizes.md}
                                            color={customColors.primary}
                                        />
                                        <Text style={styles.companyDisplayText}>
                                            {selectedCompany.Company_Name}
                                        </Text>
                                    </View>
                                )}

                                <Modal
                                    animationType="slide"
                                    transparent={true}
                                    visible={modalVisible}
                                    onRequestClose={() =>
                                        setModalVisible(false)
                                    }
                                >
                                    <View style={styles.modalOverlay}>
                                        <View style={styles.modalView}>
                                            <Text style={styles.modalTitle}>
                                                Select Company
                                            </Text>
                                            <FlatList
                                                data={companies}
                                                renderItem={({ item }) => (
                                                    <TouchableOpacity
                                                        style={
                                                            styles.companyItem
                                                        }
                                                        onPress={() =>
                                                            handleCompanySelect(
                                                                item,
                                                            )
                                                        }
                                                    >
                                                        <FontAwesome
                                                            name="building-o"
                                                            size={iconSizes.md}
                                                            color={
                                                                customColors.primary
                                                            }
                                                        />
                                                        <Text
                                                            style={
                                                                styles.companyText
                                                            }
                                                        >
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
                                                onPress={() =>
                                                    setModalVisible(false)
                                                }
                                            >
                                                <Text
                                                    style={
                                                        styles.closeButtonText
                                                    }
                                                >
                                                    Close
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </Modal>

                                {selectedCompany && (
                                    <>
                                        <View style={styles.inputWrapper}>
                                            <Icon
                                                name="lock-closed-outline"
                                                size={iconSizes.lg}
                                                color={customColors.primary}
                                                style={styles.inputIcon}
                                            />
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Password"
                                                placeholderTextColor={
                                                    customColors.grey400
                                                }
                                                value={password}
                                                onChangeText={setPassword}
                                                secureTextEntry
                                            />
                                        </View>

                                        <TouchableOpacity
                                            style={styles.continueButton}
                                            onPress={handleLogin}
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient
                                                colors={[
                                                    "#1565C0",
                                                    "#1976D2",
                                                    "#1E88E5",
                                                ]}
                                                style={styles.gradientButton}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                            >
                                                <Icon
                                                    name="log-in-outline"
                                                    size={iconSizes.md}
                                                    color={customColors.white}
                                                />
                                                <Text
                                                    style={
                                                        styles.continueButtonText
                                                    }
                                                >
                                                    Login
                                                </Text>
                                            </LinearGradient>
                                        </TouchableOpacity>

                                        <View style={styles.dividerContainer}>
                                            <View style={styles.dividerLine} />
                                            <Text style={styles.dividerText}>
                                                OR
                                            </Text>
                                            <View style={styles.dividerLine} />
                                        </View>

                                        <TouchableOpacity
                                            style={styles.resetButton}
                                            onPress={handleReset}
                                            activeOpacity={0.7}
                                        >
                                            <MaterialCommunityIcons
                                                name="refresh"
                                                size={iconSizes.md}
                                                color={customColors.primary}
                                            />
                                            <Text
                                                style={styles.resetButtonText}
                                            >
                                                Reset
                                            </Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <View style={styles.footerContent}>
                            <MaterialCommunityIcons
                                name="shield-check"
                                size={iconSizes.md}
                                color={customColors.white}
                            />
                            <View style={styles.footerTextContainer}>
                                <Text style={styles.footerTitle}>
                                    Secure & Trusted Access
                                </Text>
                                <Text style={styles.footerVersion}>
                                    Version {APP_VERSION}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
};

export default LoginPortal;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.lg,
        // paddingTop: StatusBar.currentHeight || 0,
    },
    card: {
        width: "100%",
        maxWidth: responsiveSize(380),
        backgroundColor: customColors.white,
        borderRadius: radius.xl,
        paddingHorizontal: responsiveSize(24),
        paddingTop: responsiveSize(40),
        paddingBottom: spacing.xl,
        alignItems: "center",
        ...shadows.large,
    },
    logoContainer: {
        marginBottom: spacing.xs,
    },
    logoBorder: {
        width: responsiveSize(120),
        height: responsiveSize(120),
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "transparent",
    },
    logo: {
        width: "125%",
        height: "125%",
        resizeMode: "cover",
    },
    appTitle: {
        ...typography.appTitle(),
        color: customColors.primaryDark,
        textAlign: "center",
    },
    appSubtitle: {
        ...typography.appSubtitle(),
        color: customColors.grey500,
        textAlign: "center",
        marginBottom: responsiveSize(20),
    },
    inputContainer: {
        width: "100%",
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.white,
        borderRadius: radius.round,
        paddingHorizontal: spacing.lg,
        height: responsiveSize(56),
        borderWidth: borderWidths.medium,
        borderColor: customColors.grey300,
        marginBottom: spacing.md,
    },
    inputIcon: {
        marginRight: spacing.md,
    },
    input: {
        flex: 1,
        height: responsiveSize(56),
        ...typography.inputText(),
        color: customColors.grey800,
    },
    continueButton: {
        width: "100%",
        borderRadius: radius.round,
        overflow: "hidden",
        marginBottom: spacing.md,
        ...shadows.small,
    },
    gradientButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        height: responsiveSize(56),
        gap: spacing.sm,
    },
    continueButtonText: {
        ...typography.buttonLarge(),
        color: customColors.white,
    },
    dividerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: spacing.md,
    },
    dividerLine: {
        flex: 1,
        height: borderWidths.normal,
        backgroundColor: customColors.grey300,
    },
    dividerText: {
        ...typography.dividerText(),
        color: customColors.grey500,
        marginHorizontal: spacing.md,
    },
    resetButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: responsiveSize(56),
        borderRadius: radius.round,
        borderWidth: borderWidths.medium,
        borderColor: customColors.primary,
        backgroundColor: customColors.white,
        gap: spacing.sm,
    },
    resetButtonText: {
        ...typography.buttonLarge(),
        color: customColors.primary,
    },
    selectButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.white,
        borderRadius: radius.round,
        paddingHorizontal: spacing.lg,
        height: responsiveSize(56),
        borderWidth: borderWidths.medium,
        borderColor: customColors.grey300,
        marginBottom: spacing.md,
    },
    selectButtonText: {
        flex: 1,
        ...typography.inputText(),
        color: customColors.grey800,
        marginLeft: spacing.md,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalView: {
        width: "85%",
        maxHeight: "60%",
        backgroundColor: customColors.white,
        borderRadius: radius.lg,
        padding: spacing.lg,
        ...shadows.large,
    },
    modalTitle: {
        ...typography.modalTitle(),
        color: customColors.grey900,
        textAlign: "center",
        marginBottom: spacing.lg,
    },
    companyItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderBottomWidth: borderWidths.normal,
        borderBottomColor: customColors.grey200,
    },
    companyText: {
        marginLeft: spacing.md,
        ...typography.listItem(),
        color: customColors.grey800,
    },
    closeButton: {
        marginTop: spacing.lg,
        alignSelf: "center",
        backgroundColor: customColors.grey100,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        paddingHorizontal: responsiveSize(40),
    },
    closeButtonText: {
        ...typography.buttonMedium(),
        color: customColors.primaryDark,
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: customColors.grey100,
        borderRadius: radius.round,
        height: responsiveSize(48),
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    backButtonText: {
        ...typography.buttonMedium(),
        color: customColors.primaryDark,
        marginLeft: spacing.sm,
    },
    companyDisplayWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.grey50,
        borderRadius: radius.round,
        paddingHorizontal: spacing.lg,
        height: responsiveSize(56),
        borderWidth: borderWidths.medium,
        borderColor: customColors.primary,
        marginBottom: spacing.md,
    },
    companyDisplayText: {
        flex: 1,
        ...typography.listItemBold(),
        color: customColors.primaryDark,
        marginLeft: spacing.md,
    },
    footer: {
        position: "absolute",
        bottom: responsiveSize(12),
        alignSelf: "center",
    },
    footerContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    footerTextContainer: {
        marginLeft: spacing.sm,
    },
    footerTitle: {
        ...typography.footerText(),
        color: customColors.white,
    },
    footerVersion: {
        ...typography.footerCaption(),
        color: "rgba(255, 255, 255, 0.7)",
    },
});
