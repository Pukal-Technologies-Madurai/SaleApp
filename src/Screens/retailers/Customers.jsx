import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ActivityIndicator,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import AppHeader from "../../Components/AppHeader";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import { fetchRetailers, fetchRoutePathData, visitEntryLog } from "../../Api/retailers";
import {
    customColors,
    typography,
    spacing,
    shadows,
    borderRadius,
    iconSizes,
} from "../../Config/helper";
import { SafeAreaView } from "react-native-safe-area-context";

const RetailerItem = memo(({ item, onPress, isVisited }) => {

    return (
        <TouchableOpacity
            onPress={onPress}
            style={isVisited
                ? [styles.retailerCard, styles.visitedRetailerCard]
                : styles.retailerCard
            }
            activeOpacity={0.7}>
            {isVisited && <View style={styles.visitedOverlay} pointerEvents="none" />}
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
                            size={iconSizes.sm}
                            color={customColors.grey500}
                        />
                    </View>
                </View>

                <View style={styles.detailsContainer}>
                    <View style={styles.detailRow}>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Route:</Text>
                            <Text style={[styles.detailValue, {color: item.Order_By ? customColors.success : customColors.grey500}]} numberOfLines={1}>
                                {item.RouteGet || "No Route"} - {item.Order_By ? `${item.Order_By}` : "Nil"}
                            </Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Area:</Text>
                            <Text style={[styles.detailValue, {color: item.AreaGet ? customColors.success : customColors.grey500}]} numberOfLines={1}>
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
    );
});

const Customers = () => {
    const navigation = useNavigation();

    const [userId, setUserId] = useState(null);
    const [companyId, setCompanyId] = useState(null);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    const [selectedRoute, setSelectedRoute] = useState(null);
    const [selectedArea, setSelectedArea] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [showAllRetailers, setShowAllRetailers] = useState(false);

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

    const { data: retailers = [], isLoading: isLoadingRetailers } = useQuery({
        queryKey: ["retailers", companyId],
        queryFn: () => fetchRetailers(companyId),
        enabled: !!companyId, // prevent fetch until companyId is ready
        select: (rows) => rows.filter(isDelFlag => isDelFlag.Del_Flag === 0),
    });

    const currentDate = useMemo(() => new Date().toISOString().split("T")[0], []);

    const { data: userVisitLog = [], isLoading: isLoadingUserVisitLog } = useQuery({
        queryKey: ["userVisitLog", currentDate, userId],
        queryFn: () => visitEntryLog({ toDate: currentDate, uId: userId }),
        enabled: !!userId,
        select: (rows) => {
            return rows
                .filter(r => r.IsExistingRetailer === 1 && r.Retailer_Id)
                .map(r => String(r.Retailer_Id));
        }
    });

    const visitedRetailerIds = useMemo(() => new Set(userVisitLog), [userVisitLog]);

    const { data: existingRouteData = [] } = useQuery({
        queryKey: ["routePath", currentDate, userId],
        queryFn: () => fetchRoutePathData(currentDate, userId),
        enabled: !!userId,
    });

    const routeOptions = useMemo(() => {
        const routeMap = new Map();
        retailers.forEach(retailer => {
            if (!routeMap.has(retailer.Route_Id)) {
                routeMap.set(retailer.Route_Id, retailer.RouteGet || "");
            }
        });

        return [...routeMap.entries()]
            .map(([value, label]) => ({ value, label }))
            .filter(route => route.label);
    }, [retailers]);

    const activeRouteId = useMemo(() => {
        const activeRoute = existingRouteData.find(route => route.IsActive === 1);
        if (activeRoute?.Route_Id) return activeRoute.Route_Id;
        return existingRouteData[0]?.Route_Id || null;
    }, [existingRouteData]);

    // Create filtered routes based on existingRouteData
    const getAvailableRoutes = useCallback(() => {
        if (existingRouteData.length > 0 && !showAllRetailers) {
            const routeRankMap = new Map();
            existingRouteData.forEach(route => {
                routeRankMap.set(route.Route_Id, route.IsActive || 0);
            });

            const filteredRoutes = routeOptions.filter(route =>
                routeRankMap.has(route.value),
            );

            // Sort routes based on IsActive status (active routes first)
            return filteredRoutes.sort((a, b) => {
                return (routeRankMap.get(b.value) || 0) - (routeRankMap.get(a.value) || 0);
            });
        }
        return routeOptions;
    }, [existingRouteData, routeOptions, showAllRetailers]);

    // Auto-select route based on existingRouteData
    useEffect(() => {
        if (showAllRetailers) return;
        if (!selectedRoute && activeRouteId) {
            setSelectedRoute(activeRouteId);
        }
    }, [activeRouteId, selectedRoute, showAllRetailers]);

    // Update areas when route is selected
    const areas = useMemo(() => {
        if (!selectedRoute || showAllRetailers) return [];

        const areaMap = new Map();
        retailers.forEach(retailer => {
            if (retailer.Route_Id === selectedRoute && !areaMap.has(retailer.Area_Id)) {
                areaMap.set(retailer.Area_Id, retailer.AreaGet || "");
            }
        });

        return [...areaMap.entries()]
            .map(([value, label]) => ({ value, label }))
            .filter(area => area.label);
    }, [retailers, selectedRoute, showAllRetailers]);

    useEffect(() => {
        if (!selectedArea) return;
        const hasSelectedArea = areas.some(area => area.value === selectedArea);
        if (!hasSelectedArea) {
            setSelectedArea(null);
        }
    }, [areas, selectedArea]);

    const removeSplChar = useCallback(
        str => String(str).replace(/[^\w]/g, "").toLowerCase(),
        [],
    );

    const reactSelectFilterLogic = useCallback((option, inputValue) => {
        const normalizedLabel = removeSplChar(option.label);
        const normalizedMobile = removeSplChar(option.mobile || "");
        const normalizedInput = removeSplChar(inputValue);

        return normalizedLabel.includes(normalizedInput) || normalizedMobile.includes(normalizedInput);
    }, [removeSplChar]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 250);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSearchInputChange = (text) => {
        setSearchQuery(text);
    };

    const filteredRetailers = useMemo(() => {
        let filtered = retailers;

        if (!showAllRetailers) {
            if (selectedRoute) {
                filtered = filtered.filter(retailer => retailer.Route_Id === selectedRoute);
            }
            if (selectedArea) {
                filtered = filtered.filter(retailer => retailer.Area_Id === selectedArea);
            }
        }

        if (debouncedSearch) {
            filtered = filtered.filter(retailer => {
                const option = {
                    label: retailer.Retailer_Name,
                    mobile: retailer.Mobile_No,
                };
                return reactSelectFilterLogic(option, debouncedSearch);
            });
        }

        // If route-path is set for the day, show retailers by Order_By sequence.
        if (existingRouteData.length > 0) {
            filtered = [...filtered].sort((a, b) => {
                const orderA = Number.parseInt(a?.Order_By, 10);
                const orderB = Number.parseInt(b?.Order_By, 10);

                const normalizedA = Number.isFinite(orderA)
                    ? orderA
                    : Number.MAX_SAFE_INTEGER;
                const normalizedB = Number.isFinite(orderB)
                    ? orderB
                    : Number.MAX_SAFE_INTEGER;

                if (normalizedA !== normalizedB) {
                    return normalizedA - normalizedB;
                }

                return String(a?.Retailer_Name || "").localeCompare(
                    String(b?.Retailer_Name || ""),
                );
            });
        }

        return filtered;
    }, [
        retailers,
        existingRouteData,
        showAllRetailers,
        selectedRoute,
        selectedArea,
        debouncedSearch,
        reactSelectFilterLogic,
    ]);

    const renderItem = useCallback(
        ({ item }) => (
            <RetailerItem
                item={item}
                onPress={() => navigation.push("CustomersDetails", { item })}
                isVisited={visitedRetailerIds.has(String(item.Retailer_Id))}
            />
        ),
        [navigation, visitedRetailerIds],
    );

    const keyExtractor = useCallback(
        item => String(item.Retailer_Id),
        [],
    );

    const getItemLayout = useCallback(
        (data, index) => ({
            length: 120,
            offset: 120 * index,
            index,
        }),
        [],
    );

    const clearFilters = () => {
        setSearchQuery("");
        setShowAllRetailers(false);
        setSelectedArea(null);
        setSelectedRoute(activeRouteId || null);
    };

    const toggleShowAllRetailers = () => {
        setShowAllRetailers(prev => {
            const next = !prev;
            if (next) {
                setSelectedRoute(null);
                setSelectedArea(null);
            } else {
                setSelectedRoute(activeRouteId || null);
                setSelectedArea(null);
            }
            return next;
        });
    };

    const totalRetailersLabel = filteredRetailers.length === 0
        ? "No Retailers Found"
        : `${filteredRetailers.length} Retailers`;

    const shouldShowClearButton = Boolean(searchQuery || selectedRoute || selectedArea);

    const shouldShowShowAllButton =
        existingRouteData && existingRouteData.length > 0 && showFilterDropdown;

    const handleToggleFilterDropdown = () => {
        setShowFilterDropdown(prev => !prev);
    };

    const handleRouteChange = item => {
        setSelectedRoute(item.value);
        setSelectedArea(null);
    };

    const handleAreaChange = item => {
        setSelectedArea(item.value);
    };

    if (isLoadingRetailers || isLoadingUserVisitLog) {
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
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={customColors.primary} />
                    <Text style={styles.loadingText}>
                        {isLoadingRetailers && isLoadingUserVisitLog
                            ? "Loading retailers and visit data..."
                            : isLoadingRetailers
                                ? "Loading retailers..."
                                : "Loading visit data..."}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

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
                    {showFilterDropdown && (
                        <View style={styles.dropdownColumn}>
                            <View style={styles.dropdownContainer}>
                                <EnhancedDropdown
                                    data={getAvailableRoutes()}
                                    labelField="label"
                                    valueField="value"
                                    placeholder="Select Route"
                                    value={selectedRoute}
                                    onChange={handleRouteChange}
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
                                    onChange={handleAreaChange}
                                    disabled={showAllRetailers}
                                />
                            </View>
                        </View>
                    )}

                    <View style={styles.searchRow}>
                        <View style={styles.searchContainer}>
                            <Icon
                                name="search"
                                size={iconSizes.md}
                                color={customColors.grey}
                                style={styles.searchIcon}
                            />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by name or mobile..."
                                placeholderTextColor={customColors.grey}
                                value={searchQuery}
                                onChangeText={handleSearchInputChange}
                                autoCapitalize="none"
                                autoFocus={false}
                                selectTextOnFocus={false}
                                keyboardType="default"
                            />

                            {shouldShowClearButton && (
                                <TouchableOpacity
                                    onPress={clearFilters}
                                    style={styles.clearButton}>
                                    <Icon
                                        name="close"
                                        size={iconSizes.md}
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
                                {totalRetailersLabel}
                            </Text>
                        </View>

                        {shouldShowShowAllButton ? (
                            <TouchableOpacity
                                onPress={toggleShowAllRetailers}
                                style={[
                                    styles.toggleButton,
                                    showAllRetailers && styles.toggleButtonActive,
                                ]}>
                                <Icon
                                    name="visibility"
                                    size={iconSizes.md}
                                    color={
                                        showAllRetailers
                                            ? customColors.white
                                            : customColors.grey100
                                    }
                                />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={handleToggleFilterDropdown}
                                style={styles.toggleButton}>
                                <Icon
                                    name="filter-list"
                                    size={iconSizes.md}
                                    color={customColors.grey600}
                                />
                            </TouchableOpacity>
                        )}
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
                    extraData={userVisitLog}
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
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: customColors.white,
    },
    loadingText: {
        ...typography.body1(),
        color: customColors.grey700,
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
        borderRadius: borderRadius.md,
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
        borderRadius: borderRadius.md,
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
        borderRadius: borderRadius.md,
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
        borderRadius: borderRadius.md,
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
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        borderRadius: borderRadius.lg,
        ...shadows.xs,
        marginVertical: spacing.xs,
        borderLeftWidth: 5,
        borderLeftColor: customColors.info,
        overflow: "hidden",
    },
    visitedRetailerCard: {
        borderLeftColor: customColors.success,
        backgroundColor: "rgba(46, 204, 113, 0.1)",
    },
    visitedOverlay: {
        ...StyleSheet.absoluteFillObject,
        // backgroundColor: "rgba(255, 255, 255, 0.55)",
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
        fontWeight: "600",
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
