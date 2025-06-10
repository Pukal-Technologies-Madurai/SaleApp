import React, { useEffect, useState, useCallback, memo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import Ionicons from "react-native-vector-icons/Ionicons";

import AppHeader from "../../Components/AppHeader";
import { fetchRetailers } from "../../Api/retailers";
import EnhancedDropdown from "../../Components/EnhancedDropdown";
import {
    customColors,
    typography,
    spacing,
    shadows,
} from "../../Config/helper";

const RetailerItem = memo(({ item, onPress }) => (
    <TouchableOpacity
        onPress={onPress}
        style={styles.retailerCard}
        activeOpacity={0.7}>
        <View style={styles.cardContent}>
            <View style={styles.retailerHeader}>
                <View style={styles.storeIconContainer}>
                    <Icon name="store" size={24} color={customColors.primary} />
                </View>
                <View style={styles.retailerInfo}>
                    <Text style={styles.retailerName} numberOfLines={1}>
                        {item.Retailer_Name || "No Name"}
                    </Text>
                    <View style={styles.retailerPhone}>
                        <Text style={styles.phoneText}>
                            {item.Mobile_No || "No Contact"}
                        </Text>
                    </View>
                </View>
                <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={customColors.grey}
                />
            </View>

            <View style={styles.detailsContainer}>
                <View style={styles.detailItem}>
                    <View style={styles.detailIconContainer}>
                        <Icon
                            name="route"
                            size={16}
                            color={customColors.primary}
                        />
                    </View>
                    <Text style={styles.retailerDetails} numberOfLines={1}>
                        {item.RouteGet || "No Route"}
                    </Text>
                </View>

                <View style={styles.detailItem}>
                    <View style={styles.detailIconContainer}>
                        <Icon
                            name="location-on"
                            size={16}
                            color={customColors.primary}
                        />
                    </View>
                    <Text style={styles.retailerDetails} numberOfLines={1}>
                        {item.AreaGet || "No Area"}
                    </Text>
                </View>
            </View>
        </View>
    </TouchableOpacity>
));

const Customers = () => {
    const navigation = useNavigation();

    const [companyId, setCompanyId] = useState(null);
    const [filteredRetailers, setFilteredRetailers] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [areas, setAreas] = useState([]);

    const [selectedRoute, setSelectedRoute] = useState(null);
    const [selectedArea, setSelectedArea] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

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
    }, []);

    const { data: retailers = [] } = useQuery({
        queryKey: ["retailers", companyId],
        queryFn: () => fetchRetailers(companyId),
        enabled: !!companyId, // prevent fetch until companyId is ready
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

    // Update areas when route is selected
    useEffect(() => {
        if (selectedRoute) {
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
    }, [selectedRoute]);

    const filterRetailers = (routeId, areaId, search) => {
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
        setFilteredRetailers(retailers);
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
        <View style={styles.container}>
            <AppHeader
                title="Retailers"
                navigation={navigation}
                showRightIcon={true}
                rightIconLibrary="MaterialCommunityIcons"
                rightIconName="map-marker-right-outline"
                onRightPress={() => navigation.navigate("RetailerMapView")}
            />

            <View style={styles.contentContainer}>
                <View style={styles.filterSection}>
                    <View style={styles.dropdownRow}>
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
                                    setSelectedArea(null);
                                }}
                            />
                        </View>

                        <View style={styles.dropdownContainer}>
                            <Text style={styles.dropdownLabel}>Area</Text>
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
                            />
                        </View>
                    </View>

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
                </View>

                <FlatList
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
        </View>
    );
};

export default Customers;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primary,
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
    dropdownRow: {
        flexDirection: "row",
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    dropdownContainer: {
        flex: 1,
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
    list: {
        flex: 1,
    },
    listContent: {
        padding: spacing.md,
    },
    retailerCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        marginBottom: spacing.sm,
        ...shadows.small,
    },
    cardContent: {
        padding: spacing.md,
    },
    retailerHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    storeIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: customColors.primary + "10",
        justifyContent: "center",
        alignItems: "center",
        marginRight: spacing.sm,
    },
    retailerInfo: {
        flex: 1,
        marginRight: spacing.sm,
    },
    retailerName: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        marginBottom: spacing.xs,
    },
    retailerPhone: {
        backgroundColor: customColors.primary + "10",
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs / 2,
        borderRadius: 4,
        alignSelf: "flex-start",
    },
    phoneText: {
        ...typography.caption(),
        color: customColors.primary,
        fontWeight: "500",
    },
    detailsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginLeft: spacing.xs,
        gap: spacing.sm,
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        minWidth: "45%",
        // backgroundColor: customColors.grey50,
        padding: spacing.xs,
        // borderRadius: 6,
    },
    detailIconContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: customColors.white,
        justifyContent: "center",
        alignItems: "center",
        marginRight: spacing.xs,
        ...shadows.small,
    },
    retailerDetails: {
        ...typography.body2(),
        color: customColors.grey700,
        flex: 1,
    },
});
