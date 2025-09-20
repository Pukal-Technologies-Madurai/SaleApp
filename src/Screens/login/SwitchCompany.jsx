import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from "react-native";
import React from "react";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { customColors, typography, shadows } from "../../Config/helper";
import AppHeader from "../../Components/AppHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchUserCompanies } from "../../Api/auth";
import { useQuery } from "@tanstack/react-query";
import { API, setBaseUrl } from "../../Config/Endpoint";
import CheckBox from "@react-native-community/checkbox";
import CryptoJS from "react-native-crypto-js";
import Icon from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const SwitchCompany = () => {
    const navigation = useNavigation();

    const [selectedCompany, setSelectedCompany] = React.useState(null);
    const [isSwitching, setIsSwitching] = React.useState(false);
    const [userName, setUserName] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [currentCompanyId, setCurrentCompanyId] = React.useState("");
    const [name, setName] = React.useState("");
    const [companyName, setCompanyName] = React.useState("");

    React.useEffect(() => {
        (async () => {
            const userName = await AsyncStorage.getItem("userName");
            const password = await AsyncStorage.getItem("password");
            const name = await AsyncStorage.getItem("Name");
            const currentCompanyId = await AsyncStorage.getItem("Company_Id");
            const companyName = await AsyncStorage.getItem("companyName");

            setUserName(userName);
            setCurrentCompanyId(currentCompanyId);
            setName(name);
            setPassword(password);
            setCompanyName(companyName);
        })();
    }, [])

    const {
        data: companyData = [],
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ["companyInfo", userName],
        queryFn: () => fetchUserCompanies(userName),
        enabled: !!userName,
    });

    React.useEffect(() => {
        if (companyData.length > 0 && currentCompanyId) {
            const current = companyData.find(
                (company) =>
                    String(company.Global_Id) === currentCompanyId,
            );
            if (current) {
                setSelectedCompany(current);
            }
        }
    }, [companyData, currentCompanyId]);

    const handleCompanySelection = async (item) => {
        if (isSwitching) return;

        setSelectedCompany(item);
        setIsSwitching(true);

        try {
            const passHash = CryptoJS.AES.encrypt(
                password,
                "ly4@&gr$vnh905RyB>?%#@-(KSMT",
            ).toString();

            const response = await fetch(API.userPortalLogin(), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    Global_User_ID: item.Global_User_ID,
                    username: userName,
                    Password: passHash,
                    Company_Name: item.Company_Name,
                    Global_Id: item.Global_Id,
                    Local_Id: item.Local_Id,
                    Web_Api: item.Web_Api,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setBaseUrl(item.Web_Api);
                await getUserAuthToken(
                    data.data.Autheticate_Id,
                    item.Company_Name,
                );
            } else {
                throw new Error(data.message || "Login failed");
            }
        } catch (error) {
            console.error("Login Error: ", error);
            setIsSwitching(false);
            setSelectedCompany(null);
            Alert.alert(
                "Error",
                `Login failed: ${error.message || "Unknown error"}`,
            );
        }
    }

    const getUserAuthToken = async (token, companyName) => {
        try {
            // console.log("Getting user auth token with:", token);
            const url = `${API.getUserAuthMob()}`;

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            // console.log("User auth token response:", data.user.Autheticate_Id);

            if (data.success) {
                const success = await updateStorage(data.user);

                if (success) {
                    ToastAndroid.show(
                        `Successfully switched to ${companyName}`,
                        ToastAndroid.LONG,
                    );
                    navigation.reset({
                        index: 0,
                        routes: [{ name: "HomeScreen" }],
                    });
                }

                return data.data;
            } else {
                throw new Error(
                    data.message || "Failed to get user auth token",
                );
            }
        } catch (err) {
            console.error("GetUserAuthToken Error: ", err);
            setIsSwitching(false);
            const errorMessage =
                err instanceof Error ? err.message : "Unknown error";
            Alert.alert(
                "Error",
                `Failed to get user information: ${errorMessage}`,
            );
            throw err;
        }
    };

    const updateStorage = async (data) => {
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

            setIsSwitching(false);
            return true;
        } catch (error) {
            setIsSwitching(false);
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            Alert.alert(
                "Error",
                `Failed to update user information: ${errorMessage}`,
            );
            return false;
        }
    }

    const renderLoadingState = () => (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={customColors.primary} />
            <Text style={styles.loadingText}>
                Loading companies...
            </Text>
        </View>
    );

    const renderErrorState = () => (
        <View style={styles.errorContainer}>
            <MaterialIcons
                name="error-outline"
                size={48}
                color={customColors.error}
            />
            <Text style={styles.errorTitle}>
                Unable to load companies
            </Text>
            <Text style={styles.errorMessage}>
                {error?.message || "An unexpected error occurred"}
            </Text>
            <TouchableOpacity
                style={styles.retryButton}
                onPress={() => refetch()}>
                <Text style={styles.retryButtonText}>Tap to retry</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <AppHeader
                navigation={navigation}
                title="Switch Company"
            />

            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.welcomeSection}>
                    <View style={styles.userInfoCard}>
                        <View style={styles.avatarContainer}>
                            <Icon name="person" size={20} color={customColors.white} />
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.welcomeText}>Hello, {name}! 👋</Text>
                            <Text style={styles.userSubtext}>Manage your company access</Text>
                        </View>
                    </View>

                    <View style={styles.companyCardsRow}>
                        <View style={styles.currentCompanyCard}>
                            <MaterialIcons
                                name="business"
                                size={20}
                                color={customColors.primary}
                                style={styles.cardIcon}
                            />
                            <Text style={styles.currentCompanyLabel}>Current Company</Text>
                            <Text style={styles.currentCompanyName} numberOfLines={2}>
                                {companyName}
                            </Text>
                        </View>

                        {selectedCompany && selectedCompany.Company_Name !== companyName && (
                            <View style={styles.switchingCard}>
                                <MaterialIcons
                                    name="swap-horiz"
                                    size={20}
                                    color={customColors.warning}
                                    style={styles.cardIcon}
                                />
                                <Text style={styles.switchingLabel}>Switching To</Text>
                                <Text style={styles.switchingCompanyName} numberOfLines={2}>
                                    {selectedCompany.Company_Name}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Company Selection Section */}
                <View style={styles.selectionSection}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons
                            name="domain"
                            size={20}
                            color={customColors.primary}
                        />
                        <Text style={styles.sectionTitle}>Available Companies</Text>
                    </View>

                    {isLoading ? (
                        renderLoadingState()
                    ) : error ? (
                        renderErrorState()
                    ) : (
                        <View style={styles.companiesContainer}>
                            {companyData.map((company, index) => {
                                const isCurrentCompany = String(company.Global_Id) === currentCompanyId;
                                const isSelected = selectedCompany?.Global_Id === company.Global_Id;

                                return (
                                    <TouchableOpacity
                                        key={company.Global_Id}
                                        style={[
                                            styles.companyItem,
                                            isCurrentCompany && styles.currentCompanyItem,
                                            isSelected && styles.selectedCompanyItem,
                                            isSwitching && styles.companyItemDisabled,
                                            index === companyData.length - 1 && styles.lastCompanyItem
                                        ]}
                                        onPress={() => !isSwitching && handleCompanySelection(company)}
                                        disabled={isSwitching}
                                        activeOpacity={0.7}>

                                        <View style={styles.companyItemContent}>
                                            <View style={styles.companyIcon}>
                                                <MaterialIcons
                                                    name="business"
                                                    size={20}
                                                    color={isCurrentCompany ? customColors.primary : customColors.grey500}
                                                />
                                            </View>

                                            <View style={styles.companyDetails}>
                                                <Text style={[
                                                    styles.companyName,
                                                    isCurrentCompany && styles.currentCompanyText,
                                                    isSelected && styles.selectedCompanyText
                                                ]}>
                                                    {company.Company_Name}
                                                </Text>

                                                {isCurrentCompany && (
                                                    <View style={styles.currentBadge}>
                                                        <Text style={styles.currentBadgeText}>Current</Text>
                                                    </View>
                                                )}

                                            </View>

                                            <View style={styles.companyActions}>
                                                {isSelected && isSwitching ? (
                                                    <ActivityIndicator
                                                        size="small"
                                                        color={customColors.primary}
                                                    />
                                                ) : (
                                                    <CheckBox
                                                        value={isCurrentCompany || isSelected}
                                                        onValueChange={() => !isSwitching && handleCompanySelection(company)}
                                                        disabled={isSwitching}
                                                        tintColors={{
                                                            true: customColors.primary,
                                                            false: customColors.grey400,
                                                        }}
                                                        style={styles.checkbox}
                                                    />
                                                )}
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}

                            {companyData.length === 0 && (
                                <View style={styles.noDataContainer}>
                                    <MaterialIcons
                                        name="business-center"
                                        size={48}
                                        color={customColors.grey400}
                                    />
                                    <Text style={styles.noDataText}>
                                        No companies available
                                    </Text>
                                    <Text style={styles.noDataSubtext}>
                                        Contact your administrator for access
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

export default SwitchCompany

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    welcomeSection: {
        padding: 20,
        paddingBottom: 10,
    },
    userInfoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        ...shadows.small,
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: customColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
    },
    welcomeText: {
        ...typography.body1(),
        color: customColors.textPrimary,
        fontWeight: '600',
        marginBottom: 2,
    },
    userSubtext: {
        ...typography.caption(),
        color: customColors.grey600,
        fontWeight: '500',
    },
    companyCardsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    currentCompanyCard: {
        flex: 1,
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: customColors.primary + '20',
        ...shadows.small,
    },
    cardIcon: {
        marginBottom: 8,
    },
    currentCompanyLabel: {
        ...typography.caption(),
        color: customColors.grey600,
        fontWeight: '500',
        marginBottom: 4,
        textAlign: 'center',
    },
    currentCompanyName: {
        ...typography.body2(),
        color: customColors.textPrimary,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 16,
    },
    switchingCard: {
        flex: 1,
        backgroundColor: customColors.warning + '08',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: customColors.warning + '40',
    },
    switchingLabel: {
        ...typography.caption(),
        color: customColors.warning,
        fontWeight: '500',
        marginBottom: 4,
        textAlign: 'center',
    },
    switchingCompanyName: {
        ...typography.body2(),
        color: customColors.warning,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 16,
    },
    selectionSection: {
        flex: 1,
        backgroundColor: customColors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 20,
        paddingHorizontal: 16,
        marginTop: 6,
        minHeight: 400,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey100,
    },
    sectionTitle: {
        ...typography.body1(),
        color: customColors.textPrimary,
        fontWeight: '600',
        marginLeft: 8,
    },
    companiesContainer: {
        flex: 1,
        paddingBottom: 20,
    },
    companyItem: {
        backgroundColor: customColors.grey50,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: customColors.grey200,
        overflow: 'hidden',
    },
    currentCompanyItem: {
        borderColor: customColors.primary,
        backgroundColor: customColors.primary + '06',
    },
    selectedCompanyItem: {
        borderColor: customColors.success,
        backgroundColor: customColors.success + '06',
    },
    companyItemDisabled: {
        opacity: 0.6,
    },
    lastCompanyItem: {
        marginBottom: 40,
    },
    companyItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    companyIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: customColors.grey100,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    companyDetails: {
        flex: 1,
    },
    companyName: {
        ...typography.body2(),
        color: customColors.textPrimary,
        fontWeight: '600',
        marginBottom: 2,
    },
    currentCompanyText: {
        color: customColors.primary,
    },
    selectedCompanyText: {
        color: customColors.success,
    },
    currentBadge: {
        backgroundColor: customColors.primary,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 1,
        alignSelf: 'flex-start',
        marginBottom: 2,
    },
    currentBadgeText: {
        fontSize: 10,
        color: customColors.white,
        fontWeight: '600',
    },
    companyActions: {
        marginLeft: 8,
    },
    checkbox: {
        transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        ...typography.body2(),
        color: customColors.grey600,
        marginTop: 12,
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 16,
    },
    errorTitle: {
        ...typography.body1(),
        color: customColors.error,
        fontWeight: '600',
        marginTop: 12,
        marginBottom: 6,
        textAlign: 'center',
    },
    errorMessage: {
        ...typography.caption(),
        color: customColors.grey600,
        textAlign: 'center',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: customColors.primary,
        borderRadius: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    retryButtonText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: '600',
    },
    noDataContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    noDataText: {
        ...typography.body1(),
        color: customColors.grey500,
        fontWeight: '600',
        marginTop: 12,
        marginBottom: 6,
    },
    noDataSubtext: {
        ...typography.caption(),
        color: customColors.grey400,
        textAlign: 'center',
    },
});