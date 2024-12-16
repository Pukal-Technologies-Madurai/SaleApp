import { PermissionsAndroid, StyleSheet, Text, TouchableOpacity, View, Alert, Linking, Platform, ToastAndroid } from "react-native"
import React, { useCallback, useEffect, useState } from "react"
import Geolocation from "@react-native-community/geolocation";
import Icon from "react-native-vector-icons/Ionicons";
import RefreshIcon from "react-native-vector-icons/MaterialIcons";
import { customColors, typography } from "../Config/helper";

const LocationIndicator = ({ onLocationUpdate, autoFetch = true, autoFetchOnMount = true }) => {
    const [currentLocation, setCurrentLocation] = useState({
        latitude: null,
        longitude: null
    });

    const [locationStatus, setLocationStatus] = useState({
        permission: false,
        enabled: false,
        positioning: false,
        error: null
    });

    // Comprehensive location permission request with multiple strategies
    const requestLocationPermission = useCallback(async () => {
        try {
            if (Platform.OS === "android") {
                // First, check location services
                const serviceEnabled = await checkLocationServices();
                if (!serviceEnabled) {
                    return false;
                }

                // Request permission
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: "Location Access Required",
                        message: "This app needs precise location to log retailer visits accurately.",
                        buttonNeutral: "Ask Later",
                        buttonNegative: "Cancel",
                        buttonPositive: "Enable"
                    }
                );

                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    setLocationStatus(prev => ({
                        ...prev,
                        permission: true,
                        error: null
                    }));

                    // Auto fetch if enabled
                    if (autoFetchOnMount && autoFetch) {
                        fetchCurrentLocation();
                    }

                    return true;
                } else {
                    // Detailed location permission denied guidance
                    showLocationPermissionAlert();
                    return false;
                }
            }
            return false;
        } catch (err) {
            console.error("Location Permission Error:", err);
            ToastAndroid.show("Failed to get location permissions", ToastAndroid.LONG);
            return false;
        }
    }, [autoFetch, autoFetchOnMount]);

    // Check if location services are enabled
    const checkLocationServices = () => {
        return new Promise((resolve) => {
            Geolocation.getCurrentPosition(
                () => resolve(true),
                (error) => {
                    if (error.code === error.POSITION_UNAVAILABLE) {
                        Alert.alert(
                            "Location Services Disabled",
                            "Please enable location services in your device settings.",
                            [
                                {
                                    text: "Open Settings",
                                    onPress: () => {
                                        Platform.OS === "android"
                                            ? Linking.openSettings()
                                            : Linking.openURL("app-settings:")
                                    }
                                },
                                { text: "Cancel", style: "cancel" }
                            ]
                        );
                        resolve(false);
                    }
                },
                {
                    enableHighAccuracy: false,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        });
    };

    // Show detailed location permission alert
    const showLocationPermissionAlert = () => {
        Alert.alert(
            "Location Access Denied",
            "Retailer visit tracking requires location access. Please grant permissions in app settings.",
            [
                {
                    text: "Open Settings",
                    onPress: () => {
                        Platform.OS === 'android'
                            ? Linking.openSettings()
                            : Linking.openURL('app-settings:')
                    }
                },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    // Fetch current location with multiple strategies
    const fetchCurrentLocation = useCallback(() => {
        const locationOptions = [
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 }
        ];

        const attemptLocationFetch = async (optionIndex = 0) => {
            try {
                // Try geolocation first
                const position = await new Promise((resolve, reject) => {
                    Geolocation.getCurrentPosition(resolve, reject, locationOptions[optionIndex]);
                });

                // Successful location
                const { latitude, longitude } = position.coords;
                setCurrentLocation({ latitude, longitude });

                // Optional: Validate coordinates
                if (isValidCoordinate(latitude, longitude)) {
                    onLocationUpdate?.({ latitude, longitude });
                } else {
                    throw new Error('Invalid coordinates');
                }
            } catch (error) {
                // Try alternative methods
                if (optionIndex < locationOptions.length - 1) {
                    attemptLocationFetch(optionIndex + 1);
                    return;
                }

                // Additional fallback strategies
                await tryAlternativeLocationMethods();
            }
        };

        // Additional location retrieval methods
        const tryAlternativeLocationMethods = async () => {
            try {
                // Network-based location retrieval
                const networkLocation = await fetchNetworkLocation();

                // IP geolocation as last resort
                const ipLocation = await fetchIPGeolocation();

                // Choose the most accurate location
                const bestLocation = selectBestLocation(networkLocation, ipLocation);

                if (bestLocation) {
                    setCurrentLocation(bestLocation);
                    onLocationUpdate?.(bestLocation);
                }
            } catch (error) {
                // Handle complete location failure
                setLocationStatus(prev => ({
                    ...prev,
                    error: "Location unavailable"
                }));
            }
        };

        attemptLocationFetch();
    }, [onLocationUpdate]);

    // Utility to validate coordinates
    const isValidCoordinate = (lat, lon) => {
        return (
            typeof lat === 'number' &&
            typeof lon === 'number' &&
            !isNaN(lat) &&
            !isNaN(lon) &&
            lat >= -90 &&
            lat <= 90 &&
            lon >= -180 &&
            lon <= 180
        );
    };

    // Automatic location fetch on mount
    useEffect(() => {
        if (autoFetchOnMount) {
            requestLocationPermission();
        }
    }, [requestLocationPermission, autoFetchOnMount]);

    // Manual refresh handler
    const handleManualRefresh = () => {
        requestLocationPermission();
    };

    // Determine status color and icon
    const getStatusStyle = (status) => ({
        backgroundColor: status ? "#4CAF50" : "#FF5722",
        color: status ? customColors.white : customColors.white
    });

    // Request permission on component mount
    useEffect(() => {
        requestLocationPermission();
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.statusContainer}>
                <View style={[
                    styles.statusItem,
                    getStatusStyle(locationStatus.permission)
                ]}>
                    <Icon
                        name="shield-checkmark"
                        size={20}
                        color="white"
                    />
                    <Text style={styles.statusText}>Permission</Text>
                </View>

                <View style={[
                    styles.statusItem,
                    getStatusStyle(locationStatus.enabled)
                ]}>
                    <Icon
                        name="location"
                        size={20}
                        color="white"
                    />
                    <Text style={styles.statusText}>Location</Text>
                </View>

                <View style={[
                    styles.statusItem,
                    getStatusStyle(!!currentLocation.latitude)
                ]}>
                    <Icon
                        name="pin"
                        size={20}
                        color="white"
                    />
                    <Text style={styles.statusText}>Position</Text>
                </View>
            </View>

            {locationStatus.error && (
                <View style={styles.errorContainer}>
                    <Icon name="warning" size={20} color="#FF5722" />
                    <Text style={styles.errorText}>
                        {locationStatus.error}
                    </Text>
                </View>
            )}

            {currentLocation.latitude && (
                <View style={styles.locationDetails}>
                    <Text style={styles.locationText}>
                        Latitude: {currentLocation.latitude.toFixed(4)}
                    </Text>
                    <Text style={styles.locationText}>
                        Longitude: {currentLocation.longitude.toFixed(4)}
                    </Text>
                </View>
            )}

            <View style={styles.actionContainer}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleManualRefresh}
                >
                    <RefreshIcon name="refresh" size={20} color="#333" />
                    <Text style={styles.actionButtonText}>
                        {locationStatus.permission ? "Update Location" : "Enable Location"}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default LocationIndicator

const styles = StyleSheet.create({
    container: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: 10,
        shadowColor: customColors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statusContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    statusItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 6,
    },
    statusText: {
        ...typography.body1(),
        color: customColors.white,
        fontWeight: "600",
    },
    locationDetails: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
        backgroundColor: "#F0F0F0",
        padding: 7,
        borderRadius: 8,
    },
    locationText: {
        ...typography.body1(),
        fontWeight: "500",
        color: "#333",
    },
    actionContainer: {
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E0E0E0",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 25,
        gap: 6,
    },
    actionButtonText: {
        ...typography.body2(),
        fontWeight: "bold",
        color: '#333',
    },
    errorContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF3E0",
        padding: 10,
        borderRadius: 8,
        marginBottom: 16,
    },
    errorText: {
        color: "#FF5722",
        marginLeft: 10,
        flex: 1,
    },
})