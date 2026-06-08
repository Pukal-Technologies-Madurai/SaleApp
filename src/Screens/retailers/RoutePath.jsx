import { StyleSheet, Text, View, Alert, TouchableOpacity } from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FeatherIcon from "react-native-vector-icons/Feather";
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
    borderRadius,
    iconSizes,
} from "../../Config/helper";
import { API } from "../../Config/Endpoint";
import { SafeAreaView } from "react-native-safe-area-context";

const RoutePath = () => {
    const navigation = useNavigation();
    const queryClient = useQueryClient();
    const [companyId, setCompanyId] = useState(null);
    const [userId, setUserId] = useState(null);
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
                    setSelectedRoute(Number(existingRoute.Route_Id));
                }
            }
        }
    }, [existingRouteData, routes]);

    const routeStatsById = useMemo(() => {
        const stats = {};

        retailers.forEach(retailer => {
            const routeId = retailer.Route_Id;
            if (!routeId && routeId !== 0) return;

            if (!stats[routeId]) {
                stats[routeId] = {
                    routeName: retailer.RouteGet || `Route ${routeId}`,
                    shopsCount: 0,
                };
            }

            stats[routeId].shopsCount += 1;

            if (!stats[routeId].routeName && retailer.RouteGet) {
                stats[routeId].routeName = retailer.RouteGet;
            }
        });

        return stats;
    }, [retailers]);

    const existingRouteCards = useMemo(() => {
        return [...existingRouteData]
            .sort((a, b) => b.IsActive - a.IsActive)
            .map(routeData => {
                const routeStat = routeStatsById[routeData.Route_Id];
                const fallbackRoute = routes.find(r => r.value === routeData.Route_Id);
                const routeName =
                    routeStat?.routeName ||
                    fallbackRoute?.label ||
                    `Route ${routeData.Route_Id}`;

                return {
                    ...routeData,
                    routeName,
                    shopsCount: routeStat?.shopsCount || 0,
                };
            });
    }, [existingRouteData, routeStatsById, routes]);

    const selectedRouteStat = useMemo(() => {
        if (!selectedRoute) return null;
        return routeStatsById[selectedRoute] || null;
    }, [selectedRoute, routeStatsById]);

    const normalizedSelectedRoute = useMemo(() => {
        if (selectedRoute === null || selectedRoute === undefined) return null;
        const value = Number(selectedRoute);
        return Number.isNaN(value) ? null : value;
    }, [selectedRoute]);

    const isValidSelectedRoute = useMemo(() => {
        if (normalizedSelectedRoute === null) return false;
        return routes.some(route => Number(route.value) === normalizedSelectedRoute);
    }, [normalizedSelectedRoute, routes]);

    const hasDuplicateRoute = useMemo(() => {
        if (normalizedSelectedRoute === null) return false;
        return existingRouteData.some(
            routeData => Number(routeData.Route_Id) === normalizedSelectedRoute,
        );
    }, [existingRouteData, normalizedSelectedRoute]);

    // POST operation - Add new route
    const switchRoute = async () => {
        if (!isValidSelectedRoute || normalizedSelectedRoute === null) {
            Alert.alert("Error", "Please select a route first");
            return;
        }

        if (hasDuplicateRoute) {
            Alert.alert(
                "Route Already Added",
                "This route is already added for today. You can activate it from Current Routes.",
            );
            return;
        }

        setIsSubmitting(true);
        try {
            const requestBody = {
                User_Id: parseInt(userId),
                Route_Id: normalizedSelectedRoute,
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
                navigation.reset({
                index: 0,
                routes: [{
                    name: "HomeScreen",
                    state: {
                        index: 0,
                        routes: [{ name: "HomeScreen"}] 
                    }
                }],
            });
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
                        <Text style={styles.newRouteTitle}>Add Route For Today</Text>
                        <Text style={styles.newRouteSubTitle}>
                            Choose a route and mark it for your current working session.
                        </Text>

                        <View style={styles.dropdownContainer}>
                            <Text style={styles.dropdownLabel}>Route</Text>
                            <EnhancedDropdown
                                data={routes}
                                labelField="label"
                                valueField="value"
                                placeholder="Select Route"
                                value={selectedRoute}
                                onChange={item => {
                                    setSelectedRoute(Number(item.value));
                                }}
                            />
                        </View>

                        {isValidSelectedRoute && selectedRoute && (
                            <View style={styles.selectedRouteInfoCard}>
                                <Text style={styles.selectedRouteTitle}>Selected Route</Text>
                                <Text style={styles.selectedRouteText}>
                                    {selectedRouteStat?.routeName ||
                                        routes.find(r => r.value === selectedRoute)
                                            ?.label}
                                </Text>
                                <Text style={styles.selectedRouteCountText}>
                                    {selectedRouteStat?.shopsCount || 0} shops in this route
                                </Text>
                            </View>
                        )}

                        {hasDuplicateRoute && (
                            <Text style={styles.duplicateWarningText}>
                                This route is already added for today. Use Current Routes to activate it.
                            </Text>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                (isSubmitting || !isValidSelectedRoute || hasDuplicateRoute) && styles.submitButtonDisabled,
                            ]}
                            onPress={switchRoute}
                            disabled={isSubmitting || !isValidSelectedRoute || hasDuplicateRoute}>
                            <Text style={styles.submitButtonText}>
                                {isSubmitting
                                    ? "Adding Route..."
                                    : "Switch Route"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Existing Routes List */}
                    {existingRouteCards.length > 0 && (
                        <View style={styles.existingRoutesContainer}>
                            <Text style={styles.sectionTitle}>
                                Current Routes
                            </Text>
                            {existingRouteCards.map(routeData => {
                                return (
                                    <View
                                        key={routeData.Id}
                                        style={[
                                            styles.existingRouteItem,
                                            routeData.IsActive === 1
                                                ? styles.existingRouteItemActive
                                                : styles.existingRouteItemInactive,
                                        ]}>
                                        <View style={styles.routeInfo}>
                                            <Text style={styles.routeLabel}>
                                                {routeData.routeName}
                                            </Text>
                                            <Text style={styles.routeCountLabel}>
                                                {routeData.shopsCount} shops
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
                                                    <FeatherIcon
                                                        name="check"
                                                        size={iconSizes.sm}
                                                        color={customColors.white}
                                                    />
                                                </TouchableOpacity>
                                            )}

                                            <TouchableOpacity
                                                style={styles.deleteButton}
                                                onPress={() =>
                                                    deleteRoute(routeData)
                                                }
                                                disabled={isSubmitting}>
                                                <FeatherIcon
                                                    name="trash-2"
                                                    size={iconSizes.sm}
                                                    color={customColors.white}
                                                />
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
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        overflow: "hidden",
    },
    filterSection: {
        padding: spacing.md,
        backgroundColor: customColors.white,
    },
    existingRoutesContainer: {
        marginTop: spacing.lg,
    },
    sectionTitle: {
        ...typography.subtitle1(),
        color: customColors.grey700,
        marginBottom: spacing.sm,
        fontWeight: "600",
    },
    existingRouteItemActive: {
        borderLeftWidth: 4,
        borderLeftColor: customColors.success,
    },
    existingRouteItemInactive: {
        borderLeftWidth: 4,
        borderLeftColor: customColors.grey300,
    },
    existingRouteItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: customColors.grey200,
        ...shadows.small,
    },
    routeInfo: {
        flex: 1,
    },
    routeLabel: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    routeCountLabel: {
        ...typography.caption(),
        color: customColors.grey600,
        marginTop: 2,
        fontWeight: "500",
    },
    routeIdContainer: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.round,
        marginTop: spacing.xs,
        alignSelf: "flex-start",
    },
    activeRoute: {
        backgroundColor: customColors.successFaded,
    },
    inactiveRoute: {
        backgroundColor: customColors.grey200,
    },
    routeId: {
        ...typography.caption(),
        fontWeight: "600",
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
        width: 32,
        height: 32,
        borderRadius: borderRadius.md,
        justifyContent: "center",
        alignItems: "center",
    },
    deleteButton: {
        width: 32,
        height: 32,
        backgroundColor: customColors.error,
        borderRadius: borderRadius.md,
        justifyContent: "center",
        alignItems: "center",
    },
    newRouteSection: {
        backgroundColor: customColors.grey50,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: customColors.grey200,
        ...shadows.small,
    },
    newRouteTitle: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    newRouteSubTitle: {
        ...typography.body2(),
        color: customColors.grey600,
        marginTop: spacing.xxs,
        marginBottom: spacing.md,
    },
    dropdownContainer: {
        marginBottom: spacing.sm,
    },
    dropdownLabel: {
        ...typography.body2(),
        marginBottom: spacing.xs,
        color: customColors.grey700,
        fontWeight: "500",
    },
    selectedRouteText: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        marginTop: 2,
        fontWeight: "600",
    },
    selectedRouteTitle: {
        ...typography.caption(),
        color: customColors.grey600,
        fontWeight: "600",
    },
    selectedRouteCountText: {
        ...typography.caption(),
        color: customColors.primary,
        marginTop: 2,
        fontWeight: "600",
    },
    selectedRouteInfoCard: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: customColors.grey200,
        padding: spacing.sm,
        marginTop: spacing.xs,
    },
    duplicateWarningText: {
        ...typography.caption(),
        color: customColors.error,
        marginTop: spacing.sm,
        fontWeight: "600",
    },
    submitButton: {
        backgroundColor: customColors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        marginTop: spacing.md,
        alignItems: "center",
        ...shadows.small,
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
        borderColor: customColors.grey200,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.sm,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.white,
        borderWidth: 1,
        borderColor: customColors.grey200,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.sm,
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
