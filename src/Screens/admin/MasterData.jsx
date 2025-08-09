import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import AppHeader from "../../Components/AppHeader";
import AddDataModal from "../../Components/AddDataModal";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import { API } from "../../Config/Endpoint";
import {
    customColors,
    typography,
    shadows,
    spacing,
} from "../../Config/helper";
import { SafeAreaView } from "react-native-safe-area-context";

const MasterData = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [districtData, setDistrictData] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState(1);
    const [stateData, setStateData] = useState([]);
    const [selectedState, setSelectedState] = useState(1);
    const [routeData, setRouteData] = useState([]);
    const [areaData, setAreaData] = useState([]);
    const [modalType, setModalType] = useState(null);

    useEffect(() => {
        (async () => {
            fetchArea();
            fetchState();
            fetchDistrict();
            fetchRoute();
        })();
    }, []);

    const fetchArea = async () => {
        try {
            const response = await fetch(`${API.areas()}`);
            const data = await response.json();
            if (data.success) {
                // console.log("Area Data Structure:", data.data[0].District_Id); // Log first item
                setAreaData(data.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchState = async () => {
        try {
            const url = `${API.state()}`;
            // console.log(url);
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (data.success) {
                setStateData(data.data);
                setSelectedState(1);
            } else {
                console.log("Failed to fetch logs: ", data.message);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDistrict = async () => {
        try {
            const url = `${API.district()}`;
            // console.log(url);
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (data.success) {
                setDistrictData(data.data);
                setSelectedDistrict(1);
            } else {
                console.log("Failed to fetch logs: ", data.message);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRoute = async () => {
        try {
            const response = await fetch(`${API.routes()}`);
            const data = await response.json();
            if (data.success) {
                // console.log("Route Data Structure:", data.data[0]); // Log first item
                setRouteData(data.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const addRoute = async routeName => {
        try {
            const response = await fetch(`${API.routes()}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    Route_Name: routeName,
                }),
            });

            const data = await response.json();
            // console.log(data);

            if (!data.success) {
                throw new Error(data.message || "Failed to add route");
            }

            // Refresh route list
            fetchRoute();
            Alert.alert("Success", data.message);
        } catch (error) {
            throw new Error(error.message || "Failed to add route");
        }
    };

    const addArea = async areaName => {
        // console.log(selectedDistrict);
        if (!selectedDistrict) {
            throw new Error("Please select a district");
        }

        try {
            const response = await fetch(`${API.areas()}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    Area_Name: areaName,
                    District_Id: selectedDistrict,
                }),
            });

            const data = await response.json();
            // console.log(data);

            if (!data.success) {
                throw new Error(data.message || "Failed to add area");
            }

            // Refresh area list
            fetchArea();
            Alert.alert("Success", data.message);
        } catch (error) {
            throw new Error(error.message || "Failed to add area");
        }
    };

    const handleAddData = async value => {
        try {
            if (modalType === "route") {
                await addRoute(value);
            } else if (modalType === "area") {
                await addArea(value);
            }
        } catch (error) {
            Alert.alert("Error", error.message);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={customColors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader title="Master Data" navigation={navigation} />

            <View style={styles.contentContainer}>
                <View style={styles.dropdownSection}>
                    <View style={styles.dropdownCard}>
                        <Text style={styles.sectionTitle}>
                            Location Details
                        </Text>
                        <EnhancedDropdown
                            data={stateData}
                            labelField="State_Name"
                            valueField="State_Id"
                            placeholder="Select State"
                            value={selectedState}
                            containerStyle={styles.dropdownContainer}
                            onChange={item => {
                                setSelectedState(item.State_Id);
                            }}
                        />

                        <EnhancedDropdown
                            data={districtData}
                            labelField="District_Name"
                            valueField="District_Id"
                            placeholder="Select District"
                            containerStyle={styles.dropdownContainer}
                            value={selectedDistrict}
                            onChange={item => {
                                setSelectedDistrict(item.District_Id);
                            }}
                        />
                    </View>
                </View>

                <View style={styles.actionSection}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.routeButton]}
                        onPress={() => {
                            if (!selectedDistrict) {
                                Alert.alert(
                                    "Error",
                                    "Please select a district first",
                                );
                                return;
                            }
                            setModalType("route");
                        }}>
                        <MaterialCommunityIcons
                            name="road-variant"
                            size={24}
                            color={customColors.white}
                        />
                        <Text style={styles.actionButtonText}>Add Route</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.areaButton]}
                        onPress={() => {
                            if (!selectedDistrict) {
                                Alert.alert(
                                    "Error",
                                    "Please select a district first",
                                );
                                return;
                            }
                            setModalType("area");
                        }}>
                        <MaterialCommunityIcons
                            name="map-marker-plus"
                            size={24}
                            color={customColors.white}
                        />
                        <Text style={styles.actionButtonText}>Add Area</Text>
                    </TouchableOpacity>
                </View>

                <AddDataModal
                    visible={modalType !== null}
                    onClose={() => setModalType(null)}
                    onSubmit={handleAddData}
                    title={
                        modalType === "route" ? "Add New Route" : "Add New Area"
                    }
                    placeholder={
                        modalType === "route"
                            ? "Enter route name"
                            : "Enter area name"
                    }
                    existingItems={modalType === "route" ? routeData : areaData}
                    selectedDistrict={selectedDistrict}
                    modalType={modalType}
                />
            </View>
        </SafeAreaView>
    );
};

export default MasterData;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.white,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        ...shadows.small,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: customColors.white,
    },
    dropdownSection: {
        padding: spacing.md,
    },
    dropdownCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.md,
        ...shadows.small,
    },
    sectionTitle: {
        ...typography.h6(),
        color: customColors.primary,
        marginBottom: spacing.md,
        fontWeight: "600",
    },
    dropdownContainer: {
        marginBottom: spacing.md,
    },
    actionSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: spacing.md,
        gap: spacing.md,
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.md,
        borderRadius: 8,
        gap: spacing.sm,
        ...shadows.small,
    },
    routeButton: {
        backgroundColor: customColors.primary,
    },
    areaButton: {
        backgroundColor: customColors.secondary,
    },
    actionButtonText: {
        color: customColors.white,
        ...typography.subtitle1(),
        fontWeight: "600",
    },
});
