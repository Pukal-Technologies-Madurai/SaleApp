import React, { useEffect, useState, useCallback, memo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import AppHeader from "../../Components/AppHeader";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import { fetchRetailers, fetchRoutePathData } from "../../Api/retailers";
import {
    customColors,
    typography,
    spacing,
    shadows,
} from "../../Config/helper";
import { SafeAreaView } from "react-native-safe-area-context";

const RetailerItem = memo(({ item, onPress }) => (
    <TouchableOpacity
        onPress={onPress}
        style={styles.retailerCard}
        activeOpacity={0.7}>
        <View style={styles.cardContent}>
            <View style={styles.retailerHeader}>
                <View style={styles.retailerInfo}>
                    <Text style={styles.retailerName} numberOfLines={1}>
                        {item.Retailer_Name || "No Name"}
                    </Text>
                    <Text style={styles.contactInfo}>
                        {item.Mobile_No || "No Contact"}
                    </Text>
                </View>
                <View style={styles.chevronContainer}>
                    <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={customColors.grey500}
                    />
                </View>
            </View>

            <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Route:</Text>
                        <Text style={styles.detailValue} numberOfLines={1}>
                            {item.RouteGet || "No Route"}
                        </Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Area:</Text>
                        <Text style={styles.detailValue} numberOfLines={1}>
                            {item.AreaGet || "No Area"}
                        </Text>
                    </View>
                </View>

                <View style={styles.addressContainer}>
                    <Text style={styles.addressText} numberOfLines={2}>
                        {item.Reatailer_Address || "No Address"},{" "}
                        {item.Reatailer_City || ""}
                        {item.PinCode ? ` - ${item.PinCode}` : ""}
                    </Text>
                </View>
            </View>
        </View>
    </TouchableOpacity>
));

const Customers = () => {
    const navigation = useNavigation();

    const [userId, setUserId] = useState(null);
    const [companyId, setCompanyId] = useState(null);
    const [filteredRetailers, setFilteredRetailers] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [areas, setAreas] = useState([]);

    const [selectedRoute, setSelectedRoute] = useState(null);
    const [selectedArea, setSelectedArea] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAllRetailers, setShowAllRetailers] = useState(false);

    const renderItem = useCallback(
        ({ item }) => (
            <RetailerItem
                item={item}
                onPress={() => navigation.push("CustomersDetails", { item })}
            />
        ),
        [navigation],
    );

    const keyExtractor = useCallback(item => item.Retailer_Id.toString(), []);

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
        enabled: !!companyId, // prevent fetch until companyId is ready
    });

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

    // Create filtered routes based on existingRouteData
    const getAvailableRoutes = () => {
        if (existingRouteData.length > 0 && !showAllRetailers) {
            // Show only routes from existingRouteData
            const existingRouteIds = existingRouteData.map(
                route => route.Route_Id,
            );
            const filteredRoutes = routes.filter(route =>
                existingRouteIds.includes(route.value),
            );

            // Sort routes based on IsActive status (active routes first)
            return filteredRoutes.sort((a, b) => {
                const routeDataA = existingRouteData.find(
                    r => r.Route_Id === a.value,
                );
                const routeDataB = existingRouteData.find(
                    r => r.Route_Id === b.value,
                );

                const isActiveA = routeDataA ? routeDataA.IsActive : 0;
                const isActiveB = routeDataB ? routeDataB.IsActive : 0;

                // Sort by IsActive (1 first, then 0)
                return isActiveB - isActiveA;
            });
        }
        // Show all routes when showAllRetailers is true or no existing data
        return routes;
    };

    // Auto-select route based on existingRouteData
    useEffect(() => {
        if (
            existingRouteData.length > 0 &&
            routes.length > 0 &&
            !showAllRetailers
        ) {
            // Find the active route first (IsActive === 1)
            const activeRoute = existingRouteData.find(
                route => route.IsActive === 1,
            );

            if (activeRoute && activeRoute.Route_Id) {
                setSelectedRoute(activeRoute.Route_Id);
            } else {
                // If no active route, select the first route in existingRouteData
                const firstRoute = existingRouteData[0];
                if (firstRoute && firstRoute.Route_Id) {
                    setSelectedRoute(firstRoute.Route_Id);
                }
            }
        } else if (existingRouteData.length === 0 || showAllRetailers) {
            // If no existing route data or showAllRetailers is true, reset selection
            setSelectedRoute(null);
            setSelectedArea(null);
            if (showAllRetailers) {
                setFilteredRetailers(retailers);
            }
        }
    }, [existingRouteData, routes, showAllRetailers]);

    // Update areas when route is selected
    useEffect(() => {
        if (selectedRoute && !showAllRetailers) {
            const routeRetailers = retailers.filter(
                item => item.Route_Id === selectedRoute,
            );
            const uniqueAreas = [...new Set(routeRetailers.map(r => r.Area_Id))]
                .map(areaId => ({
                    label:
                        routeRetailers.find(a => a.Area_Id === areaId)
                            ?.AreaGet || "",
                    value: areaId,
                }))
                .filter(a => a.label);

            setAreas(uniqueAreas);
            filterRetailers(selectedRoute, selectedArea, searchQuery);
        }
    }, [selectedRoute, showAllRetailers]);

    const filterRetailers = (routeId, areaId, search) => {
        if (showAllRetailers) {
            // When showing all retailers, only apply search filter
            let filtered = [...retailers];
            if (search) {
                filtered = filtered.filter(i =>
                    i.Retailer_Name.toLowerCase().includes(
                        search.toLowerCase(),
                    ),
                );
            }
            setFilteredRetailers(filtered);
            return;
        }

        // Normal filtering logic
        let filtered = [...retailers];

        if (routeId) filtered = filtered.filter(i => i.Route_Id === routeId);
        if (areaId) filtered = filtered.filter(i => i.Area_Id === areaId);
        if (search)
            filtered = filtered.filter(i =>
                i.Retailer_Name.toLowerCase().includes(search.toLowerCase()),
            );

        setFilteredRetailers(filtered);
    };

    const clearFilters = () => {
        setSelectedRoute(null);
        setSelectedArea(null);
        setSearchQuery("");
        setShowAllRetailers(false);

        // Reset to existingRouteData behavior
        if (existingRouteData.length > 0) {
            // Find the active route first (IsActive === 1)
            const activeRoute = existingRouteData.find(
                route => route.IsActive === 1,
            );

            if (activeRoute && activeRoute.Route_Id) {
                setSelectedRoute(activeRoute.Route_Id);
            } else {
                // If no active route, select the first route in existingRouteData
                const firstRoute = existingRouteData[0];
                if (firstRoute && firstRoute.Route_Id) {
                    setSelectedRoute(firstRoute.Route_Id);
                }
            }
        } else {
            setFilteredRetailers(retailers);
        }
    };

    const toggleShowAllRetailers = () => {
        const newShowAll = !showAllRetailers;
        setShowAllRetailers(newShowAll);

        if (newShowAll) {
            // Reset route and area selection when showing all
            setSelectedRoute(null);
            setSelectedArea(null);
            setAreas([]);
            // Apply only search filter
            filterRetailers(null, null, searchQuery);
        } else {
            // When turning off "show all", reset to existing route data behavior
            if (existingRouteData.length > 0) {
                // Find the active route first (IsActive === 1)
                const activeRoute = existingRouteData.find(
                    route => route.IsActive === 1,
                );

                if (activeRoute && activeRoute.Route_Id) {
                    setSelectedRoute(activeRoute.Route_Id);
                } else {
                    // If no active route, select the first route in existingRouteData
                    const firstRoute = existingRouteData[0];
                    if (firstRoute && firstRoute.Route_Id) {
                        setSelectedRoute(firstRoute.Route_Id);
                    }
                }
            }
        }
    };

    const getItemLayout = useCallback(
        (data, index) => ({
            length: 120,
            offset: 120 * index,
            index,
        }),
        [],
    );

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader
                title="Retailers"
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="MaterialIcon"
                rightIconName="alt-route"
                onRightPress={() => navigation.navigate("RoutePath")}
            />

            <View style={styles.contentContainer}>
                <View style={styles.filterSection}>
                    <View style={styles.dropdownColumn}>
                        <View style={styles.dropdownContainer}>
                            <EnhancedDropdown
                                data={getAvailableRoutes()}
                                labelField="label"
                                valueField="value"
                                placeholder="Select Route"
                                value={selectedRoute}
                                onChange={item => {
                                    setSelectedRoute(item.value);
                                    setSelectedArea(null);
                                }}
                                disabled={showAllRetailers}
                            />
                        </View>

                        <View style={styles.dropdownContainer}>
                            <EnhancedDropdown
                                data={areas}
                                labelField="label"
                                valueField="value"
                                placeholder="Select Area"
                                value={selectedArea}
                                onChange={item => {
                                    setSelectedArea(item.value);
                                    filterRetailers(
                                        selectedRoute,
                                        item.value,
                                        searchQuery,
                                    );
                                }}
                                disabled={showAllRetailers}
                            />
                        </View>
                    </View>

                    <View style={styles.searchRow}>
                        <View style={styles.searchContainer}>
                            <Icon
                                name="search"
                                size={20}
                                color={customColors.grey}
                                style={styles.searchIcon}
                            />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search retailers..."
                                placeholderTextColor={customColors.grey}
                                value={searchQuery}
                                onChangeText={text => {
                                    setSearchQuery(text);
                                    filterRetailers(
                                        selectedRoute,
                                        selectedArea,
                                        text,
                                    );
                                }}
                            />

                            {(searchQuery || selectedRoute || selectedArea) && (
                                <TouchableOpacity
                                    onPress={clearFilters}
                                    style={styles.clearButton}>
                                    <Icon
                                        name="close"
                                        size={20}
                                        color={customColors.grey}
                                    />
                                </TouchableOpacity>
                            )}
                            <Text
                                style={{
                                    marginLeft: spacing.sm,
                                    ...typography.caption(),
                                    color: customColors.grey700,
                                }}>
                                {filteredRetailers.length === 0
                                    ? "No Retailers Found"
                                    : `${filteredRetailers.length} Retailers`}
                            </Text>
                        </View>

                        {/* Toggle button to show all retailers - moved outside */}
                        <TouchableOpacity
                            onPress={toggleShowAllRetailers}
                            style={[
                                styles.toggleButton,
                                showAllRetailers && styles.toggleButtonActive,
                            ]}>
                            <Icon
                                name="visibility"
                                size={20}
                                color={
                                    showAllRetailers
                                        ? customColors.white
                                        : customColors.grey
                                }
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                <FlashList
                    data={filteredRetailers}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    getItemLayout={getItemLayout}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                    initialNumToRender={8}
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                />
            </View>
        </SafeAreaView>
    );
};

export default Customers;

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
    routeInfoContainer: {
        backgroundColor: customColors.primary + "10",
        padding: spacing.md,
        borderRadius: 8,
        marginBottom: spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: customColors.primary,
    },
    routeInfoTitle: {
        ...typography.subtitle2(),
        color: customColors.primary,
        fontWeight: "600",
        marginBottom: spacing.xs,
    },
    routesList: {
        gap: spacing.xs,
    },
    routeInfoItem: {
        flexDirection: "row",
        alignItems: "center",
    },
    routeInfoText: {
        ...typography.body2(),
        color: customColors.grey800,
    },
    dropdownColumn: {
        marginBottom: spacing.sm,
    },
    dropdownContainer: {
        marginBottom: spacing.sm,
    },
    dropdownLabel: {
        ...typography.label(),
        marginBottom: spacing.xs,
        color: customColors.grey900,
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
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    searchContainer: {
        flex: 1,
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
    toggleButton: {
        padding: spacing.sm,
        borderRadius: 8,
        backgroundColor: customColors.grey200,
        ...shadows.small,
    },
    toggleButtonActive: {
        backgroundColor: customColors.primary,
    },
    list: {
        flex: 1,
    },
    listContent: {
        padding: spacing.md,
    },
    retailerCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        marginBottom: spacing.md,
        ...shadows.small,
        borderLeftWidth: 4,
        borderLeftColor: customColors.primary,
    },
    cardContent: {
        padding: spacing.md,
    },
    retailerHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: spacing.sm,
    },
    retailerInfo: {
        flex: 1,
    },
    retailerName: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        marginBottom: spacing.xs,
        fontWeight: "600",
    },
    contactInfo: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "500",
    },
    chevronContainer: {
        marginLeft: spacing.sm,
        marginTop: spacing.xs,
    },
    detailsContainer: {
        gap: spacing.sm,
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: spacing.md,
    },
    detailItem: {
        flex: 1,
    },
    detailLabel: {
        ...typography.caption(),
        color: customColors.grey600,
        fontWeight: "500",
        marginBottom: spacing.xs / 2,
    },
    detailValue: {
        ...typography.body2(),
        color: customColors.grey800,
        fontWeight: "500",
    },
    addressContainer: {
        paddingTop: spacing.xs,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
    },
    addressText: {
        ...typography.body2(),
        color: customColors.grey600,
        lineHeight: 18,
    },
});
