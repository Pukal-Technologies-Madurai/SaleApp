import { StyleSheet, View, Alert } from "react-native";
import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import AppHeader from "../../Components/AppHeader";
import LocationIndicator from "../../Components/LocationIndicator";

const RetailerMapView = () => {
    const navigation = useNavigation();

    const [logData, setLogData] = React.useState([]);
    const [selectedFromDate, setSelectedFromDate] = React.useState(new Date());
    const [selectedToDate, setSelectedToDate] = React.useState(new Date());

    const [location, setLocation] = React.useState({
        latitude: null,
        longitude: null,
    });

    const [htmlContent, setHtmlContent] = React.useState("");

    console.log("location", location.latitude, location.longitude);

    React.useEffect(() => {
        (async () => {
            try {
                const userId = await AsyncStorage.getItem("UserId");
                const fromDate = selectedFromDate.toISOString().split("T")[0];
                const toDate = selectedToDate.toISOString().split("T")[0];
                await fetchTripSheet(fromDate, toDate, userId);
            } catch (err) {
                console.log(err);
            }
        })();
    }, []);

    React.useEffect(() => {
        if (logData && logData.length > 0) {
            const htmlContent = createHtmlContent(logData, location);
            setHtmlContent(htmlContent);
        }
    }, [logData, location]);

    const fetchTripSheet = async (from, to, uId) => {
        try {
            const url = `${API.deliveryTripSheet()}${from}&Todate=${to}&User_Id=${uId}`;
            // console.log("Fetching trip sheet from URL:", url);
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (data.success) {
                // Temporarily disable filtering to show all trips
                setLogData(data.data);
                // const filteredData = await filterTripsByUserId(data.data);
                // setLogData(filteredData);
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

    const handleLocationUpdate = locationData => {
        setLocation(locationData);
    };

    const createHtmlContent = (data, userLocation) => {
        // Extract unique retailers from Product_Array structure
        const extractRetailers = (tripData) => {
            const retailersMap = new Map();
            
            if (tripData && Array.isArray(tripData)) {
                tripData.forEach(trip => {
                    if (trip.Product_Array && Array.isArray(trip.Product_Array)) {
                        trip.Product_Array.forEach(productGroup => {
                            if (productGroup.Products_List && Array.isArray(productGroup.Products_List)) {
                                productGroup.Products_List.forEach(product => {
                                    if (product.Retailer_Name && product.Latitude && product.Longitude) {
                                        const key = product.Retailer_Name;
                                        if (!retailersMap.has(key)) {
                                            retailersMap.set(key, {
                                                Retailer_Name: product.Retailer_Name,
                                                Latitude: product.Latitude,
                                                Longitude: product.Longitude,
                                                Branch: product.Branch || '',
                                                Do_Inv_No: product.Do_Inv_No || ''
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    }
                });
            }
            
            return Array.from(retailersMap.values());
        };

        // Calculate distance between two coordinates using Haversine formula
        const calculateDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371; // Earth's radius in kilometers
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c; // Distance in kilometers
        };

        const retailers = extractRetailers(data);
        
        // Use current location or fallback to provided coordinates
        const currentLat = userLocation?.latitude || 9.954993;
        const currentLng = userLocation?.longitude || 78.127357;

        // Calculate distances and sort retailers by proximity
        const retailersWithDistance = retailers.map(retailer => ({
            ...retailer,
            distance: calculateDistance(
                currentLat, 
                currentLng, 
                parseFloat(retailer.Latitude), 
                parseFloat(retailer.Longitude)
            )
        })).sort((a, b) => a.distance - b.distance);

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Retailers Map</title>
                <style>
                    #map {
                        height: 100%;
                        width: 100%;
                    }
                    html, body {
                        height: 100%;
                        margin: 0;
                        padding: 0;
                    }
                    .info-window {
                        padding: 10px;
                        max-width: 250px;
                    }
                    .info-window h4 {
                        margin: 0 0 8px 0;
                        color: #1a73e8;
                    }
                    .info-window p {
                        margin: 0 0 5px 0;
                        font-size: 13px;
                    }
                    .distance-badge {
                        background-color: #34a853;
                        color: white;
                        padding: 3px 8px;
                        border-radius: 12px;
                        font-size: 12px;
                        margin-bottom: 5px;
                        display: inline-block;
                    }
                    .shop-number {
                        background-color: #ea4335;
                        color: white;
                        padding: 2px 6px;
                        border-radius: 10px;
                        font-size: 11px;
                        font-weight: bold;
                        margin-right: 5px;
                    }
                    .directions-link {
                        display: inline-block;
                        margin-top: 8px;
                        padding: 8px 12px;
                        background-color: #4285f4;
                        color: white;
                        text-decoration: none;
                        border-radius: 4px;
                        font-size: 14px;
                    }
                </style>
                <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyD4IuRFVcMjWo1qWvBrS3v4uvDXcCiq_c4"></script>
                <script>
                    function initMap() {
                        const currentLocation = { lat: ${currentLat}, lng: ${currentLng} };
                        
                        const map = new google.maps.Map(document.getElementById('map'), {
                            zoom: 12,
                            center: currentLocation
                        });

                        const retailers = ${JSON.stringify(retailersWithDistance)};
                        const bounds = new google.maps.LatLngBounds();

                        // Add user's current location marker
                        const userMarker = new google.maps.Marker({
                            position: currentLocation,
                            map: map,
                            title: "Your Current Location",
                            icon: {
                                url: 'data:image/svg+xml;charset=UTF-8;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="%23EA4335" stroke="white" stroke-width="3"/><circle cx="20" cy="20" r="8" fill="white"/><circle cx="20" cy="20" r="4" fill="%23EA4335"/></svg>'),
                                scaledSize: new google.maps.Size(40, 40),
                                anchor: new google.maps.Point(20, 20)
                            },
                            zIndex: 1000
                        });

                        const userInfoContent = \`
                            <div class="info-window">
                                <h4>📍 Your Current Location</h4>
                                <p><strong>Coordinates:</strong> \${currentLocation.lat.toFixed(6)}, \${currentLocation.lng.toFixed(6)}</p>
                            </div>
                        \`;

                        const userInfoWindow = new google.maps.InfoWindow({
                            content: userInfoContent
                        });

                        userMarker.addListener('click', () => {
                            userInfoWindow.open(map, userMarker);
                        });

                        bounds.extend(currentLocation);

                        // Add retailer markers with numbered labels
                        retailers.forEach((retailer, index) => {
                            let coordinates = null;
                            if (retailer.Latitude && retailer.Longitude) {
                                coordinates = { 
                                    lat: parseFloat(retailer.Latitude), 
                                    lng: parseFloat(retailer.Longitude) 
                                };
                            }

                            if (coordinates && !isNaN(coordinates.lat) && !isNaN(coordinates.lng)) {
                                const shopNumber = index + 1;
                                
                                // Create numbered marker icon
                                const markerIcon = {
                                    url: 'data:image/svg+xml;charset=UTF-8;base64,' + btoa(\`
                                        <svg xmlns="http://www.w3.org/2000/svg" width="45" height="55" viewBox="0 0 45 55">
                                            <path d="M22.5 0C10.1 0 0 10.1 0 22.5c0 22.5 22.5 32.5 22.5 32.5s22.5-10 22.5-32.5C45 10.1 34.9 0 22.5 0z" fill="%234285F4" stroke="white" stroke-width="2"/>
                                            <circle cx="22.5" cy="22.5" r="15" fill="white"/>
                                            <text x="22.5" y="30" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="%234285F4">\${shopNumber}</text>
                                        </svg>
                                    \`),
                                    scaledSize: new google.maps.Size(45, 55),
                                    anchor: new google.maps.Point(22.5, 55)
                                };

                                const marker = new google.maps.Marker({
                                    position: coordinates,
                                    map: map,
                                    title: \`#\${shopNumber} - \${retailer.Retailer_Name}\`,
                                    icon: markerIcon
                                });

                                const infoContent = \`
                                    <div class="info-window">
                                        <h4><span class="shop-number">#\${shopNumber}</span>\${retailer.Retailer_Name}</h4>
                                        <span class="distance-badge">\${retailer.distance.toFixed(2)} km away</span>
                                        <p><strong>Branch:</strong> \${retailer.Branch || 'N/A'}</p>
                                        <p><strong>Invoice:</strong> \${retailer.Do_Inv_No || 'N/A'}</p>
                                        <p><strong>Coordinates:</strong> \${coordinates.lat.toFixed(6)}, \${coordinates.lng.toFixed(6)}</p>
                                        <a href="https://www.google.com/maps/dir/\${currentLocation.lat},\${currentLocation.lng}/\${coordinates.lat},\${coordinates.lng}" 
                                           class="directions-link" 
                                           target="_blank">
                                           Get Directions (\${retailer.distance.toFixed(2)} km)
                                        </a>
                                    </div>
                                \`;

                                const infowindow = new google.maps.InfoWindow({
                                    content: infoContent
                                });

                                marker.addListener('click', () => {
                                    infowindow.open(map, marker);
                                });

                                bounds.extend(coordinates);
                            }
                        });

                        if (!bounds.isEmpty()) {
                            map.fitBounds(bounds);
                            // Ensure reasonable zoom level
                            const listener = google.maps.event.addListener(map, 'idle', function() {
                                if (map.getZoom() > 16) map.setZoom(16);
                                if (map.getZoom() < 10) map.setZoom(10);
                                google.maps.event.removeListener(listener);
                            });
                        }
                    }

                    window.onload = initMap;
                </script>
            </head>
            <body>
                <div id="map"></div>
            </body>
            </html>
        `;
    };

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader title="Trip Map" navigation={navigation} />

            <View style={styles.contentContainer}>
                <LocationIndicator
                    onLocationUpdate={handleLocationUpdate}
                    autoFetch={true}
                    autoFetchOnMount={true}
                />

                <WebView
                    // pullToRefreshEnabled={true}
                    originWhitelist={["*"]}
                    source={{ html: htmlContent }}
                    style={styles.webview}
                />
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
    dropdownContainer: {
        margin: 10,
    },
    webview: {
        flex: 1,
    },
});
