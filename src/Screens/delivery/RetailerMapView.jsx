import {
    StyleSheet,
    Text,
    View,
    Alert,
    TouchableOpacity,
    Linking,
    ScrollView,
} from "react-native";
import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Mapbox from "@rnmapbox/maps";
import FeatherIcon from "react-native-vector-icons/Feather";
import Icon from "react-native-vector-icons/MaterialIcons";
import { API } from "../../Config/Endpoint";
import {
    customColors,
    typography,
    shadows,
    spacing,
    borderRadius,
    iconSizes,
} from "../../Config/helper";
import AppHeader from "../../Components/AppHeader";
import LocationIndicator from "../../Components/LocationIndicator";

Mapbox.setAccessToken('');

// Madurai fallback when device location is unavailable
const DEFAULT_CENTER = { latitude: 9.954993, longitude: 78.127357 };

// Haversine distance in kilometers
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const isDelivered = detail =>
    String(detail.Delivery_Status) === "7" || !!detail.Delivery_Time;

/**
 * Builds delivery stops for one trip by joining Trip_Details (status,
 * invoice value) with Product_Array (retailer name, coordinates, items)
 * on Do_Id, grouped by retailer so repeat orders become a single stop.
 */
const buildTripStops = trip => {
    const stopsMap = new Map();

    (trip?.Trip_Details || []).forEach(detail => {
        const productGroup = (trip.Product_Array || []).find(
            g => String(g.Do_Id) === String(detail.Do_Id),
        );
        const products = productGroup?.Products_List || [];

        // Product rows carry the real shop name; Ledger_Name can be null
        const name =
            detail.Ledger_Name ||
            products[0]?.Retailer_Name ||
            `Retailer ${detail.Retailer_Id}`;

        const withCoords = products.find(p => {
            const lat = parseFloat(p.Latitude);
            const lng = parseFloat(p.Longitude);
            return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        });

        const key = String(detail.Retailer_Id);
        if (!stopsMap.has(key)) {
            stopsMap.set(key, {
                retailerId: key,
                name: name.trim(),
                latitude: withCoords ? parseFloat(withCoords.Latitude) : null,
                longitude: withCoords ? parseFloat(withCoords.Longitude) : null,
                amount: 0,
                itemCount: 0,
                invoices: [],
                deliveryCount: 0,
                deliveredCount: 0,
            });
        }

        const stop = stopsMap.get(key);
        stop.amount += detail.Total_Invoice_Value || 0;
        stop.itemCount += products.length;
        stop.deliveryCount += 1;
        if (isDelivered(detail)) stop.deliveredCount += 1;
        const invoice = products[0]?.Do_Inv_No;
        if (invoice && !stop.invoices.includes(invoice)) {
            stop.invoices.push(invoice);
        }
        // A later delivery of the same retailer may carry the coordinates
        if (stop.latitude === null && withCoords) {
            stop.latitude = parseFloat(withCoords.Latitude);
            stop.longitude = parseFloat(withCoords.Longitude);
        }
    });

    return Array.from(stopsMap.values());
};

const RetailerMapView = () => {
    const navigation = useNavigation();

    const [trips, setTrips] = React.useState([]);
    const [selectedTripIndex, setSelectedTripIndex] = React.useState(0);
    const [selectedStop, setSelectedStop] = React.useState(null);

    const [location, setLocation] = React.useState({
        latitude: null,
        longitude: null,
    });

    const cameraRef = React.useRef(null);

    React.useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                const today = new Date().toISOString().split("T")[0];
                await fetchTripSheet(today, today, userId);
            } catch (err) {
                console.log(err);
            }
        })();
    }, []);

    const fetchTripSheet = async (from, to, uId) => {
        try {
            const url = `${API.deliveryTripSheet()}${from}&Todate=${to}&User_Id=${uId}`;
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (data.success) {
                setTrips(Array.isArray(data.data) ? data.data : []);
            } else {
                Alert.alert(
                    "Error",
                    data.message || "Failed to fetch trip data",
                );
            }
        } catch (err) {
            console.error("Error fetching trip sheet:", err);
            Alert.alert("Error", "Failed to fetch trip data");
        }
    };

    const handleLocationUpdate = React.useCallback(locationData => {
        setLocation(locationData);
    }, []);

    const currentLat = location?.latitude || DEFAULT_CENTER.latitude;
    const currentLng = location?.longitude || DEFAULT_CENTER.longitude;

    const currentTrip = trips[selectedTripIndex];

    // Stops of the selected trip, nearest first (numbered in that order)
    const tripStops = React.useMemo(() => {
        const stops = buildTripStops(currentTrip);
        return stops
            .map(stop => ({
                ...stop,
                distance:
                    stop.latitude !== null
                        ? calculateDistance(
                              currentLat,
                              currentLng,
                              stop.latitude,
                              stop.longitude,
                          )
                        : null,
            }))
            .sort((a, b) => {
                if (a.distance === null) return 1;
                if (b.distance === null) return -1;
                return a.distance - b.distance;
            });
    }, [currentTrip, currentLat, currentLng]);

    const mappableStops = React.useMemo(
        () => tripStops.filter(s => s.latitude !== null),
        [tripStops],
    );

    const tripSummary = React.useMemo(() => {
        const totalValue = tripStops.reduce((sum, s) => sum + s.amount, 0);
        const delivered = tripStops.filter(
            s => s.deliveryCount > 0 && s.deliveredCount === s.deliveryCount,
        ).length;
        return {
            stops: tripStops.length,
            delivered,
            pending: tripStops.length - delivered,
            totalValue,
            noLocation: tripStops.length - mappableStops.length,
        };
    }, [tripStops, mappableStops]);

    // GeoJSON markers for the selected trip, colored by delivery status
    const stopFeatures = React.useMemo(() => {
        return {
            type: "FeatureCollection",
            features: mappableStops.map((stop, index) => ({
                type: "Feature",
                id: stop.retailerId,
                geometry: {
                    type: "Point",
                    coordinates: [stop.longitude, stop.latitude],
                },
                properties: {
                    retailerId: stop.retailerId,
                    shopNumber: String(index + 1),
                    delivered:
                        stop.deliveryCount > 0 &&
                        stop.deliveredCount === stop.deliveryCount
                            ? 1
                            : 0,
                },
            })),
        };
    }, [mappableStops]);

    // Refit the camera whenever the selected trip's markers change
    React.useEffect(() => {
        setSelectedStop(null);
        if (!cameraRef.current || mappableStops.length === 0) return;

        const lats = mappableStops.map(s => s.latitude);
        const lngs = mappableStops.map(s => s.longitude);
        lats.push(currentLat);
        lngs.push(currentLng);

        cameraRef.current.fitBounds(
            [Math.max(...lngs), Math.max(...lats)],
            [Math.min(...lngs), Math.min(...lats)],
            [60, 60, 60, 60],
            1000,
        );
    }, [mappableStops]);

    const handleMarkerPress = React.useCallback(
        event => {
            const feature = event.features?.[0];
            if (!feature) return;
            const stop = mappableStops.find(
                s => s.retailerId === feature.properties?.retailerId,
            );
            if (!stop) return;

            const index = mappableStops.indexOf(stop);
            setSelectedStop({ ...stop, shopNumber: index + 1 });

            if (cameraRef.current) {
                cameraRef.current.setCamera({
                    centerCoordinate: [stop.longitude, stop.latitude],
                    zoomLevel: 15,
                    animationDuration: 600,
                });
            }
        },
        [mappableStops],
    );

    const handleGetDirections = React.useCallback(() => {
        if (selectedStop) {
            Linking.openURL(
                `https://www.google.com/maps/dir/${currentLat},${currentLng}/${selectedStop.latitude},${selectedStop.longitude}`,
            );
        }
    }, [selectedStop, currentLat, currentLng]);

    const handleRecenter = React.useCallback(() => {
        if (cameraRef.current) {
            cameraRef.current.setCamera({
                centerCoordinate: [currentLng, currentLat],
                zoomLevel: 13,
                animationDuration: 800,
            });
        }
    }, [currentLat, currentLng]);

    const selectedDelivered =
        selectedStop &&
        selectedStop.deliveryCount > 0 &&
        selectedStop.deliveredCount === selectedStop.deliveryCount;

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader title="Trip Map" navigation={navigation} />

            <View style={styles.contentContainer}>
                <LocationIndicator
                    onLocationUpdate={handleLocationUpdate}
                    autoFetch={true}
                    autoFetchOnMount={true}
                    showComponent={false}
                />

                {/* Trip selector */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tripBar}
                    contentContainerStyle={styles.tripBarContent}
                >
                    {trips.map((trip, index) => {
                        const active = index === selectedTripIndex;
                        const stopCount = buildTripStops(trip).length;
                        return (
                            <TouchableOpacity
                                key={trip.Trip_Id}
                                style={[
                                    styles.tripChip,
                                    active && styles.tripChipActive,
                                ]}
                                onPress={() => setSelectedTripIndex(index)}
                            >
                                <Icon
                                    name="local-shipping"
                                    size={iconSizes.sm}
                                    color={
                                        active
                                            ? customColors.white
                                            : customColors.primary
                                    }
                                />
                                <Text
                                    style={[
                                        styles.tripChipText,
                                        active && styles.tripChipTextActive,
                                    ]}
                                >
                                    Trip {trip.Trip_No}
                                </Text>
                                <View
                                    style={[
                                        styles.tripChipBadge,
                                        active && styles.tripChipBadgeActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.tripChipBadgeText,
                                            active &&
                                                styles.tripChipBadgeTextActive,
                                        ]}
                                    >
                                        {stopCount}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Selected trip summary */}
                {currentTrip && (
                    <View style={styles.statsBar}>
                        <View style={styles.statItem}>
                            <Icon
                                name="storefront"
                                size={iconSizes.sm}
                                color={customColors.primary}
                            />
                            <Text style={styles.statText}>
                                <Text style={styles.statNumber}>
                                    {tripSummary.stops}
                                </Text>{" "}
                                stops
                            </Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Icon
                                name="check-circle"
                                size={iconSizes.sm}
                                color={customColors.success}
                            />
                            <Text style={styles.statText}>
                                <Text style={styles.statNumber}>
                                    {tripSummary.delivered}
                                </Text>{" "}
                                done
                            </Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Icon
                                name="currency-rupee"
                                size={iconSizes.sm}
                                color={customColors.grey500}
                            />
                            <Text style={styles.statText}>
                                <Text style={styles.statNumber}>
                                    {Math.round(
                                        tripSummary.totalValue,
                                    ).toLocaleString("en-IN")}
                                </Text>
                            </Text>
                        </View>
                        {tripSummary.noLocation > 0 && (
                            <>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Icon
                                        name="location-off"
                                        size={iconSizes.sm}
                                        color={customColors.warning}
                                    />
                                    <Text style={styles.statTextWarning}>
                                        <Text style={styles.statNumber}>
                                            {tripSummary.noLocation}
                                        </Text>{" "}
                                        no location
                                    </Text>
                                </View>
                            </>
                        )}
                    </View>
                )}

                <View style={styles.mapWrapper}>
                    <Mapbox.MapView
                        style={styles.map}
                        styleURL={Mapbox.StyleURL.Street}
                        logoEnabled={false}
                        attributionEnabled={false}
                        compassEnabled={true}
                        scaleBarEnabled={false}
                    >
                        <Mapbox.Camera
                            ref={cameraRef}
                            centerCoordinate={[currentLng, currentLat]}
                            zoomLevel={12}
                            animationMode="flyTo"
                            animationDuration={1000}
                        />

                        {/* Device location marker */}
                        {location?.latitude && location?.longitude && (
                            <Mapbox.ShapeSource
                                id="deviceLocation"
                                shape={{
                                    type: "Feature",
                                    geometry: {
                                        type: "Point",
                                        coordinates: [
                                            location.longitude,
                                            location.latitude,
                                        ],
                                    },
                                }}
                            >
                                <Mapbox.CircleLayer
                                    id="deviceLocationPulse"
                                    style={{
                                        circleColor: customColors.primary,
                                        circleRadius: 18,
                                        circleOpacity: 0.15,
                                    }}
                                />
                                <Mapbox.CircleLayer
                                    id="deviceLocationDot"
                                    style={{
                                        circleColor: customColors.primary,
                                        circleRadius: 8,
                                        circleStrokeWidth: 3,
                                        circleStrokeColor: customColors.white,
                                        circleOpacity: 1,
                                    }}
                                />
                            </Mapbox.ShapeSource>
                        )}

                        {/* Numbered stop markers, green = delivered */}
                        <Mapbox.ShapeSource
                            id="stopMarkers"
                            shape={stopFeatures}
                            onPress={handleMarkerPress}
                        >
                            <Mapbox.CircleLayer
                                id="stopPoints"
                                style={{
                                    circleColor: [
                                        "case",
                                        ["==", ["get", "delivered"], 1],
                                        customColors.success,
                                        customColors.warning,
                                    ],
                                    circleRadius: 14,
                                    circleStrokeWidth: 3,
                                    circleStrokeColor: customColors.white,
                                    circleOpacity: 0.95,
                                }}
                            />
                            <Mapbox.SymbolLayer
                                id="stopNumbers"
                                style={{
                                    textField: ["get", "shopNumber"],
                                    textSize: 13,
                                    textColor: customColors.white,
                                    textFont: [
                                        "DIN Pro Medium",
                                        "Arial Unicode MS Bold",
                                    ],
                                    textAllowOverlap: true,
                                }}
                            />
                        </Mapbox.ShapeSource>

                        {/* Selected stop highlight */}
                        {selectedStop && (
                            <Mapbox.ShapeSource
                                id="selectedStop"
                                shape={{
                                    type: "Feature",
                                    geometry: {
                                        type: "Point",
                                        coordinates: [
                                            selectedStop.longitude,
                                            selectedStop.latitude,
                                        ],
                                    },
                                }}
                            >
                                <Mapbox.CircleLayer
                                    id="selectedStopHighlight"
                                    style={{
                                        circleColor: customColors.accent,
                                        circleRadius: 14,
                                        circleStrokeWidth: 3,
                                        circleStrokeColor: customColors.white,
                                        circleOpacity: 1,
                                    }}
                                />
                            </Mapbox.ShapeSource>
                        )}
                    </Mapbox.MapView>

                    <TouchableOpacity
                        style={styles.recenterButton}
                        onPress={handleRecenter}
                    >
                        <Icon
                            name="my-location"
                            size={iconSizes.md}
                            color={customColors.primary}
                        />
                    </TouchableOpacity>
                </View>

                {/* Selected stop card */}
                {selectedStop && (
                    <View style={styles.stopCard}>
                        <View style={styles.cardHeaderRow}>
                            <View
                                style={[
                                    styles.shopNumberBadge,
                                    selectedDelivered &&
                                        styles.shopNumberBadgeDone,
                                ]}
                            >
                                <Text style={styles.shopNumberText}>
                                    {selectedStop.shopNumber}
                                </Text>
                            </View>
                            <Text style={styles.cardTitle} numberOfLines={2}>
                                {selectedStop.name}
                            </Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setSelectedStop(null)}
                                hitSlop={{
                                    top: 10,
                                    bottom: 10,
                                    left: 10,
                                    right: 10,
                                }}
                            >
                                <FeatherIcon
                                    name="x"
                                    size={18}
                                    color={customColors.grey500}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.cardTagRow}>
                            <View
                                style={[
                                    styles.statusTag,
                                    selectedDelivered
                                        ? styles.statusTagDone
                                        : styles.statusTagPending,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.statusTagText,
                                        selectedDelivered
                                            ? styles.statusTagTextDone
                                            : styles.statusTagTextPending,
                                    ]}
                                >
                                    {selectedDelivered
                                        ? "Delivered"
                                        : "Pending"}
                                </Text>
                            </View>
                            {selectedStop.distance !== null && (
                                <View style={styles.statusTag}>
                                    <Text style={styles.statusTagText}>
                                        {selectedStop.distance.toFixed(1)} km
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.cardDetailRow}>
                            <FeatherIcon
                                name="package"
                                size={13}
                                color={customColors.grey500}
                            />
                            <Text style={styles.cardDetailText}>
                                {selectedStop.itemCount} items · ₹
                                {Math.round(
                                    selectedStop.amount,
                                ).toLocaleString("en-IN")}
                            </Text>
                        </View>

                        {selectedStop.invoices.length > 0 && (
                            <View style={styles.cardDetailRow}>
                                <FeatherIcon
                                    name="file-text"
                                    size={13}
                                    color={customColors.grey500}
                                />
                                <Text
                                    style={styles.cardDetailText}
                                    numberOfLines={1}
                                >
                                    {selectedStop.invoices.join(", ")}
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.directionsButton}
                            onPress={handleGetDirections}
                        >
                            <FeatherIcon
                                name="corner-up-right"
                                size={16}
                                color={customColors.white}
                            />
                            <Text style={styles.directionsButtonText}>
                                Get Directions
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

export default RetailerMapView;

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
    tripBar: {
        flexGrow: 0,
        backgroundColor: customColors.white,
    },
    tripBarContent: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
    },
    tripChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: customColors.grey300,
        backgroundColor: customColors.white,
    },
    tripChipActive: {
        backgroundColor: customColors.primary,
        borderColor: customColors.primary,
    },
    tripChipText: {
        ...typography.body2(),
        color: customColors.grey800,
        fontWeight: "600",
    },
    tripChipTextActive: {
        color: customColors.white,
    },
    tripChipBadge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        paddingHorizontal: 5,
        backgroundColor: customColors.grey100,
        justifyContent: "center",
        alignItems: "center",
    },
    tripChipBadgeActive: {
        backgroundColor: "rgba(255, 255, 255, 0.25)",
    },
    tripChipBadgeText: {
        ...typography.caption(),
        color: customColors.grey700,
        fontWeight: "700",
    },
    tripChipBadgeTextActive: {
        color: customColors.white,
    },
    statsBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: customColors.grey50,
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    statItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    statDivider: {
        width: 1,
        height: 16,
        backgroundColor: customColors.grey300,
        marginHorizontal: spacing.sm,
    },
    statText: {
        ...typography.caption(),
        color: customColors.grey600,
    },
    statTextWarning: {
        ...typography.caption(),
        color: customColors.warningDark,
    },
    statNumber: {
        fontWeight: "700",
        color: customColors.grey800,
    },
    mapWrapper: {
        flex: 1,
        position: "relative",
    },
    map: {
        flex: 1,
    },
    recenterButton: {
        position: "absolute",
        bottom: spacing.md,
        right: spacing.md,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: customColors.white,
        justifyContent: "center",
        alignItems: "center",
        ...shadows.medium,
    },
    stopCard: {
        margin: spacing.sm,
        padding: spacing.md,
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: customColors.grey200,
        ...shadows.small,
    },
    cardHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.xs,
        gap: spacing.sm,
    },
    shopNumberBadge: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: customColors.warning,
        justifyContent: "center",
        alignItems: "center",
    },
    shopNumberBadgeDone: {
        backgroundColor: customColors.success,
    },
    shopNumberText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "700",
    },
    cardTitle: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        fontWeight: "700",
        flex: 1,
    },
    closeButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: customColors.grey100,
        justifyContent: "center",
        alignItems: "center",
    },
    cardTagRow: {
        flexDirection: "row",
        gap: spacing.xs,
        marginBottom: spacing.xs,
    },
    statusTag: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.grey100,
    },
    statusTagDone: {
        backgroundColor: customColors.successFaded,
    },
    statusTagPending: {
        backgroundColor: customColors.warningFaded,
    },
    statusTagText: {
        ...typography.caption(),
        color: customColors.grey700,
        fontWeight: "600",
    },
    statusTagTextDone: {
        color: customColors.successDark,
    },
    statusTagTextPending: {
        color: customColors.warningDark,
    },
    cardDetailRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        marginTop: spacing.xxs,
    },
    cardDetailText: {
        ...typography.caption(),
        color: customColors.grey600,
        flex: 1,
    },
    directionsButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        marginTop: spacing.sm,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        backgroundColor: customColors.primary,
    },
    directionsButtonText: {
        ...typography.body2(),
        color: customColors.white,
        fontWeight: "600",
    },
});
