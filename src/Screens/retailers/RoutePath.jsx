import { StyleSheet, Text, View, Alert, TouchableOpacity } from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppHeader from "../../Components/AppHeader";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import {
    fetchRetailers,
    fetchRoutePathData,
    deleteRoutePathData,
} from "../../Api/retailers";
import {
    customColors,
    shadows,
    spacing,
    typography,
} from "../../Config/helper";
import { API } from "../../Config/Endpoint";
import { SafeAreaView } from "react-native-safe-area-context";

const RoutePath = () => {
    const navigation = useNavigation();
    const queryClient = useQueryClient();
    const [companyId, setCompanyId] = useState(null);
    const [userId, setUserId] = useState(null);
    const [filteredRetailers, setFilteredRetailers] = useState([]);
    const [routes, setRoutes] = useState([]);

    const [selectedRoute, setSelectedRoute] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem("Company_Id").then(id => {
            setCompanyId(id);
        });
        AsyncStorage.getItem("UserId").then(userId => {
            if (userId) {
                setUserId(userId);
            }
        });
    }, []);

    const { data: retailers = [] } = useQuery({
        queryKey: ["retailers", companyId],
        queryFn: () => fetchRetailers(companyId),
        enabled: !!companyId,
    });

    // Get current date for fetching existing route data
    const currentDate = new Date().toISOString().split("T")[0];

    const { data: existingRouteData = [] } = useQuery({
        queryKey: ["routePath", currentDate, userId],
        queryFn: () => fetchRoutePathData(currentDate, userId),
        enabled: !!userId,
    });

    useEffect(() => {
        if (retailers.length) {
            setFilteredRetailers(retailers);

            const uniqueRoutes = [...new Set(retailers.map(r => r.Route_Id))]
                .map(routeId => ({
                    label:
                        retailers.find(r => r.Route_Id === routeId)?.RouteGet ||
                        "",
                    value: routeId,
                }))
                .filter(r => r.label);

            setRoutes(uniqueRoutes);
        }
    }, [retailers]);

    // Set default selected route if exists in existing data
    useEffect(() => {
        if (existingRouteData.length > 0 && routes.length > 0) {
            // Don't auto-select when multiple routes exist
            // User will manage them individually
            if (existingRouteData.length === 1) {
                const existingRoute = existingRouteData[0];
                if (existingRoute && existingRoute.Route_Id) {
                    setSelectedRoute(existingRoute.Route_Id);
                    filterRetailers(existingRoute.Route_Id);
                }
            }
        }
    }, [existingRouteData, routes]);

    // Filter retailers when route is selected
    const filterRetailers = routeId => {
        if (routeId) {
            const filtered = retailers.filter(
                item => item.Route_Id === routeId,
            );
            setFilteredRetailers(filtered);
        } else {
            setFilteredRetailers(retailers);
        }
    };

    // POST operation - Add new route
    const switchRoute = async () => {
        if (!selectedRoute) {
            Alert.alert("Error", "Please select a route first");
            return;
        }

        setIsSubmitting(true);
        try {
            const requestBody = {
                User_Id: parseInt(userId),
                Route_Id: selectedRoute,
                date: currentDate,
            };

            const response = await fetch(API.setRoutePath(), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || `HTTP error! status: ${response.status}`,
                );
            }

            if (data.success) {
                Alert.alert("Success", "Route has been added successfully!");
                navigation.navigate("HomeScreen");
                setSelectedRoute(null);
            } else {
                throw new Error(data.message || "Failed to add route");
            }
        } catch (error) {
            console.error("Error adding route:", error);
            Alert.alert(
                "Error",
                error.message || "Failed to add route. Please try again.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // PUT operation - Update existing route (toggle IsActive state)
    const updateRoute = async routeData => {
        setIsSubmitting(true);
        try {
            const requestBody = {
                Id: routeData.Id,
                User_Id: parseInt(userId),
                Route_Id: routeData.Route_Id,
                date: currentDate,
            };

            const response = await fetch(API.setRoutePath(), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || `HTTP error! status: ${response.status}`,
                );
            }

            if (data.success) {
                Alert.alert(
                    "Success",
                    "Route status has been updated successfully!",
                );
                // Refresh the route data
                queryClient.invalidateQueries({
                    queryKey: ["routePath", currentDate, userId],
                });
            } else {
                throw new Error(data.message || "Failed to update route");
            }
        } catch (error) {
            console.error("Error updating route:", error);
            Alert.alert(
                "Error",
                error.message || "Failed to update route. Please try again.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // DELETE operation - Remove route
    const deleteRoute = async routeData => {
        Alert.alert(
            "Delete Route",
            "Are you sure you want to delete this route?",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setIsSubmitting(true);
                        try {
                            await deleteRoutePathData(routeData.Id);
                            Alert.alert(
                                "Success",
                                "Route has been deleted successfully!",
                            );
                            // Refresh the route data
                            queryClient.invalidateQueries({
                                queryKey: ["routePath", currentDate, userId],
                            });
                        } catch (error) {
                            console.error("Error deleting route:", error);
                            Alert.alert(
                                "Error",
                                error.message ||
                                    "Failed to delete route. Please try again.",
                            );
                        } finally {
                            setIsSubmitting(false);
                        }
                    },
                },
            ],
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader title="Set Route" navigation={navigation} />

            <View style={styles.contentContainer}>
                <View style={styles.filterSection}>
                    <View style={styles.newRouteSection}>
                        <View style={styles.dropdownContainer}>
                            <Text style={styles.dropdownLabel}>Route</Text>
                            <EnhancedDropdown
                                data={routes}
                                labelField="label"
                                valueField="value"
                                placeholder="Select Route"
                                value={selectedRoute}
                                onChange={item => {
                                    setSelectedRoute(item.value);
                                    filterRetailers(item.value);
                                }}
                            />
                        </View>

                        {selectedRoute && (
                            <Text style={styles.selectedRouteText}>
                                Selected Route:{" "}
                                {
                                    routes.find(r => r.value === selectedRoute)
                                        ?.label
                                }
                            </Text>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                isSubmitting && styles.submitButtonDisabled,
                            ]}
                            onPress={switchRoute}
                            disabled={isSubmitting || !selectedRoute}>
                            <Text style={styles.submitButtonText}>
                                {isSubmitting
                                    ? "Adding Route..."
                                    : "Switch Route"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Existing Routes List */}
                    {existingRouteData.length > 0 && (
                        <View style={styles.existingRoutesContainer}>
                            <Text style={styles.sectionTitle}>
                                Current Routes
                            </Text>
                            {existingRouteData.map((routeData, index) => {
                                const routeInfo = routes.find(
                                    r => r.value === routeData.Route_Id,
                                );

                                return (
                                    <View
                                        key={routeData.Id}
                                        style={styles.existingRouteItem}>
                                        <View style={styles.routeInfo}>
                                            <Text style={styles.routeLabel}>
                                                {routeInfo?.label ||
                                                    `Route ${routeData.Route_Id}`}
                                            </Text>
                                            <View
                                                style={[
                                                    styles.routeIdContainer,
                                                    routeData.IsActive === 1
                                                        ? styles.activeRoute
                                                        : styles.inactiveRoute,
                                                ]}>
                                                <Text
                                                    style={[
                                                        styles.routeId,
                                                        routeData.IsActive === 1
                                                            ? styles.activeText
                                                            : styles.inactiveText,
                                                    ]}>
                                                    {routeData.IsActive === 1
                                                        ? "Active"
                                                        : "Inactive"}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.routeActions}>
                                            {routeData.IsActive === 0 && (
                                                <TouchableOpacity
                                                    style={
                                                        styles.activateButton
                                                    }
                                                    onPress={() =>
                                                        updateRoute(routeData)
                                                    }
                                                    disabled={isSubmitting}>
                                                    <Text
                                                        style={
                                                            styles.activateButtonText
                                                        }>
                                                        {isSubmitting
                                                            ? "..."
                                                            : "✓"}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}

                                            <TouchableOpacity
                                                style={styles.deleteButton}
                                                onPress={() =>
                                                    deleteRoute(routeData)
                                                }
                                                disabled={isSubmitting}>
                                                <Text
                                                    style={
                                                        styles.deleteButtonText
                                                    }>
                                                    ×
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
};

export default RoutePath;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    contentContainer: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.white,
    },
    filterSection: {
        padding: spacing.md,
        backgroundColor: customColors.white,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    existingRoutesContainer: {
        marginTop: spacing.lg,
    },
    sectionTitle: {
        ...typography.h3(),
        color: customColors.grey900,
        marginBottom: spacing.md,
        fontWeight: "600",
    },
    existingRouteItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        backgroundColor: customColors.grey50,
        borderRadius: 8,
        marginBottom: spacing.sm,
        ...shadows.small,
    },
    routeInfo: {
        flex: 1,
    },
    routeLabel: {
        ...typography.body1(),
        color: customColors.grey900,
        fontWeight: "500",
    },
    routeIdContainer: {
        width: 60,
        height: 24,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 4,
        marginTop: spacing.xs,
    },
    activeRoute: {
        backgroundColor: customColors.success + "20",
    },
    inactiveRoute: {
        backgroundColor: customColors.grey300 + "80",
    },
    routeId: {
        textAlign: "center",
        ...typography.body2(),
        fontSize: 11,
        fontWeight: "500",
    },
    activeText: {
        color: customColors.success,
    },
    inactiveText: {
        color: customColors.grey600,
    },
    routeActions: {
        flexDirection: "row",
        gap: spacing.sm,
        alignItems: "center",
    },
    activateButton: {
        backgroundColor: customColors.success,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 4,
        minWidth: 28,
        height: 28,
        justifyContent: "center",
        alignItems: "center",
    },
    activateButtonText: {
        color: customColors.white,
        fontSize: 14,
        fontWeight: "bold",
        textAlign: "center",
    },
    deleteButton: {
        width: 28,
        height: 28,
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.xs,
        backgroundColor: customColors.error,
        borderRadius: 4,
        justifyContent: "center",
        alignItems: "center",
    },
    deleteButtonText: {
        color: customColors.white,
        fontSize: 16,
        fontWeight: "bold",
        textAlign: "center",
    },
    newRouteSection: {
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    dropdownContainer: {
        marginBottom: spacing.md,
    },
    dropdownLabel: {
        ...typography.label(),
        marginBottom: spacing.xs,
        color: customColors.grey900,
    },
    selectedRouteText: {
        ...typography.body1(),
        color: customColors.primary,
        marginTop: spacing.sm,
        fontWeight: "600",
    },
    existingRouteText: {
        ...typography.caption(),
        color: customColors.grey600,
        marginTop: spacing.xs,
        fontStyle: "italic",
    },
    submitButton: {
        backgroundColor: customColors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 8,
        margin: spacing.lg,
        alignItems: "center",
        ...shadows.medium,
    },
    submitButtonDisabled: {
        backgroundColor: customColors.grey400,
        opacity: 0.6,
    },
    submitButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
    },
    dropdown: {
        height: 48,
        backgroundColor: customColors.white,
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 8,
        paddingHorizontal: spacing.sm,
        ...shadows.small,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.white,
        borderWidth: 1,
        borderColor: customColors.grey300,
        borderRadius: 8,
        paddingHorizontal: spacing.sm,
        ...shadows.small,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        height: 48,
        ...typography.body1(),
        color: customColors.grey900,
    },
    clearButton: {
        padding: spacing.xs,
    },
});
