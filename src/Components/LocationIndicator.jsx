import {
    PermissionsAndroid,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert,
    Linking,
    Platform,
    Animated,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import Geolocation from "@react-native-community/geolocation";
import FeatherIcon from "react-native-vector-icons/Feather";
import {
    customColors,
    typography,
    spacing,
    shadows,
    borderRadius,
    iconSizes,
} from "../Config/helper";

const LocationIndicator = ({
    onLocationUpdate,
    autoFetch = true,
    showComponent = true,
}) => {
    const [location, setLocation] = useState({
        latitude: null,
        longitude: null,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const spinValue = useRef(new Animated.Value(0)).current;

    // Spinning animation for refresh icon
    useEffect(() => {
        if (isLoading) {
            Animated.loop(
                Animated.timing(spinValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ).start();
        } else {
            spinValue.setValue(0);
        }
    }, [isLoading]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
    });

    const requestLocationPermission = async () => {
        try {
            if (Platform.OS === "android") {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: "Location Access Required",
                        message:
                            "This app needs location access to function properly.",
                        buttonPositive: "OK",
                    },
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            }
            return true;
        } catch (err) {
            console.error("Location Permission Error:", err);
            return false;
        }
    };

    const getLocation = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const hasPermission = await requestLocationPermission();
            if (!hasPermission) {
                setError("Location permission denied");
                Alert.alert(
                    "Location Access Denied",
                    "Please enable location access in settings.",
                    [
                        {
                            text: "Open Settings",
                            onPress: () => Linking.openSettings(),
                        },
                        { text: "Cancel", style: "cancel" },
                    ],
                );
                return;
            }

            // Configure geolocation with optimized settings
            Geolocation.setRNConfiguration({
                skipPermissionRequests: false,
                authorizationLevel: "whenInUse",
                locationProvider: "auto",
            });

            // First try with high accuracy
            try {
                const position = await getPositionWithOptions({
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0,
                    distanceFilter: 10,
                });
                handleSuccessfulLocation(position);
            } catch (highAccuracyError) {
                // If high accuracy fails, try with lower accuracy
                try {
                    const position = await getPositionWithOptions({
                        enableHighAccuracy: false,
                        timeout: 10000,
                        maximumAge: 30000,
                        distanceFilter: 50,
                    });
                    handleSuccessfulLocation(position);
                } catch (lowAccuracyError) {
                    throw lowAccuracyError;
                }
            }
        } catch (error) {
            console.error("Location Error:", error);
            setError(getErrorMessage(error.code));
        } finally {
            setIsLoading(false);
        }
    };

    const getPositionWithOptions = options => {
        return new Promise((resolve, reject) => {
            Geolocation.getCurrentPosition(
                position => resolve(position),
                error => reject(error),
                options,
            );
        });
    };

    const handleSuccessfulLocation = position => {
        const { latitude, longitude } = position.coords;
        if (isValidCoordinates(latitude, longitude)) {
            setLocation({ latitude, longitude });
            onLocationUpdate?.({ latitude, longitude });
            setError(null);
        } else {
            throw new Error("Invalid coordinates received");
        }
    };

    const isValidCoordinates = (lat, lon) => {
        return (
            typeof lat === "number" &&
            typeof lon === "number" &&
            !isNaN(lat) &&
            !isNaN(lon) &&
            lat >= -90 &&
            lat <= 90 &&
            lon >= -180 &&
            lon <= 180
        );
    };

    const getErrorMessage = code => {
        switch (code) {
            case 1:
                return "Location permission denied";
            case 2:
                return "Location unavailable";
            case 3:
                return "Location request timed out. Please try again.";
            case 4:
                return "Location service not available";
            default:
                return "Failed to get location";
        }
    };

    useEffect(() => {
        if (autoFetch) {
            getLocation();
        }
    }, [autoFetch]);

    if (!showComponent) {
        return null;
    }

    const hasLocation = location.latitude && location.longitude;
    const statusColor = error
        ? customColors.accent2
        : hasLocation
        ? customColors.success
        : customColors.primary;

    return (
        <View style={[styles.container, error && styles.containerError]}>
            <View style={styles.iconContainer}>
                <View
                    style={[
                        styles.iconBackground,
                        { backgroundColor: statusColor + "15" },
                    ]}>
                    <FeatherIcon
                        name={error ? "alert-circle" : "map-pin"}
                        size={iconSizes.md}
                        color={statusColor}
                    />
                </View>
            </View>

            <View style={styles.locationInfo}>
                {hasLocation ? (
                    <>
                        <Text style={styles.locationLabel}>Current Location</Text>
                        <View style={styles.coordinatesRow}>
                            <View style={styles.coordinateItem}>
                                <Text style={styles.coordinateLabel}>Lat</Text>
                                <Text style={styles.coordinateValue}>
                                    {location.latitude.toFixed(6)}
                                </Text>
                            </View>
                            <View style={styles.coordinateDivider} />
                            <View style={styles.coordinateItem}>
                                <Text style={styles.coordinateLabel}>Long</Text>
                                <Text style={styles.coordinateValue}>
                                    {location.longitude.toFixed(6)}
                                </Text>
                            </View>
                        </View>
                    </>
                ) : (
                    <>
                        <Text style={styles.locationLabel}>
                            {error ? "Location Error" : "Fetching Location"}
                        </Text>
                        <Text
                            style={[
                                styles.statusText,
                                error && styles.errorText,
                            ]}
                            numberOfLines={1}>
                            {error || "Please wait..."}
                        </Text>
                    </>
                )}
            </View>

            <TouchableOpacity
                style={[
                    styles.refreshButton,
                    { backgroundColor: statusColor + "15" },
                ]}
                onPress={getLocation}
                disabled={isLoading}
                activeOpacity={0.7}>
                <Animated.View
                    style={{
                        transform: [{ rotate: isLoading ? spin : "0deg" }],
                    }}>
                    <FeatherIcon
                        name="refresh-cw"
                        size={iconSizes.md}
                        color={statusColor}
                    />
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
};

export default LocationIndicator;

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.white,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: customColors.grey200,
        ...shadows.small,
    },
    containerError: {
        borderColor: customColors.accent2 + "30",
        backgroundColor: customColors.accent2 + "05",
    },
    iconContainer: {
        marginRight: spacing.md,
    },
    iconBackground: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.lg,
        justifyContent: "center",
        alignItems: "center",
    },
    locationInfo: {
        flex: 1,
    },
    locationLabel: {
        ...typography.caption(),
        color: customColors.grey500,
        fontWeight: "500",
        marginBottom: spacing.xxs,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    coordinatesRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    coordinateItem: {
        flexDirection: "row",
        alignItems: "baseline",
        gap: spacing.xs,
    },
    coordinateLabel: {
        ...typography.caption(),
        color: customColors.grey500,
        fontWeight: "500",
    },
    coordinateValue: {
        ...typography.body2(),
        color: customColors.grey900,
        fontWeight: "600",
        fontVariant: ["tabular-nums"],
    },
    coordinateDivider: {
        width: 1,
        height: 12,
        backgroundColor: customColors.grey300,
        marginHorizontal: spacing.sm,
    },
    statusText: {
        ...typography.body2(),
        color: customColors.grey600,
    },
    errorText: {
        color: customColors.accent2,
    },
    refreshButton: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.lg,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: spacing.sm,
    },
});
