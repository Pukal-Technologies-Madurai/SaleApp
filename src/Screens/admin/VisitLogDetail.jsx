import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking, Modal, Dimensions } from "react-native";
import React, { useMemo, useState, useRef, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FeatherIcon from "react-native-vector-icons/Feather";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import AppHeader from "../../Components/AppHeader";
import Mapbox from "@rnmapbox/maps";
import { fetchRetailers } from "../../Api/retailers";
import { customColors, shadows, typography, spacing, borderRadius, iconSizes } from "../../Config/helper";

Mapbox.setAccessToken('');

const RADIUS_CONFIG = [
    { km: 2, color: '#2196F3' },
    { km: 5, color: '#4CAF50' },
    { km: 10, color: '#FF9800' },
    { km: 15, color: '#F44336' },
    { km: 20, color: '#9C27B0' },
];

const RADIUS_VALUES = [...RADIUS_CONFIG].map(r => r.km).sort((a, b) => a - b);
const OFFICE_LOCATION = {
    name: 'PT Nagar (Main Office)',
    coordinates: [78.1273733, 9.954987],
};

// Haversine formula for accurate GPS distances in km
const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Generates a GeoJSON polygon approximating a geodesic circle
const generateCirclePolygon = (centerLng, centerLat, radiusKm, steps = 64) => {
    const R = 6371;
    const coords = [];
    for (let i = 0; i <= steps; i++) {
        const bearing = (i / steps) * 2 * Math.PI;
        const d = radiusKm / R;
        const lat1 = centerLat * Math.PI / 180;
        const lon1 = centerLng * Math.PI / 180;
        const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing)
        );
        const lon2 = lon1 + Math.atan2(
            Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
            Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
        );
        coords.push([lon2 * 180 / Math.PI, lat2 * 180 / Math.PI]);
    }
    return coords;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const VisitLogDetail = ({ route }) => {
    const navigation = useNavigation();
    const { person, selectedDate, visitData = [], attendanceData } = route.params || {};
    const [companyId, setCompanyId] = React.useState(null);
    const [mapModalVisible, setMapModalVisible] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState(null);
    const [selectedSegment, setSelectedSegment] = useState(null);
    const modalCameraRef = useRef(null);
    const [showRadiusCircles, setShowRadiusCircles] = useState(false);
    const [activeRadii, setActiveRadii] = useState([2]);

    const existRetailers = visitData.filter(item => item.IsExistingRetailer === 1).length;
    const newRetailers = visitData.filter(item => item.IsExistingRetailer === 0).length;

    React.useEffect(() => {
        const loadUserData = async () => {
            try {
                const storedCompanyId = await AsyncStorage.getItem("Company_Id");
                setCompanyId(storedCompanyId);
            } catch (err) {
                console.error("Error in VisitLogSummary useEffect", err);
            }
        };
        loadUserData();
    }, []);

    const formatTime = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const distance = attendanceData?.Start_KM && attendanceData?.End_KM ?
        (attendanceData.End_KM - attendanceData.Start_KM) : 0;

    const { data: retailersMaster = [], isretailersLoading, isretailersError } = useQuery({
        queryKey: ["retailersMaster", companyId],
        queryFn: () => fetchRetailers({ companyId }),
        enabled: !!companyId,
    });

    // Sort visits by EntryAt time (earliest first) and filter valid coordinates
    const sortedVisitsWithCoords = useMemo(() => {
        return [...visitData]
            .filter(v => {
                const lat = parseFloat(v.Latitude);
                const lng = parseFloat(v.Longitude);
                return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
            })
            .sort((a, b) => new Date(a.EntryAt) - new Date(b.EntryAt));
    }, [visitData]);

    // Distance (km) from the previous stop to each visit, keyed by visit Id
    const segmentDistancesMap = useMemo(() => {
        const map = {};
        for (let i = 1; i < sortedVisitsWithCoords.length; i++) {
            const a = sortedVisitsWithCoords[i - 1];
            const b = sortedVisitsWithCoords[i];
            map[b.Id] = haversineKm(
                parseFloat(a.Latitude), parseFloat(a.Longitude),
                parseFloat(b.Latitude), parseFloat(b.Longitude),
            ).toFixed(2);
        }
        return map;
    }, [sortedVisitsWithCoords]);

    // GeoJSON for visit markers (numbered by time order)
    const visitMarkersGeoJson = useMemo(() => ({
        type: 'FeatureCollection',
        features: sortedVisitsWithCoords.map((v, index) => ({
            type: 'Feature',
            id: String(v.Id),
            geometry: {
                type: 'Point',
                coordinates: [parseFloat(v.Longitude), parseFloat(v.Latitude)],
            },
            properties: {
                visitIndex: index + 1,
                name: v.Reatailer_Name || 'Unknown',
                time: formatTime(v.EntryAt),
                address: v.Location_Address || '',
                narration: v.Narration || '',
                visitId: v.Id,
                segmentDistance: segmentDistancesMap[v.Id] ?? null,
            },
        })),
    }), [sortedVisitsWithCoords, segmentDistancesMap]);

    // GeoJSON polyline connecting visits in chronological order
    const routeLineGeoJson = useMemo(() => {
        if (sortedVisitsWithCoords.length < 2) return null;
        return {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: sortedVisitsWithCoords.map(v => [
                    parseFloat(v.Longitude),
                    parseFloat(v.Latitude),
                ]),
            },
        };
    }, [sortedVisitsWithCoords]);

    const routeSegmentsGeoJson = useMemo(() => ({
        type: 'FeatureCollection',
        features: sortedVisitsWithCoords.slice(0, -1).map((fromVisit, index) => {
            const toVisit = sortedVisitsWithCoords[index + 1];
            const segmentDistance = haversineKm(
                parseFloat(fromVisit.Latitude), parseFloat(fromVisit.Longitude),
                parseFloat(toVisit.Latitude), parseFloat(toVisit.Longitude),
            ).toFixed(2);

            return {
                type: 'Feature',
                id: `segment-${fromVisit.Id}-${toVisit.Id}`,
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [parseFloat(fromVisit.Longitude), parseFloat(fromVisit.Latitude)],
                        [parseFloat(toVisit.Longitude), parseFloat(toVisit.Latitude)],
                    ],
                },
                properties: {
                    segmentIndex: index + 1,
                    fromName: fromVisit.Reatailer_Name || 'Visit',
                    toName: toVisit.Reatailer_Name || 'Visit',
                    fromTime: formatTime(fromVisit.EntryAt),
                    toTime: formatTime(toVisit.EntryAt),
                    segmentDistance,
                },
            };
        }),
    }), [sortedVisitsWithCoords]);

    // Map center and bounds
    const mapCenter = useMemo(() => {
        if (sortedVisitsWithCoords.length === 0) {
            return OFFICE_LOCATION.coordinates;
        }
        const totalLat = sortedVisitsWithCoords.reduce((s, v) => s + parseFloat(v.Latitude), 0);
        const totalLng = sortedVisitsWithCoords.reduce((s, v) => s + parseFloat(v.Longitude), 0);
        return [
            totalLng / sortedVisitsWithCoords.length,
            totalLat / sortedVisitsWithCoords.length,
        ];
    }, [sortedVisitsWithCoords]);

    const radiusCenter = OFFICE_LOCATION.coordinates;

    const officeLocationGeoJson = useMemo(() => ({
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: OFFICE_LOCATION.coordinates,
                },
                properties: {
                    name: OFFICE_LOCATION.name,
                },
            },
        ],
    }), []);

    // Bounds for fitting all markers
    const mapBounds = useMemo(() => {
        if (sortedVisitsWithCoords.length < 2) return null;
        const lats = sortedVisitsWithCoords.map(v => parseFloat(v.Latitude));
        const lngs = sortedVisitsWithCoords.map(v => parseFloat(v.Longitude));
        const padding = 0.005;
        return {
            ne: [Math.max(...lngs) + padding, Math.max(...lats) + padding],
            sw: [Math.min(...lngs) - padding, Math.min(...lats) - padding],
        };
    }, [sortedVisitsWithCoords]);

    const totalRouteDistance = useMemo(() => {
        if (sortedVisitsWithCoords.length < 2) return 0;
        let total = 0;
        for (let i = 0; i < sortedVisitsWithCoords.length - 1; i++) {
            const a = sortedVisitsWithCoords[i];
            const b = sortedVisitsWithCoords[i + 1];
            total += haversineKm(
                parseFloat(a.Latitude), parseFloat(a.Longitude),
                parseFloat(b.Latitude), parseFloat(b.Longitude),
            );
        }
        return total.toFixed(2);
    }, [sortedVisitsWithCoords]);

    const activeRadiiSorted = useMemo(() => [...activeRadii].sort((a, b) => a - b), [activeRadii]);

    const selectedVisitRadius = useMemo(() => {
        const distanceKm = parseFloat(selectedVisit?.segmentDistance);
        if (!Number.isFinite(distanceKm)) return null;
        return activeRadiiSorted.find(km => distanceKm <= km) ?? null;
    }, [selectedVisit, activeRadiiSorted]);

    const selectedSegmentRadius = useMemo(() => {
        const distanceKm = parseFloat(selectedSegment?.segmentDistance);
        if (!Number.isFinite(distanceKm)) return null;
        return activeRadiiSorted.find(km => distanceKm <= km) ?? null;
    }, [selectedSegment, activeRadiiSorted]);

    const focusedRadius = selectedSegmentRadius ?? selectedVisitRadius;

    const radiusCirclesGeoJson = useMemo(() => ({
        type: 'FeatureCollection',
        features: activeRadii.map(km => {
            const cfg = RADIUS_CONFIG.find(r => r.km === km) || { color: '#2196F3' };
            return {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [generateCirclePolygon(radiusCenter[0], radiusCenter[1], km)],
                },
                properties: { km, color: cfg.color },
            };
        }),
    }), [radiusCenter, activeRadii]);

    const radiusLabelsGeoJson = useMemo(() => ({
        type: 'FeatureCollection',
        features: activeRadii.map(km => {
            const cfg = RADIUS_CONFIG.find(r => r.km === km) || { color: '#2196F3' };
            return {
                type: 'Feature',
                // Label placed at the north edge of each circle
                geometry: { type: 'Point', coordinates: [radiusCenter[0], radiusCenter[1] + km / 111] },
                properties: { label: `${km} km`, color: cfg.color },
            };
        }),
    }), [radiusCenter, activeRadii]);

    const ensureRadiusForDistance = useCallback((distanceValue) => {
        const distanceKm = parseFloat(distanceValue);
        if (!Number.isFinite(distanceKm)) return;

        const matchingRadius = RADIUS_VALUES.find(km => distanceKm <= km);
        if (!matchingRadius) return;

        setActiveRadii(prev => {
            if (prev.includes(matchingRadius)) return prev;
            return [...prev, matchingRadius].sort((a, b) => a - b);
        });
    }, []);

    const handleRouteSegmentPress = useCallback((event) => {
        const feature = event.features?.[0];
        if (feature?.properties) {
            setSelectedSegment(feature.properties);
            setSelectedVisit(null);
            ensureRadiusForDistance(feature.properties.segmentDistance);
        }
    }, [ensureRadiusForDistance]);

    const handleVisitMarkerPress = useCallback((event) => {
        const feature = event.features?.[0];
        if (feature) {
            setSelectedVisit(feature.properties);
            setSelectedSegment(null);
            ensureRadiusForDistance(feature.properties.segmentDistance);
        }
    }, [ensureRadiusForDistance]);

    const handleFitBounds = useCallback(() => {
        if (modalCameraRef.current && mapBounds) {
            modalCameraRef.current.fitBounds(
                mapBounds.ne,
                mapBounds.sw,
                [60, 60, 60, 60],
                800,
            );
        }
    }, [mapBounds]);

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const latDiff = Math.abs(lat1 - lat2) * 111000;
        const lonDiff = Math.abs(lon1 - lon2) * 111000;
        const totalDistance = Math.sqrt(Math.pow(latDiff, 2) + Math.pow(lonDiff, 2));
        return {
            totalDistance: (totalDistance / 1000).toFixed(2),
            latDiff: (latDiff / 1000).toFixed(2),
            lonDiff: (lonDiff / 1000).toFixed(2)
        };
    };

    const comparingTwoDataSet = () => {
        if (isretailersError) {
            return <Text style={styles.errorText}>Error loading data. Please try again.</Text>;
        }

        if (!isretailersLoading) {
            const processedVisits = visitData.map(visit => {
                if (visit.IsExistingRetailer === 1) {
                    const masterRetailer = retailersMaster.find(
                        retailer => retailer.Retailer_Id.toString() === visit.Retailer_Id.toString()
                    );

                    if (masterRetailer) {
                        const verifiedLocation = masterRetailer.VERIFIED_LOCATION;
                        
                        let masterLat, masterLon;
                        
                        if (verifiedLocation?.latitude && verifiedLocation?.longitude) {
                            masterLat = parseFloat(verifiedLocation.latitude);
                            masterLon = parseFloat(verifiedLocation.longitude);
                        } else if (masterRetailer.Latitude && masterRetailer.Longitude) {
                            masterLat = parseFloat(masterRetailer.Latitude);
                            masterLon = parseFloat(masterRetailer.Longitude);
                        }

                        if (masterLat && masterLon && !isNaN(masterLat) && !isNaN(masterLon)) {
                            const distance = calculateDistance(
                                parseFloat(visit.Latitude),
                                parseFloat(visit.Longitude),
                                masterLat,
                                masterLon
                            );

                            return {
                                ...visit,
                                locationDifference: distance,
                                masterLatitude: masterLat,
                                masterLongitude: masterLon,
                                hasLocationData: true,
                                isVerifiedLocation: !!verifiedLocation?.latitude
                            };
                        }
                    }
                    return { ...visit, hasLocationData: false };
                } else {
                    return { ...visit, hasLocationData: false };
                }
            });

            return processedVisits;
        }
        return [];
    };

    const renderAttendanceCard = () => (
        <View style={styles.attendanceCard}>
            <View style={styles.cardHeader}>
                <MaterialIcon name="schedule" size={24} color={customColors.primary} />
                <Text style={styles.cardTitle}>Attendance Summary</Text>
            </View>
            
            <View style={styles.attendanceGrid}>
                <View style={styles.attendanceItem}>
                    <Text style={styles.attendanceLabel}>Start Time</Text>
                    <Text style={styles.attendanceValue}>
                        {formatTime(attendanceData?.Start_Date)}
                    </Text>
                </View>
                
                <View style={styles.attendanceItem}>
                    <Text style={styles.attendanceLabel}>End Time</Text>
                    <Text style={styles.attendanceValue}>
                        {attendanceData?.End_Date ? formatTime(attendanceData.End_Date) : "Present"}
                    </Text>
                </View>

                <View style={styles.attendanceItem}>
                    <Text style={styles.attendanceLabel}>Shops</Text>
                    <Text style={[styles.attendanceValue, { color: person?.statusColor || "#666" }]}>
                        {visitData.length || 0}
                    </Text>
                </View>
                
                <View style={styles.attendanceItem}>
                    <Text style={styles.attendanceLabel}>Distance</Text>
                    <Text style={styles.attendanceValue}>{distance} KM</Text>
                </View>
            </View>
        </View>
    );

    // Shared map content rendered both in preview and modal
    const renderMapLayers = (isModal = false) => (
        <>
            {/* Route polyline */}
            {routeLineGeoJson && (
                <Mapbox.ShapeSource id={isModal ? "routeLineModal" : "routeLine"} shape={routeLineGeoJson}>
                    <Mapbox.LineLayer
                        id={isModal ? "routeLineLayerModal" : "routeLineLayer"}
                        style={{
                            lineColor: customColors.primaryDark,
                            lineWidth: 3,
                            lineOpacity: 0.7,
                            lineDasharray: [2, 1],
                            lineCap: 'round',
                            lineJoin: 'round',
                        }}
                    />
                </Mapbox.ShapeSource>
            )}

            {/* Tappable route segments */}
            {routeSegmentsGeoJson.features.length > 0 && (
                <Mapbox.ShapeSource
                    id={isModal ? "routeSegmentsModal" : "routeSegments"}
                    shape={routeSegmentsGeoJson}
                    onPress={isModal ? handleRouteSegmentPress : undefined}
                >
                    <Mapbox.LineLayer
                        id={isModal ? "routeSegmentsLayerModal" : "routeSegmentsLayer"}
                        style={{
                            lineColor: customColors.primaryDark,
                            lineWidth: 5,
                            lineOpacity: 0.01,
                        }}
                    />
                </Mapbox.ShapeSource>
            )}

            {/* Visit markers */}
            <Mapbox.ShapeSource
                id={isModal ? "visitMarkersModal" : "visitMarkers"}
                shape={visitMarkersGeoJson}
                onPress={isModal ? handleVisitMarkerPress : undefined}
            >
                {/* Marker circles */}
                <Mapbox.CircleLayer
                    id={isModal ? "visitCirclesModal" : "visitCircles"}
                    style={{
                        circleColor: customColors.primaryDark,
                        circleRadius: isModal ? 14 : 10,
                        circleStrokeWidth: 2.5,
                        circleStrokeColor: customColors.white,
                        circleOpacity: 0.95,
                    }}
                />
                {/* Number labels */}
                <Mapbox.SymbolLayer
                    id={isModal ? "visitNumbersModal" : "visitNumbers"}
                    style={{
                        textField: ['get', 'visitIndex'],
                        textSize: isModal ? 12 : 9,
                        textColor: customColors.white,
                        textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
                        textAllowOverlap: true,
                    }}
                />
            </Mapbox.ShapeSource>

            {/* Office location marker */}
            <Mapbox.ShapeSource
                id={isModal ? "officeMarkerModal" : "officeMarker"}
                shape={officeLocationGeoJson}
            >
                <Mapbox.CircleLayer
                    id={isModal ? "officeMarkerCircleModal" : "officeMarkerCircle"}
                    style={{
                        circleColor: customColors.error,
                        circleRadius: isModal ? 10 : 8,
                        circleStrokeWidth: 3,
                        circleStrokeColor: customColors.white,
                        circleOpacity: 0.95,
                    }}
                />
                <Mapbox.SymbolLayer
                    id={isModal ? "officeMarkerLabelModal" : "officeMarkerLabel"}
                    style={{
                        textField: ['get', 'name'],
                        textSize: isModal ? 13 : 11,
                        textColor: customColors.error,
                        textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
                        textOffset: [0, 1.6],
                        textHaloColor: customColors.white,
                        textHaloWidth: 1.5,
                        textAllowOverlap: true,
                    }}
                />
            </Mapbox.ShapeSource>

            {/* Radius circles with distance labels (modal only) */}
            {isModal && showRadiusCircles && activeRadii.length > 0 && (
                <>
                    <Mapbox.ShapeSource id="radiusCirclesSource" shape={radiusCirclesGeoJson}>
                        <Mapbox.FillLayer
                            id="radiusCirclesFill"
                            style={{ fillColor: ['get', 'color'], fillOpacity: 0.08 }}
                        />
                        <Mapbox.LineLayer
                            id="radiusCirclesLine"
                            style={{
                                lineColor: ['get', 'color'],
                                lineWidth: 1.5,
                                lineOpacity: 0.8,
                                lineDasharray: [4, 2],
                            }}
                        />
                    </Mapbox.ShapeSource>
                    <Mapbox.ShapeSource id="radiusLabelsSource" shape={radiusLabelsGeoJson}>
                        <Mapbox.SymbolLayer
                            id="radiusLabels"
                            style={{
                                textField: ['get', 'label'],
                                textSize: 11,
                                textColor: ['get', 'color'],
                                textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
                                textHaloColor: customColors.white,
                                textHaloWidth: 1.5,
                                textAllowOverlap: true,
                            }}
                        />
                    </Mapbox.ShapeSource>
                </>
            )}
        </>
    );

    // Small map preview below attendance card
    const renderMapPreview = () => {
        if (sortedVisitsWithCoords.length === 0) return null;

        return (
            <TouchableOpacity
                style={styles.mapPreviewContainer}
                onPress={() => setMapModalVisible(true)}
                activeOpacity={0.9}
            >
                <View style={styles.mapPreviewHeader}>
                    <View style={styles.mapPreviewTitleRow}>
                        <MaterialIcon name="route" size={18} color={customColors.primary} />
                        <Text style={styles.mapPreviewTitle}>Visit Route</Text>
                        {parseFloat(totalRouteDistance) > 0 && (
                            <View style={styles.routeDistanceBadge}>
                                <Text style={styles.routeDistanceText}>{totalRouteDistance} km</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.mapExpandHint}>
                        <Text style={styles.mapExpandText}>Tap to expand</Text>
                        <FeatherIcon name="maximize-2" size={14} color={customColors.grey500} />
                    </View>
                </View>

                <View style={styles.mapPreviewWrapper}>
                    <Mapbox.MapView
                        style={styles.mapPreview}
                        styleURL={Mapbox.StyleURL.Street}
                        logoEnabled={false}
                        attributionEnabled={false}
                        compassEnabled={false}
                        scaleBarEnabled={false}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        rotateEnabled={false}
                        pitchEnabled={false}
                    >
                        <Mapbox.Camera
                            centerCoordinate={mapCenter}
                            zoomLevel={sortedVisitsWithCoords.length === 1 ? 14 : 11}
                            animationMode="none"
                            bounds={mapBounds ? {
                                ne: mapBounds.ne,
                                sw: mapBounds.sw,
                                paddingTop: 30,
                                paddingBottom: 30,
                                paddingLeft: 30,
                                paddingRight: 30,
                            } : undefined}
                        />
                        {renderMapLayers(false)}
                    </Mapbox.MapView>

                    {/* Visit count overlay */}
                    <View style={styles.visitCountBadge}>
                        <Text style={styles.visitCountText}>
                            {sortedVisitsWithCoords.length} visits
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // Full-screen map modal
    const renderMapModal = () => (
        <Modal
            visible={mapModalVisible}
            animationType="slide"
            onRequestClose={() => {
                setMapModalVisible(false);
                setSelectedVisit(null);
                setSelectedSegment(null);
            }}
        >
            <SafeAreaView style={styles.modalContainer} edges={["top", "bottom"]}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                    <TouchableOpacity
                        style={styles.modalCloseButton}
                        onPress={() => {
                            setMapModalVisible(false);
                            setSelectedVisit(null);
                            setSelectedSegment(null);
                        }}
                    >
                        <FeatherIcon name="arrow-left" size={22} color={customColors.grey900} />
                    </TouchableOpacity>
                    <View style={styles.modalHeaderContent}>
                        <Text style={styles.modalTitle}>Visit Route</Text>
                        <Text style={styles.modalSubtitle}>
                            {person?.User_Name} • {sortedVisitsWithCoords.length} visits{parseFloat(totalRouteDistance) > 0 ? ` • ${totalRouteDistance} km` : ''}
                        </Text>
                    </View>
                </View>

                {/* Map */}
                <View style={styles.modalMapWrapper}>
                    <Mapbox.MapView
                        style={styles.modalMap}
                        styleURL={Mapbox.StyleURL.Street}
                        logoEnabled={false}
                        attributionEnabled={false}
                        compassEnabled={true}
                        scaleBarEnabled={false}
                    >
                        <Mapbox.Camera
                            ref={modalCameraRef}
                            centerCoordinate={mapCenter}
                            zoomLevel={sortedVisitsWithCoords.length === 1 ? 14 : 11}
                            animationMode="flyTo"
                            animationDuration={800}
                            bounds={mapBounds ? {
                                ne: mapBounds.ne,
                                sw: mapBounds.sw,
                                paddingTop: 60,
                                paddingBottom: 60,
                                paddingLeft: 60,
                                paddingRight: 60,
                            } : undefined}
                        />
                        {renderMapLayers(true)}
                    </Mapbox.MapView>

                    {/* Fit bounds button */}
                    <TouchableOpacity style={styles.fitBoundsButton} onPress={handleFitBounds}>
                        <MaterialIcon name="fit-screen" size={iconSizes.md} color={customColors.primary} />
                    </TouchableOpacity>

                    {/* Radius circles toggle */}
                    <TouchableOpacity
                        style={[styles.radiusToggleButton, showRadiusCircles && styles.mapControlActive]}
                        onPress={() => setShowRadiusCircles(v => !v)}
                    >
                        <MaterialIcon name="radio-button-checked" size={iconSizes.md} color={showRadiusCircles ? customColors.white : customColors.primary} />
                    </TouchableOpacity>

                    {/* Radius distance selector */}
                    {showRadiusCircles && (
                        <View style={styles.radiusPanel}>
                            {RADIUS_CONFIG.map(({ km, color }) => {
                                const isActive = activeRadii.includes(km);
                                return (
                                    <TouchableOpacity
                                        key={km}
                                        style={[
                                            styles.radiusChip,
                                            { borderColor: color },
                                            isActive && { backgroundColor: color },
                                            focusedRadius === km && styles.radiusChipFocused,
                                        ]}
                                        onPress={() => setActiveRadii(prev =>
                                            isActive ? prev.filter(r => r !== km) : [...prev, km].sort((a, b) => a - b)
                                        )}
                                    >
                                        <Text style={[styles.radiusChipText, isActive && { color: customColors.white }]}>
                                            {km} km
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Selected visit card */}
                {selectedVisit && (
                    <View style={styles.modalVisitCard}>
                        <View style={styles.modalVisitHeader}>
                            <View style={styles.modalVisitNumber}>
                                <Text style={styles.modalVisitNumberText}>{selectedVisit.visitIndex}</Text>
                            </View>
                            <View style={styles.modalVisitInfo}>
                                <Text style={styles.modalVisitName} numberOfLines={1}>
                                    {selectedVisit.name}
                                </Text>
                                <Text style={styles.modalVisitTime}>{selectedVisit.time}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalDismissBtn}
                                onPress={() => setSelectedVisit(null)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <FeatherIcon name="x" size={16} color={customColors.grey500} />
                            </TouchableOpacity>
                        </View>
                        {selectedVisit.address ? (
                            <View style={styles.modalVisitDetailRow}>
                                <FeatherIcon name="map-pin" size={12} color={customColors.grey400} />
                                <Text style={styles.modalVisitDetailText} numberOfLines={2}>
                                    {selectedVisit.address}
                                </Text>
                            </View>
                        ) : null}
                        {selectedVisit.narration ? (
                            <View style={styles.modalVisitDetailRow}>
                                <FeatherIcon name="message-circle" size={12} color={customColors.grey400} />
                                <Text style={styles.modalVisitDetailText} numberOfLines={2}>
                                    {selectedVisit.narration}
                                </Text>
                            </View>
                        ) : null}
                        {selectedVisit.segmentDistance && parseFloat(selectedVisit.segmentDistance) > 0 && (
                            <View style={styles.modalVisitDetailRow}>
                                <MaterialIcon name="directions" size={12} color={customColors.grey400} />
                                <Text style={styles.modalVisitDetailText}>
                                    {selectedVisit.segmentDistance} km from previous stop
                                </Text>
                            </View>
                        )}
                        {selectedVisit.segmentDistance && parseFloat(selectedVisit.segmentDistance) > 0 && (
                            <View style={styles.modalVisitDetailRow}>
                                <MaterialIcon name="radio-button-checked" size={12} color={customColors.grey400} />
                                <Text style={styles.modalVisitDetailText}>
                                    {selectedVisitRadius ? `Falls under ${selectedVisitRadius} km radius` : "Outside selected radius bands"}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Selected route segment card */}
                {selectedSegment && (
                    <View style={styles.modalSegmentCard}>
                        <View style={styles.modalSegmentHeader}>
                            <View style={styles.modalSegmentBadge}>
                                <Text style={styles.modalSegmentBadgeText}>{selectedSegment.segmentIndex}</Text>
                            </View>
                            <Text style={styles.modalSegmentDistanceText}>
                                {selectedSegment.segmentDistance} km
                            </Text>
                            <TouchableOpacity
                                style={styles.modalDismissBtn}
                                onPress={() => setSelectedSegment(null)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <FeatherIcon name="x" size={16} color={customColors.grey500} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalSegmentShopText} numberOfLines={1}>
                            {selectedSegment.fromName}
                        </Text>
                        <Text style={styles.modalSegmentArrowText}>
                            {selectedSegment.fromTime} to {selectedSegment.toTime}
                        </Text>
                        <Text style={styles.modalSegmentShopText} numberOfLines={1}>
                            {selectedSegment.toName}
                        </Text>
                        <Text style={styles.modalSegmentArrowText}>
                            {selectedSegmentRadius ? `Falls under ${selectedSegmentRadius} km radius` : "Outside selected radius bands"}
                        </Text>
                    </View>
                )}

                {/* Visit timeline at bottom */}
                <View style={styles.modalTimeline}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.timelineContent}
                    >
                        {sortedVisitsWithCoords.map((v, i) => (
                            <TouchableOpacity
                                key={v.Id}
                                style={[
                                    styles.timelineItem,
                                    selectedVisit?.visitId === v.Id && styles.timelineItemActive,
                                ]}
                                onPress={() => {
                                    const visitSegmentDistance = segmentDistancesMap[v.Id] ?? null;
                                    setSelectedVisit({
                                        visitIndex: i + 1,
                                        name: v.Reatailer_Name || 'Unknown',
                                        time: formatTime(v.EntryAt),
                                        address: v.Location_Address || '',
                                        narration: v.Narration || '',
                                        visitId: v.Id,
                                        segmentDistance: visitSegmentDistance,
                                    });
                                    setSelectedSegment(null);
                                    ensureRadiusForDistance(visitSegmentDistance);
                                    if (modalCameraRef.current) {
                                        modalCameraRef.current.setCamera({
                                            centerCoordinate: [parseFloat(v.Longitude), parseFloat(v.Latitude)],
                                            zoomLevel: 16,
                                            animationDuration: 600,
                                        });
                                    }
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[
                                    styles.timelineNumber,
                                    selectedVisit?.visitId === v.Id && styles.timelineNumberActive,
                                ]}>
                                    <Text style={[
                                        styles.timelineNumberText,
                                        selectedVisit?.visitId === v.Id && styles.timelineNumberTextActive,
                                    ]}>{i + 1}</Text>
                                </View>
                                <Text style={styles.timelineTime}>{formatTime(v.EntryAt)}</Text>
                                <Text style={styles.timelineName} numberOfLines={1}>
                                    {v.Reatailer_Name?.split(',')[0]?.trim() || 'Visit'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </SafeAreaView>
        </Modal>
    );

    const renderVisitCard = (visit, index) => {
        const isExisting = visit.IsExistingRetailer === 1;
        const latitude = parseFloat(visit.Latitude);
        const longitude = parseFloat(visit.Longitude);
        const hasValidCoordinates = latitude !== 0 && longitude !== 0;
        
        let googleMapsUrl;
        if (visit.masterLatitude && visit.masterLongitude) {
            googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${visit.Latitude},${visit.Longitude}&destination=${visit.masterLatitude},${visit.masterLongitude}`;
        }

        const hasLocationDifference = visit.locationDifference && visit.hasLocationData;
        const totalDistance = hasLocationDifference ? parseFloat(visit.locationDifference.totalDistance) : 0;
        
        let locationStatus = "Unknown";
        let locationColor = customColors.grey600;
        
        if (hasLocationDifference) {
            if (totalDistance <= 0.1) {
                locationStatus = "Accurate";
                locationColor = customColors.success;
            } else if (totalDistance <= 0.5) {
                locationStatus = "Close";
                locationColor = customColors.warning;
            } else {
                locationStatus = "Far";
                locationColor = customColors.error;
            }
        }

        return (
            <View key={visit.Id} style={styles.visitCard}>
                <View style={styles.visitHeader}>
                    <View style={styles.visitTypeIndicator}>
                        <MaterialIcon 
                            name={isExisting ? "store" : "add-business"} 
                            size={20} 
                            color={isExisting ? customColors.primary : customColors.success} 
                        />
                        <Text 
                            numberOfLines={2} 
                            ellipsizeMode="tail" 
                            style={[styles.visitType, { color: isExisting ? customColors.primary : customColors.success }]}
                        >
                            {visit.Reatailer_Name?.trim()}
                        </Text>
                    </View>
                    <Text style={styles.visitTime}>{formatTime(visit.EntryAt)}</Text>
                </View>

                {/* Location Accuracy Section */}
                {hasLocationDifference && (
                    <View style={styles.locationSection}>
                        <View style={styles.locationHeader}>
                            <MaterialIcon name="my-location" size={16} color={locationColor} />
                            <Text style={[styles.locationStatus, { color: locationColor }]}>
                                {locationStatus} ({totalDistance} km)
                            </Text>
                            {(visit.masterLatitude && visit.masterLongitude) && (
                                <View style={{ justifyContent: "flex-end", alignItems: "flex-end", flex: 1 }}>
                                    <TouchableOpacity
                                        style={styles.mapButton}
                                        onPress={() => Linking.openURL(googleMapsUrl)}
                                        activeOpacity={0.8}
                                    >
                                        <FeatherIcon name="external-link" size={14} color="rgba(255,255,255,0.8)" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                        <View style={styles.locationDetails}>
                            <Text style={styles.locationDetailText}>
                                Distance from expected location: {visit.locationDifference.totalDistance} km
                            </Text>
                            <Text style={styles.locationDetailText}>
                                Lat diff: {visit.locationDifference.latDiff} km • Lon diff: {visit.locationDifference.lonDiff} km
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <AppHeader 
                title={`${person?.User_Name || "Salesperson"}'s Info`} 
                navigation={navigation} 
                showRightIcon={true}
                rightIconLibrary="FeatherIcon"
                rightIconName="arrow-up-right"
                onRightPress={() => navigation.navigate("AdminAttendance", {
                    person: person
                })}
            />
            
            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.contentContainer}>
                    {/* Date Header */}
                    <View style={styles.dateHeader}>
                        <MaterialIcon name="event" size={20} color={customColors.primary} />
                        <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
                    </View>

                    {/* Attendance Card */}
                    {renderAttendanceCard()}

                    {/* Map Preview - below attendance, above visit log */}
                    {renderMapPreview()}

                    {/* Visits Section */}
                    <View style={styles.visitsSection}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcon name="location-city" size={20} color="#2196F3" />
                            <Text style={styles.sectionTitle}>Visit Log ({`${existRetailers} + ${newRetailers}`})</Text>
                        </View>

                        {visitData.length > 0 ? (
                            comparingTwoDataSet()
                                .sort((a, b) => new Date(b.EntryAt) - new Date(a.EntryAt))
                                .map((visit, index) => renderVisitCard(visit, index))
                        ) : (
                            <View style={styles.noVisitsContainer}>
                                <MaterialIcon name="store" size={48} color="#ccc" />
                                <Text style={styles.noVisitsText}>No visits recorded</Text>
                            </View>
                        )}
                    </View>

                    <View style={{ height: 20 }} />
                </View>
            </ScrollView>

            {/* Full-screen map modal */}
            {renderMapModal()}
        </SafeAreaView>
    );
};

export default VisitLogDetail;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primaryDark,
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    contentContainer: {
        padding: spacing.md,
    },
    dateHeader: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.primaryLight + "30",
        padding: spacing.sm,
        borderRadius: 6,
        marginBottom: spacing.md,
    },
    dateText: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: "700",
        marginLeft: spacing.sm,
    },
    // Attendance Card Styles
    attendanceCard: {
        backgroundColor: customColors.white,
        borderRadius: 16,
        padding: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.medium,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    cardTitle: {
        ...typography.h6(),
        color: customColors.grey900,
        fontWeight: "700",
        marginLeft: spacing.sm,
    },
    attendanceGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    attendanceItem: {
        width: "48%",
        alignItems: "center",
        backgroundColor: customColors.grey100,
        padding: spacing.md,
        borderRadius: 12,
        marginBottom: spacing.sm,
    },
    attendanceLabel: {
        ...typography.caption(),
        color: customColors.grey700,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: spacing.xs,
    },
    attendanceValue: {
        ...typography.h6(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    // Map Preview Styles
    mapPreviewContainer: {
        backgroundColor: customColors.white,
        borderRadius: 16,
        marginBottom: spacing.sm,
        overflow: "hidden",
        ...shadows.medium,
    },
    mapPreviewHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    mapPreviewTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    mapPreviewTitle: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    routeDistanceBadge: {
        backgroundColor: customColors.primaryFaded,
        borderRadius: borderRadius.round,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        marginLeft: spacing.xs,
    },
    routeDistanceText: {
        ...typography.caption(),
        color: customColors.primary,
        fontWeight: "700",
    },
    mapExpandHint: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xxs,
    },
    mapExpandText: {
        ...typography.caption(),
        color: customColors.grey500,
    },
    mapPreviewWrapper: {
        height: 180,
        position: "relative",
    },
    mapPreview: {
        flex: 1,
    },
    visitCountBadge: {
        position: "absolute",
        bottom: spacing.sm,
        left: spacing.sm,
        backgroundColor: customColors.primaryDark,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.round,
    },
    visitCountText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "700",
        fontSize: 11,
    },
    // Visits Section Styles
    visitsSection: {
        marginTop: spacing.sm,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        ...typography.h6(),
        color: customColors.grey900,
        fontWeight: "700",
        marginLeft: spacing.xs,
    },
    visitCard: {
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.medium,
    },
    visitHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: spacing.sm,
        gap: spacing.xs,
    },
    visitTypeIndicator: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: spacing.xs,
    },
    visitType: {
        flex: 1,
        ...typography.caption(),
        fontWeight: "700",
        letterSpacing: 0.25,
        marginLeft: spacing.xs,
    },
    visitTime: {
        ...typography.caption(),
        color: customColors.grey600,
        fontWeight: "500",
        minWidth: 65,
        textAlign: "right",
    },
    mapButton: {
        backgroundColor: customColors.error,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: 8,
    },
    mapButtonText: {
        ...typography.button(),
        color: customColors.white,
        fontWeight: "600",
        marginHorizontal: spacing.xs,
    },
    noVisitsContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.xxl,
        backgroundColor: customColors.grey100,
        borderRadius: 12,
    },
    noVisitsText: {
        ...typography.body1(),
        color: customColors.grey500,
        fontWeight: "500",
        marginTop: spacing.sm,
    },
    // Location Accuracy Styles
    locationSection: {
        backgroundColor: "#F8F9FA",
        borderRadius: 8,
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
    locationHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.xs,
    },
    locationStatus: {
        ...typography.body2(),
        fontWeight: "600",
        marginLeft: spacing.xs,
    },
    locationDetails: {
        marginLeft: 20,
    },
    locationDetailText: {
        ...typography.caption(),
        color: customColors.grey600,
        lineHeight: 16,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
        backgroundColor: customColors.white,
    },
    modalCloseButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: customColors.grey100,
        justifyContent: "center",
        alignItems: "center",
        marginRight: spacing.sm,
    },
    modalHeaderContent: {
        flex: 1,
    },
    modalTitle: {
        ...typography.subtitle1(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    modalSubtitle: {
        ...typography.caption(),
        color: customColors.grey500,
    },
    modalMapWrapper: {
        flex: 1,
        position: "relative",
    },
    modalMap: {
        flex: 1,
    },
    fitBoundsButton: {
        position: "absolute",
        top: spacing.md,
        right: spacing.md,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: customColors.white,
        justifyContent: "center",
        alignItems: "center",
        ...shadows.medium,
    },
    modalVisitCard: {
        marginHorizontal: spacing.sm,
        marginTop: spacing.sm,
        padding: spacing.md,
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: customColors.grey200,
        ...shadows.small,
    },
    modalSegmentCard: {
        marginHorizontal: spacing.sm,
        marginTop: spacing.sm,
        padding: spacing.md,
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: customColors.grey200,
        ...shadows.small,
    },
    modalSegmentHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.xs,
    },
    modalSegmentBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: customColors.primaryDark,
        justifyContent: "center",
        alignItems: "center",
    },
    modalSegmentBadgeText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "700",
        fontSize: 10,
    },
    modalSegmentDistanceText: {
        ...typography.subtitle2(),
        color: customColors.primary,
        fontWeight: "700",
        marginLeft: spacing.sm,
        flex: 1,
    },
    modalSegmentShopText: {
        ...typography.caption(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    modalSegmentArrowText: {
        ...typography.caption(),
        color: customColors.grey500,
        marginVertical: 2,
    },
    modalVisitHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    modalVisitNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: customColors.primaryDark,
        justifyContent: "center",
        alignItems: "center",
    },
    modalVisitNumberText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "700",
        fontSize: 12,
    },
    modalVisitInfo: {
        flex: 1,
    },
    modalVisitName: {
        ...typography.subtitle2(),
        color: customColors.grey900,
        fontWeight: "700",
    },
    modalVisitTime: {
        ...typography.caption(),
        color: customColors.grey500,
        marginTop: 1,
    },
    modalDismissBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: customColors.grey100,
        justifyContent: "center",
        alignItems: "center",
    },
    modalVisitDetailRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: spacing.xs,
        marginTop: spacing.xs,
        paddingLeft: 36,
    },
    modalVisitDetailText: {
        ...typography.caption(),
        color: customColors.grey600,
        flex: 1,
    },
    // Timeline Styles
    modalTimeline: {
        borderTopWidth: 1,
        borderTopColor: customColors.grey200,
        backgroundColor: customColors.white,
        paddingVertical: spacing.sm,
    },
    timelineContent: {
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
    },
    timelineItem: {
        alignItems: "center",
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.lg,
        backgroundColor: customColors.grey50,
        borderWidth: 1,
        borderColor: customColors.grey200,
        minWidth: 70,
    },
    timelineItemActive: {
        backgroundColor: customColors.primaryFaded,
        borderColor: customColors.primary,
    },
    timelineNumber: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: customColors.grey300,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 2,
    },
    timelineNumberActive: {
        backgroundColor: customColors.primaryDark,
    },
    timelineNumberText: {
        ...typography.caption(),
        color: customColors.grey700,
        fontWeight: "700",
        fontSize: 10,
    },
    timelineNumberTextActive: {
        color: customColors.white,
    },
    timelineTime: {
        ...typography.caption(),
        color: customColors.grey600,
        fontWeight: "600",
        fontSize: 10,
    },
    timelineName: {
        ...typography.caption(),
        color: customColors.grey500,
        fontSize: 9,
        maxWidth: 70,
        textAlign: "center",
    },
    // Map control overlay styles
    mapControlActive: {
        backgroundColor: customColors.primaryDark,
    },
    radiusToggleButton: {
        position: "absolute",
        top: spacing.md + 48,
        right: spacing.md,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: customColors.white,
        justifyContent: "center",
        alignItems: "center",
        ...shadows.medium,
    },
    radiusPanel: {
        position: "absolute",
        top: spacing.md,
        right: spacing.md + 48,
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: spacing.xs,
        gap: spacing.xs,
        ...shadows.medium,
    },
    radiusChip: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.round,
        borderWidth: 1.5,
        alignItems: "center",
        minWidth: 54,
    },
    radiusChipFocused: {
        transform: [{ scale: 1.08 }],
        borderWidth: 2.5,
    },
    radiusChipText: {
        ...typography.caption(),
        fontWeight: "700",
        fontSize: 11,
        color: customColors.grey700,
    },
});
