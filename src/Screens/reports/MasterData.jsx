import {
    ActivityIndicator,
    Alert,
    Button,
    ImageBackground,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useEffect, useState } from "react";
import Icon from "react-native-vector-icons/MaterialIcons";
import assetImages from "../../Config/Image";
import { customColors, typography } from "../../Config/helper";
import { API } from "../../Config/Endpoint";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import AddDataModal from "../../Components/AddDataModal";
import { useNavigation } from "@react-navigation/native";

const MasterData = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [districtData, setDistrictData] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState(1);
    const [stateData, setStateData] = useState([]);
    const [selectedState, setSelectedState] = useState(1);

    const [routeData, setRouteData] = useState([]);
    const [areaData, setAreaData] = useState([]);

    const [modalVisible, setModalVisible] = useState(false);
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
                console.log("Area Data Structure:", data.data[0].District_Id); // Log first item
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
            console.log(data);

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
        console.log(selectedDistrict);
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
            console.log(data);

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
                <ActivityIndicator size="large" color="#841584" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.overlay}>
                    <View style={styles.headerContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Icon
                                name="arrow-back"
                                size={25}
                                color={customColors.white}
                            />
                        </TouchableOpacity>
                        <Text style={styles.headerText}>Master Data</Text>
                    </View>

                    <View
                        style={styles.contentContainer}
                        behavior={Platform.OS === "ios" ? "padding" : "height"}>
                        <View>
                            <View style={styles.stateContainer}>
                                <EnhancedDropdown
                                    data={stateData}
                                    labelField="State_Name"
                                    valueField="State_Id"
                                    placeholder="Select State"
                                    value={selectedState}
                                    onChange={item => {
                                        setSelectedState(item.State_Id);
                                    }}
                                />

                                <EnhancedDropdown
                                    data={districtData}
                                    labelField="District_Name"
                                    valueField="District_Id"
                                    placeholder="Select State"
                                    value={selectedDistrict}
                                    onChange={item => {
                                        setSelectedDistrict(item.District_Id);
                                    }}
                                />
                            </View>

                            <View style={styles.actionSection}>
                                <TouchableOpacity
                                    style={[
                                        styles.actionButton,
                                        styles.routeButton,
                                    ]}
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
                                    <Icon
                                        name="add-road"
                                        size={24}
                                        color="#fff"
                                    />
                                    <Text style={styles.actionButtonText}>
                                        Add Route
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.actionButton,
                                        styles.areaButton,
                                    ]}
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
                                    <Icon
                                        name="add-location"
                                        size={24}
                                        color="#fff"
                                    />
                                    <Text style={styles.actionButtonText}>
                                        Add Area
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <AddDataModal
                                visible={modalType !== null}
                                onClose={() => setModalType(null)}
                                onSubmit={handleAddData}
                                title={
                                    modalType === "route"
                                        ? "Add New Route"
                                        : "Add New Area"
                                }
                                placeholder={
                                    modalType === "route"
                                        ? "Enter route name"
                                        : "Enter area name"
                                }
                                existingItems={
                                    modalType === "route" ? routeData : areaData
                                }
                                selectedDistrict={selectedDistrict}
                                modalType={modalType} // Pass the modalType
                            />
                        </View>
                    </View>
                </View>
            </ImageBackground>
        </View>
    );
};

export default MasterData;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.background,
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.2)",
    },
    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 20,
    },
    headerText: {
        flex: 1,
        ...typography.h4(),
        color: customColors.white,
        marginHorizontal: 10,
    },
    contentContainer: {
        width: "100%",
        height: "100%",
        backgroundColor: customColors.white,
        borderRadius: 7.5,
    },

    stateContainer: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
    },
    actionSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        margin: 15,
        gap: 15,
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        borderRadius: 8,
        elevation: 2,
        gap: 8,
    },
    routeButton: {
        backgroundColor: customColors.background,
    },
    areaButton: {
        backgroundColor: customColors.primary,
    },
    actionButtonText: {
        color: customColors.white,
        ...typography.h6(),
        fontWeight: "600",
    },
});
